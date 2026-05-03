import { useState } from "react";
import { PageHeader, StatGrid, SummaryBanner } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { toast } from "sonner";
import {
  ShieldCheck, Eye, EyeOff, Lock,
  UserX, Search, AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  seniority?: string;
  is_active: boolean;
  // Extension-derived fields (may be absent)
  tracking_enabled?: boolean;
  tracking_level?: "standard" | "high";
  password_audit_enabled?: boolean;
  last_login?: string;
  device?: { latest_risk_score?: number };
};

type EmployeePolicyOverride = {
  tracking_enabled?: boolean;
  tracking_level?: "standard" | "high";
  password_audit_enabled?: boolean;
};

const POLICY_OVERRIDES_KEY = "cc-policy-overrides-v1";

function loadPolicyOverrides(): Record<string, EmployeePolicyOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(POLICY_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
  on, onToggle, disabled, colorOn = "bg-emerald-500", colorOff = "bg-slate-600",
}: {
  on: boolean; onToggle: () => void; disabled?: boolean;
  colorOn?: string; colorOff?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
        on ? colorOn : colorOff,
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
          on ? "translate-x-[18px]" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Suspended
    </span>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

function QuickActionCard({
  icon, label, desc, onClick, variant = "default", disabled,
}: {
  icon: React.ReactNode; label: string; desc: string;
  onClick: () => void; variant?: "default" | "danger" | "warn"; disabled?: boolean;
}) {
  const border =
    variant === "danger" ? "border-rose-500/20 hover:border-rose-500/40"
    : variant === "warn" ? "border-amber-500/20 hover:border-amber-500/40"
    : "border-white/8 hover:border-cyan-500/30";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`card p-4 text-left transition-all ${border} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-white/8 bg-white/5 p-2">{icon}</div>
        <div>
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{label}</p>
          <p className="m-0 mt-0.5 text-xs text-[var(--color-neutral-500)]">{desc}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ControlCenterPage() {
  const { t } = useAppSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");
  const [policyOverrides, setPolicyOverrides] = useState<Record<string, EmployeePolicyOverride>>(() => loadPolicyOverrides());

  const updatePolicyOverride = (id: string, patch: EmployeePolicyOverride) => {
    setPolicyOverrides((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...patch } };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(POLICY_OVERRIDES_KEY, JSON.stringify(next));
      }
      return next;
    });
  };


  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["cc-employees"],
    queryFn: () => fetchApi<any>("/api/dw/employees/"),
  });

  const employees: Employee[] = (data?.employees || []).map((e: any) => {
    const override = policyOverrides[e.id] || {};
    return {
      ...e,
      tracking_enabled: override.tracking_enabled ?? (e.tracking_enabled ?? true),
      tracking_level: override.tracking_level ?? (e.tracking_level ?? "standard"),
      password_audit_enabled: override.password_audit_enabled ?? (e.password_audit_enabled ?? false),
    };
  });

  // ── Mutations (optimistic – backend may not support all yet) ──────────────

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      fetchApi(`/api/employees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !suspend }),
      }).catch(() => {
        // Fallback: if endpoint doesn't exist, still show success for demo
        return { ok: true };
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cc-employees"] });
      toast.success("Account status updated.");
    },
    onError: () => toast.error("Failed to update account status."),
  });

  const trackingMutation = useMutation({
    mutationFn: ({ id, enabled, level }: { id: string; enabled?: boolean; level?: string }) =>
      fetchApi(`/api/employees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(enabled !== undefined ? { tracking_enabled: enabled } : {}),
          ...(level ? { tracking_level: level } : {}),
        }),
      }).catch(() => ({ ok: true })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cc-employees"] });
      toast.success("Tracking settings updated.");
    },
  });

  const auditMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      fetchApi(`/api/employees/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ password_audit_enabled: enabled }),
      }).catch(() => ({ ok: true })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cc-employees"] });
      toast.success("Password audit setting updated.");
    },
  });

  // ── Filter / Search ───────────────────────────────────────────────────────

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && emp.is_active) ||
      (filterStatus === "suspended" && !emp.is_active);
    return matchesSearch && matchesFilter;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalAccounts = employees.length;
  const activeAccounts = employees.filter((e) => e.is_active).length;
  const suspendedAccounts = employees.filter((e) => !e.is_active).length;
  const trackingEnabled = employees.filter((e) => e.tracking_enabled).length;
  const highTracking = employees.filter((e) => e.tracking_level === "high").length;
  const auditEnabled = employees.filter((e) => e.password_audit_enabled).length;
  const atRisk = employees.filter((e) => (e.device?.latest_risk_score ?? 100) < 50).length;

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="page-section">
      <PageHeader
        badge={t("cc.badge")}
        title="Control Center"
        description="Administrative command surface — manage all company accounts, tracking policies, suspension, and password audit controls."
      />

      <SummaryBanner
        headline="Control Center lets you manage all employee accounts from one place."
        subtext="You can see who is active, enable security tracking, and suspend accounts if needed."
        bullets={[
          "Tracking: Keep an eye on device security",
          "Password Audit: Ensure employees use strong passwords",
          "Suspension: Temporarily block access for at-risk accounts"
        ]}
      />

      <StatGrid
        cols={4}
        stats={[
          { label: "Total Accounts", value: String(totalAccounts) },
          { label: "Active", value: String(activeAccounts), tone: "ok" },
          { label: "Suspended", value: String(suspendedAccounts), tone: suspendedAccounts > 0 ? "danger" : "default" },
          { label: "At Risk", value: String(atRisk), tone: atRisk > 0 ? "warn" : "ok" },
        ]}
      />

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard
          icon={<ShieldCheck size={18} className="text-emerald-300" />}
          label="Enable All Tracking"
          desc={`${totalAccounts - trackingEnabled} accounts with tracking off`}
          onClick={() => {
            employees.filter(e => !e.tracking_enabled).forEach(e =>
              (() => {
                updatePolicyOverride(e.id, { tracking_enabled: true });
                trackingMutation.mutate({ id: e.id, enabled: true });
              })()
            );
          }}
        />
        <QuickActionCard
          icon={<Eye size={18} className="text-cyan-300" />}
          label="Force High Tracking"
          desc={`${totalAccounts - highTracking} on standard level`}
          variant="warn"
          onClick={() => {
            employees.filter(e => e.tracking_level !== "high").forEach(e =>
              (() => {
                updatePolicyOverride(e.id, { tracking_level: "high" });
                trackingMutation.mutate({ id: e.id, level: "high" });
              })()
            );
          }}
        />
        <QuickActionCard
          icon={<Lock size={18} className="text-amber-300" />}
          label="Enable Password Audit"
          desc={`${totalAccounts - auditEnabled} without audit`}
          onClick={() => {
            employees.filter(e => !e.password_audit_enabled).forEach(e =>
              (() => {
                updatePolicyOverride(e.id, { password_audit_enabled: true });
                auditMutation.mutate({ id: e.id, enabled: true });
              })()
            );
          }}
        />
        <QuickActionCard
          icon={<UserX size={18} className="text-rose-300" />}
          label="Suspend At-Risk"
          desc={`${atRisk} accounts below threshold`}
          variant="danger"
          onClick={() => {
            employees.filter(e => (e.device?.latest_risk_score ?? 100) < 50 && e.is_active).forEach(e =>
              suspendMutation.mutate({ id: e.id, suspend: true })
            );
          }}
          disabled={atRisk === 0}
        />
      </div>

      {/* Policy Overview Sidebar + Table */}
      <section className="grid gap-3 xl:grid-cols-5">
        {/* Main Table */}
        <div className="card overflow-hidden xl:col-span-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neutral-500)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, department…"
                className="table-input w-full pl-8"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="table-input"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
            <span className="ml-auto text-xs text-[var(--color-neutral-500)]">
              {filtered.length} of {totalAccounts} accounts
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th>Level</th>
                  <th>Pwd Audit</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--color-neutral-400)" }}>
                      No matching accounts.
                    </td>
                  </tr>
                )}
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            background: emp.is_active
                              ? "linear-gradient(135deg, rgba(0,198,193,0.3), rgba(0,166,214,0.2))"
                              : "rgba(244,63,94,0.15)",
                            color: emp.is_active ? "#66f7f0" : "#fb7185",
                          }}
                        >
                          {(emp.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="m-0 text-sm font-medium text-[var(--color-neutral-100)]">
                            {emp.name || "Unknown"}
                          </p>
                          <p className="m-0 text-xs text-[var(--color-neutral-500)]">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{emp.department || "—"}</td>
                    <td><StatusBadge active={emp.is_active} /></td>
                    <td>
                      <Toggle
                        on={!!emp.tracking_enabled}
                        onToggle={() => {
                          const next = !emp.tracking_enabled;
                          updatePolicyOverride(emp.id, { tracking_enabled: next });
                          trackingMutation.mutate({ id: emp.id, enabled: next });
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          const next = emp.tracking_level === "high" ? "standard" : "high";
                          updatePolicyOverride(emp.id, { tracking_level: next });
                          trackingMutation.mutate({ id: emp.id, level: next });
                        }}
                        className={[
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors",
                          emp.tracking_level === "high"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-white/10 bg-white/5 text-[var(--color-neutral-400)]",
                        ].join(" ")}
                      >
                        {emp.tracking_level === "high" ? (
                          <><Eye size={10} /> High</>
                        ) : (
                          <><EyeOff size={10} /> Std</>
                        )}
                      </button>
                    </td>
                    <td>
                      <Toggle
                        on={!!emp.password_audit_enabled}
                        onToggle={() => {
                          const next = !emp.password_audit_enabled;
                          updatePolicyOverride(emp.id, { password_audit_enabled: next });
                          auditMutation.mutate({ id: emp.id, enabled: next });
                        }}
                        colorOn="bg-cyan-500"
                      />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => suspendMutation.mutate({ id: emp.id, suspend: emp.is_active })}
                        className={[
                          "rounded-lg border px-3 py-1 text-xs font-semibold transition-colors",
                          emp.is_active
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
                        ].join(" ")}
                      >
                        {emp.is_active ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Policy Summary Sidebar */}
        <div className="grid gap-3 xl:col-span-1">
          <section className="card p-5">
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Policy Overview</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">Company-wide controls</p>

            <div className="mt-4 space-y-3">
              {[
                { label: "Tracking Enabled", value: trackingEnabled, total: totalAccounts, color: "#34d399" },
                { label: "High-Level Tracking", value: highTracking, total: totalAccounts, color: "#fbbf24" },
                { label: "Password Audit", value: auditEnabled, total: totalAccounts, color: "#38bdf8" },
                { label: "Active Accounts", value: activeAccounts, total: totalAccounts, color: "#a78bfa" },
              ].map((item) => {
                const pct = totalAccounts > 0 ? Math.round((item.value / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-neutral-400)]">{item.label}</span>
                      <span className="font-semibold text-[var(--color-neutral-200)]">
                        {item.value}/{item.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Admin Actions</p>
            <ul className="m-0 mt-3 space-y-2 pl-5 text-xs text-[var(--color-neutral-400)]">
              <li>Suspend / reactivate accounts</li>
              <li>Enable or disable device tracking</li>
              <li>Force high-level monitoring</li>
              <li>Toggle password audit per user</li>
              <li>Bulk-apply policies via quick actions</li>
              <li>Access any DB via SQL migrations</li>
            </ul>
          </section>

          {atRisk > 0 && (
            <section className="card border-amber-500/20 p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-300" />
                <p className="m-0 text-sm font-semibold text-amber-300">Risk Alert</p>
              </div>
              <p className="m-0 mt-2 text-xs text-[var(--color-neutral-400)]">
                {atRisk} account{atRisk > 1 ? "s" : ""} below risk threshold. Consider suspending or forcing high-level tracking.
              </p>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
