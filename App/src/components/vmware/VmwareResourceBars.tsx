import { Activity } from "lucide-react";

interface ResourceBar {
  label: string;
  usedPct: number;
  usedLabel: string;
  totalLabel: string;
  color?: string;
}

interface VmwareResourceBarsProps {
  bars: ResourceBar[];
  title?: string;
  subtitle?: string;
  footer?: Array<{ label: string; value: string }>;
}

function barColor(pct: number, base?: string): string {
  if (pct >= 90) return "#fb7185";
  if (pct >= 75) return "#fbbf24";
  return base ?? "var(--color-primary)";
}

export function VmwareResourceBars({ bars, title, subtitle, footer }: VmwareResourceBarsProps) {
  return (
    <div className="card p-5 h-full flex flex-col">
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-5">
          <div>
            {title && <p className="m-0 text-sm font-semibold text-black dark:text-white">{title}</p>}
            {subtitle && <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{subtitle}</p>}
          </div>
          <Activity size={16} style={{ color: "var(--color-primary)" }} />
        </div>
      )}

      <div className="flex-1 space-y-5">
        {bars.map(bar => {
          const color = barColor(bar.usedPct, bar.color);
          return (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: "var(--color-neutral-300)" }}>{bar.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums" style={{ color: "var(--color-neutral-400)" }}>{bar.usedLabel} / {bar.totalLabel}</span>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color }}
                  >
                    {bar.usedPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(bar.usedPct, 100)}%`,
                    background: color,
                    boxShadow: `0 0 8px ${color}55`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {footer && footer.length > 0 && (
        <div
          className="grid gap-3 mt-5 pt-4"
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
            gridTemplateColumns: `repeat(${footer.length}, 1fr)`,
          }}
        >
          {footer.map(f => (
            <div key={f.label} className="text-center">
              <p className="m-0 text-[10px] uppercase tracking-wider" style={{ color: "var(--color-neutral-500)" }}>{f.label}</p>
              <p className="m-0 mt-1 text-base font-bold text-white">{f.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
