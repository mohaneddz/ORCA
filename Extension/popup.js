const emailInput = document.getElementById("emailInput");
const nextBtn = document.getElementById("nextBtn");
const emailHint = document.getElementById("emailHint");

const passwordInput = document.getElementById("passwordInput");
const backBtn = document.getElementById("backBtn");
const loginBtn = document.getElementById("loginBtn");
const passwordHint = document.getElementById("passwordHint");
const emailPreview = document.getElementById("emailPreview");

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const alertBand = document.getElementById("alertBand");
const lastPollEl = document.getElementById("lastPoll");
const extVersionEl = document.getElementById("extVersion");

const stepEmail = document.getElementById("stepEmail");
const stepPassword = document.getElementById("stepPassword");
const sessionPanel = document.getElementById("sessionPanel");
const sessionName = document.getElementById("sessionName");
const sessionEmail = document.getElementById("sessionEmail");
const sessionOrg = document.getElementById("sessionOrg");
const logoutBtn = document.getElementById("logoutBtn");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let currentEmail = "";

function formatTime(ts) {
  if (!ts) return "Never";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setHint(el, message, type = "") {
  el.textContent = message || "";
  el.className = "hint" + (type ? " " + type : "");
}

function setStatusAuthenticated(employee) {
  statusDot.className = "dot on";
  statusText.textContent = "Active - authenticated";
  alertBand.classList.remove("visible");

  stepEmail.classList.add("hidden");
  stepPassword.classList.add("hidden");
  sessionPanel.classList.remove("hidden");

  sessionName.textContent = employee?.name || "Employee";
  sessionEmail.textContent = employee?.email || "-";
  sessionOrg.textContent = employee?.organization?.name || "-";
}

function setStatusLocked() {
  statusDot.className = "dot off";
  statusText.textContent = "Locked - sign in required";
  alertBand.classList.add("visible");

  sessionPanel.classList.add("hidden");
  stepPassword.classList.add("hidden");
  stepEmail.classList.remove("hidden");
}

function showEmailStep() {
  stepEmail.classList.remove("hidden");
  stepPassword.classList.add("hidden");
  setHint(emailHint, "");
  setHint(passwordHint, "");
  passwordInput.value = "";
  emailInput.focus();
}

function showPasswordStep() {
  stepEmail.classList.add("hidden");
  stepPassword.classList.remove("hidden");
  emailPreview.textContent = currentEmail;
  setHint(passwordHint, "");
  passwordInput.value = "";
  passwordInput.focus();
}

async function callBackground(payload) {
  try {
    return await chrome.runtime.sendMessage(payload);
  } catch (error) {
    return { ok: false, error: error?.message || "Background connection failed." };
  }
}

async function refreshAuthState() {
  const [authState, pollState] = await Promise.all([
    callBackground({ action: "AUTH_GET_STATE" }),
    chrome.storage.local.get(["lastPollTime"]),
  ]);

  lastPollEl.textContent = formatTime(pollState.lastPollTime);
  extVersionEl.textContent = chrome.runtime.getManifest().version;

  if (authState?.isAuthenticated && authState?.employee) {
    currentEmail = authState.employee.email || "";
    setStatusAuthenticated(authState.employee);
    return;
  }

  setStatusLocked();
  showEmailStep();
}

nextBtn.addEventListener("click", () => {
  const email = String(emailInput.value || "").trim().toLowerCase();
  setHint(emailHint, "");

  if (!EMAIL_REGEX.test(email)) {
    setHint(emailHint, "Enter a valid email address.", "error");
    return;
  }

  currentEmail = email;
  showPasswordStep();
});

backBtn.addEventListener("click", () => {
  showEmailStep();
});

loginBtn.addEventListener("click", async () => {
  const password = String(passwordInput.value || "");
  setHint(passwordHint, "");

  if (!password) {
    setHint(passwordHint, "Password is required.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";
  const response = await callBackground({
    action: "AUTH_LOGIN",
    email: currentEmail,
    password,
  });
  loginBtn.disabled = false;
  loginBtn.textContent = "Login";

  if (!response?.ok || !response?.isAuthenticated || !response?.employee) {
    setHint(passwordHint, response?.error || "Authentication failed.", "error");
    return;
  }

  setHint(passwordHint, "Authenticated.", "success");
  setStatusAuthenticated(response.employee);
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  logoutBtn.textContent = "Signing out...";
  await callBackground({ action: "AUTH_LOGOUT" });
  logoutBtn.disabled = false;
  logoutBtn.textContent = "Logout";
  currentEmail = "";
  emailInput.value = "";
  passwordInput.value = "";
  setStatusLocked();
  showEmailStep();
});

emailInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") nextBtn.click();
});

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginBtn.click();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.lastPollTime) {
    lastPollEl.textContent = formatTime(changes.lastPollTime.newValue);
  }
});

refreshAuthState();
