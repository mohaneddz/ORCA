/**
 * apiKeysStore.ts
 *
 * Manages API key overrides that the user can set via the Settings UI.
 * Priority: user override (persisted in Tauri Store) > .env defaults.
 *
 * The store file lives in the app data directory and is managed by
 * tauri-plugin-store. In a web-only (non-Tauri) context it falls back
 * to localStorage for dev convenience.
 */

import { isTauri } from "@tauri-apps/api/core";
import { load, type Store } from "@tauri-apps/plugin-store";
import { logger } from "@/lib/logger";

export type ApiKeysConfig = {
  /** Pinecone secret API key */
  pineconeApiKey: string;
  /** Pinecone index name */
  pineconeIndexName: string;
  /** Pinecone namespace (leave empty for default) */
  pineconeNamespace: string;
  /** Number of results to retrieve from Pinecone */
  pineconeTopK: number;
  /** Groq API key */
  groqApiKey: string;
  /** Groq base URL */
  groqBaseUrl: string;
  /** Groq chat model */
  groqChatModel: string;
};

// ──────────────────────────────────────────────────────────────────
// Env defaults (read once at module load)
// ──────────────────────────────────────────────────────────────────
export const ENV_DEFAULTS: ApiKeysConfig = {
  pineconeApiKey:
    import.meta.env.VITE_PINECONE_API_KEY ||
    import.meta.env.PINECONE_API_KEY ||
    "",
  pineconeIndexName:
    import.meta.env.VITE_PINECONE_INDEX_NAME ||
    import.meta.env.PINECONE_INDEX_NAME ||
    "ORCA",
  pineconeNamespace:
    import.meta.env.VITE_PINECONE_NAMESPACE || "",
  pineconeTopK:
    Number(import.meta.env.VITE_PINECONE_TOP_K) || 4,
  groqApiKey:
    import.meta.env.VITE_GROQ_API_KEY ||
    import.meta.env.GROQ_API_KEY ||
    "",
  groqBaseUrl:
    import.meta.env.VITE_GROQ_BASE_URL ||
    "https://api.groq.com/openai/v1",
  groqChatModel:
    import.meta.env.VITE_GROQ_CHAT_MODEL ||
    "llama-3.3-70b-versatile",
};

// ──────────────────────────────────────────────────────────────────
// Store constants
// ──────────────────────────────────────────────────────────────────
const STORE_FILE = "api-keys.json";
const STORE_KEY = "apiKeysOverrides";
const LS_KEY = "ORCA-api-keys-overrides-v1"; // localStorage fallback for dev

// ──────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────
let _storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!_storePromise) {
    _storePromise = load(STORE_FILE, { autoSave: true } as any);
  }
  return _storePromise;
}

function parseOverrides(raw: unknown): Partial<ApiKeysConfig> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: Partial<ApiKeysConfig> = {};
  if (typeof obj.pineconeApiKey === "string") result.pineconeApiKey = obj.pineconeApiKey;
  if (typeof obj.pineconeIndexName === "string") result.pineconeIndexName = obj.pineconeIndexName;
  if (typeof obj.pineconeNamespace === "string") result.pineconeNamespace = obj.pineconeNamespace;
  if (typeof obj.pineconeTopK === "number") result.pineconeTopK = obj.pineconeTopK;
  if (typeof obj.groqApiKey === "string") result.groqApiKey = obj.groqApiKey;
  if (typeof obj.groqBaseUrl === "string") result.groqBaseUrl = obj.groqBaseUrl;
  if (typeof obj.groqChatModel === "string") result.groqChatModel = obj.groqChatModel;
  return result;
}

// ──────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────

/**
 * Reads stored overrides and merges them with env defaults.
 * Returns the final merged config.
 */
export async function getApiConfig(): Promise<ApiKeysConfig> {
  try {
    let overrides: Partial<ApiKeysConfig> = {};

    if (isTauri()) {
      const store = await getStore();
      const raw = await store.get<unknown>(STORE_KEY);
      overrides = parseOverrides(raw);
    } else {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) overrides = parseOverrides(JSON.parse(raw) as unknown);
    }

    const merged: ApiKeysConfig = { ...ENV_DEFAULTS, ...overrides };
    // Filter out empty-string overrides (treat empty as "use default")
    for (const k of Object.keys(overrides) as (keyof ApiKeysConfig)[]) {
      const v = overrides[k];
      if (typeof v === "string" && v.trim() === "") {
        (merged[k] as string) = ENV_DEFAULTS[k] as string;
      }
    }

    return merged;
  } catch (err) {
    logger.warn("apiKeysStore.read.failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return { ...ENV_DEFAULTS };
  }
}

/**
 * Reads the raw user-supplied overrides (without merging with defaults).
 * Useful for pre-filling the settings form.
 */
export async function getApiOverrides(): Promise<Partial<ApiKeysConfig>> {
  try {
    if (isTauri()) {
      const store = await getStore();
      const raw = await store.get<unknown>(STORE_KEY);
      return parseOverrides(raw);
    } else {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? parseOverrides(JSON.parse(raw) as unknown) : {};
    }
  } catch {
    return {};
  }
}

/**
 * Persists user overrides. Only non-empty values are stored;
 * empty strings clear that override (revert to env default).
 */
export async function saveApiOverrides(overrides: Partial<ApiKeysConfig>): Promise<void> {
  try {
    if (isTauri()) {
      const store = await getStore();
      await store.set(STORE_KEY, overrides);
      await store.save();
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(overrides));
    }
    logger.info("apiKeysStore.saved");
  } catch (err) {
    logger.error("apiKeysStore.save.failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Clears all overrides, reverting everything to env defaults.
 */
export async function clearApiOverrides(): Promise<void> {
  try {
    if (isTauri()) {
      const store = await getStore();
      await store.delete(STORE_KEY);
      await store.save();
    } else {
      localStorage.removeItem(LS_KEY);
    }
    logger.info("apiKeysStore.cleared");
  } catch (err) {
    logger.warn("apiKeysStore.clear.failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
