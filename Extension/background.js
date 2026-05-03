// Must be at the top level — MV3 service workers only allow importScripts() during initial evaluation
try { importScripts("./lib/transformers.min.js"); } catch (e) { console.warn("[CyberBase BG] Top-level transformers import failed:", e.message); }

const BACKEND_URL = "https://innov.leapcell.app";
const DEBUG_MODE = true;
const POLL_INTERVAL_MINUTES = 0.2; // 12 seconds
const OFFLINE_QUEUE_MAX = 20;
const BLACKLIST_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_TARGETS_CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const NAV_ALLOW_TTL_MS = 15 * 1000;
const NAV_WARNING_TTL_MS = 60 * 1000;
const EMPLOYEE_AUTH_PREFIX = "EmployeeToken ";
const AUTH_STORAGE_KEYS = ["employeeAuthToken", "employeeProfile"];
const SEMANTIC_THRESHOLD_STORAGE_KEY = "semanticDlpThreshold";
const SEMANTIC_THRESHOLD_SOURCE_KEY = "semanticDlpThresholdSource";
const SEMANTIC_THRESHOLD_CALIBRATED_AT_KEY = "semanticDlpThresholdCalibratedAt";
const REPUTATION_CHECK_PATH = "/api/extension/reputation/check/";
const REPUTATION_CHECK_PAGE = "reputation-check.html";
const BLOCKED_PAGE = "blocked.html";

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
  threshold: 0.65,
  maxInputChars: 12000,
};
const SEMANTIC_THRESHOLD_GRID = { min: 0.35, max: 0.8, step: 0.03 };
const SEMANTIC_CALIBRATION_EXAMPLES = [
  { label: 0, text: "Team standup is at 10am and we will review sprint tasks." },
  { label: 0, text: "Please update the meeting agenda and share the final deck." },
  { label: 0, text: "Weekly status update: throughput improved and error rate decreased." },
  { label: 0, text: "Customer asked for a public product overview and timeline." },
  { label: 0, text: "Reminder to submit your vacation plan before Friday." },
  { label: 0, text: "Let's review front-end spacing and dashboard card layout." },
  { label: 1, text: "password=Admin123 and token=abcd-1234, keep this secret." },
  { label: 1, text: "Here is our customer database export with emails and phone numbers." },
  { label: 1, text: "Attached are payroll files, IBAN values, and salary statements." },
  { label: 1, text: "Sharing private source code and internal architecture diagram for review." },
  { label: 1, text: "These NDA contract clauses and legal investigation notes are confidential." },
  { label: 1, text: "Please upload admin credentials and API keys to the AI chat." },
];

let semanticExtractorPromise = null;
let sensitiveTopicEmbeddingsPromise = null;
let sensitiveTopicsPromise = null;
let authSyncPromise = null;
let authSessionIssueInFlight = false;
const oneTimeAllowByTab = new Map();
const oneTimeWarningByTab = new Map();

function log(...args) {
  if (DEBUG_MODE) console.log("[CyberBase BG]", ...args);
}

function normalizeSemanticThreshold(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return SEMANTIC_DLP_CONFIG.threshold;
  return Math.max(0.01, Math.min(0.99, parsed));
}

async function getSemanticThreshold() {
  try {
    const stored = await chrome.storage.local.get([SEMANTIC_THRESHOLD_STORAGE_KEY]);
    return normalizeSemanticThreshold(stored?.[SEMANTIC_THRESHOLD_STORAGE_KEY]);
  } catch (_) {
    return SEMANTIC_DLP_CONFIG.threshold;
  }
}

