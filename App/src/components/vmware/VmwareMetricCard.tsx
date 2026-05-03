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
  ok: "#7dd3fc",
  warn: "#fcd34d",
  danger: "#fda4af",
  default: "var(--color-neutral-100)",
  neutral: "var(--color-neutral-400)",
};

const toneBg: Record<string, string> = {
  ok: "rgba(125,211,252,0.12)",
  warn: "rgba(252,211,77,0.12)",
  danger: "rgba(253,164,175,0.12)",
  default: "rgba(255,255,255,0.035)",
  neutral: "rgba(255,255,255,0.025)",
};

export function VmwareMetricCard({
  icon, label, value, unit, valueTone = "default",
  subMetrics, footer, delay = 0,
}: VmwareMetricCardProps) {
  return (
    <article
      className="kpi-card animate-fade-up flex flex-col justify-between"
      style={{ animationDelay: `${delay}s` }}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--color-neutral-500)" }}>
            {label}
          </p>
          <span className="opacity-40" style={{ color: "var(--color-neutral-400)" }}>{icon}</span>
        </div>

        <p className="m-0 text-[28px] font-bold tabular-nums leading-none tracking-tight" style={{ color: toneColor[valueTone] }}>
          {value}
          {unit && <span className="text-sm font-normal ml-1" style={{ color: "var(--color-neutral-500)" }}>{unit}</span>}
        </p>
      </div>

      {subMetrics && subMetrics.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {subMetrics.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-[10px] tabular-nums">
                <span style={{ color: "var(--color-neutral-500)" }}>{m.label}</span>
                <span className="font-semibold" style={{ color: toneColor[m.tone ?? "default"] }}>{m.value}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "100%",
                    background: toneBg[m.tone ?? "default"],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {footer && <div className="pt-2">{footer}</div>}
    </article>
  );
}
