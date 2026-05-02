const BACKEND_URL = "http://127.0.0.1:8000";
const DEBUG_MODE = true;
const POLL_INTERVAL_MINUTES = 0.2; // 12 seconds
const OFFLINE_QUEUE_MAX = 20;
const BLACKLIST_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_TARGETS_CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const EMPLOYEE_AUTH_PREFIX = "EmployeeToken ";
const AUTH_STORAGE_KEYS = ["employeeAuthToken", "employeeProfile"];

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
let authSyncPromise = null;
let logoutInFlight = false;

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase BG]", ...args);
}

function normalizeEmployee(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.id || !raw.email) return null;
  return {
    id: String(raw.id),
    name: String(raw.name || ""),
    email: String(raw.email || ""),
    department: String(raw.department || ""),
    role: String(raw.role || ""),
    seniority: String(raw.seniority || ""),
    organization: raw.organization && typeof raw.organization === "object"
      ? {
          id: String(raw.organization.id || ""),
          name: String(raw.organization.name || ""),
        }
      : { id: "", name: "" },
  };
}

async function getAuthState() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEYS);
  const token = (stored.employeeAuthToken || "").trim();
  const employee = normalizeEmployee(stored.employeeProfile);
  return {
    token,
    employee,
    isAuthenticated: Boolean(token && employee),
  };
}

function toAuthResponse(state, extra = {}) {
  return {
    ok: true,
    isAuthenticated: state.isAuthenticated,
    employee: state.employee,
    ...extra,
  };
}

async function persistAuthSession(token, employee) {
  await chrome.storage.local.set({
    employeeAuthToken: token,
    employeeProfile: employee,
  });
}

async function clearAuthSession(reason = "logout") {
  await chrome.storage.local.remove(AUTH_STORAGE_KEYS);
  await chrome.storage.local.set({
    offlineQueue: [],
    lastEventId: null,
  });
  log(`Auth session cleared: ${reason}`);
}

async function handleUnauthorized(reason = "unauthorized") {
  if (logoutInFlight) return;
  logoutInFlight = true;
  try {
    await clearAuthSession(reason);
  } finally {
    logoutInFlight = false;
  }
}