function computePrf(tp, fp, fn) {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

function selectBestThreshold(scores, labels) {
  let best = {
    threshold: SEMANTIC_DLP_CONFIG.threshold,
    precision: 0,
    recall: 0,
    f1: -1,
  };

  for (let t = SEMANTIC_THRESHOLD_GRID.min; t <= SEMANTIC_THRESHOLD_GRID.max + 1e-9; t += SEMANTIC_THRESHOLD_GRID.step) {
    const threshold = Number(t.toFixed(2));
    let tp = 0;
    let fp = 0;
    let fn = 0;

    for (let i = 0; i < scores.length; i += 1) {
      const pred = scores[i] >= threshold ? 1 : 0;
      const truth = labels[i];
      if (pred === 1 && truth === 1) tp += 1;
      if (pred === 1 && truth === 0) fp += 1;
      if (pred === 0 && truth === 1) fn += 1;
    }

    const metrics = computePrf(tp, fp, fn);
    const isBetter =
      metrics.f1 > best.f1 ||
      (metrics.f1 === best.f1 && metrics.precision > best.precision) ||
      (metrics.f1 === best.f1 && metrics.precision === best.precision && metrics.recall > best.recall);

    if (isBetter) {
      best = {
        threshold,
        precision: Number(metrics.precision.toFixed(4)),
        recall: Number(metrics.recall.toFixed(4)),
        f1: Number(metrics.f1.toFixed(4)),
      };
    }
  }

  return best;
}

async function scoreSemanticOnly(text) {
  const source = (text || "").trim().slice(0, SEMANTIC_DLP_CONFIG.maxInputChars);
  if (!source) return { score: 0, topic: "no_text" };

  const [docVector, topicEmbeddings] = await Promise.all([
    getEmbeddingVector(source),
    getSensitiveTopicEmbeddings(),
  ]);
  if (!docVector.length) return { score: 0, topic: "no_vector" };

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
  return { score: Number(boundedScore.toFixed(4)), topic: topTopic };
}

async function maybeAutoCalibrateSemanticThreshold() {
  try {
    const existing = await chrome.storage.local.get([
      SEMANTIC_THRESHOLD_STORAGE_KEY,
      SEMANTIC_THRESHOLD_SOURCE_KEY,
    ]);
    const hasManualThreshold = Number.isFinite(Number(existing?.[SEMANTIC_THRESHOLD_STORAGE_KEY]));
    if (hasManualThreshold) return;

    const scores = [];
    const labels = [];
    for (const example of SEMANTIC_CALIBRATION_EXAMPLES) {
      const result = await scoreSemanticOnly(example.text);
      scores.push(result.score);
      labels.push(example.label);
    }

    const best = selectBestThreshold(scores, labels);
    await chrome.storage.local.set({
      [SEMANTIC_THRESHOLD_STORAGE_KEY]: best.threshold,
      [SEMANTIC_THRESHOLD_SOURCE_KEY]: "auto_calibration_v1",
      [SEMANTIC_THRESHOLD_CALIBRATED_AT_KEY]: Date.now(),
    });

    log("Semantic threshold auto-calibrated:", best);
  } catch (error) {
    log("Semantic threshold auto-calibration failed:", error.message || error);
  }
}

function normalizeHttpUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ""));
    const protocol = (parsed.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return "";
    parsed.hash = "";
    if ((protocol === "http:" && parsed.port === "80") || (protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }
    return parsed.toString();
  } catch (_) {
    return "";
  }
}

function isRuntimePage(url, pageName) {
  if (!url || !pageName) return false;
  return String(url).startsWith(chrome.runtime.getURL(pageName));
}

function reapExpiredTabCaches() {
  const now = Date.now();

  for (const [tabId, entry] of oneTimeAllowByTab.entries()) {
    if (!entry || entry.expiresAt <= now) oneTimeAllowByTab.delete(tabId);
  }

  for (const [tabId, entry] of oneTimeWarningByTab.entries()) {
    if (!entry || entry.expiresAt <= now) oneTimeWarningByTab.delete(tabId);
  }
}

function setOneTimeAllow(tabId, normalizedUrl) {
  if (!Number.isInteger(tabId) || tabId < 0 || !normalizedUrl) return;
  oneTimeAllowByTab.set(tabId, {
    url: normalizedUrl,
    expiresAt: Date.now() + NAV_ALLOW_TTL_MS,
  });
}

function consumeOneTimeAllow(tabId, normalizedUrl) {
  if (!Number.isInteger(tabId) || tabId < 0) return false;
  const entry = oneTimeAllowByTab.get(tabId);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    oneTimeAllowByTab.delete(tabId);
    return false;
  }
  if (entry.url !== normalizedUrl) return false;
  oneTimeAllowByTab.delete(tabId);
  return true;
}

