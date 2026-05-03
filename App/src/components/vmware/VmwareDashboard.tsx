import { RefreshCw, Server, Cpu, Database, Shield, Camera, Wrench, Monitor } from "lucide-react";
import { useVmwareDashboard } from "@/hooks/useVmwareDashboard";
import { VmwareMetricCard } from "./VmwareMetricCard";
import { VmwareResourceBars } from "./VmwareResourceBars";
import { VmwareDatastoreHealth } from "./VmwareDatastoreHealth";
import { VmwareHostUsageList } from "./VmwareHostUsageList";
import { VmwareAlertsPanel } from "./VmwareAlertsPanel";
import { VmwareInventoryTable } from "./VmwareInventoryTable";
import { VmwareVmDetailDrawer } from "./VmwareVmDetailDrawer";
import { useAppSettings } from "@/contexts/AppSettingsContext";

function TranslatedModeBadge({ isDummy, t }: { isDummy: boolean; t: (k: string) => string }) {
  return isDummy ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      {t("vmware.dummy")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
      {t("vmware.live")}
    </span>
  );
}

function ModeBadge({ isDummy }: { isDummy: boolean }) {
  const { t } = useAppSettings();
  return <TranslatedModeBadge isDummy={isDummy} t={t} />;
}


function LoadingSkeleton() {
  return (
    <div className="page-section pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: "var(--color-surface-3)" }} />
          <div className="h-7 w-56 rounded animate-pulse" style={{ background: "var(--color-surface-3)" }} />
          <div className="h-3 w-80 rounded animate-pulse" style={{ background: "var(--color-surface-3)" }} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="kpi-card h-24 animate-pulse" style={{ background: "var(--color-surface-2)" }} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card h-64 animate-pulse" style={{ background: "var(--color-surface-2)" }} />
        ))}
      </div>
    </div>
  );
}


function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useAppSettings();
  return <TranslatedErrorBanner message={message} onRetry={onRetry} t={t} />;
}

function TranslatedErrorBanner({ message, onRetry, t }: { message: string; onRetry: () => void; t: (k: string) => string }) {
  return (
    <div className="card p-4 flex items-center gap-4 mb-6" style={{ border: "1px solid rgba(244,63,94,0.2)", background: "rgba(244,63,94,0.05)" }}>
      <Shield size={24} style={{ color: "#f43f5e" }} />
      <div>
        <p className="m-0 text-sm font-semibold" style={{ color: "#fb7185" }}>{t("vmware.unreachable")}</p>
        <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{message}</p>
      </div>
      <button className="btn-ghost text-xs shrink-0" onClick={onRetry}>
        <RefreshCw size={13} className="mr-1.5" /> {t("vmware.retry")}
      </button>
    </div>
  );
}

function formatTiB(t: number): string {
  return t >= 1 ? `${t.toFixed(1)} TiB` : `${(t * 1024).toFixed(0)} GiB`;
}

