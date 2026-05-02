import { type FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader, SplitCards, StatGrid, BulletActions } from "@/components/cards/BaseCards";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { APP_URLS } from "@/config/urls";
import { supabase } from "@/lib/supabase";

type AccountRow = {
  id: string;
  email: string;
  full_name: string;
  organization_name: string;
  phone: string;
  role: UserRole;
};

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("InnovByte Organization");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  const isAdmin = user?.role === "admin";
  const backendBaseUrl = APP_URLS.api.backendBase;

  const refreshAccounts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,organization_name,phone,role")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      setIsLoading(false);
      return;
    }

    setAccounts((data as AccountRow[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    void refreshAccounts();
  }, []);

  const stats = useMemo(() => {
    const admins = accounts.filter((account) => account.role === "admin").length;
    const staff = accounts.filter((account) => account.role === "staff").length;

    return [
      { label: "Total Accounts", value: String(accounts.length) },
      { label: "Admin Accounts", value: String(admins) },
      { label: "Staff Accounts", value: String(staff) },
      { label: "Your Access", value: isAdmin ? "Admin" : "Staff", tone: isAdmin ? ("ok" as const) : undefined },
    ];
  }, [accounts, isAdmin]);

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!isAdmin) {
      setStatus("Only admins can create accounts from this page.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatus("No active session.");
      return;
    }

    const response = await fetch(`${backendBaseUrl}/accounts/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        role,
        fullName: fullName.trim(),
        organizationName: organizationName.trim(),
        phone: phone.trim(),
      }),
    });

    const payload = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !payload.ok) {
      setStatus(payload.message || "Failed to create account.");
      return;
    }

    setStatus("Account created successfully.");
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
    setRole("staff");
    await refreshAccounts();
  };

  const onDeleteAccount = async (targetUserId: string) => {
    setStatus(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatus("No active session.");
      return;
    }

    const response = await fetch(`${backendBaseUrl}/accounts/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ targetUserId }),
    });

    const payload = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !payload.ok) {
      setStatus(payload.message || "Failed to delete account.");
      return;
    }

    setStatus("Account deleted.");
    await refreshAccounts();
  };

  return (
    <div className="page-section">
      <PageHeader
        badge="Accounts"
        title="Organization Google Accounts"
        description="Actual Supabase-backed account management with role separation (`admin` / `staff`), create/delete operations, and account exposure context."
      />

      <StatGrid stats={stats} />

      <SplitCards
        left={
          <BulletActions
            title="Security Controls"
            items={[
              "Account creation auto-confirms email (no verification step).",
              "Only admins can create admin accounts.",
              "Only admins can delete other users.",
              "Any user can delete their own account from Account page.",
            ]}
          />
        }
        right={
          <BulletActions
            title="Operational Notes"
            items={[
              "Roles are stored in `public.profiles.role` and user metadata.",
              "RLS protects profile access and role updates.",
              "Delete account action removes auth user and profile.",
              "Deleted user is signed out on self-delete.",
            ]}
          />
        }
      />

      {isAdmin && (
        <section className="card p-4">
          <p className="m-0 text-sm font-semibold text-white">Create Account</p>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreateAccount}>
            <label className="grid gap-1 text-sm text-slate-200">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
                required
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
                minLength={8}
                required
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
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
            <label className="grid gap-1 text-sm text-slate-200">
              Organization
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-cyan-400/35 bg-cyan-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20 md:col-span-2"
            >
              Create Account
            </button>
          </form>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="m-0 text-sm font-semibold text-white">Managed Accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[var(--color-dim)]">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Organization</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr className="border-t border-white/8">
                  <td className="px-4 py-3 text-[var(--color-dim)]" colSpan={6}>
                    Loading accounts...
                  </td>
                </tr>
              )}

              {!isLoading && accounts.length === 0 && (
                <tr className="border-t border-white/8">
                  <td className="px-4 py-3 text-[var(--color-dim)]" colSpan={6}>
                    No accounts found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                accounts.map((account) => (
                  <tr key={account.id} className="border-t border-white/8">
                    <td className="px-4 py-2 text-white">{account.full_name}</td>
                    <td className="px-4 py-2 text-[var(--color-dim)]">{account.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                          account.role === "admin"
                            ? "bg-cyan-500/18 text-cyan-100"
                            : "bg-white/10 text-slate-200",
                        ].join(" ")}
                      >
                        {account.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-dim)]">{account.organization_name}</td>
                    <td className="px-4 py-2 text-[var(--color-dim)]">{account.phone || "-"}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => void onDeleteAccount(account.id)}
                        disabled={!isAdmin || account.id === user?.id}
                        className="rounded-md border border-red-400/35 bg-red-500/10 px-2 py-1 text-xs text-red-200 disabled:cursor-not-allowed disabled:opacity-45 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {status && (
        <section className="card px-4 py-3">
          <p className="m-0 text-sm text-slate-200">{status}</p>
        </section>
      )}
    </div>
  );
}
