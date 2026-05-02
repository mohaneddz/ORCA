import { RefreshCw, Server, Cpu, HardDrive, Database, Activity, Shield, Camera, Wrench, Monitor } from "lucide-react";
import { useVmwareDashboard } from "@/hooks/useVmwareDashboard";
import { VmwareMetricCard } from "./VmwareMetricCard";
import { VmwareResourceBars } from "./VmwareResourceBars";
import { VmwareDatastoreHealth } from "./VmwareDatastoreHealth";
import { VmwareHostUsageList } from "./VmwareHostUsageList";
import { VmwareAlertsPanel } from "./VmwareAlertsPanel";
import { VmwareInventoryTable } from "./VmwareInventoryTable";
import { VmwareVmDetailDrawer } from "./VmwareVmDetailDrawer";

function ModeBadge({ isDummy }: { isDummy: boolean }) {
  return isDummy ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      Dummy Data
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
      Live vCenter
    </span>
  );
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
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl px-5 py-3.5"
      style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
    >
      <div>
        <p className="m-0 text-sm font-semibold" style={{ color: "#fb7185" }}>vCenter unreachable</p>
        <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{message}</p>
      </div>
      <button className="btn-ghost text-xs shrink-0" onClick={onRetry}>
        <RefreshCw size={13} className="mr-1.5" /> Retry
      </button>
    </div>
  );
}

function formatTiB(t: number): string {
  return t >= 1 ? `${t.toFixed(1)} TiB` : `${(t * 1024).toFixed(0)} GiB`;
}

