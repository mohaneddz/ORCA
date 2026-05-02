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
let classifierPromise = null;

const DLP_CONFIG = {
  warningThreshold: 0.62,
  sampleChars: 4000,
  maxReadBytes: 120000,
  modelId: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
};

const FILE_TEXT_TYPES = [
  "text/plain",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "text/markdown",
  "application/javascript",
  "text/javascript",
];

const SENSITIVE_HINTS = [
  /confidential/i, /internal use only/i, /salary/i, /payroll/i, /customer list/i, /nda/i,
  /trade secret/i, /credential/i, /password/i, /token/i, /iban/i, /swift/i, /invoice/i,
  /contract/i, /roadmap/i, /proprietary/i, /financial report/i, /employee id/i,
  /social security/i, /passport/i, /tax/i, /project x/i,
];

function attachDlpListeners() {
  document.addEventListener("change", handleFileChange, true);
  document.addEventListener("drop", handleFileDrop, true);
}

async function handleFileChange(event) {
  const input = event.target;
  if (!input || input.type !== "file") return;
  if (!input.files || input.files.length === 0) return;
  if (dlpActive) return;

  const file = input.files[0];
  const analysis = await analyzeUploadRisk(file);

  if (!analysis.shouldWarn) {
    await sendDlpDecisionLog("allow", file.name, analysis);
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  triggerUploadWarning({
    filename: file.name,
    analysis,
    originalInput: input,
    onProceed: () => {
      dlpActive = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      dlpActive = false;
    },
  });
}

async function handleFileDrop(event) {
  const files = event.dataTransfer && event.dataTransfer.files;
  if (!files || files.length === 0) return;
  if (dlpActive) return;

  const file = files[0];
  const analysis = await analyzeUploadRisk(file);

  if (!analysis.shouldWarn) {
    await sendDlpDecisionLog("allow", file.name, analysis);
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  triggerUploadWarning({
    filename: file.name,
    analysis,
    originalInput: null,
    onProceed: null,
  });
}

async function analyzeUploadRisk(file) {
  const text = await extractTextSample(file);
  const topic = summarizeDocument(text, file.name);

  if (!text) {
    const nameRisk = scoreFromFilename(file.name);
    return {
      shouldWarn: nameRisk >= DLP_CONFIG.warningThreshold,
      riskScore: nameRisk,
      topic,
      reason: "filename_fallback",
    };
  }

  let modelRisk = null;
  try {
    const classifier = await loadLocalClassifier();
    if (classifier) {
      const result = await classifier(text, { topk: 1 });
      const top = Array.isArray(result) ? result[0] : result;
      if (top && typeof top.score === "number") modelRisk = top.score;
    }
  } catch (error) {
    log("Local transformer unavailable, using heuristic fallback:", error.message || error);
  }

  const heuristicRisk = scoreFromText(text, file.name);
  const riskScore = modelRisk == null
    ? heuristicRisk
    : Math.max(heuristicRisk, normalizeClassifierScore(modelRisk));

  return {
    shouldWarn: riskScore >= DLP_CONFIG.warningThreshold,
    riskScore,
    topic,
    reason: modelRisk == null ? "heuristic" : "model_plus_heuristic",
  };
}

function normalizeClassifierScore(rawScore) {
  if (typeof rawScore !== "number") return 0;
  if (rawScore < 0) return 0;
  if (rawScore > 1) return 1;
  return rawScore;
}

async function loadLocalClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const transformersUrl = chrome.runtime.getURL("lib/transformers.min.js");
      const { pipeline, env } = await import(transformersUrl);
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline("text-classification", DLP_CONFIG.modelId);
    })().catch((error) => {
      classifierPromise = null;
      throw error;
    });
  }
  return classifierPromise;
}

async function extractTextSample(file) {
  if (!file) return "";

  const lowerName = (file.name || "").toLowerCase();
  const isTextLike =
    FILE_TEXT_TYPES.includes(file.type) ||
    lowerName.endsWith(".txt") || lowerName.endsWith(".csv") || lowerName.endsWith(".md") ||
    lowerName.endsWith(".json") || lowerName.endsWith(".xml") || lowerName.endsWith(".log");

  if (!isTextLike) return "";

  const blob = file.slice(0, DLP_CONFIG.maxReadBytes);
  const text = await blob.text();
  return text.slice(0, DLP_CONFIG.sampleChars);
}

function scoreFromText(text, filename) {
  const lowered = (text || "").toLowerCase();
  let hits = 0;
  for (const re of SENSITIVE_HINTS) {
    if (re.test(lowered)) hits += 1;
  }
  const extra = scoreFromFilename(filename);
  return Math.min(1, hits * 0.12 + extra * 0.45);
}

function scoreFromFilename(filename) {
  const n = (filename || "").toLowerCase();
  const sensitiveNameHints = [
    "confidential", "private", "internal", "salary", "payroll", "invoice",
    "contract", "employee", "customers", "roadmap", "finance", "secret",
  ];
  const matches = sensitiveNameHints.filter((k) => n.includes(k)).length;
  return Math.min(1, matches * 0.24);
}

function summarizeDocument(text, filename) {
  const base = (text || "").replace(/s+/g, " ").trim();
  if (!base) return "File: " + sanitize(filename, 80);
  return sanitize(base.slice(0, 180), 180);
}

async function sendDlpDecisionLog(action_taken, filename, analysis) {
  chrome.runtime.sendMessage({
    action: "DLP_LOG",
    filename,
    website: window.location.hostname,
    action_taken,
    document_topic: analysis.topic,
    risk_score: Number((analysis.riskScore || 0).toFixed(3)),
    detection_reason: analysis.reason,
  });
}

function triggerUploadWarning({ filename, analysis, originalInput, onProceed }) {
  dlpActive = true;
  const scorePct = Math.round((analysis.riskScore || 0) * 100);

  Swal.fire({
    html:
      '<div class="cb-dlp-modal">' +
      '<div class="cb-dlp-header">' +
        '<span class="cb-dlp-icon">&#9888;</span>' +
        '<span class="cb-dlp-title">Upload Risk Detected</span>' +
        '<span class="cb-dlp-badge">CyberBase AI</span>' +
      "</div>" +
      '<div class="cb-dlp-body-wrap">' +
        '<p class="cb-dlp-body">Selected file:</p>' +
        '<div class="cb-dlp-filename">' + sanitize(filename, 80) + "</div>" +
        '<p class="cb-dlp-question">This document appears company-related (' + scorePct + '% risk). Upload to external site only if you are sure.</p>' +
        '<p class="cb-dlp-question">Document summary: ' + sanitize(analysis.topic, 180) + "</p>" +
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
  }).then((result) => {
    dlpActive = false;
    const action_taken = result.isConfirmed ? "cancel" : "force";
    chrome.runtime.sendMessage({
      action: "DLP_LOG",
      filename,
      website: window.location.hostname,
      action_taken,
      document_topic: analysis.topic,
      risk_score: Number((analysis.riskScore || 0).toFixed(3)),
      detection_reason: analysis.reason,
    });

    if (result.isConfirmed) {
      if (originalInput) originalInput.value = "";
    } else if (onProceed) {
      onProceed();
    }
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
