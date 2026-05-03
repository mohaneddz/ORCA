import { APP_URLS } from "@/config/urls";
import { logger } from "@/lib/logger";

const AUTH_STORAGE_KEY = "orca.auth.session";

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token || null;
  } catch {
    return null;
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const response = await fetch(`${APP_URLS.api.backendBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.warn("api.request.failed", { path, status: response.status, errorData });
    throw new Error(errorData?.error || `API request failed with status ${response.status}`);
  }

  // Some endpoints might return 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
