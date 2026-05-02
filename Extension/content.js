const DEBUG_MODE = true;

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase]", ...args);
}

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, maxLen);
}

if (!document.body) {
  log("No document.body, skipping content script init.");
} else {
  init();
}

function init() {
  checkEmpId();
  showHttpWarning();
  checkBlacklist();
  attachDlpListeners();
  listenForAdminTriggers();
}

// Employee ID banner
function checkEmpId() {
  chrome.storage.local.get("emp_id", ({ emp_id }) => {
    if (!emp_id) injectSetupBanner();
  });
}

function injectSetupBanner() {
  if (document.getElementById("cb-setup-banner")) return;
  const banner = document.createElement("div");
  banner.id = "cb-setup-banner";
  banner.className = "cb-setup-banner";
  banner.innerHTML =
    "<span>CyberBase: click the extension icon and set your employee ID to activate protection.</span>" +
    '<button id="cb-setup-dismiss" aria-label="Close">X</button>';
  document.body.prepend(banner);
  document.getElementById("cb-setup-dismiss").addEventListener("click", () => banner.remove());
}

// HTTP warning banner
function showHttpWarning() {
  if (window.location.protocol !== "http:") return;
  if (document.getElementById("cb-http-banner")) return;
  const banner = document.createElement("div");
  banner.id = "cb-http-banner";
  banner.className = "cb-http-banner";
  banner.textContent =
    "CyberBase - Insecure connection (HTTP). Do not submit passwords or confidential data on this page.";
  document.body.prepend(banner);
}

