const DEBUG_MODE = true;

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase]", ...args);
}

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, maxLen);
}

if (!document.body) {
  log("Pas de document.body, ignoré.");
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

// ─── Identifiant employé ──────────────────────────────────────────────────────

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
    "<span>CyberBase : cliquez sur l'icône de l'extension pour définir votre identifiant employé.</span>" +
    '<button id="cb-setup-dismiss" aria-label="Fermer">✕</button>';
  document.body.prepend(banner);
  document.getElementById("cb-setup-dismiss").addEventListener("click", () => banner.remove());
}

// ─── Avertissement HTTP ───────────────────────────────────────────────────────

function showHttpWarning() {
  if (window.location.protocol !== "http:") return;
  if (document.getElementById("cb-http-banner")) return;
  const banner = document.createElement("div");
  banner.id = "cb-http-banner";
  banner.className = "cb-http-banner";
  banner.textContent =
    "CyberBase — Connexion non sécurisée (HTTP). Ne saisissez pas de mots de passe ni de données confidentielles.";
  document.body.prepend(banner);
}

// ─── Liste noire ──────────────────────────────────────────────────────────────

function checkBlacklist() {
  chrome.runtime.sendMessage(
    { action: "CHECK_BLACKLIST", hostname: window.location.hostname, attempted_url: window.location.href },
    (response) => {
      if (chrome.runtime.lastError) { log("Erreur liste noire:", chrome.runtime.lastError.message); return; }
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
        "<h1 style='color:#fc8181'>Accès bloqué — CyberBase</h1>" +
        "<p>Ce site est bloqué par la politique de sécurité de l'entreprise.</p></div>";
    });
}

// ─── Avertissement upload universel ──────────────────────────────────────────

let dlpActive = false;
const replayBypassInputs = new WeakSet();

const DLP_PIPELINE_CONFIG = {
  maxExtractChars: 12000,
  maxPdfPages: 8,
};

const TIER1_RESTRICTED_PATTERNS = [
  {
    id: "credentials",
    label: "credentials or secrets",
    regex: /\b(password|passwd|api[_\s-]?key|secret[_\s-]?key|private[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|bearer)\b/i,
  },
  {
    id: "personal_id",
    label: "personal identifiers",
    regex: /\b(ssn|social security|passport|national id|employee id|dob|date of birth)\b/i,
  },
  {
    id: "banking",
    label: "banking information",
    regex: /\b(iban|swift|routing number|bank account|credit card|card number)\b/i,
  },
  {
    id: "confidentiality_marker",
    label: "confidentiality markers",
    regex: /\b(confidential|internal use only|do not share|restricted|private and confidential)\b/i,
  },
  {
    id: "legal_finance",
    label: "legal or finance sensitive content",
    regex: /\b(nda|contract|payroll|salary|financial report|acquisition|merger)\b/i,
  },
];

function attachDlpListeners() {
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
  try {
    const analysis = await runUploadPipeline(file);
    if (!analysis.shouldBlock) {
      await sendDlpDecisionLog("allow", file.name, analysis);
      replayBypassInputs.add(input);
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      return;
    }

    const userAction = await showDlpWarningModal(file.name, analysis);
    const actionTaken = userAction === "cancel" ? "cancel" : "force";
    await sendDlpDecisionLog(actionTaken, file.name, analysis);

    if (actionTaken === "cancel") {
      input.value = "";
      return;
    }

    replayBypassInputs.add(input);
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  } catch (error) {
    log("DLP pipeline error:", error.message || error);
    input.value = "";
    await sendDlpDecisionLog("cancel", file.name, {
      topic: "Extraction pipeline failure",
      similarity: 1,
      tier: "pipeline_error",
      reason: error.message || String(error),
      matchedPattern: null,
    });
  } finally {
    dlpActive = false;
  }
}

async function runUploadPipeline(file) {
  const extractedText = await extractTextFromFile(file);
  const topic = summarizeDocument(extractedText, file.name);

  const tier1 = runTier1Regex(extractedText, file.name);
  if (tier1.hit) {
    return {
      shouldBlock: true,
      topic,
      tier: "tier1_regex",
      similarity: 1,
      reason: "Tier 1 regex hit: " + tier1.label,
      matchedPattern: tier1.id,
    };
  }

  if (!extractedText) {
    return {
      shouldBlock: false,
      topic,
      tier: "no_text",
      similarity: 0,
      reason: "No extractable text",
      matchedPattern: null,
    };
  }

  const semanticResponse = await chrome.runtime.sendMessage({
    action: "DLP_SEMANTIC_CHECK",
    text: extractedText,
  });

  const similarity = typeof semanticResponse?.top_score === "number" ? semanticResponse.top_score : 0;
  const blocked = Boolean(semanticResponse?.blocked);
  return {
    shouldBlock: blocked,
    topic,
    tier: "tier2_semantic",
    similarity,
    reason: semanticResponse?.top_topic || "semantic check",
    matchedPattern: null,
  };
}

function runTier1Regex(text, filename) {
  const source = (filename || "") + "\n" + (text || "");
  for (const pattern of TIER1_RESTRICTED_PATTERNS) {
    if (pattern.regex.test(source)) {
      return { hit: true, id: pattern.id, label: pattern.label };
    }
  }
  return { hit: false, id: null, label: "" };
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
  const tierLabel = analysis.tier === "tier1_regex" ? "Tier 1 / Regex" : "Tier 2 / Semantic";
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
        '<p class="cb-dlp-question"><strong>Detection:</strong> ' + sanitize(tierLabel, 80) + "</p>" +
        '<p class="cb-dlp-question"><strong>Signal:</strong> ' + sanitize(analysis.reason || "sensitive content", 180) + "</p>" +
        '<p class="cb-dlp-question"><strong>Semantic score:</strong> ' + similarityPct + "%</p>" +
        '<p class="cb-dlp-question">This file may contain private company information and should not be shared externally.</p>' +
      "</div>" +
      "</div>",
    showCancelButton: true,
    confirmButtonText: "Cancel upload",
    cancelButtonText: "Force upload",
    cancelButtonColor: "#c53030",
    confirmButtonColor: "#276749",
    allowOutsideClick: false,
    showClass: { popup: "cb-swal-enter" },
    customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
  });

  return result.isConfirmed ? "cancel" : "force";
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

