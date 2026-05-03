import { useState } from "react";
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

  const [activeTab, setActiveTab] = useState<"overview" | "infra" | "inventory">("overview");

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

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="m-0 text-3xl font-black tracking-tight text-white">
              {t("vmware.title")}
            </h1>
            <ModeBadge isDummy={isDummyMode} />
          </div>
          <p className="m-0 max-w-[70ch] text-sm font-medium leading-relaxed" style={{ color: "var(--color-neutral-500)" }}>
            {t("vmware.description")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {lastRefresh && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Last Sync</span>
              <span className="text-xs font-mono font-bold text-neutral-400">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          )}
          <button
            className="btn-primary group h-10 px-5"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={14} className={`${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
            <span>{t("vmware.sync")}</span>
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

<<<<<<< HEAD
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

      {/* â”€â”€ Resource + Datastore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid gap-3 xl:grid-cols-[3fr_2fr]">
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
        <VmwareDatastoreHealth datastores={datastores} />
      </section>

      {/* â”€â”€ Hosts + Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid gap-3 xl:grid-cols-2">
        <VmwareHostUsageList hosts={hosts} />
        <VmwareAlertsPanel alerts={alerts} />
      </section>

      {/* â”€â”€ Quick-stats strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {s && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]" style={{ color: "var(--color-neutral-500)" }}>
          <span className="inline-flex items-center gap-1.5">
            <span>VM Health:</span>
            <span className="tabular-nums font-medium" style={{ color: "#7dd3fc" }}>{s.healthyVMs} ok</span>
            <span className="tabular-nums font-medium" style={{ color: "#fcd34d" }}>{s.warningVMs} warn</span>
            <span className="tabular-nums font-medium" style={{ color: "#fda4af" }}>{s.criticalVMs} crit</span>
          </span>
          <span className="w-px h-3 opacity-20" style={{ background: "var(--color-neutral-500)" }} />
          <span className="inline-flex items-center gap-1.5">
            <span>Snapshots:</span>
            <span className="tabular-nums font-medium text-neutral-200">{s.vmsWithSnapshots} VMs</span>
            {s.oldestSnapshotDays !== null && (
              <span className="tabular-nums">(oldest {s.oldestSnapshotDays}d)</span>
            )}
            {s.criticalSnapshotCount > 0 && (
              <span className="tabular-nums font-medium" style={{ color: "#fda4af" }}>{s.criticalSnapshotCount} crit</span>
            )}
          </span>
          <span className="w-px h-3 opacity-20" style={{ background: "var(--color-neutral-500)" }} />
          <span className="inline-flex items-center gap-1.5">
            <span>Tools:</span>
            <span className="tabular-nums font-medium text-neutral-200">{s.toolsRunning} running</span>
            {s.toolsNotRunning > 0 && (
              <span className="tabular-nums font-medium" style={{ color: "#fcd34d" }}>{s.toolsNotRunning} stopped</span>
            )}
            <span className="tabular-nums">{s.guestIpsAvailable} IPs</span>
          </span>
=======
      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="tabs-list">
          <button
            className={`tab-trigger ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`tab-trigger ${activeTab === "infra" ? "active" : ""}`}
            onClick={() => setActiveTab("infra")}
          >
            Infrastructure
          </button>
          <button
            className={`tab-trigger ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            VM Inventory
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{s?.runningVMs ?? 0} Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{alerts.length} Alerts</span>
          </div>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-up">
          {/* 4 KPI Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <VmwareMetricCard
              icon={<Monitor size={18} />}
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
              icon={<Server size={18} />}
              label={t("vmware.stats.hosts")}
              value={s?.totalHosts ?? 0}
              delay={0.05}
              valueTone={s && s.disconnectedHosts > 0 ? "danger" : "ok"}
              subMetrics={[
                { label: t("vmware.stats.connected"),   value: s?.connectedHosts ?? 0,    tone: "ok" },
                { label: t("vmware.stats.issues"),      value: s?.disconnectedHosts ?? 0, tone: s && s.disconnectedHosts > 0 ? "danger" : "neutral" },
                { label: t("vmware.stats.maintenance"), value: s?.maintenanceHosts ?? 0,  tone: "neutral" },
              ]}
            />
            <VmwareMetricCard
              icon={<Database size={18} />}
              label={t("vmware.stats.storage")}
              value={s ? `${s.storageUsagePercent.toFixed(1)}` : "—"}
              unit="%"
              delay={0.10}
              valueTone={s && s.storageUsagePercent >= 90 ? "danger" : s && s.storageUsagePercent >= 75 ? "warn" : "default"}
              subMetrics={[
                { label: "Used",  value: s ? formatTiB(s.totalStorageUsedTiB) : "—" },
                { label: "Total", value: s ? formatTiB(s.totalStorageCapacityTiB) : "—" },
                { label: ">85%",  value: s?.datastoresAbove85Pct ?? 0, tone: s && s.datastoresAbove85Pct > 0 ? "warn" : "ok" },
              ]}
            />
            <VmwareMetricCard
              icon={<Cpu size={18} />}
              label={t("vmware.stats.cpuUsage")}
              value={clusterPerf ? `${clusterPerf.cpuUsagePct}` : s ? `${s.clusterCpuUsagePct}` : "—"}
              unit="%"
              delay={0.15}
              valueTone={
                (clusterPerf?.cpuUsagePct ?? s?.clusterCpuUsagePct ?? 0) >= 90 ? "danger" :
                (clusterPerf?.cpuUsagePct ?? s?.clusterCpuUsagePct ?? 0) >= 75 ? "warn" : "default"
              }
              subMetrics={[
                { label: "Mem", value: `${clusterPerf?.memUsagePct ?? s?.clusterMemUsagePct ?? 0}%` },
                { label: "vCPU", value: `${s?.totalAllocatedVcpu ?? 0}` },
                { label: "RAM", value: s ? `${s.totalAllocatedMemoryGiB} GiB` : "—" },
              ]}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
             <div className="xl:col-span-2">
                <VmwareResourceBars
                  title={t("vmware.resource.title")}
                  subtitle={t("vmware.resource.subtitle")}
                  bars={storageBars}
                  footer={[
                    { label: "vCPUs", value: String(s?.totalAllocatedVcpu ?? 0) },
                    { label: "RAM",   value: s ? `${s.totalAllocatedMemoryGiB} GiB` : "—" },
                    { label: t("vmware.stats.clusters"), value: String(s?.totalClusters ?? 0) },
                  ]}
                />
             </div>
             <VmwareAlertsPanel alerts={alerts} />
          </section>
>>>>>>> 8b6e4206a7c69f88ef889c8c8cb53fadd8d4f39b
        </div>
      )}

      {activeTab === "infra" && (
        <div className="space-y-6 animate-fade-up">
          <section className="grid gap-6 xl:grid-cols-2">
            <VmwareHostUsageList hosts={hosts} />
            <VmwareDatastoreHealth datastores={datastores} />
          </section>

          {/* Quick-stats strip (Health · Snapshots · Tools) */}
          {s && (
            <div
              className="glass-panel p-6 grid gap-8 sm:grid-cols-3"
            >
              {/* VM Health */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    <span className="font-bold text-white text-sm">{t("vmware.health.title")}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">{( (s.healthyVMs / Math.max(s.runningVMs, 1)) * 100).toFixed(0)}% Healthy</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                  <div style={{ width: `${(s.healthyVMs / Math.max(s.runningVMs, 1)) * 100}%`, background: "#10b981" }} />
                  <div style={{ width: `${(s.warningVMs / Math.max(s.runningVMs, 1)) * 100}%`, background: "#f59e0b" }} />
                  <div style={{ width: `${(s.criticalVMs / Math.max(s.runningVMs, 1)) * 100}%`, background: "#f43f5e" }} />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5" style={{ color: "#10b981" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" /> {s.healthyVMs} Healthy
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" /> {s.warningVMs} Warn
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color: "#f43f5e" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" /> {s.criticalVMs} Crit
                  </div>
                </div>
              </div>

              {/* Snapshot Risk */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-primary" />
                  <span className="font-bold text-white text-sm">{t("vmware.snapshot.title")}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: t("vmware.snapshot.vms"), value: String(s.vmsWithSnapshots) },
                    { label: t("vmware.snapshot.oldest"), value: s.oldestSnapshotDays !== null ? `${s.oldestSnapshotDays}d` : "—" },
                    { label: "Crit count", value: String(s.criticalSnapshotCount), danger: s.criticalSnapshotCount > 0 },
                  ].map(row => (
                    <div key={row.label} className="bg-white/5 p-2.5 rounded-lg">
                      <span className="block text-[9px] font-bold uppercase text-neutral-500 mb-1">{row.label}</span>
                      <span className={`text-sm font-bold tabular-nums ${row.danger ? "text-rose-500" : "text-white"}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VMware Tools */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-primary" />
                  <span className="font-bold text-white text-sm">{t("vmware.tools.title")}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Running",    value: String(s.toolsRunning),    ok: true },
                    { label: "Issues", value: String(s.toolsNotRunning), warn: s.toolsNotRunning > 0 },
                    { label: "IPs Found",        value: String(s.guestIpsAvailable) },
                  ].map(row => (
                    <div key={row.label} className="bg-white/5 p-2.5 rounded-lg">
                      <span className="block text-[9px] font-bold uppercase text-neutral-500 mb-1">{row.label}</span>
                      <span className={`text-sm font-bold tabular-nums ${row.ok ? "text-emerald-500" : row.warn ? "text-amber-500" : "text-white"}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="animate-fade-up">
          <VmwareInventoryTable
            vms={localVms}
            onSelectVm={id => void selectVm(id)}
          />
        </div>
      )}

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
