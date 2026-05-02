import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ─── PageHeader ──────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {badge && (
          <span
            className="mb-2 inline-block text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "#a855f7" }}
          >
            {badge}
          </span>
        )}
        <h1 className="m-0 text-2xl font-bold tracking-tight text-white">{title}</h1>
        <p className="m-0 mt-1.5 max-w-[78ch] text-sm" style={{ color: "#64748b" }}>
          {description}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─── StatGrid – Dashdark-style KPI cards ─────────────── */
type StatItem = {
  label: string;
  value: string;
  helper?: string;
  trend?: number;   // positive = up, negative = down, 0 = flat
  tone?: "default" | "danger" | "ok" | "warn";
  icon?: ReactNode;
};

export function StatGrid({ stats }: { stats: StatItem[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {stats.map((stat, i) => {
        const trendUp   = stat.trend !== undefined && stat.trend > 0;
        const trendDown = stat.trend !== undefined && stat.trend < 0;
        const trendFlat = stat.trend !== undefined && stat.trend === 0;

        const valueColor =
          stat.tone === "danger" ? "#fb7185"
          : stat.tone === "ok"   ? "#34d399"
          : stat.tone === "warn" ? "#fbbf24"
          : "#fff";

        return (
          <article
            key={stat.label}
            className="kpi-card animate-fade-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <p
                className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "#64748b" }}
              >
                {stat.label}
              </p>
              {stat.trend !== undefined && (
                trendUp ? (
                  <span className="badge-up">
                    <TrendingUp size={10} />
                    {Math.abs(stat.trend)}%
                  </span>
                ) : trendDown ? (
                  <span className="badge-down">
                    <TrendingDown size={10} />
                    {Math.abs(stat.trend)}%
                  </span>
                ) : trendFlat ? (
                  <span className="pill">
                    <Minus size={10} />
                    0%
                  </span>
                ) : null
              )}
            </div>

            <p
              className="m-0 text-2xl font-bold tabular-nums"
              style={{ color: valueColor }}
            >
              {stat.value}
            </p>

            {stat.helper && (
              <p className="m-0 mt-1.5 text-xs" style={{ color: "#475569" }}>
                {stat.helper}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}

/* ─── BulletActions ───────────────────────────────────── */
export function BulletActions({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-white">{title}</p>
      <ul className="m-0 space-y-2.5 pl-5 text-sm" style={{ color: "#64748b" }}>
        {items.map((item) => (
          <li key={item} className="leading-relaxed" style={{ color: "#94a3b8" }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── DataTable ───────────────────────────────────────── */
export function DataTable({
  title,
  columns,
  rows,
  actions,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  actions?: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="m-0 text-sm font-semibold text-white">{title}</p>
        {actions}
      </div>
      <div className="overflow-x-auto">
        <table className="data-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    style={cellIndex === 0 ? { color: "#fff", fontWeight: 500 } : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─── SplitCards ──────────────────────────────────────── */
export function SplitCards({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <section className="grid gap-3 xl:grid-cols-2">
      {left}
      {right}
    </section>
  );
}

/* ─── ActionButtonRow ─────────────────────────────────── */
export function ActionButtonRow({ buttons }: { buttons: string[] }) {
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-white">Report Actions</p>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button key={button} type="button" className="btn-ghost text-xs uppercase tracking-wider">
            {button}
          </button>
        ))}
      </div>
    </section>
  );
}
