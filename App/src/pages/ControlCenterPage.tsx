import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useControlCenterQuery } from "@/hooks/queries/useControlCenterQuery";

function SummaryPanel({ totals }: { totals: Array<{ label: string; value: number; color: string }> }) {
  const total = totals.reduce((sum, item) => sum + item.value, 0);
  const topState = totals.reduce((max, item) => (item.value > max.value ? item : max), totals[0]);

  return (
    <section className="card h-full p-5">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-start justify-between">
          <div><p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Approval Summary</p><p className="m-0 mt-1 text-xs text-slate-400">Current queue state</p></div>
          <div className="rounded-full border border-slate-700 px-2 py-1 text-xs text-[var(--color-neutral-300)]">Total: <span className="font-semibold text-[var(--color-neutral-100)]">{total}</span></div>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
          {totals.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-[var(--color-neutral-300)]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
              <span className="font-semibold text-[var(--color-neutral-100)]">{item.value}</span>
            </div>
          ))}
          <div className="rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">Highest load: <span className="font-semibold text-[var(--color-neutral-100)]">{topState.label}</span> ({topState.value})</div>
        </div>
        <p className="m-0 mt-3 text-xs text-slate-500">Updated 2 minutes ago</p>
      </div>
    </section>
  );
}

function ActionsPanel({ actions }: { actions: Array<{ label: string; hint: string; intent: "good" | "warn" | "danger" | "neutral" }> }) {
  return (
    <section className="card h-full p-5">
      <div className="flex h-full flex-col">
        <div className="mb-5"><p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Operations Console</p><p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">Prioritized actions & system health</p></div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button key={action.label} type="button" className="flex flex-col items-start gap-1 p-2.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-left group">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-neutral-200)] group-hover:text-[var(--color-primary)] transition-colors">{action.label}</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${action.intent === "danger" ? "bg-red-500/10 text-red-600 dark:text-red-400" : action.intent === "warn" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : action.intent === "good" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>{action.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ControlCenterPage() {
  const { data, isLoading } = useControlCenterQuery();

  if (isLoading || !data) return <div className="page-section min-h-0 xl:h-full">Loading control center...</div>;

  return (
    <div className="page-section min-h-0 xl:h-full">
      <PageHeader badge="Control Center" title="Control Center" description="Operational command surface for employee control workflows, approvals, and escalation handling." />
      <StatGrid stats={data.stats} />
      <section className="grid min-h-0 flex-1 items-stretch gap-3 xl:grid-cols-5">
        <DataTable className="xl:col-span-3" fillHeight title="Employees" columns={["Employee", "Department", "Last Action", "Risk", "Status"]} rows={data.employees} minWidth={860} filterColumn="Status" searchPlaceholder="Search employees or departments" />
        <div className="grid min-h-0 gap-3 xl:col-span-2 xl:grid-rows-2"><SummaryPanel totals={data.totals} /><ActionsPanel actions={data.actions} /></div>
      </section>
    </div>
  );
}
