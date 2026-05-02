import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageDummyQuery } from "@/utils/usePageDummyQuery";
import { DualAreaChart, GroupedBarChart, DonutGauge } from "@/components/ui/TrendChart";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";

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

const STATUS_COLORS: Record<string, string> = {
  high:        "status-danger",
  medium:      "status-warn",
  low:         "status-neutral",
  todo:        "status-neutral",
  "in progress": "status-warn",
  scheduled:   "status-neutral",
  Healthy:     "status-ok",
  "Needs Review": "status-warn",
  Escalated:   "status-danger",
};

function AlertsPanel({ items }: { items: Item[] }) {
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-[var(--color-neutral-100)]">Priority Alerts</p>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-xl px-4 py-3 transition-colors"
            style={{
              background: "var(--color-surface-muted)",
              border: "1px solid var(--color-border-subtle)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-surface-muted)")}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="m-0 text-sm font-medium text-[var(--color-neutral-100)]">{item.title}</p>
                <p className="m-0 mt-0.5 text-xs" style={{ color: "var(--color-neutral-500)" }}>{item.subtitle}</p>
              </div>
              <span className={STATUS_COLORS[item.status] ?? "status-neutral"}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TasksPanel({ items }: { items: Item[] }) {
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-[var(--color-neutral-100)]">Next Actions</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
            style={{
              background: "var(--color-surface-muted)",
              border: "1px solid var(--color-border-subtle)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-surface-muted)")}
          >
            <div>
              <p className="m-0 text-sm font-medium text-[var(--color-neutral-100)]">{item.title}</p>
              <p className="m-0 text-xs" style={{ color: "var(--color-neutral-500)" }}>{item.subtitle}</p>
            </div>
            <span className={STATUS_COLORS[item.status] ?? "status-neutral"}>
              {item.status}
            </span>
          </div>
        ))}
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
      { title: "Validate open incidents", subtitle: "Ensure ticket severity is still accurate.", status: "in progress" },
      { title: "Cross-check ownership", subtitle: "Map entities to the right team member.", status: "todo" },
      { title: "Publish weekly digest", subtitle: "Summarize status for stakeholder channel.", status: "scheduled" },
    ],
    [],
  );

  const rows = useMemo(
    () => [
      { name: `${title} Node A`, owner: "Ops Team",      state: "Healthy" },
      { name: `${title} Node B`, owner: "Security Team", state: "Needs Review" },
      { name: `${title} Node C`, owner: "IT Team",       state: "Healthy" },
      { name: `${title} Node D`, owner: "Compliance",    state: "Escalated" },
    ],
    [title],
  );

  // Dual area chart data
  const dualData = useMemo(() => [
    { name: "Jan", primary: 40, secondary: 28 },
    { name: "Feb", primary: 55, secondary: 35 },
    { name: "Mar", primary: 48, secondary: 42 },
    { name: "Apr", primary: 70, secondary: 50 },
    { name: "May", primary: 63, secondary: 55 },
    { name: "Jun", primary: 80, secondary: 60 },
    { name: "Jul", primary: 72, secondary: 65 },
  ], []);

  // Grouped bar chart data
  const barData = useMemo(() => [
    { name: "Mon", primary: 20, secondary: 14 },
    { name: "Tue", primary: 35, secondary: 22 },
    { name: "Wed", primary: 28, secondary: 30 },
    { name: "Thu", primary: 45, secondary: 25 },
    { name: "Fri", primary: 38, secondary: 35 },
    { name: "Sat", primary: 15, secondary: 10 },
    { name: "Sun", primary: 22, secondary: 18 },
  ], []);

  if (isLoading || !data) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-section">
      <PageHeader title={title} description={description} />

      <StatGrid
        stats={data.kpis.map((k, i) => ({
          ...k,
          trend: [28.4, -12.6, 3.1, 11.3][i % 4],
          tone: i === 2 ? "danger" : i === 1 ? "warn" : "default",
        }))}
      />

      {/* Charts row */}
      <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <DualAreaChart
          data={dualData}
          title="Activity Overview"
          primaryLabel="Incidents"
          secondaryLabel="Resolved"
        />
        <DonutGauge
          title="Risk Distribution"
          value={64}
          max={100}
          label="Risk Score"
          breakdown={[
            { label: "Critical",  value: 3,  color: "#fb7185" },
            { label: "High",      value: 9,  color: "#fbbf24" },
            { label: "Medium",    value: 21, color: "#1d4ed8" },
            { label: "Low",       value: 31, color: "#38bdf8" },
          ]}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <AlertsPanel items={alerts} />
        <TasksPanel items={tasks} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <GroupedBarChart
          data={barData}
          title="Weekly Activity"
          primaryLabel="Events"
          secondaryLabel="Resolved"
        />
        <DataTable
          title="Entity Snapshot"
          columns={["Name", "Owner", "State"]}
          rows={rows.map((row) => [row.name, row.owner, row.state])}
          minWidth={380}
          filterColumn="State"
          searchPlaceholder="Search entities or owners"
          renderCell={(cell, row, _rowIndex, cellIndex) =>
            cellIndex === 2 ? <span className={STATUS_COLORS[row[2]] ?? "status-neutral"}>{cell}</span> : cell
          }
        />
      </section>
    </div>
  );
}
