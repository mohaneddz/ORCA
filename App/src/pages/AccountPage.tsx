import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatGrid, DataTable } from "@/components/cards/BaseCards";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setOrganizationName(user.organizationName);
    setPhone(user.phone);
  }, [user]);

  if (!user) return null;

  const onSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !organizationName.trim() || !phone.trim()) {
      setStatus("All profile fields are required.");
      return;
    }

    void updateProfile({
      name,
      email,
      organizationName,
      phone,
    }).then((result) => {
      setStatus(result.ok ? "Profile information saved." : result.message || "Failed to save profile.");
    });
  };

  const onSavePassword = (event: FormEvent<HTMLFormElement>) => {
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

    void updatePassword({ newPassword }).then((result) => {
      if (!result.ok) {
        setStatus(result.message || "Failed to update password.");
        return;
      }

      setStatus("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    });
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
          { label: "Organization", value: user.organizationName },
          { label: "Last Login", value: new Date(user.lastLoginAt).toLocaleString(), tone: "ok" },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <form className="card p-4" onSubmit={onSaveProfile}>
          <p className="m-0 text-sm font-semibold text-white">Profile Information</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-200">
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Organization name
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md border border-cyan-400/30 bg-cyan-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
          >
            Save Profile
          </button>
        </form>

        <form className="card p-4" onSubmit={onSavePassword}>
          <p className="m-0 text-sm font-semibold text-white">Password Update</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-200">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md border border-cyan-400/30 bg-cyan-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
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
        <p className="m-0 text-sm font-semibold text-white">Danger Zone</p>
        <p className="m-0 mt-2 text-sm text-[var(--color-neutral-500)]">
          Delete this account permanently and sign out immediately.
        </p>
        <button
          type="button"
          onClick={onDeleteAccount}
          className="mt-3 rounded-md border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 hover:bg-red-500/20"
        >
          Delete Account and Sign Out
        </button>
      </section>

      <DataTable
        title="Recent Audit Activity"
        columns={["Action", "Target", "Result", "Date"]}
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


