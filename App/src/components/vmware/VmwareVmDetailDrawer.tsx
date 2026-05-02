import { useEffect } from "react";
import { X, Power, RotateCcw, PauseCircle, PlayCircle, HardDrive, Wifi, Camera, Cpu, Server } from "lucide-react";
import type { VmDetails } from "@/lib/vmware/vmwareTypes";

interface VmwareVmDetailDrawerProps {
  vm: VmDetails | null;
  loading: boolean;
  isDummyMode: boolean;
  onClose: () => void;
  onPowerAction: (vmId: string, action: "start" | "stop" | "reset" | "suspend") => Promise<void>;
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <span className="text-[11px] shrink-0" style={{ color: "var(--color-neutral-500)" }}>{label}</span>
      <span className={`text-[11px] text-right font-medium ${mono ? "font-mono" : ""}`} style={{ color: "var(--color-neutral-200)" }}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-2">
        <span style={{ color: "var(--color-primary)" }}>{icon}</span>
        <p className="m-0 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-neutral-400)" }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function SnapAge({ days }: { days: number }) {
  if (days > 30) return <span className="status-danger">{days}d old</span>;
  if (days > 14) return <span className="status-warn">{days}d old</span>;
  return <span className="status-ok">{days}d old</span>;
}

function PowerBadge({ state }: { state: string }) {
  if (state === "POWERED_ON")  return <span className="status-ok">Powered On</span>;
  if (state === "POWERED_OFF") return <span className="status-neutral">Powered Off</span>;
  return <span className="status-warn">Suspended</span>;
}

function ToolsBadge({ status }: { status: string }) {
  if (status === "RUNNING")     return <span className="status-ok">Running</span>;
  if (status === "NOT_RUNNING") return <span className="status-warn">Not Running</span>;
  if (status === "NOT_INSTALLED") return <span className="status-neutral">Not Installed</span>;
  return <span className="status-neutral">Unknown</span>;
}

