import { Database } from "lucide-react";
import type { DatastoreSummary } from "@/lib/vmware/vmwareTypes";

interface VmwareDatastoreHealthProps {
  datastores: DatastoreSummary[];
}

function statusBadge(pct: number) {
  if (pct >= 90) return <span className="status-danger text-[10px] px-1.5 py-0">Critical</span>;
  if (pct >= 80) return <span className="status-warn text-[10px] px-1.5 py-0">Warning</span>;
  return <span className="status-ok text-[10px] px-1.5 py-0">Healthy</span>;
}

function usageColor(pct: number): string {
  if (pct >= 90) return "#fda4af";
  if (pct >= 80) return "#fcd34d";
  return "#7dd3fc";
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

  const troubled = [...datastores]
    .filter(d => d.usage_percent >= 80)
    .sort((a, b) => b.usage_percent - a.usage_percent);
  const total = Math.max(datastores.length, 1);

  return (
    <div className="card p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Datastore Health</p>
          <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{datastores.length} monitored</p>
        </div>
        <Database size={14} className="opacity-40" style={{ color: "var(--color-neutral-400)" }} />
      </div>

      <div className="space-y-2">
        <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ background: "var(--color-surface-3)" }}>
          <div style={{ width: `${(healthy / total) * 100}%`, background: "#7dd3fc" }} />
          <div style={{ width: `${(warning / total) * 100}%`, background: "#fcd34d" }} />
          <div style={{ width: `${(critical / total) * 100}%`, background: "#fda4af" }} />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1" style={{ color: "#7dd3fc" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#7dd3fc" }} />
            {healthy}
          </span>
          <span className="inline-flex items-center gap-1" style={{ color: "#fcd34d" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#fcd34d" }} />
            {warning}
          </span>
          <span className="inline-flex items-center gap-1" style={{ color: "#fda4af" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#fda4af" }} />
            {critical}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3" style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: 12 }}>
        <p className="m-0 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-neutral-500)" }}>
          {troubled.length > 0 ? "Needs attention" : "All datastores healthy"}
        </p>
        {troubled.map(ds => {
          const color = usageColor(ds.usage_percent);
          return (
            <div key={ds.datastore} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-medium truncate" style={{ color: "var(--color-neutral-200)" }}>
                    {ds.name}
                  </span>
                  {statusBadge(ds.usage_percent)}
                </div>
                <span className="text-[11px] font-semibold tabular-nums shrink-0 ml-2" style={{ color }}>
                  {ds.usage_percent.toFixed(0)}%
                </span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ds.usage_percent}%`, background: color, opacity: 0.8 }}
                />
              </div>
              <p className="m-0 text-[10px]" style={{ color: "var(--color-neutral-500)" }}>
                {formatBytes(ds.used_space)} used of {formatBytes(ds.capacity)}
              </p>
            </div>
          );
        })}
        {troubled.length === 0 && (
          <p className="m-0 text-xs italic" style={{ color: "var(--color-neutral-500)" }}>
            No datastores above 80% usage.
          </p>
        )}
      </div>
    </div>
  );
}
