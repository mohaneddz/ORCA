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

const SEMANTIC_DLP_CONFIG = {
  modelId: "Xenova/all-MiniLM-L6-v2",
  threshold: 0.85,
  maxInputChars: 12000,
};

const SENSITIVE_TOPICS = [
  { id: "credentials", text: "passwords api keys private keys secrets authentication tokens login credentials" },
  { id: "employee_data", text: "employee records personal identifiers social security passport date of birth hr files" },
  { id: "finance", text: "bank account iban swift payroll salary invoices financial statements revenue forecast" },
  { id: "legal", text: "nda contracts acquisition merger legal terms confidential agreement compliance investigation" },
  { id: "customer_data", text: "customer database pii phone email address support tickets private client information" },
  { id: "ip_strategy", text: "source code architecture roadmap unreleased product strategy internal planning proprietary design" },
];

let semanticExtractorPromise = null;
let sensitiveTopicEmbeddingsPromise = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase BG]", ...args);
}

function ensureTransformersRuntime() {
  if (!globalThis.transformers) {
    importScripts(chrome.runtime.getURL("lib/transformers.min.js"));
  }
  if (!globalThis.transformers) {
    throw new Error("Transformers.js runtime failed to load");
  }

  const runtime = globalThis.transformers;
  runtime.env.allowLocalModels = false;
  runtime.env.useBrowserCache = true;
  runtime.env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL("lib/");
  return runtime;
}

async function getSemanticExtractor() {
  if (!semanticExtractorPromise) {
    semanticExtractorPromise = (async () => {
      const runtime = ensureTransformersRuntime();
      return runtime.pipeline("feature-extraction", SEMANTIC_DLP_CONFIG.modelId);
    })().catch((error) => {
      semanticExtractorPromise = null;
      throw error;
    });
  }
  return semanticExtractorPromise;
}

async function getEmbeddingVector(text) {
  const extractor = await getSemanticExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return tensorToVector(output);
}

function tensorToVector(output) {
  if (!output) return [];

  if (output.data && typeof output.data.length === "number") {
    return Array.from(output.data);
  }

  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (first && first.data && typeof first.data.length === "number") {
      return Array.from(first.data);
    }
    const flat = output.flat(Infinity).map(Number).filter((v) => Number.isFinite(v));
    return flat;
  }

  return [];
}

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) return 0;
  if (!vecA.length || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function getSensitiveTopicEmbeddings() {
  if (!sensitiveTopicEmbeddingsPromise) {
    sensitiveTopicEmbeddingsPromise = (async () => {
      const embeddings = [];
      for (const topic of SENSITIVE_TOPICS) {
        const vector = await getEmbeddingVector(topic.text);
        embeddings.push({ ...topic, vector });
      }
      return embeddings;
    })().catch((error) => {
      sensitiveTopicEmbeddingsPromise = null;
      throw error;
    });
  }
  return sensitiveTopicEmbeddingsPromise;
}

async function runSemanticDlp(text) {
  const source = (text || "").trim().slice(0, SEMANTIC_DLP_CONFIG.maxInputChars);
  if (!source) {
    return {
      blocked: false,
      top_score: 0,
      top_topic: "no_text",
      threshold: SEMANTIC_DLP_CONFIG.threshold,
    };
  }

  const [docVector, topicEmbeddings] = await Promise.all([
    getEmbeddingVector(source),
    getSensitiveTopicEmbeddings(),
  ]);

  if (!docVector.length) {
    return {
      blocked: false,
      top_score: 0,
      top_topic: "no_vector",
      threshold: SEMANTIC_DLP_CONFIG.threshold,
    };
  }

  let topScore = -1;
  let topTopic = "none";
  for (const topic of topicEmbeddings) {
    const score = cosineSimilarity(docVector, topic.vector);
    if (score > topScore) {
      topScore = score;
      topTopic = topic.id;
    }
  }

  const boundedScore = Math.max(0, Math.min(1, topScore));
  return {
    blocked: boundedScore >= SEMANTIC_DLP_CONFIG.threshold,
    top_score: Number(boundedScore.toFixed(4)),
    top_topic: topTopic,
    threshold: SEMANTIC_DLP_CONFIG.threshold,
  };
}

async function warmSemanticModel() {
  try {
    await getSensitiveTopicEmbeddings();
    log("Semantic DLP model and topic vectors are warmed.");
  } catch (error) {
    log("Semantic warm-up failed:", error.message || error);
  }
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
  warmSemanticModel();
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

    case "DLP_SEMANTIC_CHECK": {
      try {
        return await runSemanticDlp(message.text || "");
      } catch (error) {
        log("Semantic DLP failed:", error.message || error);
        return {
          blocked: false,
          top_score: 0,
          top_topic: "semantic_error",
          threshold: SEMANTIC_DLP_CONFIG.threshold,
        };
      }
    }

    case "DLP_LOG": {
      const dlpPayload = {
        employee_id: eid,
        filename: message.filename,
        website: message.website,
        action_taken: message.action_taken,
        document_topic: message.document_topic,
        semantic_score: message.semantic_score,
        detection_tier: message.detection_tier,
        detection_reason: message.detection_reason,
        matched_pattern: message.matched_pattern,
      };
      const ok = await postLog("/api/logs/dlp/", dlpPayload);
      if (!ok) await queueLog("/api/logs/dlp/", dlpPayload);
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
