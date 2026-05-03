import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatGrid, DataTable } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { ROUTES } from "@/config/routes";
import { APP_URLS } from "@/config/urls";
import { useAuth } from "@/contexts/AuthContext";
// Supabase removed to migrate to CyberBase backend

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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setOrganizationName(user.organizationName);
    setPhone(user.phone || "");
    setAvatarUrl(user.avatarUrl || null);
    setAvatarLoadFailed(false);
  }, [user]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const raw = localStorage.getItem("orca.auth.session");
        const session = raw ? JSON.parse(raw) : null;
        if (!session?.token) return;

        const res = await fetch(`${APP_URLS.api.backendBase}/api/auth/audit-logs`, {
          headers: { Authorization: `Token ${session.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } catch (e) {
        console.error("Failed to fetch audit logs", e);
      } finally {
        setIsLoadingLogs(false);
      }
    }
    fetchLogs();
  }, [status]); 

  if (!user) return null;

  const auditRows = auditLogs.map(log => [
    log.action,
    log.target,
    log.result,
    new Date(log.created_at).toLocaleDateString()
  ]);

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !organizationName.trim()) {
      setStatus("Name and email are required.");
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

    setIsUploadingAvatar(true);
    setStatus("Processing avatar...");

    try {
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxDim = 512;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to convert to WebP"));
            },
            "image/webp",
            0.8
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        img.src = url;
      });

      setStatus("Uploading avatar...");

      const formData = new FormData();
      formData.append("file", webpBlob, "avatar.webp");

      const raw = localStorage.getItem("orca.auth.session");
      const session = raw ? JSON.parse(raw) : null;

      const res = await fetch(`${APP_URLS.api.backendBase}/api/auth/profile/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Token ${session?.token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to upload avatar");
      }

      const data = await res.json();
      setAvatarUrl(data.avatarUrl);
      setAvatarLoadFailed(false);
      setStatus("Avatar updated successfully.");

      await updateProfile({ name, email, organizationName, phone, avatarUrl: data.avatarUrl });
    } catch (e: any) {
      setStatus(e.message || "Failed to upload avatar.");
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
      await updatePassword({ newPassword });
      setStatus("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setStatus(error?.message || "Failed to update password.");
    }
  };

  const onDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action is irreversible.")) return;
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
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{t("account.profile.title")}</p>
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
              <p className="m-0 text-sm font-medium text-[var(--color-neutral-100)]">Profile picture</p>
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
            <label className="grid gap-1 text-sm text-[var(--color-neutral-200)]">
              {t("account.profile.fullName")}
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-neutral-100)] outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-neutral-200)]">
              {t("account.profile.email")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-neutral-100)] outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-neutral-200)]">
              {t("account.profile.orgName")}
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-neutral-100)] outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-neutral-200)]">
              {t("account.profile.phone")}
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-neutral-100)] outline-none ring-cyan-300/40 focus:ring"
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
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{t("account.password.title")}</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-[var(--color-neutral-200)]">
              {t("account.password.new")}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-neutral-100)] outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-[var(--color-neutral-200)]">
              {t("account.password.confirm")}
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[var(--color-neutral-100)] outline-none ring-cyan-300/40 focus:ring"
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
          <p className="m-0 text-sm text-[var(--color-neutral-100)]">{status}</p>
        </section>
      )}

      <section className="card p-4">
        <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{t("account.danger.title")}</p>
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
        rows={auditRows.length > 0 ? auditRows : (isLoadingLogs ? [["Loading logs...", "", "", ""]] : [["No audit logs found", "", "", ""]])}
      />
    </div>
  );
}