export function VmwareVmDetailDrawer({
  vm, loading, isDummyMode, onClose, onPowerAction,
}: VmwareVmDetailDrawerProps) {
  const isOpen = vm !== null || loading;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: "rgba(2,8,20,0.7)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col transition-transform duration-300"
        style={{
          width: "min(520px, 100vw)",
          background: "var(--color-surface-1)",
          borderLeft: "1px solid var(--color-border)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ background: "var(--color-surface-1)", borderBottom: "1px solid var(--color-border)", zIndex: 1 }}
        >
          <div>
            {loading ? (
              <div className="h-5 w-40 rounded-md animate-pulse" style={{ background: "var(--color-surface-3)" }} />
            ) : (
              <>
                <p className="m-0 text-sm font-bold" style={{ color: "var(--color-neutral-100)" }}>{vm?.name}</p>
                <p className="m-0 text-xs font-mono mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{vm?.vm}</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="m-0 text-xs" style={{ color: "var(--color-neutral-500)" }}>Loading VM details…</p>
            </div>
          </div>
        )}

        {vm && !loading && (
          <div className="px-5 py-4 space-y-6">

            {/* 1 – Summary */}
            <Section title="Summary" icon={<Server size={14} />}>
              <Row label="Name"          value={vm.name} />
              <Row label="VM ID"         value={vm.vm} mono />
              <Row label="Power State"   value={<PowerBadge state={vm.power_state} />} />
              <Row label="Host"          value={vm.hostName.replace(".corp.local","")} />
              <Row label="Cluster"       value={vm.clusterName} />
              <Row label="Resource Pool" value={vm.resourcePoolName} />
              <Row label="Guest OS"      value={vm.guestOS} />
              <Row label="IP Address"    value={vm.ipAddress ?? "—"} mono />
              <Row label="VMware Tools"  value={<ToolsBadge status={vm.vmwareTools} />} />
              {vm.uptimeDays !== null && <Row label="Uptime" value={`${vm.uptimeDays} days`} />}
            </Section>

            {/* 2 – Compute */}
            <Section title="Compute" icon={<Cpu size={14} />}>
              <Row label="vCPU Count"      value={vm.cpu} />
              <Row label="Cores/Socket"    value={vm.coresPerSocket} />
              <Row label="RAM"             value={`${vm.memoryMiB} MiB (${(vm.memoryMiB/1024).toFixed(1)} GiB)`} />
              <Row label="CPU Hot Add"     value={vm.cpuHotAdd ? "Enabled" : "Disabled"} />
              <Row label="Mem Hot Add"     value={vm.memoryHotAdd ? "Enabled" : "Disabled"} />
              {vm.power_state === "POWERED_ON" && (
                <>
                  <Row
                    label="CPU Usage"
                    value={
                      <span style={{ color: vm.cpuUsage >= 90 ? "#fb7185" : vm.cpuUsage >= 75 ? "#fbbf24" : "#34d399" }}>
                        {vm.cpuUsage}%
                      </span>
                    }
                  />
                  <Row
                    label="Memory Usage"
                    value={
                      <span style={{ color: vm.memoryUsage >= 90 ? "#fb7185" : vm.memoryUsage >= 75 ? "#fbbf24" : "#34d399" }}>
                        {vm.memoryUsage}%
                      </span>
                    }
                  />
                </>
              )}
            </Section>

            {/* 3 – Disks */}
            <Section title="Disks" icon={<HardDrive size={14} />}>
              {vm.disks.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-neutral-500)" }}>No disks</p>
              ) : (
                vm.disks.map(disk => (
                  <div
                    key={disk.disk}
                    className="rounded-lg p-3 space-y-1"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: "var(--color-neutral-200)" }}>{disk.label}</span>
                      <span className="text-xs tabular-nums font-bold" style={{ color: "var(--color-primary)" }}>{disk.capacityGB} GB</span>
                    </div>
                    <p className="m-0 text-[10px] font-mono break-all leading-relaxed" style={{ color: "var(--color-neutral-500)" }}>{disk.backingVmdk}</p>
                    <div className="flex gap-4 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
                      <span>Controller: {disk.controllerType}</span>
                      <span>Bus: {disk.busNumber} · Unit: {disk.unitNumber}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--color-neutral-400)" }}>Datastore: {disk.datastoreName}</span>
                  </div>
                ))
              )}
            </Section>

            {/* 4 – Network */}
            <Section title="Network" icon={<Wifi size={14} />}>
              {vm.nics.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-neutral-500)" }}>No NICs</p>
              ) : (
                vm.nics.map(nic => (
                  <div
                    key={nic.nic}
                    className="rounded-lg p-3 space-y-1"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: "var(--color-neutral-200)" }}>{nic.label}</span>
                      {nic.connected
                        ? <span className="status-ok">Connected</span>
                        : <span className="status-neutral">Disconnected</span>}
                    </div>
                    <Row label="MAC"     value={nic.macAddress} mono />
                    <Row label="Network" value={nic.backingNetwork} />
                    {nic.ipAddress && <Row label="IP" value={nic.ipAddress} mono />}
                  </div>
                ))
              )}
            </Section>

            {/* 5 – Snapshots */}
            <Section title="Snapshots" icon={<Camera size={14} />}>
              {vm.snapshots.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-neutral-400)" }}>No snapshots</p>
              ) : (
                vm.snapshots.map(snap => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                  >
                    <div className="min-w-0">
                      <p className="m-0 text-[11px] font-medium truncate" style={{ color: "var(--color-neutral-200)" }}>
                        {snap.name}
                        {snap.isCurrent && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(0,198,193,0.15)", color: "var(--color-primary)" }}>
                            Current
                          </span>
                        )}
                      </p>
                      <p className="m-0 text-[10px] mt-0.5" style={{ color: "var(--color-neutral-500)" }}>
                        {new Date(snap.created).toLocaleDateString()}
                      </p>
                    </div>
                    <SnapAge days={snap.ageDays} />
                  </div>
                ))
              )}
            </Section>

            {/* 6 – Actions */}
            <Section title="Power Actions" icon={<Power size={14} />}>
              {!isDummyMode && vm.power_state !== "POWERED_ON" ? (
                <p className="text-xs" style={{ color: "var(--color-neutral-500)" }}>Actions available in live mode only.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {vm.power_state !== "POWERED_ON" && (
                    <button
                      className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2"
                      onClick={() => onPowerAction(vm.vm, "start")}
                    >
                      <PlayCircle size={13} /> Power On
                    </button>
                  )}
                  {vm.power_state === "POWERED_ON" && (
                    <>
                      <button
                        className="btn-ghost text-xs flex items-center justify-center gap-1.5"
                        onClick={() => onPowerAction(vm.vm, "stop")}
                        style={{ borderColor: "rgba(244,63,94,0.4)", color: "#fb7185" }}
                      >
                        <Power size={13} /> Power Off
                      </button>
                      <button
                        className="btn-ghost text-xs flex items-center justify-center gap-1.5"
                        onClick={() => onPowerAction(vm.vm, "reset")}
                      >
                        <RotateCcw size={13} /> Reset
                      </button>
                      <button
                        className="btn-ghost text-xs flex items-center justify-center gap-1.5"
                        onClick={() => onPowerAction(vm.vm, "suspend")}
                      >
                        <PauseCircle size={13} /> Suspend
                      </button>
                    </>
                  )}
                </div>
              )}
              {isDummyMode && (
                <p className="text-[10px] mt-2" style={{ color: "var(--color-neutral-500)" }}>
                  Dummy mode: actions update local state only.
                </p>
              )}
            </Section>

          </div>
        )}
      </div>
    </>
  );
}
