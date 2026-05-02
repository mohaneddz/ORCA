import type { ReactNode } from "react";

export function PageHeader({ title, description, badge }: { title: string; description: string; badge?: string }) {
  return (
    <header className="card p-5 md:p-6">
      {badge && <p className="m-0 text-xs uppercase tracking-[0.1em] text-cyan-200">{badge}</p>}
      <h1 className="m-0 mt-2 text-3xl font-bold tracking-tight text-white">{title}</h1>
      <p className="m-0 mt-2 max-w-[78ch] text-sm text-[var(--color-dim)]">{description}</p>
    </header>
  );
}

export function StatGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string; helper?: string; tone?: "default" | "danger" | "ok" }>;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <article key={stat.label} className="card p-4">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--color-dim)]">{stat.label}</p>
          <p
            className={[
              "m-0 mt-2 text-2xl font-semibold",
              stat.tone === "danger" ? "text-red-200" : stat.tone === "ok" ? "text-emerald-200" : "text-white",
            ].join(" ")}
          >
            {stat.value}
          </p>
          {stat.helper && <p className="m-0 mt-1 text-xs text-[var(--color-dim)]">{stat.helper}</p>}
        </article>
      ))}
    </section>
  );
}

export function BulletActions({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card p-4">
      <p className="m-0 text-sm font-semibold text-white">{title}</p>
      <ul className="m-0 mt-3 space-y-2 pl-5 text-sm text-[var(--color-dim)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function DataTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="m-0 text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[var(--color-dim)]">
              {columns.map((column) => (
                <th key={column} className="px-4 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`} className="border-t border-white/8">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={[
                      "px-4 py-2",
                      cellIndex === 0 ? "text-white" : "text-[var(--color-dim)]",
                    ].join(" ")}
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

export function SplitCards({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <section className="grid gap-3 xl:grid-cols-2">{left}{right}</section>;
}

export function ActionButtonRow({ buttons }: { buttons: string[] }) {
  return (
    <section className="card p-4">
      <p className="m-0 text-sm font-semibold text-white">Report Actions</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button
            key={button}
            type="button"
            className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/20"
          >
            {button}
          </button>
        ))}
      </div>
    </section>
  );
}