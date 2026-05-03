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
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>}
            {subtitle && <p className="m-0 text-xs mt-0.5" style={{ color: "var(--color-neutral-500)" }}>{subtitle}</p>}
          </div>
          <Activity size={14} className="opacity-40" style={{ color: "var(--color-neutral-400)" }} />
        </div>
      )}

      <div className="flex-1 space-y-4">
        {bars.map(bar => {
          const color = barColor(bar.usedPct, bar.color);
          return (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: "var(--color-neutral-300)" }}>{bar.label}</span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
                  {bar.usedPct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(bar.usedPct, 100)}%`,
                    background: color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] tabular-nums" style={{ color: "var(--color-neutral-500)" }}>
                  {bar.usedLabel} / {bar.totalLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {footer && footer.length > 0 && (
        <div
          className="grid gap-4 mt-4 pt-3"
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
            gridTemplateColumns: `repeat(${footer.length}, 1fr)`,
          }}
        >
          {footer.map(f => (
            <div key={f.label} className="text-center">
              <p className="m-0 text-[10px] uppercase tracking-wider" style={{ color: "var(--color-neutral-500)" }}>{f.label}</p>
              <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--color-neutral-100)]">{f.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
