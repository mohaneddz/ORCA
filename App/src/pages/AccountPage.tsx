import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatGrid, DataTable } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const AVATARS_BUCKET = import.meta.env.VITE_SUPABASE_AVATARS_BUCKET || "staff-pfps";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export default function AccountPage() {
  const { t } = useAppSettings();
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
      const { error } = await supabase.auth.updateUser({
        email,
        data: {
          name,
          organizationName,
          phone,
        }
      });
      
      if (error) {
        setStatus(error.message);
        return;
      }

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
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const objectPath = `staff/${user.id}/avatar.${extension}`;
      const upload = await supabase.storage.from(AVATARS_BUCKET).upload(objectPath, file, {
        upsert: true,
        contentType: file.type,
      });

      if (upload.error) throw upload.error;

      const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(objectPath);
      const nextAvatarUrl = `${data.publicUrl}?v=${Date.now()}`;
      setAvatarUrl(nextAvatarUrl);
      setAvatarLoadFailed(false);

      await supabase.auth.updateUser({
        data: { avatarUrl: nextAvatarUrl }
      });

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
        badge={t("account.badge")}
        title={t("account.title")}
        description={t("account.description")}
      />
      <StatGrid
        stats={[
          { label: t("account.stats.role"), value: user.role === "admin" ? t("account.role.admin") : t("account.role.staff") },
          { label: t("account.stats.organization"), value: user.organizationName.length > 18 ? user.organizationName.slice(0, 15) + "..." : user.organizationName },
          { label: t("account.stats.id"), value: user.id.slice(0, 8) + "..." },
          { label: t("account.stats.lastLogin"), value: new Date(user.lastLoginAt).toLocaleString(), tone: "ok" },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <form className="card p-4" onSubmit={onSaveProfile}>
          <p className="m-0 text-sm font-semibold text-white">{t("account.profile.title")}</p>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarUrl}
                alt={`${name || user.name} profile`}
                className="h-14 w-14 rounded-full object-cover"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-sm font-semibold text-[var(--color-primary-strong)]">
                {getInitials(name || user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 text-sm font-medium text-white">{t("account.profile.picture")}</p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">{t("account.profile.pictureDesc")} {AVATARS_BUCKET}</p>
              <label className="mt-2 inline-flex cursor-pointer items-center rounded-md border border-[var(--color-border-glow)] bg-[var(--color-surface-hover)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary-strong)] hover:opacity-80 transition-opacity">
                {isUploadingAvatar ? t("account.profile.uploading") : t("account.profile.upload")}
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
              {t("account.profile.fullName")}
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              {t("account.profile.email")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              {t("account.profile.orgName")}
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              {t("account.profile.phone")}
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
            {t("account.profile.save")}
          </button>
        </form>

        <form className="card p-4" onSubmit={onSavePassword}>
          <p className="m-0 text-sm font-semibold text-white">{t("account.password.title")}</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-200">
              {t("account.password.new")}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              {t("account.password.confirm")}
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
            {t("account.password.save")}
          </button>
        </form>
      </section>

      {status && (
        <section className="card px-4 py-3">
          <p className="m-0 text-sm text-slate-200">{status}</p>
        </section>
      )}

      <section className="card p-4">
        <p className="m-0 text-sm font-semibold text-white">{t("account.danger.title")}</p>
        <p className="m-0 mt-2 text-sm text-[var(--color-neutral-500)]">
          {t("account.danger.desc")}
        </p>
        <button
          type="button"
          onClick={onDeleteAccount}
          className="mt-3 rounded-md border border-[var(--color-error)] bg-[var(--color-error)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-error)] hover:bg-[var(--color-error)]/20"
        >
          {t("account.danger.button")}
        </button>
      </section>

      <DataTable
        title={t("account.audit.title")}
        columns={[t("account.audit.action"), t("account.audit.target"), t("account.audit.result"), t("account.audit.date")]}
        filterColumn={t("account.audit.result")}
        searchPlaceholder={t("account.audit.search")}
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