// Blacklist
function checkBlacklist() {
  chrome.runtime.sendMessage(
    {
      action: "CHECK_BLACKLIST",
      hostname: window.location.hostname,
      attempted_url: window.location.href,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        log("Blacklist check error:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.blocked) showBlockedPage(window.location.href);
    }
  );
}

function showBlockedPage(attemptedUrl) {
  fetch(chrome.runtime.getURL("blocked.html"))
    .then((r) => r.text())
    .then((html) => {
      document.open();
      document.write(html.replace("{{ATTEMPTED_URL}}", sanitize(attemptedUrl)));
      document.close();
    })
    .catch(() => {
      document.body.innerHTML =
        '<div style="font-family:system-ui;text-align:center;padding:60px;background:#0f1117;color:#e2e8f0;min-height:100vh;">' +
        "<h1 style='color:#fc8181'>Access blocked - CyberBase</h1>" +
        "<p>This site is blocked by your organization security policy.</p></div>";
    });
}

// Smart multi-tier upload guard
let dlpActive = false;
const replayBypassInputs = new WeakSet();

const DLP_PIPELINE_CONFIG = {
  maxExtractChars: 12000,
  maxPdfPages: 8,
};

const REGEX_PATTERNS_URL = chrome.runtime.getURL("config/regex-patterns.json");
let tier1PatternsPromise = null;

function attachDlpListeners() {
  document.addEventListener("input", handleFileChange, true);
  document.addEventListener("change", handleFileChange, true);
}

async function handleFileChange(event) {
  const input = event.target;
  if (!input || input.type !== "file") return;
  if (!input.files || input.files.length === 0) return;
  if (dlpActive) return;

  if (replayBypassInputs.has(input)) {
    replayBypassInputs.delete(input);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();

  const file = input.files[0];
  dlpActive = true;
  showCheckingModal(file.name);

  try {
    const analysis = await runUploadPipeline(file);
    closeCheckingModal();

    if (!analysis.shouldBlock) {
      await sendDlpDecisionLog("allow", file.name, analysis);
      replayBypassInputs.add(input);
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      return;
    }

    const decision = await showDlpWarningModal(file.name, analysis);
    const actionTaken = decision === "cancel" ? "cancel" : "force";
    await sendDlpDecisionLog(actionTaken, file.name, analysis);

    if (actionTaken === "cancel") {
      input.value = "";
      return;
    }

    replayBypassInputs.add(input);
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  } catch (error) {
    closeCheckingModal();
    log("DLP pipeline error:", error?.message || error);
    input.value = "";
    await sendDlpDecisionLog("cancel", file.name, {
      topic: "Extraction pipeline failure",
      similarity: 1,
      tier: "pipeline_error",
      reason: error?.message || String(error),
      matchedPattern: null,
    });
  } finally {
    dlpActive = false;
  }
}

async function runUploadPipeline(file) {
  const extractedText = await extractTextFromFile(file);
  const topic = summarizeDocument(extractedText, file.name);
  const semanticInput = buildSemanticInput(file.name, extractedText);
  const tier1Patterns = await getTier1Patterns();

  const tier1 = runTier1Regex(extractedText, file.name, tier1Patterns);
  if (tier1.hit) {
    return {
      shouldBlock: true,
      topic,
      tier: "tier1_regex",
      similarity: computeRegexRiskScore(tier1),
      reason: "Sensitive terms detected",
      matchedPattern: tier1.ids.join(","),
    };
  }

  const semanticResponse = await chrome.runtime.sendMessage({
    action: "DLP_SEMANTIC_CHECK",
    text: semanticInput,
  });

  const similarity = typeof semanticResponse?.top_score === "number" ? semanticResponse.top_score : 0;
  const threshold = typeof semanticResponse?.threshold === "number" ? semanticResponse.threshold : 0.85;
  const semanticError = !semanticResponse || semanticResponse?.top_topic === "semantic_error";
  const blocked = semanticError ? true : similarity >= threshold;
  const semanticRisk = semanticError ? 0.92 : computeDecisionScore(similarity, threshold);

  return {
    shouldBlock: blocked,
    topic,
    tier: "tier2_semantic",
    similarity: semanticRisk,
    reason: semanticError
      ? "semantic check unavailable (fail-safe block)"
      : "Content appears related to private company domains",
    matchedPattern: null,
  };
}

function showCheckingModal(filename) {
  Swal.fire({
    html:
      '<div class="cb-dlp-modal">' +
      '<div class="cb-dlp-header">' +
      '<span class="cb-dlp-icon">&#128269;</span>' +
      '<span class="cb-dlp-title">Checking File</span>' +
      '<span class="cb-dlp-badge">CyberBase</span>' +
      "</div>" +
      '<div class="cb-dlp-body-wrap">' +
      '<p class="cb-dlp-body">Analyzing:</p>' +
      '<div class="cb-dlp-filename">' + sanitize(filename, 80) + "</div>" +
      '<p class="cb-dlp-question">Running privacy checks (regex + semantic model). Please wait.</p>' +
      "</div>" +
      "</div>",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
    customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
  });
}

function closeCheckingModal() {
  if (Swal.isVisible()) Swal.close();
}

async function getTier1Patterns() {
  if (!tier1PatternsPromise) {
    tier1PatternsPromise = (async () => {
      const response = await fetch(REGEX_PATTERNS_URL);
      if (!response.ok) throw new Error("Could not load regex patterns.");
      const payload = await response.json();
      const rawPatterns = Array.isArray(payload?.patterns) ? payload.patterns : [];
      if (!rawPatterns.length) throw new Error("Regex patterns file is empty.");

      return rawPatterns.map((pattern) => ({
        id: String(pattern.id || "pattern"),
        label: String(pattern.label || "restricted content"),
        regex: new RegExp(pattern.source, pattern.flags || "i"),
      }));
    })().catch((error) => {
      tier1PatternsPromise = null;
      throw error;
    });
  }
  return tier1PatternsPromise;
}

function runTier1Regex(text, filename, patterns) {
  const source = (filename || "") + "\n" + (text || "");
  const safePatterns = Array.isArray(patterns) ? patterns : [];
  const hits = [];
  for (const pattern of safePatterns) {
    if (pattern.regex.test(source)) {
      hits.push({ id: pattern.id, label: pattern.label });
    }
  }
  return {
    hit: hits.length > 0,
    ids: hits.map((x) => x.id),
    labels: hits.map((x) => x.label),
    hitCount: hits.length,
  };
}

function buildSemanticInput(filename, text) {
  const safeName = (filename || "").trim();
  const safeText = (text || "").trim();
  if (!safeName) return safeText;
  return "Filename: " + safeName + "\nDocument: " + safeText;
}

function computeRegexRiskScore(tier1) {
  const hits = Number(tier1?.hitCount || 0);
  const base = 0.86;
  const gain = Math.min(0.12, hits * 0.03);
  return Number((base + gain).toFixed(4));
}

function computeDecisionScore(rawSimilarity, threshold) {
  const s = Math.max(0, Math.min(1, Number(rawSimilarity) || 0));
  const t = Math.max(0.01, Math.min(0.99, Number(threshold) || 0.85));

  if (s <= t) {
    return Number(((s / t) * 0.85).toFixed(4));
  }

  return Number((0.85 + ((s - t) / (1 - t)) * 0.15).toFixed(4));
}

async function extractTextFromFile(file) {
  if (!file) return "";
  const name = (file.name || "").toLowerCase();

  if (isStructuredText(file, name)) {
    const raw = await file.slice(0, DLP_PIPELINE_CONFIG.maxExtractChars * 3).text();
    return normalizeExtractedText(raw);
  }

  if (name.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }

  return "";
}

function isStructuredText(file, lowerName) {
  const type = (file.type || "").toLowerCase();
  return (
    type.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".xml")
  );
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) return "";

  const workerUrl = chrome.runtime.getURL("lib/pdf.worker.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const bytes = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;

  const pages = Math.min(pdf.numPages, DLP_PIPELINE_CONFIG.maxPdfPages);
  const chunks = [];

  for (let i = 1; i <= pages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (item && typeof item.str === "string" ? item.str : ""))
      .join(" ");

    chunks.push(pageText);
    if (chunks.join(" ").length >= DLP_PIPELINE_CONFIG.maxExtractChars) break;
  }

  return normalizeExtractedText(chunks.join(" "));
}

