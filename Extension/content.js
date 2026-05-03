const DEBUG_MODE = true;

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase]", ...args);
}

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, maxLen);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let protectionEnabled = null;
let protectionListenersAttached = false;
let authStateRefreshPromise = null;

boot().catch((error) => {
  log("Init failure:", error?.message || error);
});

async function boot() {
  // Attach critical guards immediately so upload handlers on the page don't run first.
  attachDlpListeners();
  attachAiPromptListeners();
  listenForAdminTriggers();
  protectionListenersAttached = true;

  if (document.readyState === "loading") {
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  await init();
}

async function init() {
  showHttpWarning();
  await renderReputationWarningIfNeeded();
  await refreshProtectionState();
  watchAuthStorageChanges();
}

function watchAuthStorageChanges() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!changes.employeeAuthToken && !changes.employeeProfile) return;
    refreshProtectionState().catch((error) => {
      log("Auth refresh after storage change failed:", error?.message || error);
    });
  });
}

async function refreshProtectionState() {
  if (authStateRefreshPromise) return authStateRefreshPromise;

  authStateRefreshPromise = (async () => {
    const state = await safeRuntimeMessage({ action: "AUTH_GET_STATE" }, { isAuthenticated: false });
    const authenticated = Boolean(state?.isAuthenticated);
    setProtectionEnabled(authenticated);
  })();

  try {
    await authStateRefreshPromise;
  } finally {
    authStateRefreshPromise = null;
  }
}

function setProtectionEnabled(enabled) {
  const nextEnabled = Boolean(enabled);
  if (protectionEnabled === nextEnabled) return;

  protectionEnabled = nextEnabled;
  aiMonitorProfilePromise = null;

  if (!protectionEnabled) {
    injectSetupBanner();
    return;
  }

  removeSetupBanner();
  checkBlacklist();
}

function isProtectionEnabled() {
  return protectionEnabled === true;
}

function injectSetupBanner() {
  if (!document.body) return;
  if (document.getElementById("cb-setup-banner")) return;
  const banner = document.createElement("div");
  banner.id = "cb-setup-banner";
  banner.className = "cb-setup-banner";
  banner.innerHTML =
    "<span>CyberBase: click the extension icon and sign in to activate protection.</span>" +
    '<button id="cb-setup-dismiss" aria-label="Close">X</button>';
  document.body.prepend(banner);
  document.getElementById("cb-setup-dismiss").addEventListener("click", () => banner.remove());
}

