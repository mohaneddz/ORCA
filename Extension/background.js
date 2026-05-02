const BACKEND_URL = "http://127.0.0.1:8000";
const DEBUG_MODE = true;
const POLL_INTERVAL_MINUTES = 0.2; // 12 seconds
const OFFLINE_QUEUE_MAX = 20;
const BLACKLIST_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_TARGETS_CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_BLACKLIST = [
  "malware-test.local",
  "credential-harvest-test.local",
  "eicar.org",
];
const DEFAULT_AI_TARGET_DOMAINS = [
  "chat.openai.com",
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
];
const DEFAULT_AI_TARGET_KEYWORDS = [
  "chatgpt",
  "claude",
  "gemini",
  "copilot",
  "assistant",
  "ai chat",
  "prompt",
];
const SENSITIVE_TOPICS_URL = chrome.runtime.getURL("config/sensitive-topics.json");

const SEMANTIC_DLP_CONFIG = {
  modelId: "Xenova/all-MiniLM-L6-v2",
  threshold: 0.85,
  maxInputChars: 12000,
};

let semanticExtractorPromise = null;
let sensitiveTopicEmbeddingsPromise = null;
let sensitiveTopicsPromise = null;

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
      const sensitiveTopics = await getSensitiveTopics();
      const embeddings = [];
      for (const topic of sensitiveTopics) {
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

async function getSensitiveTopics() {
  if (!sensitiveTopicsPromise) {
    sensitiveTopicsPromise = (async () => {
      const response = await fetch(SENSITIVE_TOPICS_URL);
      if (!response.ok) throw new Error("Could not load sensitive topics config.");
      const payload = await response.json();
      const topics = Array.isArray(payload?.topics) ? payload.topics : [];
      if (!topics.length) throw new Error("Sensitive topics config is empty.");

      return topics
        .map((topic) => ({
          id: String(topic.id || "topic"),
          text: String(topic.text || "").trim(),
        }))
        .filter((topic) => topic.text.length > 0);
    })().catch((error) => {
      sensitiveTopicsPromise = null;
      throw error;
    });
  }

  return sensitiveTopicsPromise;
}

async function getBlacklistDomains(forceRefresh = false) {
  const now = Date.now();
  const cached = await chrome.storage.local.get(["blacklistDomains", "blacklistFetchedAt"]);
  const cachedDomains = Array.isArray(cached.blacklistDomains) ? cached.blacklistDomains : [];
  const fetchedAt = Number(cached.blacklistFetchedAt || 0);

  const cacheValid = !forceRefresh && cachedDomains.length > 0 && now - fetchedAt < BLACKLIST_CACHE_TTL_MS;
  if (cacheValid) return cachedDomains;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_URL}/api/extension/blacklist/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Blacklist endpoint returned ${res.status}`);

    const data = await res.json();
    const domains = Array.isArray(data?.domains)
      ? data.domains.map((d) => String(d || "").toLowerCase().trim()).filter(Boolean)
      : [];

    if (domains.length) {
      await chrome.storage.local.set({ blacklistDomains: domains, blacklistFetchedAt: now });
      return domains;
    }
  } catch (error) {
    clearTimeout(timeout);
    log("Blacklist fetch failed:", error.message || error);
  }

  return cachedDomains.length ? cachedDomains : DEFAULT_BLACKLIST;
}

async function getAiTargets(forceRefresh = false) {
  const now = Date.now();
  const cached = await chrome.storage.local.get(["aiTargetDomains", "aiTargetKeywords", "aiTargetsFetchedAt"]);
  const cachedDomains = Array.isArray(cached.aiTargetDomains) ? cached.aiTargetDomains : [];
  const cachedKeywords = Array.isArray(cached.aiTargetKeywords) ? cached.aiTargetKeywords : [];
  const fetchedAt = Number(cached.aiTargetsFetchedAt || 0);

  const cacheValid =
    !forceRefresh &&
    (cachedDomains.length > 0 || cachedKeywords.length > 0) &&
    now - fetchedAt < AI_TARGETS_CACHE_TTL_MS;

  if (cacheValid) {
    return { domains: cachedDomains, keywords: cachedKeywords };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_URL}/api/extension/ai-targets/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`AI targets endpoint returned ${res.status}`);

    const data = await res.json();
    const domains = Array.isArray(data?.domains)
      ? data.domains.map((d) => String(d || "").toLowerCase().trim()).filter(Boolean)
      : [];
    const keywords = Array.isArray(data?.keywords)
      ? data.keywords.map((k) => String(k || "").toLowerCase().trim()).filter(Boolean)
      : [];

    await chrome.storage.local.set({
      aiTargetDomains: domains,
      aiTargetKeywords: keywords,
      aiTargetsFetchedAt: now,
    });

    return { domains, keywords };
  } catch (error) {
    clearTimeout(timeout);
    log("AI targets fetch failed:", error.message || error);
  }

  return {
    domains: cachedDomains.length ? cachedDomains : DEFAULT_AI_TARGET_DOMAINS,
    keywords: cachedKeywords.length ? cachedKeywords : DEFAULT_AI_TARGET_KEYWORDS,
  };
}

function isHostnameBlacklisted(hostname, domains) {
  const host = String(hostname || "").toLowerCase().trim();
  return domains.some((entry) => host === entry || host.endsWith("." + entry));
}

function isHostnameInDomains(hostname, domains) {
  const host = String(hostname || "").toLowerCase().trim();
  return domains.some((entry) => host === entry || host.endsWith("." + entry));
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
    log("Semantic model warm-up complete.");
  } catch (error) {
    log("Semantic model warm-up failed:", error.message || error);
  }
}

async function warmAiTargets() {
  try {
    await getAiTargets();
  } catch (error) {
    log("AI target warm-up failed:", error.message || error);
  }
}

chrome.alarms.get("poll", (alarm) => {
  if (!alarm) {
    chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
    log("Polling alarm created.");
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
  warmSemanticModel();
  warmAiTargets();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
  warmSemanticModel();
  warmAiTargets();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "poll") return;
  const { emp_id } = await chrome.storage.local.get("emp_id");
  if (!emp_id) {
    log("emp_id missing, skipping poll.");
    return;
  }
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
    log("Poll response:", data);

    if (!data.hasEvent) return;
    if (!data.eventPayload || data.eventPayload.type !== "QUIZ") return;

    const { lastEventId } = await chrome.storage.local.get("lastEventId");
    if (data.eventPayload.event_id === lastEventId) return;

    await chrome.storage.local.set({ lastEventId: data.eventPayload.event_id });
    const delivered = await sendToAnyTab({ type: "ADMIN_TRIGGER", payload: data.eventPayload });
    if (!delivered) log("Could not deliver quiz event to any injectable tab.");
  } catch (e) {
    clearTimeout(timeout);
    log("Polling failed:", e.message);
  }
}

function isInjectable(url) {
  if (!url) return false;
  return (
    !url.startsWith("chrome://") &&
    !url.startsWith("chrome-extension://") &&
    !url.startsWith("about:") &&
    !url.startsWith("edge://")
  );
}

async function sendToAnyTab(message) {
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of activeTabs) {
    if (isInjectable(tab.url)) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
        return true;
      } catch (_) {}
    }
  }

  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (isInjectable(tab.url)) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
        return true;
      } catch (_) {}
    }
  }

  return false;
}

async function drainOfflineQueue(emp_id) {
  const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
  if (!offlineQueue.length) return;

  log(`Draining ${offlineQueue.length} queued log(s).`);
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
    log("POST failed:", url, e.message);
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((e) => {
      log("Message handler error:", e.message);
      sendResponse({ ok: false });
    });
  return true;
});

async function handleMessage(message) {
  const { emp_id } = await chrome.storage.local.get("emp_id");
  const eid = emp_id || "unknown";

  switch (message.action) {
    case "CHECK_BLACKLIST": {
      const domains = await getBlacklistDomains();
      const blocked = isHostnameBlacklisted(message.hostname, domains);
      if (blocked) {
        const ok = await postLog("/api/logs/blacklist/", {
          employee_id: eid,
          attempted_url: message.attempted_url,
        });
        if (!ok) await queueLog("/api/logs/blacklist/", { attempted_url: message.attempted_url });
      }
      return { blocked };
    }

    case "GET_AI_MONITOR_PROFILE": {
      const targets = await getAiTargets();
      const isKnownDomain = isHostnameInDomains(message.hostname, targets.domains);
      return {
        domains: targets.domains,
        keywords: targets.keywords,
        is_known_domain: isKnownDomain,
      };
    }

    case "DLP_SEMANTIC_CHECK": {
      try {
        return await runSemanticDlp(message.text || "");
      } catch (error) {
        log("Semantic DLP failed:", error.message || error);
        return {
          blocked: true,
          top_score: 1,
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
        event_channel: message.event_channel,
        document_topic: message.document_topic,
        semantic_score: message.semantic_score,
        detection_tier: message.detection_tier,
        detection_reason: message.detection_reason,
        matched_pattern: message.matched_pattern,
        input_size_bytes: message.input_size_bytes,
        input_size_chars: message.input_size_chars,
        threshold_type: message.threshold_type,
        threshold_value: message.threshold_value,
        decision_score: message.decision_score,
      };
      const ok = await postLog("/api/logs/dlp/", dlpPayload);
      if (!ok) await queueLog("/api/logs/dlp/", dlpPayload);
      return { ok: true };
    }

    case "SUBMIT_QUIZ": {
      const payload = {
        employee_id: eid,
        quiz_id: message.quiz_id,
        answer_selected: message.answer,
      };
      const ok = await postLog("/api/gamification/submit-quiz/", payload);
      if (!ok) await queueLog("/api/gamification/submit-quiz/", payload);
      return { ok: true };
    }

    default:
      return { ok: false, error: "Unknown action" };
  }
}
