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
      className="kpi-card animate-fade-up flex flex-col gap-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-neutral-500)" }}>
          {label}
        </p>
        <span className="opacity-60" style={{ color: "var(--color-primary)" }}>{icon}</span>
      </div>

      <p className="m-0 text-2xl font-bold tabular-nums leading-none" style={{ color: toneColor[valueTone] }}>
        {value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: "var(--color-neutral-500)" }}>{unit}</span>}
      </p>

      {subMetrics && subMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-slate-800/60">
          {subMetrics.map(m => (
            <div key={m.label} className="flex items-center justify-between gap-1">
              <span className="text-[10px]" style={{ color: "var(--color-neutral-500)" }}>{m.label}</span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: toneColor[m.tone ?? "default"] }}>
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
