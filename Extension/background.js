// ─── Configuration ────────────────────────────────────────────────────────────

const BACKEND_URL = "http://127.0.0.1:8000";
const DEBUG_MODE = true;
const POLL_INTERVAL_MINUTES = 0.2; // 12 seconds — adjust as needed
const OFFLINE_QUEUE_MAX = 20;

const BLACKLIST = [
  "malware-test.local",
  "phishing-test.local",
  "eicar.org",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase BG]", ...args);
}

// ─── Alarm bootstrap ─────────────────────────────────────────────────────────

chrome.alarms.get("poll", (alarm) => {
  if (!alarm) {
    chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
    log("Alarme créée.");
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
});

// ─── Polling ─────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "poll") return;
  const { emp_id } = await chrome.storage.local.get("emp_id");
  if (!emp_id) { log("emp_id absent, sondage ignoré."); return; }
  await drainOfflineQueue(emp_id);
  await pollAdminTriggers(emp_id);
});

async function pollAdminTriggers(emp_id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/extension/poll/?emp_id=${encodeURIComponent(emp_id)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await res.json();
    await chrome.storage.local.set({ lastPollTime: Date.now() });
    log("Sondage:", data);
    if (!data.hasEvent) return;
    const { lastEventId } = await chrome.storage.local.get("lastEventId");
    if (data.eventPayload.event_id === lastEventId) return;
    await chrome.storage.local.set({ lastEventId: data.eventPayload.event_id });
    const delivered = await sendToAnyTab({ type: "ADMIN_TRIGGER", payload: data.eventPayload });
    if (!delivered) log("Événement non distribué — aucun onglet injectable.");
  } catch (e) {
    clearTimeout(timeout);
    log("Échec du sondage:", e.message);
  }
}

// ─── Tab messaging ───────────────────────────────────────────────────────────

function isInjectable(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") &&
    !url.startsWith("chrome-extension://") &&
    !url.startsWith("about:") &&
    !url.startsWith("edge://");
}

async function sendToAnyTab(message) {
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of activeTabs) {
    if (isInjectable(tab.url)) {
      try { await chrome.tabs.sendMessage(tab.id, message); return true; } catch (_) {}
    }
  }
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (isInjectable(tab.url)) {
      try { await chrome.tabs.sendMessage(tab.id, message); return true; } catch (_) {}
    }
  }
  return false;
}

// ─── Offline queue ───────────────────────────────────────────────────────────

async function drainOfflineQueue(emp_id) {
  const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
  if (!offlineQueue.length) return;
  log(`Vidage de ${offlineQueue.length} log(s) en attente.`);
  const remaining = [];
  for (const item of offlineQueue) {
    const ok = await postLog(item.url, { ...item.body, employee_id: emp_id });
    if (!ok) remaining.push(item);
  }
  await chrome.storage.local.set({ offlineQueue: remaining });
}

async function queueLog(url, body) {
  const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
  if (offlineQueue.length >= OFFLINE_QUEUE_MAX) offlineQueue.shift();
  offlineQueue.push({ url, body });
  await chrome.storage.local.set({ offlineQueue });
}

async function postLog(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (e) {
    clearTimeout(timeout);
    log("Échec POST:", url, e.message);
    return false;
  }
}

// ─── Message handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((e) => {
    log("Erreur gestionnaire:", e.message);
    sendResponse({ ok: false });
  });
  return true;
});

async function handleMessage(message) {
  const { emp_id } = await chrome.storage.local.get("emp_id");
  const eid = emp_id || "unknown";

  switch (message.action) {
    case "CHECK_BLACKLIST": {
      const blocked = BLACKLIST.some(
        (e) => message.hostname === e || message.hostname.endsWith("." + e)
      );
      if (blocked) {
        const ok = await postLog("/api/logs/blacklist/", {
          employee_id: eid, attempted_url: message.attempted_url,
        });
        if (!ok) await queueLog("/api/logs/blacklist/", { attempted_url: message.attempted_url });
      }
      return { blocked };
    }

    case "DLP_LOG": {
      const ok = await postLog("/api/logs/dlp/", {
        employee_id: eid,
        filename: message.filename,
        website: message.website,
        action_taken: message.action_taken,
      });
      if (!ok) await queueLog("/api/logs/dlp/", {
        filename: message.filename, website: message.website, action_taken: message.action_taken,
      });
      return { ok: true };
    }

    case "SUBMIT_QUIZ": {
      const ok = await postLog("/api/gamification/submit-quiz/", {
        employee_id: eid, quiz_id: message.quiz_id, answer_selected: message.answer,
      });
      if (!ok) await queueLog("/api/gamification/submit-quiz/", {
        quiz_id: message.quiz_id, answer_selected: message.answer,
      });
      return { ok: true };
    }

    case "PHISHING_RESULT": {
      const ok = await postLog("/api/logs/phishing/", {
        employee_id: eid, clicked: message.clicked, website: message.website,
      });
      if (!ok) await queueLog("/api/logs/phishing/", {
        clicked: message.clicked, website: message.website,
      });
      return { ok: true };
    }

    default:
      return { ok: false, error: "Action inconnue" };
  }
}