export function VmwareDashboard() {
  const { t } = useAppSettings();
  const {
    loading, error, isDummyMode,
    localVms, hosts, datastores,
    summary, alerts, clusterPerf,
    selectedVm, selectedVmLoading,
    lastRefresh, refresh, selectVm, performPowerAction,
  } = useVmwareDashboard();

  if (loading) return <LoadingSkeleton />;

  const s = summary;

  // Storage bars data
  const storageBars = datastores.map(d => ({
    label: d.name,
    usedPct: d.usage_percent,
    usedLabel: formatTiB(d.used_space / 1024 ** 4),
    totalLabel: formatTiB(d.capacity / 1024 ** 4),
    color: "var(--color-primary)",
  }));


  return (
    <div className="page-section relative">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--color-primary)" }}>
              {t("vmware.badge")}
            </span>
            <ModeBadge isDummy={isDummyMode} />
          </div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--color-neutral-100)]">
            {t("vmware.title")}
          </h1>
          <p className="m-0 mt-1.5 max-w-[78ch] text-sm" style={{ color: "var(--color-neutral-500)" }}>
            {t("vmware.description")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastRefresh && (
            <span className="text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-ghost text-xs" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {t("vmware.sync")}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      {/* â”€â”€ 4 KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <VmwareMetricCard
          icon={<Monitor size={15} />}
          label={t("vmware.stats.totalVMs")}
          value={s?.totalVMs ?? 0}
          delay={0.00}
          valueTone="default"
          subMetrics={[
            { label: t("vmware.stats.running"),   value: s?.runningVMs ?? 0,   tone: "ok" },
            { label: t("vmware.stats.stopped"),   value: s?.stoppedVMs ?? 0,   tone: "neutral" },
            { label: t("vmware.stats.suspended"), value: s?.suspendedVMs ?? 0, tone: "neutral" },
          ]}
        />
        <VmwareMetricCard
          icon={<Server size={15} />}
          label={t("vmware.stats.hosts")}
          value={s?.totalHosts ?? 0}
          delay={0.06}
          valueTone={s && s.disconnectedHosts > 0 ? "danger" : "ok"}
          subMetrics={[
            { label: t("vmware.stats.connected"),   value: s?.connectedHosts ?? 0,    tone: "ok" },
            { label: t("vmware.stats.issues"),      value: s?.disconnectedHosts ?? 0, tone: s && s.disconnectedHosts > 0 ? "danger" : "neutral" },
            { label: t("vmware.stats.maintenance"), value: s?.maintenanceHosts ?? 0,  tone: "neutral" },
          ]}
        />
        <VmwareMetricCard
          icon={<Database size={15} />}
          label={t("vmware.stats.storage")}
          value={s ? `${s.storageUsagePercent.toFixed(1)}` : "â€”"}
          unit="%"
          delay={0.12}
          valueTone={s && s.storageUsagePercent >= 90 ? "danger" : s && s.storageUsagePercent >= 75 ? "warn" : "default"}
          subMetrics={[
            { label: "Used",  value: s ? formatTiB(s.totalStorageUsedTiB) : "â€”" },
            { label: "Total", value: s ? formatTiB(s.totalStorageCapacityTiB) : "â€”" },
            { label: ">85%",  value: s?.datastoresAbove85Pct ?? 0, tone: s && s.datastoresAbove85Pct > 0 ? "warn" : "ok" },
          ]}
        />
        <VmwareMetricCard
          icon={<Cpu size={15} />}
          label={t("vmware.stats.cpuUsage")}
          value={clusterPerf ? `${clusterPerf.cpuUsagePct}` : s ? `${s.clusterCpuUsagePct}` : "â€”"}
          unit="%"
          delay={0.18}
          valueTone={
            (clusterPerf?.cpuUsagePct ?? s?.clusterCpuUsagePct ?? 0) >= 90 ? "danger" :
            (clusterPerf?.cpuUsagePct ?? s?.clusterCpuUsagePct ?? 0) >= 75 ? "warn" : "default"
          }
          subMetrics={[
            { label: "Mem", value: `${clusterPerf?.memUsagePct ?? s?.clusterMemUsagePct ?? 0}%` },
            { label: "vCPU", value: `${s?.totalAllocatedVcpu ?? 0}` },
            { label: "RAM", value: s ? `${s.totalAllocatedMemoryGiB} GiB` : "â€”" },
          ]}
        />
      </section>

      {/* â”€â”€ 2-column panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid gap-4 xl:grid-cols-2">
        {/* Left: Resource bars + Host load */}
        <div className="grid gap-4">
          <VmwareResourceBars
            title={t("vmware.resource.title")}
            subtitle={t("vmware.resource.subtitle")}
            bars={storageBars}
            footer={[
              { label: "vCPUs", value: String(s?.totalAllocatedVcpu ?? 0) },
              { label: "RAM",   value: s ? `${s.totalAllocatedMemoryGiB} GiB` : "â€”" },
              { label: t("vmware.stats.clusters"), value: String(s?.totalClusters ?? 0) },
            ]}
          />
          <VmwareHostUsageList hosts={hosts} />
        </div>

        {/* Right: Datastore health + Alerts */}
        <div className="grid gap-4">
          <VmwareDatastoreHealth datastores={datastores} />
          <VmwareAlertsPanel alerts={alerts} />
        </div>
      </section>

      {/* â”€â”€ Quick-stats strip (Health Â· Snapshots Â· Tools) â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {s && (
        <div
          className="card px-5 py-4 grid gap-x-8 gap-y-3 sm:grid-cols-3 text-xs"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* VM Health */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={12} style={{ color: "var(--color-primary)" }} />
              <span className="font-semibold text-white text-xs">{t("vmware.health.title")}</span>
            </div>
            <div className="flex items-center gap-2 h-1.5 rounded-full overflow-hidden">
              <div style={{ width: `${(s.healthyVMs / Math.max(s.runningVMs, 1)) * 100}%`, background: "#34d399", height: "100%" }} />
              <div style={{ width: `${(s.warningVMs / Math.max(s.runningVMs, 1)) * 100}%`, background: "#fbbf24", height: "100%" }} />
              <div style={{ width: `${(s.criticalVMs / Math.max(s.runningVMs, 1)) * 100}%`, background: "#fb7185", height: "100%" }} />
            </div>
            <div className="flex gap-3 text-[11px]">
              <span style={{ color: "#34d399" }}>âœ“ {s.healthyVMs}</span>
              <span style={{ color: "#fbbf24" }}>âš  {s.warningVMs}</span>
              <span style={{ color: "#fb7185" }}>âœ— {s.criticalVMs}</span>
            </div>
          </div>

          {/* Snapshot Risk */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Camera size={12} style={{ color: "var(--color-primary)" }} />
              <span className="font-semibold text-white text-xs">{t("vmware.snapshot.title")}</span>
            </div>
            {[
              { label: t("vmware.snapshot.vms"), value: String(s.vmsWithSnapshots) },
              { label: t("vmware.snapshot.oldest"), value: s.oldestSnapshotDays !== null ? `${s.oldestSnapshotDays}d` : "â€”" },
              { label: t("vmware.snapshot.crit"), value: String(s.criticalSnapshotCount), danger: s.criticalSnapshotCount > 0 },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span style={{ color: "var(--color-neutral-400)" }}>{row.label}</span>
                <span className={row.danger ? "status-danger" : "font-semibold text-white tabular-nums"}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* VMware Tools */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench size={12} style={{ color: "var(--color-primary)" }} />
              <span className="font-semibold text-white text-xs">{t("vmware.tools.title")}</span>
            </div>
            {[
              { label: t("vmware.tools.running"),    value: String(s.toolsRunning),    ok: true },
              { label: t("vmware.tools.notRunning"), value: String(s.toolsNotRunning), warn: s.toolsNotRunning > 0 },
              { label: t("vmware.tools.ips"),        value: String(s.guestIpsAvailable) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span style={{ color: "var(--color-neutral-400)" }}>{row.label}</span>
                <span className={row.ok ? "status-ok" : row.warn ? "status-warn" : "font-semibold text-white tabular-nums"}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ VM Inventory (paginated) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <VmwareInventoryTable
        vms={localVms}
        onSelectVm={id => void selectVm(id)}
      />

      {/* â”€â”€ VM Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <VmwareVmDetailDrawer
        vm={selectedVm}
        loading={selectedVmLoading}
        isDummyMode={isDummyMode}
        onClose={() => void selectVm(null)}
        onPowerAction={performPowerAction}
      />
    </div>
  );
}
