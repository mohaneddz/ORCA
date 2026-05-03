import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { APP_URLS } from "@/config/urls";
import { logger } from "@/lib/logger";

export type UserRole = "admin" | "staff";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  phone: string;
  avatarUrl?: string;
  role: UserRole;
  lastLoginAt: string;
};

type LoginInput = {
  email: string;
  password: string;
  role: UserRole;
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
  avatarUrl?: string;
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

type EmployeeAuthApiResponse = {
  token: string;
  employee: {
    id: string;
    name: string;
    email: string;
    role?: string;
    organization?: {
      id: string;
      name: string;
    };
  };
};

type TauriDeviceInfo = {
  hostname?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  kernelVersion?: string | null;
  architecture: string;
  hardware: {
    architecture: string;
    cpuCores: number;
    totalMemoryMb: number;
  };
};

type TauriPosturePayload = Record<string, unknown>;

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "orca.auth.session";
const DEFAULT_ORG_NAME = "ORCA Organization";

function normalizeRole(value: string | undefined): UserRole {
  return value === "admin" ? "admin" : "staff";
}

function loadStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    logger.warn("auth.session_corrupt");
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
  avatarUrl = "",
): SessionUser {
  return {
    id: organization.id,
    name: organization.name || organization.email.split("@")[0] || "User",
    email: organization.email,
    organizationName: organization.name || DEFAULT_ORG_NAME,
    phone,
    avatarUrl,
    role,
    lastLoginAt: new Date().toISOString(),
  };
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    logger.debug("auth.request.start", { path, method: options?.method ?? "GET" });
    const response = await fetch(`${APP_URLS.api.backendBase}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      ...options,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      logger.warn("auth.request.failed", { path, status: response.status, data });
      console.error("AUTH ERROR:", { path, status: response.status, data });
      return { ok: false, message: (data as { error?: string })?.error || `Request failed: ${response.status}` };
    }

    logger.info("auth.request.success", { path, status: response.status });
    return { ok: true, data: data as T };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Network error.";
    logger.error("auth.request.error", { path, message });
    return { ok: false, message };
  }
}

function withAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Token ${token}`,
  };
}

function withEmployeeAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `EmployeeToken ${token}`,
  };
}

