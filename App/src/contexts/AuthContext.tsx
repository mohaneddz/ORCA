import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  organization_name: string;
  phone: string;
  role: UserRole;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(value: string | undefined): UserRole {
  return value === "admin" ? "admin" : "staff";
}

async function readProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,organization_name,phone,role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as ProfileRow | null;
}

function mapSessionUser(session: Session, profile: ProfileRow | null): SessionUser {
  const authUser = session.user;
  const roleFromMeta = typeof authUser.user_metadata?.role === "string" ? authUser.user_metadata.role : undefined;
  const role = normalizeRole(profile?.role || roleFromMeta);

  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
    email: profile?.email || authUser.email || "unknown@local",
    organizationName: profile?.organization_name || authUser.user_metadata?.organization_name || "InnovByte Organization",
    phone: profile?.phone || authUser.user_metadata?.phone || "",
    role,
    lastLoginAt: authUser.last_sign_in_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const hydrate = async (session: Session | null) => {
      if (!active) return;

      if (!session?.user) {
        setUser(null);
        setIsInitializing(false);
        return;
      }

      const profile = await readProfile(session.user.id);
      if (!active) return;
      setUser(mapSessionUser(session, profile));
      setIsInitializing(false);
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      await hydrate(data.session);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      login: async ({ email, password }) => {
        if (!email.trim()) return { ok: false, message: "Email is required." };
        if (!password.trim()) return { ok: false, message: "Password is required." };

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
      signup: async ({ email, password, role, name, organizationName, phone }) => {
        if (!email.trim()) return { ok: false, message: "Email is required." };
        if (!password.trim()) return { ok: false, message: "Password is required." };
        const normalizedEmail = email.trim().toLowerCase();

        if (role === "admin" && import.meta.env.VITE_ANONYMOUS_ADMINS === 'false') {
          return { ok: false, message: "Anonymous admin creation is blocked by the server configuration." };
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              role,
              full_name: name?.trim() || "",
              organization_name: organizationName?.trim() || "InnovByte Organization",
              phone: phone?.trim() || "",
            },
          },
        });

        if (signUpError) return { ok: false, message: signUpError.message };

        if (!signUpData.session) {
          return {
            ok: true,
            message: "Account created. If email confirmation is enabled, verify your inbox before signing in.",
          };
        }

        return { ok: true };
      },
      updateProfile: async ({ name, email, organizationName, phone }) => {
        if (!user) return { ok: false, message: "No active user session." };

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedName = name.trim();
        const normalizedOrganizationName = organizationName.trim();
        const normalizedPhone = phone.trim();

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            email: normalizedEmail,
            full_name: normalizedName,
            organization_name: normalizedOrganizationName,
            phone: normalizedPhone,
          })
          .eq("id", user.id);

        if (profileError) return { ok: false, message: profileError.message };

        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: normalizedName,
            organization_name: normalizedOrganizationName,
            phone: normalizedPhone,
            role: user.role,
          },
        });

        if (metadataError) return { ok: false, message: metadataError.message };

        if (normalizedEmail !== user.email) {
          const { error: emailError } = await supabase.auth.updateUser({ email: normalizedEmail });
          if (emailError) {
            return {
              ok: false,
              message: `Profile saved but auth email update failed: ${emailError.message}`,
            };
          }
        }

        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: normalizedName,
                email: normalizedEmail,
                organizationName: normalizedOrganizationName,
                phone: normalizedPhone,
              }
            : prev,
        );

        return { ok: true };
      },
      updatePassword: async ({ newPassword }) => {
        if (!newPassword.trim()) return { ok: false, message: "New password is required." };

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
      deleteOwnAccount: async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const userSession = sessionData.session?.user;
        if (!userSession) return { ok: false, message: "No active session." };

        const { error } = await supabase.rpc("delete_account", {
          p_target_user_id: userSession.id,
        });

        if (error) {
          return { ok: false, message: error.message };
        }

        await supabase.auth.signOut();
        setUser(null);
        return { ok: true };
      },
      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) return { ok: false, message: error.message };
        setUser(null);
        return { ok: true };
      },
    }),
    [isInitializing, user],
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
