import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";
const CHART_PRIMARY_BORDER = "rgba(29,78,216,0.45)";

/* ─── Shared tooltip ──────────────────────────────────── */
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[10px] border px-3 py-2 text-xs shadow-[var(--shadow-floating)]"
      style={{
        background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)",
        borderColor: CHART_PRIMARY_BORDER,
        backdropFilter: "blur(10px)",
        color: "var(--color-neutral-200)",
      }}
    >
      {label && <p className="m-0 mb-1 text-[11px]" style={{ color: "var(--color-neutral-500)" }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="m-0 font-semibold" style={{ color: p.color ?? CHART_PRIMARY }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── Gradient defs ───────────────────────────────────── */
function GradientDefs() {
  return (
    <defs>
      <linearGradient id="gradPrimaryBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={CHART_PRIMARY} stopOpacity={0.46} />
        <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.03} />
      </linearGradient>
      <linearGradient id="gradSecondaryBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={CHART_SECONDARY} stopOpacity={0.38} />
        <stop offset="100%" stopColor={CHART_SECONDARY} stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

const AXIS_STYLE = { fill: "var(--color-neutral-500)", fontSize: 11 };

/* ─── TrendChart (single line – blue) ────────────────── */
type TrendChartProps = {
  data: Array<{ name: string; value: number }>;
  title?: string;
  color?: "blue" | "cyan";
};

export default function TrendChart({ data, title = "Weekly Trend", color = "blue" }: TrendChartProps) {
  const stroke  = color === "cyan" ? CHART_SECONDARY : CHART_PRIMARY;
  const gradId  = color === "cyan" ? "gradSecondaryBlue" : "gradPrimaryBlue";

  return (
    <div className="card p-5 h-full flex flex-col">
      <p className="m-0 mb-4 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <GradientDefs />
          <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<DarkTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            name="Value"
            stroke={stroke}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 5, fill: stroke, stroke: "var(--color-surface-1)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── DualAreaChart – two overlapping areas ──────────── */
type DualAreaChartProps = {
  data: Array<{ name: string; primary: number; secondary: number }>;
  title?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export function DualAreaChart({
  data,
  title = "Trend Overview",
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
}: DualAreaChartProps) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>
        <div className="flex items-center gap-4 text-xs text-[var(--color-neutral-500)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: CHART_PRIMARY }} />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: CHART_SECONDARY }} />
            {secondaryLabel}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <GradientDefs />
          <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<DarkTooltip />} />
          <Area
            type="monotone"
            dataKey="primary"
            name={primaryLabel}
            stroke={CHART_PRIMARY}
            strokeWidth={2.5}
            fill="url(#gradPrimaryBlue)"
            dot={false}
            activeDot={{ r: 5, fill: CHART_PRIMARY, stroke: "var(--color-surface-1)", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="secondary"
            name={secondaryLabel}
            stroke={CHART_SECONDARY}
            strokeWidth={2.5}
            fill="url(#gradSecondaryBlue)"
            dot={false}
            activeDot={{ r: 5, fill: CHART_SECONDARY, stroke: "var(--color-surface-1)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── GroupedBarChart – deep blue + cyan bars ────────── */
type GroupedBarChartProps = {
  data: Array<{ name: string; primary: number; secondary: number }>;
  title?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export function GroupedBarChart({
  data,
  title = "Comparison",
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
}: GroupedBarChartProps) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>
        <div className="flex items-center gap-4 text-xs text-[var(--color-neutral-500)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: CHART_PRIMARY }} />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: CHART_SECONDARY }} />
            {secondaryLabel}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey="primary" name={primaryLabel} fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="secondary" name={secondaryLabel} fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── DonutGauge – radial progress ───────────────────── */
type DonutGaugeProps = {
  title?: string;
  value: number;
  max?: number;
  label?: string;
  breakdown?: Array<{ label: string; value: number; color: string }>;
};

export function DonutGauge({
  title = "Distribution",
  value,
  max = 100,
  label = "Score",
  breakdown,
}: DonutGaugeProps) {
  const pct = Math.round((value / max) * 100);

  // Build radial bar data: background arc + filled arc
  const radialData = [
    { name: label, value: pct, fill: "url(#radialGrad)" },
  ];

  return (
    <div className="card p-5">
      {title && <p className="m-0 mb-4 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>}
      <div className="flex flex-col items-center">
        <div className="relative w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="100%"
              startAngle={210}
              endAngle={-30}
              data={[{ value: 100, fill: "var(--color-border-subtle)" }, ...radialData]}
              barSize={16}
            >
              <defs>
                <linearGradient id="radialGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={CHART_PRIMARY} />
                  <stop offset="100%" stopColor={CHART_SECONDARY} />
                </linearGradient>
              </defs>
              <RadialBar background={false} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center mt-1.5">
            <p className="m-0 text-[26px] font-extrabold text-[var(--color-neutral-100)] leading-none">
              {value}
            </p>
            <p className="m-0 mt-[3px] text-[11px] text-[var(--color-neutral-500)]">{label}</p>
          </div>
        </div>

        {breakdown && (
          <div className="w-full mt-3 space-y-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[var(--color-neutral-400)]">
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </span>
                <span className="font-semibold text-[var(--color-neutral-100)]">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

