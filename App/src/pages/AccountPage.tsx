import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatGrid, DataTable } from "@/components/cards/BaseCards";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const AVATARS_BUCKET = import.meta.env.VITE_SUPABASE_AVATARS_BUCKET || "staff-pfps";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AUTH_STORAGE_KEY = "orca.auth.session";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function getAuthTokenFromStorage(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

export default function AccountPage() {
  const { user, updateProfile, updatePassword, deleteOwnAccount } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setOrganizationName(user.organizationName);
    setPhone(user.phone);
    setAvatarUrl(user.avatarUrl || null);
    setAvatarLoadFailed(false);
  }, [user]);

  if (!user) return null;

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !organizationName.trim() || !phone.trim()) {
      setStatus("All profile fields are required.");
      return;
    }

    try {
      const result = await updateProfile({
        name,
        email,
        organizationName,
        phone,
        avatarUrl: avatarUrl ?? undefined,
      });

      setStatus(result.ok ? "Profile information saved." : result.message || "Failed to save profile.");
    } catch (error: any) {
      setStatus(error?.message || "Failed to save profile.");
    }
  };

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    setStatus(null);

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please select an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setStatus("Profile picture must be under 5MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const token = getAuthTokenFromStorage();
      if (!token) {
        setStatus("Session token is missing. Please sign in again.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/auth/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = (payload as { details?: { message?: string; error?: string }; error?: string })?.details;
        const message = details?.message || details?.error || (payload as { error?: string }).error || "Failed to upload profile picture.";
        throw new Error(message);
      }

      const uploadedAvatarUrl = (payload as { avatarUrl?: string }).avatarUrl;
      if (!uploadedAvatarUrl) {
        throw new Error("Upload succeeded but avatar URL was missing from server response.");
      }

      const nextAvatarUrl = `${uploadedAvatarUrl}?v=${Date.now()}`;
      setAvatarUrl(nextAvatarUrl);
      setAvatarLoadFailed(false);

      const result = await updateProfile({
        name,
        email,
        organizationName,
        phone,
        avatarUrl: nextAvatarUrl,
      });

      setStatus(result.ok ? "Profile picture uploaded." : result.message || "Failed to persist profile picture.");
    } catch (error: any) {
      setStatus(error?.message || "Failed to upload profile picture.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSavePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!newPassword.trim()) {
      setStatus("New password is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("New password and confirmation do not match.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setStatus(error.message);
        return;
      }

      await updatePassword({ newPassword });
      setStatus("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setStatus(error?.message || "Failed to update password.");
    }
  };

  const onDeleteAccount = async () => {
    const result = await deleteOwnAccount();
    if (!result.ok) {
      setStatus(result.message || "Failed to delete account.");
      return;
    }
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="page-section">
      <PageHeader
        badge="Account"
        title="Account and Organization Profile"
        description="Manage your user and organization info: name, email, phone, profile details, and password update."
      />
      <StatGrid
        stats={[
          { label: "Role", value: user.role === "admin" ? "Organization Admin" : "Organization Staff" },
          { label: "Organization", value: user.organizationName.length > 18 ? user.organizationName.slice(0, 15) + "..." : user.organizationName },
          { label: "Account ID", value: user.id.slice(0, 8) + "..." },
          { label: "Last Login", value: new Date(user.lastLoginAt).toLocaleString(), tone: "ok" },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <form className="card p-4" onSubmit={onSaveProfile}>
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Profile Information</p>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarUrl}
                alt={`${name || user.name} profile`}
                className="h-14 w-14 shrink-0 rounded-full object-cover object-center aspect-square"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 aspect-square items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-sm font-semibold text-[var(--color-primary-strong)]">
                {getInitials(name || user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 text-sm font-medium text-white">Profile picture</p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">Stored in Supabase bucket: {AVATARS_BUCKET}</p>
              <label className="mt-2 inline-flex cursor-pointer items-center rounded-md border border-[var(--color-border-glow)] bg-[var(--color-surface-hover)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary-strong)] hover:opacity-80 transition-opacity">
                {isUploadingAvatar ? "Uploading..." : "Upload New Picture"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploadingAvatar}
                  onChange={(event) => {
                    void onAvatarChange(event);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-200">
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Organization name
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md border border-[var(--color-border-glow)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-strong)] hover:opacity-80 transition-opacity"
          >
            Save Profile
          </button>
        </form>

        <form className="card p-4" onSubmit={onSavePassword}>
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Password Update</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-200">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md border border-[var(--color-border-glow)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-strong)] hover:opacity-80 transition-opacity"
          >
            Save Password
          </button>
        </form>
      </section>

      {status && (
        <section className="card px-4 py-3">
          <p className="m-0 text-sm text-slate-200">{status}</p>
        </section>
      )}

      <section className="card p-4">
        <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Danger Zone</p>
        <p className="m-0 mt-2 text-sm text-[var(--color-neutral-500)]">
          Delete this account permanently and sign out immediately.
        </p>
        <button
          type="button"
          onClick={onDeleteAccount}
          className="mt-3 rounded-md border border-[var(--color-error)] bg-[var(--color-error)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-error)] hover:bg-[var(--color-error)]/20"
        >
          Delete Account and Sign Out
        </button>
      </section>

      <DataTable
        title="Recent Audit Activity"
        columns={["Action", "Target", "Result", "Date"]}
        filterColumn="Result"
        searchPlaceholder="Search action, target, result, or date"
        rows={[
          ["Updated profile details", "Account Profile", "Success", "2026-05-02"],
          ["Changed settings tab policy", "Security Settings", "Success", "2026-05-01"],
          ["Forced account password reset", "nadia@org.com", "Success", "2026-05-01"],
          ["Quarantined unknown device", "Unknown-Lenovo", "Success", "2026-04-30"],
        ]}
      />
    </div>
  );
}