async function sendSessionDeviceSnapshot(token: string, role: UserRole) {
  if (role !== "staff") {
    return;
  }

  const headers = withEmployeeAuthHeaders(token);

  try {
    const device = await invoke<TauriDeviceInfo>("collect_device_info");
    await authRequest("/api/auth/session-device", {
      method: "POST",
      headers,
      body: JSON.stringify({
        device: {
          hostname: device.hostname ?? "",
          osName: device.osName ?? "",
          osVersion: device.osVersion ?? "",
          kernelVersion: device.kernelVersion ?? "",
          architecture: device.architecture,
          hardware: {
            cpuCores: device.hardware.cpuCores,
            totalMemoryMb: device.hardware.totalMemoryMb,
          },
        },
      }),
    });
  } catch (error) {
    logger.warn("auth.session_device.snapshot_failed", { error });
  }

  try {
    const [baselineResult, wave3Result] = await Promise.allSettled([
      invoke<TauriPosturePayload>("collect_full_posture", { config: null }),
      invoke<TauriPosturePayload>("collect_wave3_posture", { config: null }),
    ]);

    const baseline = baselineResult.status === "fulfilled" ? baselineResult.value : null;
    const wave3 = wave3Result.status === "fulfilled" ? wave3Result.value : null;
    if (!baseline && !wave3) {
      logger.warn("auth.full_snapshot.collect_failed");
      return;
    }

    const payload: TauriPosturePayload = {
      ...(baseline || {}),
      ...(wave3 || {}),
      collectedAtUtc:
        (wave3?.collectedAtUtc as string | undefined) ??
        (baseline?.collectedAtUtc as string | undefined) ??
        new Date().toISOString(),
      // Preserve richer baseline blocks where available.
      processes: baseline?.processes ?? wave3?.processes,
      user: baseline?.user ?? wave3?.user,
      security: baseline?.security ?? wave3?.security,
      network: baseline?.network ?? wave3?.network,
      software: wave3?.software ?? baseline?.software,
      usb: wave3?.usb ?? baseline?.usb,
      wifi: wave3?.wifi ?? baseline?.wifi,
      lan: wave3?.lan ?? baseline?.lan,
      localPorts: wave3?.localPorts ?? baseline?.localPorts,
      antivirus: wave3?.antivirus ?? baseline?.antivirus,
      patchStatus: wave3?.patchStatus ?? baseline?.patchStatus,
      diskEncryption: wave3?.diskEncryption ?? baseline?.diskEncryption,
      hardware: wave3?.hardware ?? baseline?.hardware,
    };

    const ingestPath =
      "/api/agent/snapshot/";

    const ingest = await authRequest(ingestPath, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!ingest.ok) {
      logger.warn("auth.full_snapshot.ingest_failed", { message: ingest.message });
    }
  } catch (error) {
    logger.warn("auth.full_snapshot.error", { error });
  }
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
      logger.info("auth.session.restored", { userId: session.user.id });
      void sendSessionDeviceSnapshot(session.token, session.user.role);
    }
    setIsInitializing(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      login: async ({ email, password, role }) => {
        if (!email.trim()) return { ok: false, message: "Email is required." };
        if (!password.trim()) return { ok: false, message: "Password is required." };

        logger.info("auth.login.attempt", { email: email.trim().toLowerCase() });

        const trimmedEmail = email.trim().toLowerCase();
        const loginPath = role === "staff" ? "/api/auth/employee/login" : "/api/auth/login";

        const result = await authRequest<AuthApiResponse | EmployeeAuthApiResponse>(loginPath, {
          method: "POST",
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        });

        if (!result.ok || !result.data) return { ok: false, message: result.message || "Sign in failed." };

        let nextUser: SessionUser;
        if ("employee" in result.data) {
          const employee = result.data.employee;
          nextUser = {
            id: employee.id,
            name: employee.name || employee.email.split("@")[0] || "Staff User",
            email: employee.email,
            organizationName: employee.organization?.name || DEFAULT_ORG_NAME,
            phone: "",
            avatarUrl: "",
            role: "staff",
            lastLoginAt: new Date().toISOString(),
          };
        } else {
          nextUser = mapOrganizationToUser(
            result.data.organization,
            "admin",
            (result.data.organization as any).phone || "",
            (result.data.organization as any).avatarUrl || "",
          );
        }

        const session: StoredSession = {
          token: result.data.token,
          user: nextUser,
        };

        setToken(result.data.token);
        setUser(nextUser);
        saveStoredSession(session);
        await sendSessionDeviceSnapshot(result.data.token, nextUser.role);
        logger.info("auth.login.success", { userId: nextUser.id, role: nextUser.role });

        return { ok: true };
      },
      signup: async ({ email, password, role, name, phone, organizationName }) => {
        if (!email.trim()) return { ok: false, message: "Email is required." };
        if (!password.trim()) return { ok: false, message: "Password is required." };

        logger.info("auth.signup.attempt", { email: email.trim().toLowerCase(), role });

        const trimmedEmail = email.trim().toLowerCase();

        if (role === "staff") {
          const loginResult = await authRequest<EmployeeAuthApiResponse>("/api/auth/employee/login", {
            method: "POST",
            body: JSON.stringify({
              email: trimmedEmail,
              password,
            }),
          });

          if (!loginResult.ok || !loginResult.data) {
            return { ok: false, message: loginResult.message || "Staff sign in failed." };
          }

          const employee = loginResult.data.employee;
          const nextUser: SessionUser = {
            id: employee.id,
            name: employee.name || employee.email.split("@")[0] || "Staff User",
            email: employee.email,
            organizationName: employee.organization?.name || organizationName?.trim() || DEFAULT_ORG_NAME,
            phone: phone?.trim() || "",
            avatarUrl: "",
            role: "staff",
            lastLoginAt: new Date().toISOString(),
          };

          const session: StoredSession = {
            token: loginResult.data.token,
            user: nextUser,
          };

          setToken(loginResult.data.token);
          setUser(nextUser);
          saveStoredSession(session);
          await sendSessionDeviceSnapshot(loginResult.data.token, nextUser.role);
          logger.info("auth.staff.login.success", { userId: nextUser.id });

          return { ok: true };
        }

        const organization = organizationName?.trim() || name?.trim() || DEFAULT_ORG_NAME;
        const result = await authRequest<AuthApiResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: trimmedEmail,
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
        await sendSessionDeviceSnapshot(result.data.token, nextUser.role);
        logger.info("auth.signup.success", { userId: nextUser.id, role: nextUser.role });

        return { ok: true };
      },
      updateProfile: async ({ name, email, phone, avatarUrl }) => {
        if (!user || !token) return { ok: false, message: "No active user session." };

        const result = await authRequest<any>("/api/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            // backend also accepts organizationName as an alias for name
          }),
          headers: withAuthHeaders(token),
        });

        if (!result.ok || !result.data) {
          return { ok: false, message: result.message || "Failed to update profile on server." };
        }

        const updatedUser: SessionUser = {
          ...user,
          name: result.data.name,
          email: result.data.email,
          organizationName: result.data.name, // mapped from name
          phone: result.data.phone,
          avatarUrl: avatarUrl ?? user.avatarUrl,
        };

        setUser(updatedUser);
        saveStoredSession({ token, user: updatedUser });
        logger.info("auth.profile.updated", { userId: updatedUser.id });

        return { ok: true };
      },
      updatePassword: async ({ newPassword }) => {
        if (!token) return { ok: false, message: "No active session." };
        if (!newPassword.trim()) return { ok: false, message: "New password is required." };

        const result = await authRequest("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ new_password: newPassword }),
          headers: withAuthHeaders(token),
        });

        if (!result.ok) return { ok: false, message: result.message || "Failed to update password." };

        logger.info("auth.password.updated", { userId: user?.id });
        return { ok: true };
      },
      deleteOwnAccount: async () => {
        if (!token) return { ok: false, message: "No active session." };
        
        const result = await authRequest("/api/auth/profile", {
          method: "DELETE",
          headers: withAuthHeaders(token),
        });

        if (!result.ok) return { ok: false, message: result.message || "Failed to delete account." };

        setToken(null);
        setUser(null);
        saveStoredSession(null);
        logger.warn("auth.account.deleted");
        return { ok: true };
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
        logger.info("auth.logout.success");
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
