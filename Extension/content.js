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

function attachDlpListeners() {
  document.addEventListener("change", handleFileChange, true);
  document.addEventListener("drop", handleFileDrop, true);
}

function handleFileChange(event) {
  const input = event.target;
  if (!input || input.type !== "file") return;
  if (!input.files || input.files.length === 0) return;
  if (dlpActive) return;
  event.preventDefault();
  event.stopPropagation();
  triggerUploadWarning(input.files[0].name, input, () => {
    dlpActive = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    dlpActive = false;
  });
}

function handleFileDrop(event) {
  const files = event.dataTransfer && event.dataTransfer.files;
  if (!files || files.length === 0) return;
  if (dlpActive) return;
  event.preventDefault();
  event.stopPropagation();
  triggerUploadWarning(files[0].name, null, null);
}

function triggerUploadWarning(filename, originalInput, onProceed) {
  dlpActive = true;
  Swal.fire({
    html:
      '<div class="cb-dlp-modal">' +
      '<div class="cb-dlp-header">' +
        '<span class="cb-dlp-icon">&#9888;</span>' +
        '<span class="cb-dlp-title">Avertissement téléversement</span>' +
        '<span class="cb-dlp-badge">CyberBase</span>' +
      "</div>" +
      '<div class="cb-dlp-body-wrap">' +
        '<p class="cb-dlp-body">Fichier sélectionné&nbsp;:</p>' +
        '<div class="cb-dlp-filename">' + sanitize(filename, 80) + "</div>" +
        '<p class="cb-dlp-question">Assurez-vous que ce fichier ne contient pas de données confidentielles avant de l\'envoyer vers un site externe.</p>' +
      "</div>" +
      "</div>",
    showCancelButton: true,
    confirmButtonText: "Annuler l'envoi",
    cancelButtonText: "Envoyer quand même",
    cancelButtonColor: "#c53030",
    confirmButtonColor: "#276749",
    allowOutsideClick: false,
    showClass: { popup: "cb-swal-enter" },
    customClass: { container: "cb-swal-container", popup: "cb-swal-popup" },
  }).then((result) => {
    dlpActive = false;
    const action_taken = result.isConfirmed ? "BLOCKED" : "BYPASSED";
    chrome.runtime.sendMessage({
      action: "DLP_LOG",
      filename,
      website: window.location.hostname,
      action_taken,
    });
    if (result.isConfirmed) {
      if (originalInput) originalInput.value = "";
    } else {
      if (onProceed) onProceed();
    }
  });
}

// ─── Déclencheurs administrateur ─────────────────────────────────────────────

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
