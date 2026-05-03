import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

const FIELD = "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-full";
const LABEL = "block text-xs text-slate-400 mb-1";

const SENIORITY_OPTIONS = ["junior", "mid", "senior", "lead", "manager"];



export default function AccountsPage() {
  const { t } = useAppSettings();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", department: "", role: "", seniority: "mid",
  });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts-page"],
    queryFn: () => fetchApi<any>("/api/dw/employees/"),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      fetchApi<any>("/api/employees/", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["accounts-page"] });
      setMsg({ type: "ok", text: `Employee "${res.name}" created successfully.` });
      setForm({ name: "", email: "", password: "", department: "", role: "", seniority: "mid" });
      setShowForm(false);
    },
    onError: (err: any) => {
      setMsg({ type: "err", text: err.message || "Failed to create employee." });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setMsg({ type: "err", text: "Name, email, and password are required." });
      return;
    }
    createMutation.mutate(form);
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isLoading || !data) {
    return <PageSkeleton />;
  }

  const rows = (data?.employees || []).map((emp: any) => [
    emp.name || "Unknown",
    emp.email || "No email",
    emp.role || emp.department || "Employee",
    emp.department || "—",
    emp.is_active ? "Active" : "Inactive",
  ]);

  const stats = [
    { label: t("accounts.stats.total"), value: String(data?.total || 0) },
    { label: t("accounts.stats.admins"), value: String(data?.employees?.filter((e: any) => e.role?.toLowerCase() === "admin").length || 0) },
    { label: t("accounts.stats.staff"), value: String(data?.employees?.filter((e: any) => e.role?.toLowerCase() !== "admin").length || 0) },
    { label: t("accounts.stats.atRisk"), value: String(data?.employees?.filter((e: any) => e.device?.latest_risk_score < 50).length || 0), tone: "danger" as const },
  ];

  return (
    <div className="page-section min-h-0">
      <PageHeader
        badge={t("accounts.badge")}
        title={t("accounts.title")}
        description={t("accounts.description")}
      />

      <StatGrid stats={stats} />

      {/* Feedback banner */}
      {msg && (
        <div className={[
          "flex items-center justify-between rounded-lg border px-4 py-3 text-sm",
          msg.type === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-rose-500/30 bg-rose-500/10 text-rose-300",
        ].join(" ")}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} className="ml-4 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Create Employee panel */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-white">Employee Accounts</p>
            <p className="m-0 mt-1 text-xs text-slate-400">
              Create a new employee account. They can then log in via the employee portal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setMsg(null); }}
            className="btn-primary text-sm"
          >
            {showForm ? "Cancel" : "+ New Employee"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-5 border-t border-white/8 pt-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className={LABEL}>Full Name *</label>
                <input type="text" value={form.name} onChange={set("name")} placeholder="Jane Doe" className={FIELD} required />
              </div>
              <div>
                <label className={LABEL}>Email Address *</label>
                <input type="email" value={form.email} onChange={set("email")} placeholder="jane.doe@company.com" className={FIELD} required />
              </div>
              <div>
                <label className={LABEL}>Password *</label>
                <input type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 characters" className={FIELD} required minLength={8} />
              </div>
              <div>
                <label className={LABEL}>Department</label>
                <input type="text" value={form.department} onChange={set("department")} placeholder="e.g. Engineering" className={FIELD} />
              </div>
              <div>
                <label className={LABEL}>Role / Job Title</label>
                <input type="text" value={form.role} onChange={set("role")} placeholder="e.g. Developer" className={FIELD} />
              </div>
              <div>
                <label className={LABEL}>Seniority</label>
                <select value={form.seniority} onChange={set("seniority")} className={FIELD}>
                  {SENIORITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary text-sm"
              >
                {createMutation.isPending ? "Creating…" : "Create Employee"}
              </button>
              <p className="m-0 text-xs text-slate-500">* Required fields</p>
            </div>
          </form>
        )}
      </div>

      <section className="grid flex-1 min-h-0 gap-3 xl:grid-cols-5">
        <div className="xl:col-span-4 min-h-0 flex">
          <DataTable
            className="h-full flex-1"
            title={t("accounts.table.title")}
            columns={[t("table.name"), t("table.email"), t("table.role"), "Department", t("table.status")]}
            filterColumn={t("table.status")}
            searchPlaceholder={t("accounts.search")}
            rows={rows}
            minWidth={500}
          />
        </div>
        <section className="card p-5 h-full">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{t("accounts.assist.title")}</p>
          <ul className="m-0 mt-3 space-y-2 pl-5 text-sm text-[var(--color-neutral-400)]">
            <li>{t("accounts.assist.forcePassword")}</li>
            <li>{t("accounts.assist.bulkMfa")}</li>
            <li>{t("accounts.assist.suspend")}</li>
            <li>{t("accounts.assist.review")}</li>
          </ul>
        </section>
      </section>

      <StatGrid
        stats={[
          { label: t("accounts.stats2.passwordResets"), value: "12" },
          { label: t("accounts.stats2.privileged"), value: "14", tone: "warn" },
          { label: t("accounts.stats2.noMfa"), value: "5", tone: "danger" },
          { label: t("accounts.stats2.lastSync"), value: "2m ago" },
        ]}
      />
    </div>
  );
}
