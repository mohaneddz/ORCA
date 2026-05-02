import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";

function SummaryPanel() {
  const totals = [
    { label: "Pending", value: 12, color: "#f59e0b" },
    { label: "In Review", value: 7, color: "#38bdf8" },
    { label: "Escalated", value: 4, color: "#ef4444" },
  ];
  const total = totals.reduce((sum, item) => sum + item.value, 0);
  const topState = totals.reduce((max, item) => (item.value > max.value ? item : max), totals[0]);

  return (
    <section className="card h-full p-5">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Approval Summary</p>
            <p className="m-0 mt-1 text-xs text-slate-400">Current queue state</p>
          </div>
          <div className="rounded-full border border-slate-700 px-2 py-1 text-xs text-[var(--color-neutral-300)]">
            Total: <span className="font-semibold text-[var(--color-neutral-100)]">{total}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
          {totals.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-[var(--color-neutral-300)]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-semibold text-[var(--color-neutral-100)]">{item.value}</span>
            </div>
          ))}
          <div className="rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            Highest load: <span className="font-semibold text-[var(--color-neutral-100)]">{topState.label}</span>
            {" "}
            ({topState.value})
          </div>
        </div>

        <p className="m-0 mt-3 text-xs text-slate-500">Updated 2 minutes ago</p>
      </div>
    </section>
  );
}

function ActionsPanel() {
  const actions = [
    { label: "Approve Batch", hint: "12 ready", intent: "good" },
    { label: "Rerun Validation", hint: "5 failed", intent: "warn" },
    { label: "Escalate Owners", hint: "4 critical", intent: "danger" },
    { label: "Export Queue", hint: "CSV report", intent: "neutral" },
  ] as const;

  return (
    <section className="card h-full p-5">
      <div className="flex h-full flex-col">
        <div className="mb-3">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Operations Console</p>
          <p className="m-0 mt-1 text-xs text-slate-400">Prioritized actions</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2">
            <p className="m-0 text-[var(--color-neutral-300)]">SLA On Time</p>
            <p className="m-0 mt-1 text-sm font-semibold text-emerald-300">94.2%</p>
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2">
            <p className="m-0 text-[var(--color-neutral-300)]">At Risk</p>
            <p className="m-0 mt-1 text-sm font-semibold text-amber-300">6 items</p>
          </div>
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-2">
            <p className="m-0 text-[var(--color-neutral-300)]">ETA Clear</p>
            <p className="m-0 mt-1 text-sm font-semibold text-cyan-300">38 min</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-xs text-slate-400">
          <p className="m-0">Pipeline</p>
          <p className="m-0 mt-1 text-[var(--color-neutral-300)]">Ingested 31, Validated 24, Approved 18, Executed 15</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="btn-ghost flex items-center justify-between text-xs uppercase tracking-wider"
            >
              <span>{action.label}</span>
              <span
                className={
                  action.intent === "danger"
                    ? "text-red-300"
                    : action.intent === "warn"
                      ? "text-amber-300"
                      : action.intent === "good"
                        ? "text-emerald-300"
                        : "text-slate-400"
                }
              >
                {action.hint}
              </span>
            </button>
          ))}
        </div>

        <p className="m-0 mt-auto pt-2 text-xs text-slate-500">
          Impact projection: clearing pending approvals now reduces escalation risk by 33%.
        </p>
      </div>
    </section>
  );
}

export default function ControlCenterPage() {
  return (
    <div className="page-section min-h-0 xl:h-full">
      <PageHeader
        badge="Control Center"
        title="Control Center"
        description="Operational command surface for employee control workflows, approvals, and escalation handling."
      />

      <StatGrid
        stats={[
          { label: "Queued Actions", value: "32", trend: 8.4 },
          { label: "Executed Today", value: "147", tone: "ok", trend: 12.2 },
          { label: "Failed Actions", value: "5", tone: "danger", trend: -3.1 },
          { label: "Live Integrations", value: "11", trend: 2.7 },
        ]}
      />

      <section className="grid min-h-0 flex-1 items-stretch gap-3 xl:grid-cols-5">
        <DataTable
          className="xl:col-span-3"
          fillHeight
          title="Employees"
          columns={["Employee", "Department", "Last Action", "Risk", "Status"]}
          rows={[
            ["Maya Rahal", "Finance", "MFA reset", "High", "Pending Approval"],
            ["Yousef Hamdi", "Operations", "Session revoke", "Medium", "Executed"],
            ["Sara Bensalem", "HR", "Device isolate", "High", "In Review"],
            ["Nour Khider", "Engineering", "Policy override", "Low", "Executed"],
            ["Karim Tarek", "Sales", "Token revoke", "Medium", "Pending Approval"],
            ["Lina Farouk", "Legal", "Mailbox quarantine", "High", "Escalated"],
          ]}
          minWidth={860}
          filterColumn="Status"
          searchPlaceholder="Search employees or departments"
        />

        <div className="grid min-h-0 gap-3 xl:col-span-2 xl:grid-rows-2">
          <SummaryPanel />
          <ActionsPanel />
        </div>
      </section>
    </div>
  );
}
