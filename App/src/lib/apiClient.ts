import { APP_URLS } from "@/config/urls";
import { logger } from "@/lib/logger";

const AUTH_STORAGE_KEY = "orca.auth.session";

function getStoredSession(): { token: string | null; role: "admin" | "staff" | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: null, role: null };
    const session = JSON.parse(raw);
    return {
      token: session?.token || null,
      role: session?.user?.role === "staff" ? "staff" : session?.user?.role === "admin" ? "admin" : null,
    };
  } catch {
    return { token: null, role: null };
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const { token, role } = getStoredSession();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
  };

  if (token) {
    const authValue = role === "staff" ? `EmployeeToken ${token}` : `Token ${token}`;
    if (headers instanceof Headers) {
      headers.set("Authorization", authValue);
    } else if (Array.isArray(headers)) {
      headers.push(["Authorization", authValue]);
    } else {
      (headers as Record<string, string>)["Authorization"] = authValue;
    }
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