function listenForAdminTriggers() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "ADMIN_TRIGGER") return;
    const payload = message.payload;
    if (!payload || !payload.type) return;
    if (payload.type === "QUIZ") showQuizModal(payload);
    else if (payload.type === "FAKE_PHISHING") showFakePhishingModal(payload);
  });
}

function showQuizModal(payload) {
  const question = sanitize(payload.question || "Question de sécurité :");
  const rawOptions = (payload.options && typeof payload.options === "object") ? payload.options : {};
  const letters = ["A", "B", "C", "D"];

  const optionsHtml = Object.entries(rawOptions)
    .slice(0, 4)
    .map(([k, v], i) =>
      '<label class="cb-quiz-option">' +
      '<input type="radio" name="cb-quiz-radio" value="' + sanitize(k) + '">' +
      '<span class="cb-quiz-letter">' + (letters[i] || sanitize(k)) + "</span>" +
      '<span class="cb-quiz-text">' + sanitize(v) + "</span>" +
      "</label>"
    )
    .join("");

  Swal.fire({
    html:
      '<div class="cb-quiz-modal">' +
      '<div class="cb-quiz-header">' +
        '<span class="cb-quiz-label">Mini-formation · CyberBase</span>' +
      "</div>" +
      '<p class="cb-quiz-question">' + question + "</p>" +
      '<div class="cb-quiz-options" id="cb-quiz-options">' + optionsHtml + "</div>" +
      '<p class="cb-quiz-error" id="cb-quiz-error" style="display:none">Veuillez sélectionner une réponse.</p>' +
      "</div>",
    showCancelButton: false,
    confirmButtonText: "Valider ma réponse",
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
    chrome.runtime.sendMessage({ action: "SUBMIT_QUIZ", quiz_id: payload.quiz_id || "", answer: result.value });
    Swal.fire({
      html:
        '<div class="cb-result-modal">' +
        '<span class="cb-result-icon cb-result-success">&#10003;</span>' +
        "<p>Votre réponse a bien été enregistrée.</p></div>",
      timer: 2200,
      showConfirmButton: false,
      customClass: { container: "cb-swal-container", popup: "cb-swal-popup cb-swal-compact" },
    });
  });
}

function showFakePhishingModal(payload) {
  const text = sanitize(payload.text || "Cliquez ici pour télécharger le correctif de sécurité d'urgence !");

  Swal.fire({
    html:
      '<div class="cb-phish-modal">' +
      '<div class="cb-phish-header">' +
        '<span class="cb-phish-icon">&#9888;</span>' +
        '<span class="cb-phish-title">ALERTE DE SÉCURITÉ CRITIQUE</span>' +
      "</div>" +
      '<p class="cb-phish-from">De&nbsp;: securite-it@entreprise.com</p>' +
      '<p class="cb-phish-body">' + text + "</p>" +
      '<p class="cb-phish-urgency">Action requise — Délai&nbsp;: 15 minutes</p>' +
      "</div>",
    showCancelButton: true,
    confirmButtonText: "Télécharger maintenant",
    cancelButtonText: "Ignorer",
    confirmButtonColor: "#c53030",
    cancelButtonColor: "#4a5568",
    allowOutsideClick: false,
    showClass: { popup: "cb-swal-enter" },
    customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
  }).then((result) => {
    const clicked = result.isConfirmed;
    chrome.runtime.sendMessage({ action: "PHISHING_RESULT", clicked, website: window.location.hostname });

    if (clicked) {
      Swal.fire({
        html:
          '<div class="cb-reveal-modal">' +
          '<span class="cb-result-icon cb-result-warn">&#9888;</span>' +
          "<h3>C'était un test !</h3>" +
          "<p>Ce message était une <strong>simulation de phishing</strong> organisée par votre équipe IT.</p>" +
          "<p>Restez vigilant&nbsp;: ne cliquez jamais sur des liens urgents sans vérification.</p>" +
          "</div>",
        confirmButtonText: "J'ai compris",
        confirmButtonColor: "#2b6cb0",
        allowOutsideClick: false,
        customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
      });
    } else {
      Swal.fire({
        html:
          '<div class="cb-result-modal">' +
          '<span class="cb-result-icon cb-result-success">&#10003;</span>' +
          "<p>Bonne réaction — vous avez ignoré une alerte suspecte.</p></div>",
        timer: 2500,
        showConfirmButton: false,
        customClass: { container: "cb-swal-container", popup: "cb-swal-popup cb-swal-compact" },
      });
    }
  });
}
