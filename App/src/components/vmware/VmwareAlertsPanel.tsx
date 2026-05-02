import { AlertTriangle, AlertCircle, Info, Cpu, HardDrive, Server, Camera, Wifi, MemoryStick } from "lucide-react";
import type { VmwareAlert, AlertType } from "@/lib/vmware/vmwareTypes";

interface VmwareAlertsPanelProps {
  alerts: VmwareAlert[];
}

function AlertIcon({ type, size = 12 }: { type: AlertType; size?: number }) {
  const props = { size, className: "shrink-0" };
  switch (type) {
    case "cpu":      return <Cpu {...props} />;
    case "memory":   return <MemoryStick {...props} />;
    case "disk":     return <HardDrive {...props} />;
    case "host":     return <Server {...props} />;
    case "snapshot": return <Camera {...props} />;
    case "tools":    return <Wifi {...props} />;
    default:         return <AlertCircle {...props} />;
  }
}

function SeverityIcon({ sev }: { sev: string }) {
  if (sev === "critical") return <AlertCircle size={13} className="text-rose-400 shrink-0" />;
  if (sev === "warning")  return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
  return <Info size={13} className="text-cyan-400 shrink-0" />;
}

function sevStyle(sev: string): string {
  if (sev === "critical") return "border-rose-500/20 bg-rose-500/5";
  if (sev === "warning")  return "border-amber-500/20 bg-amber-500/5";
  return "border-cyan-500/20 bg-cyan-500/5";
}

function sevTextColor(sev: string): string {
  if (sev === "critical") return "#fb7185";
  if (sev === "warning")  return "#fbbf24";
  return "#22d3ee";
}

export function VmwareAlertsPanel({ alerts }: VmwareAlertsPanelProps) {
  const critical = alerts.filter(a => a.severity === "critical").length;
  const warning  = alerts.filter(a => a.severity === "warning").length;

  return (
    <div className="card flex flex-col h-full">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <div>
          <p className="m-0 text-sm font-semibold text-white">Infrastructure Alerts</p>
          <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>
            {alerts.length} total · {critical} critical · {warning} warning
          </p>
        </div>
        <div className="flex gap-2">
          {critical > 0 && (
            <span className="status-danger">{critical} critical</span>
          )}
          {warning > 0 && (
            <span className="status-warn">{warning} warn</span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="text-center">
            <p className="m-0 text-sm font-medium" style={{ color: "#34d399" }}>All systems healthy</p>
            <p className="m-0 text-xs mt-1" style={{ color: "var(--color-neutral-500)" }}>No active alerts</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ maxHeight: 340 }}>
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${sevStyle(alert.severity)}`}
            >
              <SeverityIcon sev={alert.severity} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <AlertIcon type={alert.type} />
                  <span
                    className="text-[11px] font-semibold truncate"
                    style={{ color: sevTextColor(alert.severity) }}
                  >
                    {alert.entity}
                  </span>
                </div>
                <p className="m-0 text-[10px] mt-0.5 leading-relaxed" style={{ color: "var(--color-neutral-500)" }}>
                  {alert.message}
                </p>
              </div>
              <span
                className="text-[9px] font-bold uppercase shrink-0 mt-0.5"
                style={{ color: sevTextColor(alert.severity) }}
              >
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