async function extractDocxText(file) {
  if (!window.mammoth) return "";
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return normalizeExtractedText(result?.value || "");
}

function normalizeExtractedText(text) {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, DLP_PIPELINE_CONFIG.maxExtractChars);
}

function summarizeDocument(text, filename) {
  if (!text) return "File: " + sanitize(filename, 80);
  return sanitize(text.slice(0, 220), 220);
}

async function showDlpWarningModal(filename, analysis) {
  const similarityPct = Math.round((analysis.similarity || 0) * 100);

  const result = await Swal.fire({
    html:
      '<div class="cb-dlp-modal">' +
      '<div class="cb-dlp-header">' +
      '<span class="cb-dlp-icon">&#9888;</span>' +
      '<span class="cb-dlp-title">Sensitive Upload Detected</span>' +
      '<span class="cb-dlp-badge">CyberBase</span>' +
      "</div>" +
      '<div class="cb-dlp-body-wrap">' +
      '<p class="cb-dlp-body">Selected file:</p>' +
      '<div class="cb-dlp-filename">' + sanitize(filename, 80) + "</div>" +
      '<p class="cb-dlp-question"><strong>Risk score:</strong> ' + similarityPct + "%</p>" +
      '<p class="cb-dlp-question">This file may contain private company information and should not be shared externally.</p>' +
      "</div>" +
      "</div>",
    showCancelButton: true,
    confirmButtonText: "Cancel upload",
    cancelButtonText: "Force upload",
    cancelButtonColor: "#c53030",
    confirmButtonColor: "#276749",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showClass: { popup: "cb-swal-enter" },
    customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
  });

  if (result.isConfirmed) return "cancel";
  if (result.dismiss === Swal.DismissReason.cancel) return "force";
  return "cancel";
}

async function sendDlpDecisionLog(actionTaken, filename, analysis) {
  chrome.runtime.sendMessage({
    action: "DLP_LOG",
    filename,
    website: window.location.hostname,
    action_taken: actionTaken,
    document_topic: analysis.topic,
    semantic_score: Number((analysis.similarity || 0).toFixed(4)),
    detection_tier: analysis.tier,
    detection_reason: analysis.reason,
    matched_pattern: analysis.matchedPattern,
  });
}

// Admin quiz trigger
function listenForAdminTriggers() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "ADMIN_TRIGGER") return;

    const payload = message.payload;
    if (!payload || payload.type !== "QUIZ") return;

    showQuizModal(payload);
  });
}

function showQuizModal(payload) {
  const question = sanitize(payload.question || "Security awareness question:");
  const rawOptions = payload.options && typeof payload.options === "object" ? payload.options : {};
  const letters = ["A", "B", "C", "D"];

  const optionsHtml = Object.entries(rawOptions)
    .slice(0, 4)
    .map(
      ([key, value], index) =>
        '<label class="cb-quiz-option">' +
        '<input type="radio" name="cb-quiz-radio" value="' + sanitize(key) + '">' +
        '<span class="cb-quiz-letter">' + (letters[index] || sanitize(key)) + "</span>" +
        '<span class="cb-quiz-text">' + sanitize(String(value)) + "</span>" +
        "</label>"
    )
    .join("");

  Swal.fire({
    html:
      '<div class="cb-quiz-modal">' +
      '<div class="cb-quiz-header">' +
      '<span class="cb-quiz-label">Security Training - CyberBase</span>' +
      "</div>" +
      '<p class="cb-quiz-question">' + question + "</p>" +
      '<div class="cb-quiz-options" id="cb-quiz-options">' + optionsHtml + "</div>" +
      '<p class="cb-quiz-error" id="cb-quiz-error" style="display:none">Please select an answer.</p>' +
      "</div>",
    showCancelButton: false,
    confirmButtonText: "Submit answer",
    confirmButtonColor: "#2b6cb0",
    allowOutsideClick: false,
    showClass: { popup: "cb-swal-enter" },
    customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
    preConfirm: () => {
      const selected = document.querySelector('input[name="cb-quiz-radio"]:checked');
      if (!selected) {
        document.getElementById("cb-quiz-error").style.display = "block";
        return false;
      }
      return selected.value;
    },
  }).then((result) => {
    if (!result.isConfirmed || result.value === false) return;

    chrome.runtime.sendMessage({
      action: "SUBMIT_QUIZ",
      quiz_id: payload.quiz_id || "",
      answer: result.value,
    });

    Swal.fire({
      html:
        '<div class="cb-result-modal">' +
        '<span class="cb-result-icon cb-result-success">&#10003;</span>' +
        "<p>Your answer has been recorded.</p></div>",
      timer: 2200,
      showConfirmButton: false,
      customClass: {
        container: "cb-swal-container",
        popup: "cb-swal-popup cb-swal-compact",
      },
    });
  });
}