function removeSetupBanner() {
  const banner = document.getElementById("cb-setup-banner");
  if (banner) banner.remove();
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

async function renderReputationWarningIfNeeded() {
  const warning = await safeRuntimeMessage(
    {
      action: "REPUTATION_CONSUME_WARNING",
      page_url: window.location.href,
    },
    null
  );

  if (!warning || !warning.has_warning) return;
  injectReputationWarningBanner(warning);
}

function injectReputationWarningBanner(warning) {
  if (document.getElementById("cb-reputation-warning")) return;

  const banner = document.createElement("div");
  banner.id = "cb-reputation-warning";
  banner.className = "cb-reputation-warning";

  const verdict = sanitize(String(warning.verdict || "unknown"), 50);
  const reason = sanitize(String(warning.reason || "provider_degraded_allow"), 120);
  banner.innerHTML =
    "<span>CyberBase: reputation providers were partially unavailable for this page. " +
    "Navigation was allowed with caution. (verdict: " +
    verdict +
    ", reason: " +
    reason +
    ")</span>" +
    '<button id="cb-reputation-dismiss" aria-label="Dismiss">X</button>';

  document.body.prepend(banner);
  const dismissBtn = document.getElementById("cb-reputation-dismiss");
  if (dismissBtn) dismissBtn.addEventListener("click", () => banner.remove());
}

// Blacklist
function checkBlacklist() {
  if (!isProtectionEnabled()) return;
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
let aiPromptGuardActive = false;
const replayBypassInputs = new WeakSet();
const replayBypassPromptElements = new WeakSet();

const DLP_PIPELINE_CONFIG = {
  maxExtractChars: 12000,
  maxPdfPages: 8,
  uploadSizeThresholdBytes: 10 * 1024 * 1024,
  promptTextThresholdChars: 2500,
  keywordHitThreshold: 2,
  largeSizeKeywordHitThreshold: 1,
  largeSizeSemanticPenalty: 0.85,
};

const AI_MONITOR_FALLBACK = {
  domains: [
    "chat.openai.com",
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "copilot.microsoft.com",
  ],
  keywords: ["chatgpt", "claude", "gemini", "copilot", "assistant", "ai chat", "prompt"],
};

const REGEX_PATTERNS_URL = chrome.runtime.getURL("config/regex-patterns.json");
let tier1PatternsPromise = null;
let aiMonitorProfilePromise = null;
const HIGH_RISK_KEYWORDS = [
  "password",
  "passphrase",
  "api key",
  "private key",
  "secret",
  "token",
  "credential",
  "access token",
  "jwt",
  "oauth",
  "ssn",
  "passport",
  "iban",
  "swift",
  "payroll",
  "salary",
  "nda",
  "contract",
  "customer database",
  "client records",
  "pii",
  "source code",
  "repository",
  "architecture",
  "roadmap",
  "internal planning",
  "proprietary",
  "unreleased",
];

async function safeRuntimeMessage(payload, fallback = null) {
  try {
    return await chrome.runtime.sendMessage(payload);
  } catch (error) {
    log("Runtime message failed:", error?.message || error);
    return fallback;
  }
}

function attachDlpListeners() {
  // Capture at window first, then document, to beat page-level upload listeners.
  window.addEventListener("input", handleFileChange, true);
  window.addEventListener("change", handleFileChange, true);
  document.addEventListener("input", handleFileChange, true);
  document.addEventListener("change", handleFileChange, true);
}

async function handleFileChange(event) {
  const input = event.target;
  if (!input || input.type !== "file") return;
  if (!input.files || input.files.length === 0) return;

  const captureEvent = () => {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  // Allow our synthetic replay event to pass through even if the guard
  // is still finalizing state from the prior decision.
  // Defer deletion to a microtask so the bypass survives all synchronous
  // handler invocations (window + document capture) for the same event.
  if (replayBypassInputs.has(input)) {
    Promise.resolve().then(() => replayBypassInputs.delete(input));
    return;
  }

  // While DLP is active, block follow-up native events (e.g. a second
  // `change` after `input`) so page auto-upload handlers cannot race through.
  if (dlpActive) {
    captureEvent();
    return;
  }

  if (protectionEnabled === null) {
    // First events can happen before auth state arrives; hold them until state is known.
    captureEvent();
    await refreshProtectionState();

    if (!isProtectionEnabled()) {
      replayBypassInputs.add(input);
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      return;
    }
  } else if (!isProtectionEnabled()) {
    return;
  }

  captureEvent();

  const file = input.files[0];
  dlpActive = true;

  showCheckingModal(file.name);

  try {
    const analysis = await runUploadPipeline(file);
    closeCheckingModal();
    await sleep(350);

    if (!analysis.shouldBlock) {
      void sendDlpDecisionLog("allow", file.name, analysis, {
        eventChannel: "file_upload",
        inputSizeBytes: file.size,
        inputSizeChars: analysis.inputSizeChars || 0,
      });
      replayBypassInputs.add(input);
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      return;
    }

    const decision = await showDlpWarningModal(file.name, analysis);
    input.value = "";

    if (decision === "report") {
      void sendDlpDecisionLog("report_mistake", file.name, analysis, {
        eventChannel: "file_upload",
        inputSizeBytes: file.size,
        inputSizeChars: analysis.inputSizeChars || 0,
      });
      void sendDlpMistakeReport(file.name, analysis, "file_upload");
    } else {
      void sendDlpDecisionLog("cancel", file.name, analysis, {
        eventChannel: "file_upload",
        inputSizeBytes: file.size,
        inputSizeChars: analysis.inputSizeChars || 0,
      });
    }
  } catch (error) {
    closeCheckingModal();
    log("DLP pipeline error:", error?.message || error);
    input.value = "";
    await Swal.fire({
      html:
        '<div class="cb-dlp-modal">' +
        '<div class="cb-dlp-header">' +
        '<span class="cb-dlp-icon">&#9888;</span>' +
        '<span class="cb-dlp-title">Upload Blocked</span>' +
        '<span class="cb-dlp-badge">CyberBase</span>' +
        "</div>" +
        '<div class="cb-dlp-body-wrap">' +
        '<p class="cb-dlp-body">Selected item:</p>' +
        '<div class="cb-dlp-filename">' + sanitize(file.name, 80) + "</div>" +
        '<p class="cb-dlp-question">The security check could not complete. The upload has been blocked as a precaution.</p>' +
        '<p class="cb-dlp-question" style="font-size:11px;opacity:0.7;margin-top:6px">' + sanitize(error?.message || String(error), 120) + '</p>' +
        "</div>" +
        "</div>",
      confirmButtonText: "OK",
      confirmButtonColor: "#c53030",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showClass: { popup: "cb-swal-enter" },
      customClass: {
        container: "cb-swal-container",
        popup: "cb-swal-popup cb-swal-popup--dlp",
      },
    });
    await sendDlpDecisionLog("cancel", file.name, {
      topic: "Extraction pipeline failure",
      similarity: 1,
      tier: "pipeline_error",
      reason: error?.message || String(error),
      matchedPattern: null,
    }, {
      eventChannel: "file_upload",
      inputSizeBytes: file.size,
      inputSizeChars: 0,
      thresholdType: "pipeline_error",
      thresholdValue: 1,
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
  const inputSizeChars = extractedText.length;
  const isLargeFile = (file?.size || 0) > DLP_PIPELINE_CONFIG.uploadSizeThresholdBytes;

  // --- Tier 1a: Regex patterns ---
  const tier1 = runTier1Regex(extractedText, file.name, tier1Patterns);
  if (tier1.hit) {
    const riskScore = computeRegexRiskScore(tier1);
    return {
      shouldBlock: true,
      topic,
      tier: isLargeFile ? "tier1_regex+large_file" : "tier1_regex",
      similarity: isLargeFile ? Math.min(1, riskScore + 0.05) : riskScore,
      reason: isLargeFile
        ? "Sensitive terms detected in a large file"
        : "Sensitive terms detected",
      matchedPattern: tier1.ids.join(","),
      thresholdType: "regex_match",
      thresholdValue: tier1.hitCount,
      inputSizeChars,
    };
  }

  // --- Tier 1b: Keyword matching (large files use lower threshold) ---
  const keywordThreshold = isLargeFile
    ? DLP_PIPELINE_CONFIG.largeSizeKeywordHitThreshold
    : DLP_PIPELINE_CONFIG.keywordHitThreshold;
  const tierKeyword = runTier1Keyword(extractedText, file.name, HIGH_RISK_KEYWORDS);
  const keywordHit = tierKeyword.hitCount >= keywordThreshold;
  if (keywordHit) {
    const riskScore = computeKeywordRiskScore(tierKeyword);
    return {
      shouldBlock: true,
      topic,
      tier: isLargeFile ? "tier1_keyword+large_file" : "tier1_keyword",
      similarity: isLargeFile ? Math.min(1, riskScore + 0.05) : riskScore,
      reason: isLargeFile
        ? "High-risk keyword detected in a large file"
        : "High-risk keyword combination detected",
      matchedPattern: tierKeyword.keywords.join(","),
      thresholdType: "keyword_match",
      thresholdValue: tierKeyword.hitCount,
      inputSizeChars,
    };
  }

  // --- Tier 2: Semantic similarity (large files use stricter threshold) ---
  const semanticResponse = await safeRuntimeMessage({
    action: "DLP_SEMANTIC_CHECK",
    text: semanticInput,
  }, null);

  const semanticError = !semanticResponse || semanticResponse?.top_topic === "semantic_error";

  // When the semantic model is unavailable, Tier 1 (regex + keywords) has
  // already checked the content.  Allow the file through rather than blocking
  // everything — false-positive blocks on every upload are worse than the
  // small window of reduced protection while the model warms up.
  if (semanticError) {
    log("[DLP] Semantic model unavailable — allowing upload (Tier 1 passed)");
    return {
      shouldBlock: false,
      topic,
      tier: "tier2_semantic_unavailable",
      similarity: 0,
      reason: "Semantic model unavailable; Tier 1 checks passed",
      matchedPattern: null,
      thresholdType: "semantic_unavailable",
      thresholdValue: 0,
      inputSizeChars,
    };
  }

  const similarity = typeof semanticResponse.top_score === "number" ? semanticResponse.top_score : 0;
  const rawThreshold = typeof semanticResponse.threshold === "number" ? semanticResponse.threshold : 0.85;
  const threshold = isLargeFile
    ? Number((rawThreshold * DLP_PIPELINE_CONFIG.largeSizeSemanticPenalty).toFixed(4))
    : rawThreshold;
  const blocked = similarity >= threshold;
  const semanticRisk = computeDecisionScore(similarity, threshold);

  return {
    shouldBlock: blocked,
    topic,
    tier: (blocked && isLargeFile) ? "tier2_semantic+large_file" : "tier2_semantic",
    similarity: semanticRisk,
    reason: (blocked && isLargeFile)
      ? "Content in large file appears related to private company domains"
      : "Content appears related to private company domains",
    matchedPattern: null,
    thresholdType: "semantic_similarity",
    thresholdValue: threshold,
    inputSizeChars,
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
      '<p class="cb-dlp-question">Running privacy checks (regex + keywords + semantic model). Please wait.</p>' +
      "</div>" +
      "</div>",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
    customClass: {
      container: "cb-swal-container",
      popup: "cb-swal-popup cb-swal-popup--dlp",
    },
  });
}

function closeCheckingModal() {
  if (Swal.isVisible()) Swal.close();
}

function attachAiPromptListeners() {
  document.addEventListener("submit", handlePromptSubmit, true);
  document.addEventListener("click", handlePromptClick, true);
  document.addEventListener("keydown", handlePromptKeydown, true);
}

async function handlePromptSubmit(event) {
  if (!isProtectionEnabled()) return;
  if (aiPromptGuardActive) return;
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const promptEl = findPromptElementInNode(form);
  if (!promptEl) return;
  await processAiPromptEvent(event, promptEl, "form_submit");
}

async function handlePromptClick(event) {
  if (!isProtectionEnabled()) return;
  if (aiPromptGuardActive) return;
  const rawTarget = event.target;
  const targetEl = rawTarget instanceof Element
    ? rawTarget
    : (rawTarget && rawTarget.parentElement ? rawTarget.parentElement : null);
  if (!targetEl) return;

  const clickable = targetEl.closest("button, [role='button'], input[type='submit']");
  if (!clickable) return;

  const label = (clickable.textContent || clickable.value || "").toLowerCase();
  if (!looksLikeSendAction(label)) return;

  const promptEl =
    findPromptElementInNode(clickable.closest("form") || clickable.parentElement || document.body) ||
    findPromptElementInNode(document.body) ||
    (isPromptLikeElement(document.activeElement) ? document.activeElement : null);
  if (!promptEl) return;
  await processAiPromptEvent(event, promptEl, "button_click");
}

async function handlePromptKeydown(event) {
  if (!isProtectionEnabled()) return;
  if (aiPromptGuardActive) return;
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

  const target = event.target;
  if (!isPromptLikeElement(target)) return;
  await processAiPromptEvent(event, target, "enter_submit");
}

async function processAiPromptEvent(event, promptEl, triggerType) {
  if (!isProtectionEnabled()) return;
  if (!promptEl || replayBypassPromptElements.has(promptEl)) {
    replayBypassPromptElements.delete(promptEl);
    return;
  }

  if (aiPromptGuardActive) return;

  const text = getPromptText(promptEl);
  if (!text || text.length < 20) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  aiPromptGuardActive = true;

  const profile = await getAiMonitorProfile();
  if (!shouldMonitorCurrentPage(profile)) {
    replayBypassPromptElements.add(promptEl);
    replayPromptSubmission(promptEl, triggerType);
    aiPromptGuardActive = false;
    return;
  }

  showCheckingModal("AI prompt submission");

  try {
    const analysis = await runPromptPipeline(text);
    closeCheckingModal();
    await sleep(350);

    if (!analysis.shouldBlock) {
      await sendDlpDecisionLog("allow", "AI prompt submission", analysis, {
        eventChannel: "ai_prompt",
        inputSizeBytes: approximateTextBytes(text),
        inputSizeChars: text.length,
      });
      replayBypassPromptElements.add(promptEl);
      replayPromptSubmission(promptEl, triggerType);
      return;
    }

    const decision = await showDlpWarningModal("AI prompt submission", analysis);

    if (decision === "report") {
      await sendDlpDecisionLog("report_mistake", "AI prompt submission", analysis, {
        eventChannel: "ai_prompt",
        inputSizeBytes: approximateTextBytes(text),
        inputSizeChars: text.length,
      });
      void sendDlpMistakeReport("AI prompt submission", analysis, "ai_prompt");
    } else {
      await sendDlpDecisionLog("cancel", "AI prompt submission", analysis, {
        eventChannel: "ai_prompt",
        inputSizeBytes: approximateTextBytes(text),
        inputSizeChars: text.length,
      });
    }
  } catch (error) {
    closeCheckingModal();
    await sendDlpDecisionLog("cancel", "AI prompt submission", {
      topic: sanitize(text.slice(0, 220), 220),
      similarity: 1,
      tier: "pipeline_error",
      reason: error?.message || String(error),
      matchedPattern: null,
      thresholdType: "pipeline_error",
      thresholdValue: 1,
    }, {
      eventChannel: "ai_prompt",
      inputSizeBytes: approximateTextBytes(text),
      inputSizeChars: text.length,
      thresholdType: "pipeline_error",
      thresholdValue: 1,
    });
  } finally {
    aiPromptGuardActive = false;
  }
}

function replayPromptSubmission(promptEl, triggerType) {
  if (triggerType === "form_submit") {
    const form = promptEl.closest("form");
    if (form) {
      form.submit();
      return;
    }
  }

  if (triggerType === "button_click") {
    const form = promptEl.closest("form");
    if (form) {
      form.requestSubmit();
      return;
    }
  }

  const keyEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
    cancelable: true,
  });
  promptEl.dispatchEvent(keyEvent);
}

async function runPromptPipeline(text) {
  const topic = sanitize(text.slice(0, 220), 220);
  const tier1Patterns = await getTier1Patterns();

  if (text.length > DLP_PIPELINE_CONFIG.promptTextThresholdChars) {
    return {
      shouldBlock: true,
      topic,
      tier: "size_threshold",
      similarity: 0.9,
      reason: "Prompt size exceeds threshold",
      matchedPattern: null,
      thresholdType: "prompt_chars",
      thresholdValue: DLP_PIPELINE_CONFIG.promptTextThresholdChars,
      inputSizeChars: text.length,
    };
  }

  const tier1 = runTier1Regex(text, "ai_prompt.txt", tier1Patterns);
  if (tier1.hit) {
    return {
      shouldBlock: true,
      topic,
      tier: "tier1_regex",
      similarity: computeRegexRiskScore(tier1),
      reason: "Sensitive terms detected",
      matchedPattern: tier1.ids.join(","),
      thresholdType: "regex_match",
      thresholdValue: tier1.hitCount,
      inputSizeChars: text.length,
    };
  }

  const tierKeyword = runTier1Keyword(text, "ai_prompt.txt", HIGH_RISK_KEYWORDS);
  if (tierKeyword.hit) {
    return {
      shouldBlock: true,
      topic,
      tier: "tier1_keyword",
      similarity: computeKeywordRiskScore(tierKeyword),
      reason: "High-risk keyword combination detected",
      matchedPattern: tierKeyword.keywords.join(","),
      thresholdType: "keyword_match",
      thresholdValue: tierKeyword.hitCount,
      inputSizeChars: text.length,
    };
  }

  const semanticResponse = await safeRuntimeMessage({
    action: "DLP_SEMANTIC_CHECK",
    text: buildSemanticInput("ai_prompt.txt", text),
  }, null);

  const semanticError = !semanticResponse || semanticResponse?.top_topic === "semantic_error";

  if (semanticError) {
    log("[DLP] Semantic model unavailable — allowing prompt (Tier 1 passed)");
    return {
      shouldBlock: false,
      topic,
      tier: "tier2_semantic_unavailable",
      similarity: 0,
      reason: "Semantic model unavailable; Tier 1 checks passed",
      matchedPattern: null,
      thresholdType: "semantic_unavailable",
      thresholdValue: 0,
      inputSizeChars: text.length,
    };
  }

  const similarity = typeof semanticResponse.top_score === "number" ? semanticResponse.top_score : 0;
  const threshold = typeof semanticResponse.threshold === "number" ? semanticResponse.threshold : 0.85;
  const blocked = similarity >= threshold;
  const semanticRisk = computeDecisionScore(similarity, threshold);

  return {
    shouldBlock: blocked,
    topic,
    tier: "tier2_semantic",
    similarity: semanticRisk,
    reason: "Prompt appears related to private company domains",
    matchedPattern: null,
    thresholdType: "semantic_similarity",
    thresholdValue: threshold,
    inputSizeChars: text.length,
  };
}

async function getAiMonitorProfile() {
  if (!aiMonitorProfilePromise) {
    aiMonitorProfilePromise = safeRuntimeMessage({
        action: "GET_AI_MONITOR_PROFILE",
        hostname: window.location.hostname,
      }, null)
      .then((profile) => {
        const domains = Array.isArray(profile?.domains) && profile.domains.length
          ? profile.domains
          : AI_MONITOR_FALLBACK.domains;
        const keywords = Array.isArray(profile?.keywords) && profile.keywords.length
          ? profile.keywords
          : AI_MONITOR_FALLBACK.keywords;
        const host = (window.location.hostname || "").toLowerCase();
        const known = domains.some((d) => host === d || host.endsWith("." + d));
        return {
          domains,
          keywords,
          is_known_domain: Boolean(profile?.is_known_domain || known),
        };
      })
      .catch(() => {
        const host = (window.location.hostname || "").toLowerCase();
        const known = AI_MONITOR_FALLBACK.domains.some((d) => host === d || host.endsWith("." + d));
        return {
          domains: AI_MONITOR_FALLBACK.domains,
          keywords: AI_MONITOR_FALLBACK.keywords,
          is_known_domain: known,
        };
      });
  }

  return aiMonitorProfilePromise;
}

function shouldMonitorCurrentPage(profile) {
  if (!profile) return false;
  if (profile.is_known_domain) return true;

  const keywordMatch = hasAiKeywordMatch(profile.keywords || []);
  return keywordMatch && !!findPromptElementInNode(document.body);
}

function hasAiKeywordMatch(keywords) {
  const source = (window.location.href + " " + document.title).toLowerCase();
  return keywords.some((keyword) => keyword && source.includes(String(keyword).toLowerCase()));
}

function findPromptElementInNode(node) {
  if (!node) return null;
  const candidates = node.querySelectorAll(
    "textarea, #prompt-textarea, [data-testid*='composer'], [contenteditable='true'], [contenteditable='plaintext-only'], div[role='textbox']"
  );
  for (const candidate of candidates) {
    if (!isPromptLikeElement(candidate)) continue;
    if (getPromptText(candidate).length > 0) return candidate;
  }
  return null;
}

function isPromptLikeElement(el) {
  if (!(el instanceof HTMLElement)) return false;

  const tag = el.tagName.toLowerCase();
  const isTextArea = tag === "textarea";
  const isContentEditable = el.isContentEditable || el.getAttribute("contenteditable") === "plaintext-only";
  const roleTextbox = (el.getAttribute("role") || "").toLowerCase() === "textbox";
  if (!isTextArea && !isContentEditable && !roleTextbox) return false;

  const id = (el.id || "").toLowerCase();
  const dataTestId = (el.getAttribute("data-testid") || "").toLowerCase();
  const placeholder = (
    el.getAttribute("placeholder") ||
    (el instanceof HTMLTextAreaElement ? el.placeholder : "")
  ).toLowerCase();
  const className = (el.className || "").toString().toLowerCase();

  if (
    id.includes("prompt-textarea") ||
    dataTestId.includes("composer") ||
    placeholder.includes("message") ||
    placeholder.includes("ask") ||
    className.includes("composer")
  ) {
    return true;
  }

  const rect = el.getBoundingClientRect();
  const sizeable = rect.width >= 180 && rect.height >= 28;
  return sizeable || isContentEditable;
}

function getPromptText(el) {
  if (!(el instanceof HTMLElement)) return "";

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return (el.value || "").trim();
  }

  return (el.innerText || el.textContent || "").trim();
}

function looksLikeSendAction(label) {
  const normalized = (label || "").trim().toLowerCase();
  if (!normalized) return false;

  return [
    "send",
    "submit",
    "ask",
    "run",
    "enter",
    "prompt",
    "generate",
  ].some((token) => normalized.includes(token));
}

function approximateTextBytes(text) {
  try {
    return new Blob([text || ""]).size;
  } catch (_) {
    return (text || "").length;
  }
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
      log("[DLP] Failed to load regex patterns:", error?.message || error);
      return [];
    });
  }
  return tier1PatternsPromise;
}

