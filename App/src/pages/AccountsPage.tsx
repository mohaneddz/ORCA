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
    const staff  = accounts.filter((account) => account.role === "staff").length;

    return [
      { label: "Total Accounts", value: String(accounts.length), trend: 2.4 },
      { label: "Admin Accounts", value: String(admins) },
      { label: "Staff Accounts", value: String(staff),  trend: 1.1 },
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
        <section className="card p-5">
          <p className="m-0 mb-4 text-sm font-semibold text-white">Create Account</p>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateAccount}>
            {[
              { label: "Email",        type: "email",    value: email,            setter: setEmail,            required: true },
              { label: "Password",     type: "password", value: password,         setter: setPassword,         required: true },
              { label: "Full Name",    type: "text",     value: fullName,         setter: setFullName,         required: false },
              { label: "Phone",        type: "tel",      value: phone,            setter: setPhone,            required: false },
              { label: "Organization", type: "text",     value: organizationName, setter: setOrganizationName, required: false },
            ].map(({ label, type, value, setter, required }) => (
              <label key={label} className="grid gap-1.5" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                {label}
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required={required}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "0.5rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.84rem",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(168,85,247,0.5)"; }}
                  onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
              </label>
            ))}
            <label className="grid gap-1.5" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                style={{
                  background: "#0c1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "0.5rem 0.75rem",
                  color: "#fff",
                  fontSize: "0.84rem",
                  outline: "none",
                }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button type="submit" className="btn-primary md:col-span-2 justify-center">
              Create Account
            </button>
          </form>
        </section>
      )}

      <section className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="m-0 text-sm font-semibold text-white">Managed Accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#475569", padding: "1.5rem" }}>
                    Loading accounts...
                  </td>
                </tr>
              )}

              {!isLoading && accounts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#475569", padding: "1.5rem" }}>
                    No accounts found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.full_name}</td>
                    <td>{account.email}</td>
                    <td>
                      <span className={account.role === "admin" ? "status-ok" : "status-neutral"}>
                        {account.role}
                      </span>
                    </td>
                    <td>{account.organization_name}</td>
                    <td>{account.phone || "-"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void onDeleteAccount(account.id)}
                        disabled={!isAdmin || account.id === user?.id}
                        className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderColor: "rgba(244,63,94,0.3)", color: "#fb7185" }}
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
        <section
          className="card px-5 py-3"
          style={{
            borderColor: status.includes("success") ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)",
          }}
        >
          <p
            className="m-0 text-sm"
            style={{ color: status.includes("success") ? "#34d399" : "#fb7185" }}
          >
            {status}
          </p>
        </section>
      )}
    </div>
  );
}


