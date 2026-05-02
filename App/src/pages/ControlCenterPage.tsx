import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { MOCK_EMPLOYEES, EXPOSURE_BY_TYPE } from "@/data/mockData";

function SummaryPanel() {
  const { t } = useAppSettings();
  const totals = [
    { label: t("table.status.pending"), value: 12, color: "#f59e0b" },
    { label: t("table.status.inReview"), value: 7, color: "#38bdf8" },
    { label: t("table.status.escalated"), value: 4, color: "#ef4444" },
  ];
  const total = totals.reduce((sum, item) => sum + item.value, 0);
  const topState = totals.reduce((max, item) => (item.value > max.value ? item : max), totals[0]);

  return (
    <section className="card h-full p-5">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-white">{t("cc.summary.title")}</p>
            <p className="m-0 mt-1 text-xs text-slate-400">{t("cc.summary.subtitle")}</p>
          </div>
          <div className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
            {t("cc.summary.total")} <span className="font-semibold text-white">{total}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3">
          {totals.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-semibold text-white">{item.value}</span>
            </div>
          ))}
          <div className="rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            {t("cc.summary.highest")} <span className="font-semibold text-white">{topState.label}</span>
            {" "}
            ({topState.value})
          </div>
        </div>

        <p className="m-0 mt-3 text-xs text-slate-500">{t("cc.summary.updated")}</p>
      </div>
    </section>
  );
}

function ActionsPanel() {
  const { t } = useAppSettings();
  const actions = [
    { label: t("cc.actions.approve"), hint: t("cc.actions.approveHint"), intent: "good" },
    { label: t("cc.actions.rerun"), hint: t("cc.actions.rerunHint"), intent: "warn" },
    { label: t("cc.actions.escalate"), hint: t("cc.actions.escalateHint"), intent: "danger" },
    { label: t("cc.actions.export"), hint: t("cc.actions.exportHint"), intent: "neutral" },
  ] as const;

  return (
    <section className="card h-full p-5">
      <div className="flex h-full flex-col">
        <div className="mb-3">
          <p className="m-0 text-sm font-semibold text-white">{t("cc.ops.title")}</p>
          <p className="m-0 mt-1 text-xs text-slate-400">{t("cc.ops.subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2">
            <p className="m-0 text-slate-300">{t("cc.ops.sla")}</p>
            <p className="m-0 mt-1 text-sm font-semibold text-emerald-300">94.2%</p>
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2">
            <p className="m-0 text-slate-300">{t("cc.ops.risk")}</p>
            <p className="m-0 mt-1 text-sm font-semibold text-amber-300">6 items</p>
          </div>
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-2">
            <p className="m-0 text-slate-300">{t("cc.ops.eta")}</p>
            <p className="m-0 mt-1 text-sm font-semibold text-cyan-300">38 min</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/30 p-3 text-xs text-slate-400">
          <p className="m-0">{t("cc.ops.pipeline")}</p>
          <p className="m-0 mt-1 text-slate-300">{t("cc.ops.pipelineStats")}</p>
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
          {t("cc.ops.impact")}
        </p>
      </div>
    </section>
  );
}

export default function ControlCenterPage() {
  const { t } = useAppSettings();

  return (
    <div className="page-section">
      <PageHeader
        badge={t("cc.badge")}
        title={t("cc.title")}
        description={t("cc.description")}
      />

      <StatGrid
        stats={[
          { label: t("cc.stats.queued"), value: "32", trend: 8.4 },
          { label: t("cc.stats.executed"), value: "147", tone: "ok", trend: 12.2 },
          { label: t("cc.stats.failed"), value: "5", tone: "danger", trend: -3.1 },
          { label: t("cc.stats.live"), value: "11", trend: 2.7 },
        ]}
      />

      <section className="grid items-start gap-3 xl:grid-cols-5">
        <DataTable
          className="xl:col-span-3"
          fillHeight
          title={t("cc.table.employees")}
          columns={[t("table.employee"), t("table.lastAction"), t("table.risk"), t("table.status")]}
          rows={MOCK_EMPLOYEES.map(row => [row[0], row[1], t(row[2]), t(row[3])])}
          minWidth={600}
          filterColumn={t("table.status")}
          searchPlaceholder={t("cc.search")}
        />

        <div className="grid gap-3 xl:col-span-2">
          <SummaryPanel />
          <ActionsPanel />
        </div>
      </section>
    </div>
  );
}
