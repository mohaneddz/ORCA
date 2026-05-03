import type { ReactNode } from "react";

interface SubMetric {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "danger" | "neutral" | "default";
}

interface VmwareMetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  valueTone?: "ok" | "warn" | "danger" | "default";
  subMetrics?: SubMetric[];
  footer?: ReactNode;
  delay?: number;
}

const toneColor: Record<string, string> = {
  ok: "#34d399",
  warn: "#fbbf24",
  danger: "#fb7185",
  default: "var(--color-neutral-100)",
  neutral: "var(--color-neutral-400)",
};

export function VmwareMetricCard({
  icon, label, value, unit, valueTone = "default",
  subMetrics, footer, delay = 0,
}: VmwareMetricCardProps) {
  return (
    <article
      className="kpi-card animate-fade-up flex flex-col gap-3 group"
      style={{
        animationDelay: `${delay}s`,
        background: `linear-gradient(165deg, var(--color-surface-1), ${toneColor[valueTone]}10)`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-neutral-500)" }}>
          {label}
        </p>
        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors" style={{ color: toneColor[valueTone] === "var(--color-neutral-100)" ? "var(--color-primary)" : toneColor[valueTone] }}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <p className="m-0 text-3xl font-extrabold tabular-nums leading-none tracking-tight" style={{ color: toneColor[valueTone] }}>
          {value}
        </p>
        {unit && <span className="text-xs font-semibold" style={{ color: "var(--color-neutral-500)" }}>{unit}</span>}
      </div>

      {subMetrics && subMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 mt-1 border-t border-white/5">
          {subMetrics.map(m => (
            <div key={m.label} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--color-neutral-500)" }}>{m.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: toneColor[m.tone ?? "default"] }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {footer && <div className="pt-1">{footer}</div>}
    </article>
  );
}