function setOneTimeWarning(tabId, warningPayload) {
  if (!Number.isInteger(tabId) || tabId < 0 || !warningPayload) return;
  oneTimeWarningByTab.set(tabId, {
    ...warningPayload,
    expiresAt: Date.now() + NAV_WARNING_TTL_MS,
  });
}

function consumeOneTimeWarning(tabId, normalizedUrl = "") {
  if (!Number.isInteger(tabId) || tabId < 0) return null;
  const entry = oneTimeWarningByTab.get(tabId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    oneTimeWarningByTab.delete(tabId);
    return null;
  }
  if (normalizedUrl && entry.url && entry.url !== normalizedUrl) return null;
  oneTimeWarningByTab.delete(tabId);
  return entry;
}

function buildReputationCheckUrl(targetUrl, tabId) {
  const params = new URLSearchParams();
  params.set("target", targetUrl);
  if (Number.isInteger(tabId) && tabId >= 0) params.set("tab_id", String(tabId));
  return `${chrome.runtime.getURL(REPUTATION_CHECK_PAGE)}?${params.toString()}`;
}

function buildBlockedPageUrl(targetUrl, verdict) {
  const params = new URLSearchParams();
  params.set("target", targetUrl);
  if (verdict?.verdict) params.set("verdict", String(verdict.verdict));
  if (verdict?.reason) params.set("reason", String(verdict.reason));
  if (Array.isArray(verdict?.matched_sources) && verdict.matched_sources.length) {
    params.set("sources", verdict.matched_sources.join(","));
  }
  return `${chrome.runtime.getURL(BLOCKED_PAGE)}?${params.toString()}`;
}

function sanitizeReputationPayload(payload) {
  const decision = payload?.decision === "block" ? "block" : "allow";
  const verdict = String(payload?.verdict || (decision === "block" ? "malicious" : "clean"));
  const reason = String(payload?.reason || (decision === "block" ? "threat_match" : "no_match"));
  const degraded = Boolean(payload?.degraded);
  const matchedSources = Array.isArray(payload?.matched_sources)
    ? payload.matched_sources.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  return {
    decision,
    verdict,
    reason,
    degraded,
    matched_sources: matchedSources,
  };
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
  if (authSessionIssueInFlight) return;
  authSessionIssueInFlight = true;
  try {
    // Keep session persisted even when backend rejects token.
    // This prevents automatic logout across browser restarts/offline periods.
    log(`Auth warning (session kept): ${reason}`);
  } finally {
    authSessionIssueInFlight = false;
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
        // Keep stored session instead of forcing logout.
        return state.employee || null;
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
    // Fallback: try chrome.runtime.getURL path (works if called during initial event handling)
    try { importScripts(chrome.runtime.getURL("lib/transformers.min.js")); } catch (_) {}
  }

  if (!globalThis.transformers) {
    throw new Error("Transformers.js runtime failed to load");
  }

  const runtime = globalThis.transformers;
  runtime.env.allowLocalModels = true;
  runtime.env.allowRemoteModels = true;
  runtime.env.localModelPath = chrome.runtime.getURL("models/");
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
    if (authMissing) {
      return cachedDomains.length ? cachedDomains : DEFAULT_BLACKLIST;
    }
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
    if (authMissing) {
      return {
        domains: cachedDomains.length ? cachedDomains : DEFAULT_AI_TARGET_DOMAINS,
        keywords: cachedKeywords.length ? cachedKeywords : DEFAULT_AI_TARGET_KEYWORDS,
      };
    }
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
  const threshold = await getSemanticThreshold();
  const result = await scoreSemanticOnly(text);
  if (result.topic === "no_text") {
    return {
      blocked: false,
      top_score: 0,
      top_topic: "no_text",
      threshold,
    };
  }
  if (result.topic === "no_vector") {
    return {
      blocked: false,
      top_score: 0,
      top_topic: "no_vector",
      threshold,
    };
  }
  return {
    blocked: result.score >= threshold,
    top_score: result.score,
    top_topic: result.topic,
    threshold,
  };
}