function runTier1Regex(text, filename, patterns) {
  log("[DLP Tier1] scanning:", filename, "| text length:", (text||"").length);
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

function runTier1Keyword(text, filename, keywords) {
  const source = ((filename || "") + "\n" + (text || "")).toLowerCase();
  const safeKeywords = Array.isArray(keywords) ? keywords : [];
  const hits = [];
  for (const keyword of safeKeywords) {
    const needle = String(keyword || "").trim().toLowerCase();
    if (!needle) continue;
    if (source.includes(needle)) hits.push(needle);
  }

  const uniqueHits = Array.from(new Set(hits));
  return {
    hit: uniqueHits.length >= DLP_PIPELINE_CONFIG.keywordHitThreshold,
    keywords: uniqueHits,
    hitCount: uniqueHits.length,
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

function computeKeywordRiskScore(tierKeyword) {
  const hits = Number(tierKeyword?.hitCount || 0);
  const base = 0.83;
  const gain = Math.min(0.14, hits * 0.04);
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
  try {
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
  } catch (error) {
    log("[DLP] Text extraction failed:", error?.message || error);
    return "";
  }
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
      '<span class="cb-dlp-title">Upload Blocked</span>' +
      '<span class="cb-dlp-badge">CyberBase</span>' +
      "</div>" +
      '<div class="cb-dlp-body-wrap">' +
      '<p class="cb-dlp-body">Selected item:</p>' +
      '<div class="cb-dlp-filename">' + sanitize(filename, 80) + "</div>" +
      '<p class="cb-dlp-question"><strong>Risk score:</strong> ' + similarityPct + "%</p>" +
      '<p class="cb-dlp-question">This content contains private company information and has been blocked by your organization\'s security policy.</p>' +
      "</div>" +
      "</div>",
    showCancelButton: true,
    confirmButtonText: "OK",
    cancelButtonText: "\u26A0 Report Mistake",
    confirmButtonColor: "#c53030",
    cancelButtonColor: "#2563eb",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showClass: { popup: "cb-swal-enter" },
    customClass: {
      container: "cb-swal-container",
      popup: "cb-swal-popup cb-swal-popup--dlp",
    },
  });

  if (result.dismiss === Swal.DismissReason.cancel) return "report";
  return "cancel";
}

async function sendDlpDecisionLog(actionTaken, filename, analysis, context = {}) {
  if (!isProtectionEnabled()) return;
  const safeScore = Number((analysis.similarity || 0).toFixed(4));
  await safeRuntimeMessage({
    action: "DLP_LOG",
    filename,
    website: window.location.hostname,
    action_taken: actionTaken,
    event_channel: context.eventChannel || "file_upload",
    document_topic: analysis.topic,
    semantic_score: safeScore,
    detection_tier: analysis.tier,
    detection_reason: analysis.reason,
    matched_pattern: analysis.matchedPattern,
    input_size_bytes: Number.isFinite(context.inputSizeBytes) ? context.inputSizeBytes : null,
    input_size_chars: Number.isFinite(context.inputSizeChars) ? context.inputSizeChars : null,
    threshold_type: context.thresholdType || analysis.thresholdType || "",
    threshold_value: Number.isFinite(context.thresholdValue)
      ? context.thresholdValue
      : (Number.isFinite(analysis.thresholdValue) ? analysis.thresholdValue : null),
    decision_score: safeScore,
  }, { ok: false });
}

async function sendDlpMistakeReport(filename, analysis, eventChannel) {
  if (!isProtectionEnabled()) return;
  await safeRuntimeMessage({
    action: "DLP_REPORT_MISTAKE",
    filename,
    website: window.location.hostname,
    event_channel: eventChannel,
    document_topic: analysis.topic,
    detection_tier: analysis.tier,
    detection_reason: analysis.reason,
    matched_pattern: analysis.matchedPattern,
    semantic_score: Number((analysis.similarity || 0).toFixed(4)),
  }, { ok: false });
}

// Admin quiz trigger
function listenForAdminTriggers() {
  chrome.runtime.onMessage.addListener((message) => {
    if (!isProtectionEnabled()) return;
    if (message.type !== "ADMIN_TRIGGER") return;

    const payload = message.payload;
    if (!payload || payload.type !== "QUIZ") return;

    showQuizModal(payload);
  });
}

function showQuizModal(payload) {
  if (!isProtectionEnabled()) return;
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
    customClass: {
      container: "cb-swal-container",
      popup: "cb-swal-popup cb-swal-popup--quiz",
    },
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
