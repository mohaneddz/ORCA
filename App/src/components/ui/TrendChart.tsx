import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ─── Shared tooltip ──────────────────────────────────── */
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0c1220",
        border: "1px solid rgba(168,85,247,0.25)",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 12,
        color: "#e2e8f0",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {label && <p style={{ margin: 0, marginBottom: 4, color: "#64748b", fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: p.color ?? "#a855f7", fontWeight: 600 }}>
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
      <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#a855f7" stopOpacity={0.5} />
        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

const AXIS_STYLE = { fill: "#475569", fontSize: 11 };

/* ─── TrendChart (single line – purple) ──────────────── */
type TrendChartProps = {
  data: Array<{ name: string; value: number }>;
  title?: string;
  color?: "purple" | "cyan";
};

export default function TrendChart({ data, title = "Weekly Trend", color = "purple" }: TrendChartProps) {
  const stroke  = color === "cyan" ? "#22d3ee" : "#a855f7";
  const gradId  = color === "cyan" ? "gradCyan" : "gradPurple";

  return (
    <div className="card p-5">
      <p className="m-0 mb-4 text-sm font-semibold text-white">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <GradientDefs />
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
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
            activeDot={{ r: 5, fill: stroke, stroke: "#0c1220", strokeWidth: 2 }}
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
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-white">{title}</p>
        <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#a855f7", display: "inline-block" }} />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#22d3ee", display: "inline-block" }} />
            {secondaryLabel}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <GradientDefs />
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<DarkTooltip />} />
          <Area
            type="monotone"
            dataKey="primary"
            name={primaryLabel}
            stroke="#a855f7"
            strokeWidth={2.5}
            fill="url(#gradPurple)"
            dot={false}
            activeDot={{ r: 5, fill: "#a855f7", stroke: "#0c1220", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="secondary"
            name={secondaryLabel}
            stroke="#22d3ee"
            strokeWidth={2.5}
            fill="url(#gradCyan)"
            dot={false}
            activeDot={{ r: 5, fill: "#22d3ee", stroke: "#0c1220", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── GroupedBarChart – purple + cyan bars ───────────── */
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
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-white">{title}</p>
        <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#a855f7", display: "inline-block" }} />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#22d3ee", display: "inline-block" }} />
            {secondaryLabel}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey="primary" name={primaryLabel} fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="secondary" name={secondaryLabel} fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={20} />
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
      {title && <p className="m-0 mb-4 text-sm font-semibold text-white">{title}</p>}
      <div className="flex flex-col items-center">
        <div style={{ position: "relative", width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="100%"
              startAngle={210}
              endAngle={-30}
              data={[{ value: 100, fill: "rgba(255,255,255,0.06)" }, ...radialData]}
              barSize={16}
            >
              <defs>
                <linearGradient id="radialGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <RadialBar background={false} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              marginTop: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", marginTop: 3 }}>{label}</p>
          </div>
        </div>

        {breakdown && (
          <div className="w-full mt-3 space-y-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2" style={{ color: "#94a3b8" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {item.label}
                </span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
