import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { APP_URLS } from "@/config/urls";

export type UserRole = "admin" | "staff";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  phone: string;
  role: UserRole;
  lastLoginAt: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  organizationName?: string;
  phone?: string;
};

type ProfileUpdateInput = {
  name: string;
  email: string;
  organizationName: string;
  phone: string;
};

type PasswordUpdateInput = {
  newPassword: string;
};

type AuthResult = {
  ok: boolean;
  message?: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<AuthResult>;
  signup: (input: SignupInput) => Promise<AuthResult>;
  updateProfile: (input: ProfileUpdateInput) => Promise<AuthResult>;
  updatePassword: (input: PasswordUpdateInput) => Promise<AuthResult>;
  deleteOwnAccount: () => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
};

type StoredSession = {
  token: string;
  user: SessionUser;
};

type AuthApiResponse = {
  token: string;
  organization: {
    id: string;
    name: string;
    email: string;
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "innov.auth.session";
const DEFAULT_ORG_NAME = "InnovByte Organization";

function normalizeRole(value: string | undefined): UserRole {
  return value === "admin" ? "admin" : "staff";
}

function loadStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function saveStoredSession(session: StoredSession | null) {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function mapOrganizationToUser(
  organization: { id: string; name: string; email: string },
  role: UserRole,
  phone = "",
): SessionUser {
  return {
    id: organization.id,
    name: organization.name || organization.email.split("@")[0] || "User",
    email: organization.email,
    organizationName: organization.name || DEFAULT_ORG_NAME,
    phone,
    role,
    lastLoginAt: new Date().toISOString(),
  };
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const response = await fetch(`${APP_URLS.api.backendBase}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      ...options,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, message: (data as { error?: string })?.error || `Request failed: ${response.status}` };
    }

    return { ok: true, data: data as T };
  } catch (error: any) {
    return { ok: false, message: error?.message || "Network error." };
  }
}

function withAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Token ${token}`,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const session = loadStoredSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
    }
    setIsInitializing(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      login: async ({ email, password }) => {
        if (!email.trim()) return { ok: false, message: "Email is required." };
        if (!password.trim()) return { ok: false, message: "Password is required." };

        const result = await authRequest<AuthApiResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        if (!result.ok || !result.data) return { ok: false, message: result.message || "Sign in failed." };

        const nextUser = mapOrganizationToUser(result.data.organization, "admin");
        const session: StoredSession = {
          token: result.data.token,
          user: nextUser,
        };

        setToken(result.data.token);
        setUser(nextUser);
        saveStoredSession(session);

        return { ok: true };
      },
      signup: async ({ email, password, role, name, organizationName, phone }) => {
        if (!email.trim()) return { ok: false, message: "Email is required." };
        if (!password.trim()) return { ok: false, message: "Password is required." };

        const organization = organizationName?.trim() || name?.trim() || DEFAULT_ORG_NAME;
        const result = await authRequest<AuthApiResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            name: organization,
            password,
          }),
        });

        if (!result.ok || !result.data) return { ok: false, message: result.message || "Sign up failed." };

        const nextUser = mapOrganizationToUser(result.data.organization, normalizeRole(role), phone?.trim() || "");
        const session: StoredSession = {
          token: result.data.token,
          user: nextUser,
        };

        setToken(result.data.token);
        setUser(nextUser);
        saveStoredSession(session);

        return { ok: true };
      },
      updateProfile: async ({ name, email, organizationName, phone }) => {
        if (!user) return { ok: false, message: "No active user session." };

        const updatedUser: SessionUser = {
          ...user,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          organizationName: organizationName.trim(),
          phone: phone.trim(),
        };

        setUser(updatedUser);
        if (token) saveStoredSession({ token, user: updatedUser });

        return { ok: true };
      },
      updatePassword: async ({ newPassword }) => {
        if (!newPassword.trim()) return { ok: false, message: "New password is required." };
        return { ok: false, message: "Password update endpoint is not available yet in backend auth API." };
      },
      deleteOwnAccount: async () => {
        return { ok: false, message: "Account deletion endpoint is not available yet in backend auth API." };
      },
      logout: async () => {
        if (token) {
          await authRequest("/api/auth/logout", {
            method: "POST",
            headers: withAuthHeaders(token),
          });
        }

        setToken(null);
        setUser(null);
        saveStoredSession(null);
        return { ok: true };
      },
    }),
    [isInitializing, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

