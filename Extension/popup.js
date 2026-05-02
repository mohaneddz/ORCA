const empIdInput  = document.getElementById("empIdInput");
const saveBtn     = document.getElementById("saveBtn");
const statusDot   = document.getElementById("statusDot");
const statusText  = document.getElementById("statusText");
const alertBand   = document.getElementById("alertBand");
const fieldHint   = document.getElementById("fieldHint");
const lastPollEl  = document.getElementById("lastPoll");
const extVersionEl = document.getElementById("extVersion");

const EMP_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function formatTime(ts) {
  if (!ts) return "Jamais";
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function setStatus(configured) {
  if (configured) {
    statusDot.className = "dot on";
    statusText.textContent = "Actif — en surveillance";
    alertBand.classList.remove("visible");
  } else {
    statusDot.className = "dot off";
    statusText.textContent = "Non configuré";
    alertBand.classList.add("visible");
  }
}

function setHint(msg, type) {
  fieldHint.textContent = msg;
  fieldHint.className = "hint" + (type ? " " + type : "");
}

function loadState() {
  chrome.storage.local.get(["emp_id", "lastPollTime"], ({ emp_id, lastPollTime }) => {
    empIdInput.value = emp_id || "";
    setStatus(!!(emp_id && emp_id.trim()));
    lastPollEl.textContent = formatTime(lastPollTime);
  });
  extVersionEl.textContent = chrome.runtime.getManifest().version;
}

saveBtn.addEventListener("click", () => {
  const val = empIdInput.value.trim();
  setHint("", "");

  if (!val || !EMP_ID_REGEX.test(val)) {
    setHint("Identifiant invalide — lettres, chiffres, - et _ uniquement.", "error");
    return;
  }

  chrome.storage.local.set({ emp_id: val }, () => {
    setHint("Enregistré avec succès.", "success");
    setStatus(true);
    setTimeout(() => setHint("", ""), 2500);
  });
});

empIdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});

loadState();
