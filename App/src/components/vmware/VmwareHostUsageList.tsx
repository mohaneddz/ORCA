import { Server } from "lucide-react";
import type { HostSummary } from "@/lib/vmware/vmwareTypes";

interface VmwareHostUsageListProps {
  hosts: HostSummary[];
}

function connBadge(state: string, maintenance: boolean) {
  if (maintenance) return <span className="status-warn">Maintenance</span>;
  if (state === "CONNECTED") return <span className="status-ok">Connected</span>;
  if (state === "DISCONNECTED") return <span className="status-danger">Disconnected</span>;
  return <span className="status-warn">Not Responding</span>;
}

function barColor(pct: number): string {
  if (pct >= 85) return "#fb7185";
  if (pct >= 70) return "#fbbf24";
  return "var(--color-primary)";
}

function MiniBar({ pct, label }: { pct: number; label: string }) {
  const color = barColor(pct);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-7 shrink-0" style={{ color: "var(--color-neutral-500)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 6px ${color}44` }}
        />
      </div>
      <span className="text-[10px] w-8 text-right tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function VmwareHostUsageList({ hosts }: VmwareHostUsageListProps) {
  const sorted = [...hosts].sort((a, b) => {
    if (a.connection_state !== b.connection_state) {
      return a.connection_state === "CONNECTED" ? -1 : 1;
    }
    return b.cpuUsagePct - a.cpuUsagePct;
  });

  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-sm font-semibold text-black dark:text-white">Host Load</p>
          <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>
            {hosts.filter(h => h.connection_state === "CONNECTED").length} connected, {hosts.filter(h => h.maintenanceMode).length} maintenance
          </p>
        </div>
        <Server size={16} style={{ color: "var(--color-primary)" }} />
      </div>

      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 320 }}>
        {sorted.map(h => (
          <div
            key={h.host}
            className="p-3 rounded-xl space-y-2"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border-subtle)",
              opacity: h.connection_state !== "CONNECTED" ? 0.65 : 1,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-xs font-medium truncate" style={{ color: "var(--color-neutral-200)" }}>
                  {h.name}
                </p>
                <p className="m-0 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
                  {h.clusterName} · {h.vmCount} VMs
                </p>
              </div>
              {connBadge(h.connection_state, h.maintenanceMode)}
            </div>
            {h.connection_state === "CONNECTED" && !h.maintenanceMode && (
              <div className="space-y-1.5">
                <MiniBar pct={h.cpuUsagePct} label="CPU" />
                <MiniBar pct={h.memoryUsagePct} label="RAM" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
