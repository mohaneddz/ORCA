import { useMemo, useState, type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";

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
            style={{ color: "var(--color-primary)" }}
          >
            {badge}
          </span>
        )}
        <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--color-neutral-100)]">{title}</h1>
        <p className="m-0 mt-1.5 max-w-[78ch] text-sm" style={{ color: "var(--color-neutral-500)" }}>
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

export function StatGrid({
  stats,
  className,
  cols = 3,
}: {
  stats: StatItem[];
  className?: string;
  cols?: 3 | 4;
}) {
  const lgColsClass = cols === 4 ? "lg:grid-cols-5" : "lg:grid-cols-3";
  return (
    <section className={`grid gap-4 sm:grid-cols-2 ${className || lgColsClass}`}>
      {stats.map((stat, i) => {
        const trendUp = stat.trend !== undefined && stat.trend > 0;
        const trendDown = stat.trend !== undefined && stat.trend < 0;
        const trendFlat = stat.trend !== undefined && stat.trend === 0;

        const valueColor =
          stat.tone === "danger" ? "#fb7185"
            : stat.tone === "ok" ? "#34d399"
              : stat.tone === "warn" ? "#fbbf24"
                : "var(--color-neutral-100)";

        return (
          <article
            key={stat.label}
            className="kpi-card animate-fade-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <p
                className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--color-neutral-500)" }}
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
              <p className="m-0 mt-1.5 text-xs" style={{ color: "var(--color-neutral-500)" }}>
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
      <p className="m-0 mb-3 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>
      <ul className="m-0 space-y-2.5 pl-5 text-sm" style={{ color: "var(--color-neutral-500)" }}>
        {items.map((item) => (
          <li key={item} className="leading-relaxed" style={{ color: "var(--color-neutral-400)" }}>
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
  className,
  actions,
  filterColumn,
  filterOptions,
  searchPlaceholder,
  minWidth = 720,
  sortable = true,
  fillHeight = false,
  maxBodyHeight,
  onRowClick,
  renderCell,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  className?: string;
  actions?: ReactNode;
  filterColumn?: string;
  filterOptions?: string[];
  searchPlaceholder?: string;
  minWidth?: number;
  sortable?: boolean;
  fillHeight?: boolean;
  maxBodyHeight?: number;
  onRowClick?: (row: string[], rowIndex: number) => void;
  renderCell?: (cell: string, row: string[], rowIndex: number, cellIndex: number) => ReactNode;
}) {
  const { t } = useAppSettings();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortState, setSortState] = useState<{ index: number; direction: "asc" | "desc" } | null>(null);

  const filterIndex = filterColumn ? columns.indexOf(filterColumn) : -1;

  const resolvedFilterOptions = useMemo(() => {
    if (!filterColumn) return [];
    if (filterOptions?.length) return filterOptions;
    if (filterIndex < 0) return [];
    return Array.from(new Set(rows.map((row) => row[filterIndex]).filter(Boolean)));
  }, [filterColumn, filterIndex, filterOptions, rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const searched = normalizedSearch
      ? rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(normalizedSearch)))
      : rows;

    if (!filterColumn || filterIndex < 0 || activeFilter === "All") {
      return searched;
    }

    return searched.filter((row) => row[filterIndex] === activeFilter);
  }, [activeFilter, filterColumn, filterIndex, rows, search]);

  const displayRows = useMemo(() => {
    if (!sortState) return filteredRows;
    const next = [...filteredRows];
    next.sort((a, b) => {
      const left = a[sortState.index] ?? "";
      const right = b[sortState.index] ?? "";
      const leftNum = Number(left);
      const rightNum = Number(right);
      const bothNumeric = !Number.isNaN(leftNum) && !Number.isNaN(rightNum);
      const compare = bothNumeric ? leftNum - rightNum : left.localeCompare(right, undefined, { sensitivity: "base" });
      return sortState.direction === "asc" ? compare : -compare;
    });
    return next;
  }, [filteredRows, sortState]);

  const toggleSort = (columnIndex: number) => {
    if (!sortable) return;
    setSortState((prev) => {
      if (!prev || prev.index !== columnIndex) {
        return { index: columnIndex, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { index: columnIndex, direction: "desc" };
      }
      return null;
    });
  };

  return (
    <section
      className={[
        "card overflow-hidden",
        fillHeight ? "h-full min-h-0 flex flex-col" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{title}</p>
        {actions}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder ?? `${t("table.search")} ${title.toLowerCase()}`}
          className="table-input w-full max-w-xs"
        />
        {filterColumn && (
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="table-input"
            aria-label={`${title} filter`}
          >
            <option value="All">{t("table.all")} {filterColumn}</option>
            {resolvedFilterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>
      <div
        className={fillHeight ? "min-h-0 flex-1 overflow-auto" : maxBodyHeight ? "overflow-auto" : "overflow-x-auto"}
        style={maxBodyHeight ? { maxHeight: `${maxBodyHeight}px` } : undefined}
      >
        <table className="data-table" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  onClick={() => toggleSort(index)}
                  style={sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
                >
                  {column}
                  {sortState?.index === index ? (sortState.direction === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => (
              <tr
                key={`${row[0]}-${index}`}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    style={cellIndex === 0 ? { color: "var(--color-neutral-200)", fontWeight: 500 } : undefined}
                  >
                    {renderCell ? renderCell(cell, row, index, cellIndex) : cell}
                  </td>
                ))}
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ color: "var(--color-neutral-400)", textAlign: "center" }}>
                  {t("table.noRecords")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─── SummaryBanner ───────────────────────────────────── */
export function SummaryBanner({
  headline,
  subtext,
  bullets,
}: {
  headline: string;
  subtext?: string;
  bullets?: string[];
}) {
  return (
    <section
      className="card p-5"
      style={{ borderLeft: "3px solid var(--color-primary)" }}
    >
      <p
        className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--color-primary)" }}
      >
        At a glance
      </p>
      <p className="m-0 mt-2 text-base font-semibold text-[var(--color-neutral-100)]">
        {headline}
      </p>
      {subtext && (
        <p className="m-0 mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-neutral-400)" }}>
          {subtext}
        </p>
      )}
      {bullets && bullets.length > 0 && (
        <ul className="m-0 mt-3 space-y-1.5 pl-4 text-sm" style={{ color: "var(--color-neutral-400)" }}>
          {bullets.map((b) => (
            <li key={b} className="leading-relaxed">{b}</li>
          ))}
        </ul>
      )}
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
  const { t } = useAppSettings();
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-[var(--color-neutral-100)]">{t("card.reportActions")}</p>
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