async function warmSemanticModel() {
  try {
    await getSensitiveTopicEmbeddings();
    await maybeAutoCalibrateSemanticThreshold();
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

async function fetchReputationDecision(targetUrl) {
  const normalizedUrl = normalizeHttpUrl(targetUrl);
  if (!normalizedUrl) {
    return {
      decision: "allow",
      verdict: "unknown",
      reason: "invalid_url",
      degraded: true,
      matched_sources: [],
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = { "Content-Type": "application/json" };

  try {
    const state = await getAuthState();
    if (state.token) headers.Authorization = `${EMPLOYEE_AUTH_PREFIX}${state.token}`;

    const response = await fetch(`${BACKEND_URL}${REPUTATION_CHECK_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: normalizedUrl }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Reputation endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    return sanitizeReputationPayload(payload);
  } catch (error) {
    log("Reputation check failed:", error?.message || error);
    return {
      decision: "allow",
      verdict: "unknown",
      reason: "reputation_check_unavailable",
      degraded: true,
      matched_sources: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function logBlockAttemptIfAuthenticated(attemptedUrl) {
  const state = await getAuthState();
  if (!state.isAuthenticated) return;

  const payload = { attempted_url: attemptedUrl };
  const result = await postLog("/api/logs/blacklist/", payload);
  if (!result.ok && !result.authMissing) {
    await queueLog("/api/logs/blacklist/", payload);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((e) => {
      log("Message handler error:", e.message);
      sendResponse({ ok: false });
    });
  return true;
});

async function handleMessage(message, sender = null) {
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

  if (message.action === "REPUTATION_PREPARE_ALLOW") {
    const tabId = Number.isInteger(message.tab_id)
      ? message.tab_id
      : (sender?.tab?.id ?? -1);
    const targetUrl = normalizeHttpUrl(message.target_url);
    if (!targetUrl) return { ok: false, error: "invalid_target_url" };
    setOneTimeAllow(tabId, targetUrl);
    return { ok: true };
  }

  if (message.action === "REPUTATION_CHECK_URL") {
    const tabId = Number.isInteger(message.tab_id)
      ? message.tab_id
      : (sender?.tab?.id ?? -1);
    const targetUrl = normalizeHttpUrl(message.target_url);
    if (!targetUrl) {
      return {
        ok: true,
        target_url: "",
        decision: "allow",
        verdict: "unknown",
        reason: "invalid_target_url",
        degraded: true,
        matched_sources: [],
      };
    }

    const verdict = await fetchReputationDecision(targetUrl);
    if (verdict.decision === "block") {
      await logBlockAttemptIfAuthenticated(targetUrl);
      return {
        ok: true,
        target_url: targetUrl,
        ...verdict,
        blocked_page: buildBlockedPageUrl(targetUrl, verdict),
      };
    }

    if (verdict.degraded && Number.isInteger(tabId) && tabId >= 0) {
      setOneTimeWarning(tabId, {
        url: targetUrl,
        verdict: verdict.verdict,
        reason: verdict.reason,
      });
    }

    return {
      ok: true,
      target_url: targetUrl,
      ...verdict,
    };
  }

  if (message.action === "REPUTATION_CONSUME_WARNING") {
    reapExpiredTabCaches();
    const tabId = sender?.tab?.id ?? -1;
    const pageUrl = normalizeHttpUrl(message.page_url || sender?.tab?.url || "");
    const warning = consumeOneTimeWarning(tabId, pageUrl);
    return warning
      ? { has_warning: true, verdict: warning.verdict, reason: warning.reason }
      : { has_warning: false };
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
      const threshold = await getSemanticThreshold();
      return {
        blocked: false,
        top_score: 0,
        top_topic: "auth_required",
        threshold,
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
        const threshold = await getSemanticThreshold();
        return {
          blocked: true,
          top_score: 1,
          top_topic: "semantic_error",
          threshold,
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

    case "DLP_REPORT_MISTAKE": {
      const reportPayload = {
        filename: message.filename,
        website: message.website,
        event_channel: message.event_channel,
        document_topic: message.document_topic,
        detection_tier: message.detection_tier,
        detection_reason: message.detection_reason,
        matched_pattern: message.matched_pattern,
        semantic_score: message.semantic_score,
      };
      const reportResult = await postLog("/api/logs/dlp/report-mistake/", reportPayload);
      if (!reportResult.ok && !reportResult.authMissing) await queueLog("/api/logs/dlp/report-mistake/", reportPayload);
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
