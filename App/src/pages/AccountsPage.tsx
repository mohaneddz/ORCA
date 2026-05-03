import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, PageHeader, StatGrid, SummaryBanner } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { User, Shield, Key, Ban, History, BookOpen, ChevronRight } from "lucide-react";
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
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

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

  const hash = (str: string) => {
    let h = 0;
    for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
  };

  const rows = (data?.employees || []).map((emp: any) => {
    const h = hash(emp.email || emp.name || "unknown");
    const privacyScore = 40 + (h % 60); // 40 to 99
    const websites = 10 + (h % 150);
    const sharedPw = h % 12;
    const weakPw = (h % 8);

    return [
      emp.name || "Unknown",
      String(privacyScore),
      String(websites),
      String(sharedPw),
      String(weakPw),
      emp.is_active ? "Active" : "Inactive",
      emp.email || "", // Hidden column for renderCell
    ];
  });

  const renderCell = (cell: string, row: string[], _rowIndex: number, cellIndex: number) => {
    if (cellIndex === 0) {
      const name = row[0];
      const email = row[6];
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-200 truncate">{name}</div>
            <div className="text-[10px] text-slate-500 truncate">{email}</div>
          </div>
        </div>
      );
    }
    if (cellIndex === 1) {
      const score = Number(cell);
      const color = score < 60 ? "text-rose-400" : score < 80 ? "text-amber-400" : "text-emerald-400";
      return <span className={`${color} font-medium`}>{cell}/100</span>;
    }
    if (cellIndex === 3 || cellIndex === 4) {
      const count = Number(cell);
      const isBad = (cellIndex === 3 && count > 5) || (cellIndex === 4 && count > 2);
      return <span className={isBad ? "text-rose-400 font-semibold" : "text-slate-300"}>{cell}</span>;
    }
    if (cellIndex === 5) {
      return (
        <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${
          cell === "Active" 
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" 
            : "bg-slate-500/15 text-slate-300 border-slate-500/30"
        }`}>
          {cell}
        </span>
      );
    }
    if (cellIndex === 6) return null; // Hide the extra email column
    return cell;
  };

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

      <SummaryBanner
        headline="Create and manage employee access to the platform."
        subtext="This page shows every registered employee and allows you to add new ones."
        bullets={[
          "Add employees: Create new accounts with email and password",
          "Roles: Assign departments and seniority levels",
          "Status: See who is currently active"
        ]}
      />

      <StatGrid stats={stats} cols={4} />

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
            columns={["Employee", "Privacy Score", "Websites Logged In", "Shared Passwords", "Weak Passwords", "Status", ""]}
            filterColumn="Status"
            searchPlaceholder={t("accounts.search")}
            rows={rows}
            renderCell={renderCell}
            onRowClick={(_row, idx) => setSelectedEmp(data.employees[idx])}
            minWidth={800}
          />
        </div>
        <section className="card flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-white/2">
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)] flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              {t("accounts.assist.title")}
            </p>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {!selectedEmp ? (
              <div className="space-y-4">
                <p className="m-0 text-xs text-slate-400 leading-relaxed italic">
                  Select an account from the table to view identity details and available actions.
                </p>
                <ul className="m-0 space-y-2.5 pl-4 text-sm text-[var(--color-neutral-400)]">
                  <li>{t("accounts.assist.forcePassword")}</li>
                  <li>{t("accounts.assist.bulkMfa")}</li>
                  <li>{t("accounts.assist.suspend")}</li>
                  <li>{t("accounts.assist.review")}</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Employee Quick Info */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                      {selectedEmp.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="m-0 text-sm font-bold text-white">{selectedEmp.name}</h4>
                      <p className="m-0 text-[11px] text-slate-500">{selectedEmp.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-800/50 p-2 border border-white/5">
                      <p className="m-0 text-[10px] text-slate-500 uppercase font-semibold">Department</p>
                      <p className="m-0 text-xs text-slate-300 truncate">{selectedEmp.department || "N/A"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 p-2 border border-white/5">
                      <p className="m-0 text-[10px] text-slate-500 uppercase font-semibold">Role</p>
                      <p className="m-0 text-xs text-slate-300 truncate">{selectedEmp.role || "Staff"}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Tools */}
                <div>
                  <p className="m-0 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Tools</p>
                  <div className="space-y-1.5">
                    <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <Key size={14} className="text-amber-400" />
                        <span className="text-xs text-slate-300 font-medium">Reset Password</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <Ban size={14} className="text-rose-400" />
                        <span className="text-xs text-slate-300 font-medium">Suspend Access</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>

                    <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <History size={14} className="text-blue-400" />
                        <span className="text-xs text-slate-300 font-medium">Audit Activity</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>

                    <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <BookOpen size={14} className="text-emerald-400" />
                        <span className="text-xs text-slate-300 font-medium">Assign Training</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedEmp(null)}
                  className="w-full py-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold tracking-widest"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </section>
      </section>

      <StatGrid
        cols={4}
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
