import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageDummyQuery } from "@/utils/usePageDummyQuery";
import TrendChart from "@/components/ui/TrendChart";
import PageSkeleton from "@/components/ui/PageSkeleton";

type DashboardPageProps = {
  pageKey: string;
  title: string;
  description: string;
};

type Item = {
  title: string;
  subtitle: string;
  status: string;
};

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="page-section">
      <h1 className="m-0 text-3xl font-bold tracking-tight text-white">{title}</h1>
      <p className="m-0 max-w-[74ch] text-sm text-[var(--color-dim)]">{description}</p>
    </header>
  );
}

function KpiGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.label} className="card p-4">
          <p className="m-0 text-xs uppercase tracking-[0.07em] text-[var(--color-dim)]">{item.label}</p>
          <p className="m-0 mt-2 text-2xl font-semibold text-white">{item.value}</p>
        </article>
      ))}
    </section>
  );
}

function AlertsPanel({ items }: { items: Item[] }) {
  return (
    <section className="card p-4">
      <p className="m-0 mb-3 text-sm font-semibold text-white">Priority Alerts</p>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.title} className="rounded-md border border-white/10 bg-white/3 px-3 py-2">
            <p className="m-0 text-sm font-medium text-white">{item.title}</p>
            <p className="m-0 text-xs text-[var(--color-dim)]">{item.subtitle}</p>
            <p className="m-0 mt-1 text-[11px] uppercase tracking-wide text-amber-200">{item.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TasksPanel({ items }: { items: Item[] }) {
  return (
    <section className="card p-4">
      <p className="m-0 mb-3 text-sm font-semibold text-white">Next Actions</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.title} className="flex items-start justify-between rounded-md border border-white/10 px-3 py-2">
            <div>
              <p className="m-0 text-sm font-medium text-white">{item.title}</p>
              <p className="m-0 text-xs text-[var(--color-dim)]">{item.subtitle}</p>
            </div>
            <span className="pill">{item.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EntityTable({ rows }: { rows: Array<{ name: string; owner: string; state: string }> }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="m-0 text-sm font-semibold text-white">Entity Snapshot</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[var(--color-dim)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-white/8">
                <td className="px-4 py-2 text-white">{row.name}</td>
                <td className="px-4 py-2 text-[var(--color-dim)]">{row.owner}</td>
                <td className="px-4 py-2 text-cyan-200">{row.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DashboardPage({ pageKey, title, description }: DashboardPageProps) {
  const { user } = useAuth();
  const { data, isLoading } = usePageDummyQuery(pageKey);

  const alerts = useMemo<Item[]>(() => {
    const suffix = user?.role === "admin" ? "Policy" : "Workflow";
    return [
      { title: `${title} anomaly detected`, subtitle: `Review ${suffix} threshold and affected assets.`, status: "high" },
      { title: `${title} stale integration`, subtitle: "Sync metadata and rerun diagnostics.", status: "medium" },
      { title: "Weekly control audit", subtitle: "Pending verification from assigned owner.", status: "low" },
    ];
  }, [title, user?.role]);

  const tasks = useMemo<Item[]>(
    () => [
      { title: "Validate open incidents", subtitle: "Ensure ticket severity is still accurate.", status: "todo" },
      { title: "Cross-check ownership", subtitle: "Map entities to the right team member.", status: "in progress" },
      { title: "Publish weekly digest", subtitle: "Summarize status for stakeholder channel.", status: "scheduled" },
    ],
    [],
  );

  const rows = useMemo(
    () => [
      { name: `${title} Node A`, owner: "Ops Team", state: "Healthy" },
      { name: `${title} Node B`, owner: "Security Team", state: "Needs Review" },
      { name: `${title} Node C`, owner: "IT Team", state: "Healthy" },
      { name: `${title} Node D`, owner: "Compliance", state: "Escalated" },
    ],
    [title],
  );

  if (isLoading || !data) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-section">
      <SectionHeader title={title} description={description} />
      <KpiGrid items={data.kpis} />

      <section className="grid gap-3 xl:grid-cols-2">
        <AlertsPanel items={alerts} />
        <TasksPanel items={tasks} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <TrendChart data={data.trend} />
        <EntityTable rows={rows} />
      </section>
    </div>
  );
}