export function VmwareDashboard() {
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

  // Top CPU VMs for metric card footer
  const topCpuVms = clusterPerf?.topCpuVms ?? [];
  const topMemVms = clusterPerf?.topMemVms ?? [];

  return (
    <div className="page-section pb-10 relative">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--color-primary)" }}>
              VMware vSphere
            </span>
            <ModeBadge isDummy={isDummyMode} />
          </div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--color-neutral-100)]">
            Virtual Infrastructure
          </h1>
          <p className="m-0 mt-1.5 max-w-[78ch] text-sm" style={{ color: "var(--color-neutral-500)" }}>
            Unified management across ESXi clusters. Data sourced from vSphere REST API and PerformanceManager.
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
            Sync vCenter
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && <ErrorBanner message={error} onRetry={() => void refresh()} />}

      {/* ── Top KPI row (8 cards) ────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VmwareMetricCard
          icon={<Monitor size={15} />}
          label="Total VMs"
          value={s?.totalVMs ?? 0}
          delay={0.00}
          valueTone="default"
          subMetrics={[
            { label: "Running",   value: s?.runningVMs ?? 0,   tone: "ok" },
            { label: "Stopped",   value: s?.stoppedVMs ?? 0,   tone: "neutral" },
            { label: "Suspended", value: s?.suspendedVMs ?? 0, tone: "neutral" },
          ]}
        />
        <VmwareMetricCard
          icon={<Server size={15} />}
          label="ESXi Hosts"
          value={s?.totalHosts ?? 0}
          delay={0.04}
          valueTone={s && s.disconnectedHosts > 0 ? "danger" : "ok"}
          subMetrics={[
            { label: "Connected",     value: s?.connectedHosts ?? 0,     tone: "ok" },
            { label: "Issues",        value: s?.disconnectedHosts ?? 0,  tone: s && s.disconnectedHosts > 0 ? "danger" : "neutral" },
            { label: "Maintenance",   value: s?.maintenanceHosts ?? 0,   tone: "neutral" },
          ]}
        />
        <VmwareMetricCard
          icon={<Activity size={15} />}
          label="Clusters"
          value={s?.totalClusters ?? 0}
          delay={0.08}
          subMetrics={[
            { label: "DRS Enabled", value: s?.drsEnabledClusters ?? 0, tone: "ok" },
            { label: "HA Enabled",  value: s?.haEnabledClusters ?? 0,  tone: "ok" },
          ]}
        />
        <VmwareMetricCard
          icon={<Cpu size={15} />}
          label="Allocated vCPU"
          value={s?.totalAllocatedVcpu ?? 0}
          unit="vCPUs"
          delay={0.12}
          subMetrics={[
            { label: "Avg/VM",  value: `${s?.avgVcpuPerVm ?? 0}` },
          ]}
        />
        <VmwareMetricCard
          icon={<HardDrive size={15} />}
          label="Allocated RAM"
          value={s ? `${s.totalAllocatedMemoryGiB}` : "—"}
          unit="GiB"
          delay={0.16}
          subMetrics={[
            { label: "Avg/VM", value: s ? `${s.avgMemoryGiBPerVm} GiB` : "—" },
          ]}
        />
        <VmwareMetricCard
          icon={<Database size={15} />}
          label="Storage Used"
          value={s ? `${s.storageUsagePercent.toFixed(1)}` : "—"}
          unit="%"
          delay={0.20}
          valueTone={s && s.storageUsagePercent >= 90 ? "danger" : s && s.storageUsagePercent >= 75 ? "warn" : "default"}
          subMetrics={[
            { label: "Used",  value: s ? formatTiB(s.totalStorageUsedTiB) : "—" },
            { label: "Total", value: s ? formatTiB(s.totalStorageCapacityTiB) : "—" },
            { label: ">85%",  value: s?.datastoresAbove85Pct ?? 0, tone: s && s.datastoresAbove85Pct > 0 ? "warn" : "ok" },
          ]}
        />
        <VmwareMetricCard
          icon={<Cpu size={15} />}
          label="CPU Usage"
          value={clusterPerf ? `${clusterPerf.cpuUsagePct}` : s ? `${s.clusterCpuUsagePct}` : "—"}
          unit="%"
          delay={0.24}
          valueTone={
            (clusterPerf?.cpuUsagePct ?? s?.clusterCpuUsagePct ?? 0) >= 90 ? "danger" :
            (clusterPerf?.cpuUsagePct ?? s?.clusterCpuUsagePct ?? 0) >= 75 ? "warn" : "default"
          }
          footer={topCpuVms.length > 0 && (
            <div className="space-y-0.5">
              {topCpuVms.map(v => (
                <div key={v.vmId} className="flex items-center justify-between text-[10px]">
                  <span className="truncate" style={{ color: "var(--color-neutral-500)" }}>{v.name}</span>
                  <span className="font-mono font-semibold" style={{ color: v.cpuPct >= 90 ? "#fb7185" : "#fbbf24" }}>{v.cpuPct}%</span>
                </div>
              ))}
            </div>
          )}
        />
        <VmwareMetricCard
          icon={<HardDrive size={15} />}
          label="Memory Usage"
          value={clusterPerf ? `${clusterPerf.memUsagePct}` : s ? `${s.clusterMemUsagePct}` : "—"}
          unit="%"
          delay={0.28}
          valueTone={
            (clusterPerf?.memUsagePct ?? s?.clusterMemUsagePct ?? 0) >= 90 ? "danger" :
            (clusterPerf?.memUsagePct ?? s?.clusterMemUsagePct ?? 0) >= 75 ? "warn" : "default"
          }
          footer={topMemVms.length > 0 && (
            <div className="space-y-0.5">
              {topMemVms.map(v => (
                <div key={v.vmId} className="flex items-center justify-between text-[10px]">
                  <span className="truncate" style={{ color: "var(--color-neutral-500)" }}>{v.name}</span>
                  <span className="font-mono font-semibold" style={{ color: v.memPct >= 90 ? "#fb7185" : "#fbbf24" }}>{v.memPct}%</span>
                </div>
              ))}
            </div>
          )}
        />
      </section>

      {/* ── Second row (4 panel cards) ───────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Resource Allocation */}
        <VmwareResourceBars
          title="Resource Allocation"
          subtitle="Used vs total across all datastores"
          bars={storageBars}
          footer={[
            { label: "vCPUs",    value: String(s?.totalAllocatedVcpu ?? 0) },
            { label: "RAM",      value: s ? `${s.totalAllocatedMemoryGiB} GiB` : "—" },
            { label: "Clusters", value: String(s?.totalClusters ?? 0) },
          ]}
        />

        {/* Host Load */}
        <VmwareHostUsageList hosts={hosts} />

        {/* Datastore Health */}
        <VmwareDatastoreHealth datastores={datastores} />

        {/* Infrastructure Alerts */}
        <VmwareAlertsPanel alerts={alerts} />
      </section>

      {/* ── VM Health + Snapshot + Tools mini-row ───────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* VM Health Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">VM Health Summary</p>
            <Shield size={15} style={{ color: "var(--color-primary)" }} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden flex">
              {s && (
                <>
                  <div style={{ width: `${(s.healthyVMs / s.runningVMs) * 100}%`, background: "#34d399" }} />
                  <div style={{ width: `${(s.warningVMs / s.runningVMs) * 100}%`, background: "#fbbf24" }} />
                  <div style={{ width: `${(s.criticalVMs / s.runningVMs) * 100}%`, background: "#fb7185" }} />
                </>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Healthy",  val: s?.healthyVMs ?? 0,  color: "#34d399", cls: "status-ok" },
              { label: "Warning",  val: s?.warningVMs ?? 0,  color: "#fbbf24", cls: "status-warn" },
              { label: "Critical", val: s?.criticalVMs ?? 0, color: "#fb7185", cls: "status-danger" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                  <span style={{ color: "var(--color-neutral-400)" }}>{row.label}</span>
                </div>
                <span className="font-semibold tabular-nums" style={{ color: row.color }}>{row.val} VMs</span>
              </div>
            ))}
          </div>
          <p className="m-0 mt-3 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
            Based on CPU/RAM &gt;90% or &gt;75% thresholds and Tools status.
          </p>
        </div>

        {/* Snapshot Risk */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Snapshot Risk</p>
            <Camera size={15} style={{ color: "var(--color-primary)" }} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>VMs with snapshots</span>
              <span className="text-lg font-bold text-white tabular-nums">{s?.vmsWithSnapshots ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Oldest snapshot</span>
              <span className={`text-sm font-semibold tabular-nums ${s && s.oldestSnapshotDays !== null && s.oldestSnapshotDays > 30 ? "text-rose-400" : "text-amber-400"}`}>
                {s?.oldestSnapshotDays !== null ? `${s?.oldestSnapshotDays ?? 0}d` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Critical (&gt;30 days)</span>
              <span className={s && s.criticalSnapshotCount > 0 ? "status-danger" : "status-ok"}>
                {s?.criticalSnapshotCount ?? 0}
              </span>
            </div>
          </div>
          <p className="m-0 mt-3 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
            Old snapshots consume datastore space and increase restore time.
          </p>
        </div>

        {/* VMware Tools */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">VMware Tools / Guest</p>
            <Wrench size={15} style={{ color: "var(--color-primary)" }} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Tools running</span>
              <span className="status-ok">{s?.toolsRunning ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Tools not running</span>
              <span className={s && s.toolsNotRunning > 0 ? "status-warn" : "status-ok"}>{s?.toolsNotRunning ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Guest IPs available</span>
              <span className="text-sm font-semibold text-white tabular-nums">{s?.guestIpsAvailable ?? 0}</span>
            </div>
          </div>
          <p className="m-0 mt-3 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
            VMware Tools required for guest IP, OS, and graceful shutdown.
          </p>
        </div>
      </section>

      {/* ── VM Inventory Table ───────────────────────────────────────────────── */}
      <VmwareInventoryTable
        vms={localVms}
        onSelectVm={id => void selectVm(id)}
      />

      {/* ── VM Detail Drawer ─────────────────────────────────────────────────── */}
      <VmwareVmDetailDrawer
        vm={selectedVm}
        loading={selectedVmLoading}
        isDummyMode={isDummyMode}
        onClose={() => void selectVm(null)}
        onPowerAction={performPowerAction}
      />

      {/* ── Background Bubbles ─────────────────────────────────────────────── */}
      <svg
        className="pointer-events-none fixed bottom-0 right-0 z-0"
        width="280"
        height="200"
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.06 }}
      >
        <circle cx="220" cy="160" r="60" fill="currentColor" className="text-[var(--color-primary)]" />
        <circle cx="260" cy="120" r="40" fill="currentColor" className="text-[var(--color-primary)]" />
        <circle cx="180" cy="180" r="30" fill="currentColor" className="text-[var(--color-primary)]" />
        <circle cx="250" cy="70"  r="25" fill="currentColor" className="text-[var(--color-primary)]" />
        <circle cx="200" cy="90"  r="18" fill="currentColor" className="text-[var(--color-primary)]" />
        <circle cx="150" cy="150" r="15" fill="currentColor" className="text-[var(--color-primary)]" />
      </svg>
    </div>
  );
}
