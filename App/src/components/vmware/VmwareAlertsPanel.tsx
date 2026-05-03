import { AlertTriangle, AlertCircle, Info, Cpu, HardDrive, Server, Camera, Wifi, MemoryStick } from "lucide-react";
import type { VmwareAlert, AlertType } from "@/lib/vmware/vmwareTypes";

interface VmwareAlertsPanelProps {
  alerts: VmwareAlert[];
}

function AlertIcon({ type, size = 12 }: { type: AlertType; size?: number }) {
  const props = { size, className: "shrink-0 opacity-60" };
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
  if (sev === "critical") return <AlertCircle size={12} className="shrink-0" style={{ color: "#fda4af" }} />;
  if (sev === "warning")  return <AlertTriangle size={12} className="shrink-0" style={{ color: "#fcd34d" }} />;
  return <Info size={12} className="shrink-0" style={{ color: "#7dd3fc" }} />;
}

function sevBorder(sev: string): string {
  if (sev === "critical") return "rgba(251,113,133,0.25)";
  if (sev === "warning")  return "rgba(251,191,36,0.25)";
  return "rgba(34,211,238,0.15)";
}

function sevTextColor(sev: string): string {
  if (sev === "critical") return "#fecdd3";
  if (sev === "warning")  return "#fde68a";
  return "#bae6fd";
}

export function VmwareAlertsPanel({ alerts }: VmwareAlertsPanelProps) {
  const critical = alerts.filter(a => a.severity === "critical").length;
  const warning  = alerts.filter(a => a.severity === "warning").length;
  const info = Math.max(alerts.length - critical - warning, 0);
  const total = Math.max(alerts.length, 1);

  return (
    <div className="card flex flex-col h-full p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="m-0 text-sm font-semibold" style={{ color: "var(--color-neutral-100)" }}>Infrastructure Alerts</p>
          <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>
            {alerts.length} total · {critical} critical · {warning} warning
          </p>
        </div>
        <div className="flex gap-1.5">
          {critical > 0 && (
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">{critical}</span>
          )}
          {warning > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">{warning}</span>
          )}
        </div>
      </div>
      <div className="mb-3 h-2 w-full rounded-full overflow-hidden flex" style={{ background: "var(--color-surface-3)" }}>
        <div style={{ width: `${(critical / total) * 100}%`, background: "#fda4af" }} />
        <div style={{ width: `${(warning / total) * 100}%`, background: "#fcd34d" }} />
        <div style={{ width: `${(info / total) * 100}%`, background: "#7dd3fc" }} />
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-center">
            <p className="m-0 text-sm font-medium" style={{ color: "#34d399" }}>All systems healthy</p>
            <p className="m-0 text-xs mt-1" style={{ color: "var(--color-neutral-500)" }}>No active alerts</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: 320 }}>
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-start gap-2 px-2.5 py-2 rounded-md"
              style={{
                background: "var(--color-surface-2)",
                borderLeft: `2px solid ${sevBorder(alert.severity)}`,
              }}
            >
              <SeverityIcon sev={alert.severity} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <AlertIcon type={alert.type} />
                  <span
                    className="text-[11px] font-medium truncate"
                    style={{ color: sevTextColor(alert.severity) }}
                  >
                    {alert.entity}
                  </span>
                </div>
                <p className="m-0 text-[10px] mt-0.5 leading-relaxed" style={{ color: "var(--color-neutral-500)" }}>
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