async function authorizedFetch(path, options = {}) {
  const state = await getAuthState();
  if (!state.token) {
    return { response: null, authMissing: true, error: "not_authenticated" };
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `${EMPLOYEE_AUTH_PREFIX}${state.token}`,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401) {
      await handleUnauthorized("token_rejected");
      return { response, authMissing: true, error: "unauthorized" };
    }

    return { response, authMissing: false, error: null };
  } catch (error) {
    return { response: null, authMissing: false, error };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEmployeeProfile(token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/employee/me`, {
      method: "GET",
      headers: {
        Authorization: `${EMPLOYEE_AUTH_PREFIX}${token}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const profile = await response.json();
    return normalizeEmployee(profile);
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function syncAuthSession() {
  if (!authSyncPromise) {
    authSyncPromise = (async () => {
      const state = await getAuthState();
      if (!state.token) return null;
      const employee = await fetchEmployeeProfile(state.token);
      if (!employee) {
        await handleUnauthorized("session_validation_failed");
        return null;
      }
      await persistAuthSession(state.token, employee);
      return employee;
    })().finally(() => {
      authSyncPromise = null;
    });
  }
  return authSyncPromise;
}

async function loginEmployee(email, password) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/employee/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (_) {}

    if (!response.ok) {
      return {
        ok: false,
        error: payload.error || "Authentication failed.",
        status: response.status,
      };
    }

    const token = String(payload.token || "").trim();
    const employee = normalizeEmployee(payload.employee);
    if (!token || !employee) {
      return { ok: false, error: "Malformed login response.", status: 500 };
    }

    await persistAuthSession(token, employee);
    await chrome.storage.local.remove(["emp_id"]);
    await warmSemanticModel();
    await warmAiTargets();

    return { ok: true, employee };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Login request failed.",
      status: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function logoutEmployee() {
  const state = await getAuthState();
  if (state.token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      await fetch(`${BACKEND_URL}/api/auth/employee/logout`, {
        method: "POST",
        headers: {
          Authorization: `${EMPLOYEE_AUTH_PREFIX}${state.token}`,
        },
        signal: controller.signal,
      });
    } catch (_) {
      // Ignore logout network failures; local session is cleared regardless.
    } finally {
      clearTimeout(timeout);
    }
  }

  await clearAuthSession("user_logout");
  return { ok: true };
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

  try {
    const { response, authMissing, error } = await authorizedFetch("/api/extension/blacklist/", {
      method: "GET",
    });
    if (authMissing) return [];
    if (!response) throw error || new Error("Blacklist request failed");
    if (!response.ok) throw new Error(`Blacklist endpoint returned ${response.status}`);

    const data = await response.json();
    const domains = Array.isArray(data?.domains)
      ? data.domains.map((d) => String(d || "").toLowerCase().trim()).filter(Boolean)
      : [];

    if (domains.length) {
      await chrome.storage.local.set({ blacklistDomains: domains, blacklistFetchedAt: now });
      return domains;
    }
  } catch (error) {
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

  try {
    const { response, authMissing, error } = await authorizedFetch("/api/extension/ai-targets/", {
      method: "GET",
    });
    if (authMissing) return { domains: [], keywords: [] };
    if (!response) throw error || new Error("AI targets request failed");
    if (!response.ok) throw new Error(`AI targets endpoint returned ${response.status}`);

    const data = await response.json();
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
  syncAuthSession().then((employee) => {
    if (employee) {
      warmSemanticModel();
      warmAiTargets();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("poll", { periodInMinutes: POLL_INTERVAL_MINUTES });
  syncAuthSession().then((employee) => {
    if (employee) {
      warmSemanticModel();
      warmAiTargets();
    }
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "poll") return;
  await syncAuthSession();
  const state = await getAuthState();
  if (!state.isAuthenticated) {
    log("No authenticated employee session, skipping poll.");
    return;
  }
  await drainOfflineQueue();
  await pollAdminTriggers();
});

async function pollAdminTriggers() {
  try {
    const { response, authMissing, error } = await authorizedFetch("/api/extension/poll/", {
      method: "GET",
    });
    if (authMissing) return;
    if (!response) throw error || new Error("Poll request failed");
    if (!response.ok) throw new Error(`Poll endpoint returned ${response.status}`);

    const data = await response.json();
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

async function drainOfflineQueue() {
  const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
  if (!offlineQueue.length) return;

  log(`Draining ${offlineQueue.length} queued log(s).`);
  const remaining = [];
  for (const item of offlineQueue) {
    const result = await postLog(item.url, item.body);
    if (!result.ok) {
      if (result.authMissing) break;
      remaining.push(item);
    }
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
  try {
    const { response, authMissing, error } = await authorizedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (authMissing) return { ok: false, authMissing: true };
    if (!response) throw error || new Error("POST request failed");
    return { ok: response.ok, authMissing: false };
  } catch (e) {
    log("POST failed:", url, e.message);
    return { ok: false, authMissing: false };
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
  if (!message || typeof message !== "object") {
    return { ok: false, error: "Invalid message." };
  }

  if (message.action === "AUTH_GET_STATE") {
    await syncAuthSession();
    const state = await getAuthState();
    return toAuthResponse(state);
  }

  if (message.action === "AUTH_LOGIN") {
    const email = String(message.email || "").trim().toLowerCase();
    const password = String(message.password || "");
    if (!email || !password) {
      return { ok: false, error: "Email and password are required.", status: 400 };
    }

    const result = await loginEmployee(email, password);
    if (!result.ok) return result;
    const state = await getAuthState();
    return toAuthResponse(state, { message: "Authenticated." });
  }

  if (message.action === "AUTH_LOGOUT") {
    await logoutEmployee();
    return { ok: true, isAuthenticated: false, employee: null };
  }

  const state = await getAuthState();
  if (!state.isAuthenticated) {
    if (message.action === "CHECK_BLACKLIST") {
      return { blocked: false, auth_required: true };
    }
    if (message.action === "GET_AI_MONITOR_PROFILE") {
      return { domains: [], keywords: [], is_known_domain: false, auth_required: true };
    }
    if (message.action === "DLP_SEMANTIC_CHECK") {
      return {
        blocked: false,
        top_score: 0,
        top_topic: "auth_required",
        threshold: SEMANTIC_DLP_CONFIG.threshold,
        auth_required: true,
      };
    }
    return { ok: false, error: "AUTH_REQUIRED", auth_required: true };
  }

  switch (message.action) {
    case "CHECK_BLACKLIST": {
      const domains = await getBlacklistDomains();
      if (!domains.length) return { blocked: false };
      const blocked = isHostnameBlacklisted(message.hostname, domains);
      if (blocked) {
        const result = await postLog("/api/logs/blacklist/", {
          attempted_url: message.attempted_url,
        });
        if (!result.ok && !result.authMissing) {
          await queueLog("/api/logs/blacklist/", { attempted_url: message.attempted_url });
        }
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
      const result = await postLog("/api/logs/dlp/", dlpPayload);
      if (!result.ok && !result.authMissing) await queueLog("/api/logs/dlp/", dlpPayload);
      return { ok: true };
    }

    case "SUBMIT_QUIZ": {
      const payload = {
        quiz_id: message.quiz_id,
        answer_selected: message.answer,
      };
      const result = await postLog("/api/gamification/submit-quiz/", payload);
      if (!result.ok && !result.authMissing) {
        await queueLog("/api/gamification/submit-quiz/", payload);
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: "Unknown action" };
  }
}
