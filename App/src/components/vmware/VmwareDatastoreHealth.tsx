import { Database } from "lucide-react";
import type { DatastoreSummary } from "@/lib/vmware/vmwareTypes";

interface VmwareDatastoreHealthProps {
  datastores: DatastoreSummary[];
}

function statusBadge(pct: number) {
  if (pct >= 90) return <span className="status-danger">Critical</span>;
  if (pct >= 80) return <span className="status-warn">Warning</span>;
  return <span className="status-ok">Healthy</span>;
}

function usageColor(pct: number): string {
  if (pct >= 90) return "#fb7185";
  if (pct >= 80) return "#fbbf24";
  return "#34d399";
}

function formatBytes(bytes: number): string {
  const TiB = 1024 ** 4;
  const GiB = 1024 ** 3;
  if (bytes >= TiB) return `${(bytes / TiB).toFixed(1)} TiB`;
  return `${(bytes / GiB).toFixed(0)} GiB`;
}

export function VmwareDatastoreHealth({ datastores }: VmwareDatastoreHealthProps) {
  const healthy = datastores.filter(d => d.usage_percent < 80).length;
  const warning = datastores.filter(d => d.usage_percent >= 80 && d.usage_percent < 90).length;
  const critical = datastores.filter(d => d.usage_percent >= 90).length;

  const topFullest = [...datastores]
    .sort((a, b) => b.usage_percent - a.usage_percent)
    .slice(0, 4);

  return (
    <div className="card p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-sm font-semibold text-black dark:text-white">Datastore Health</p>
          <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{datastores.length} datastores monitored</p>
        </div>
        <Database size={16} style={{ color: "var(--color-primary)" }} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <p className="m-0 text-xl font-bold" style={{ color: "#34d399" }}>{healthy}</p>
          <p className="m-0 text-[10px] mt-0.5" style={{ color: "var(--color-neutral-500)" }}>Healthy</p>
        </div>
        <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="m-0 text-xl font-bold" style={{ color: "#fbbf24" }}>{warning}</p>
          <p className="m-0 text-[10px] mt-0.5" style={{ color: "var(--color-neutral-500)" }}>Warning</p>
        </div>
        <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
          <p className="m-0 text-xl font-bold" style={{ color: "#fb7185" }}>{critical}</p>
          <p className="m-0 text-[10px] mt-0.5" style={{ color: "var(--color-neutral-500)" }}>Critical</p>
        </div>
      </div>

      <div
        className="flex-1 space-y-2 pt-2"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <p className="m-0 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-neutral-500)" }}>
          Fullest Datastores
        </p>
        {topFullest.map(ds => {
          const color = usageColor(ds.usage_percent);
          return (
            <div key={ds.datastore} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-medium truncate" style={{ color: "var(--color-neutral-300)" }}>
                    {ds.name}
                  </span>
                  {statusBadge(ds.usage_percent)}
                </div>
                <span className="text-[11px] font-semibold tabular-nums shrink-0 ml-2" style={{ color }}>
                  {ds.usage_percent.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ds.usage_percent}%`, background: color }}
                />
              </div>
              <p className="m-0 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
                {formatBytes(ds.used_space)} used of {formatBytes(ds.capacity)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
