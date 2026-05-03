import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { DualAreaChart, GroupedBarChart, DonutGauge } from "@/components/ui/TrendChart";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { fetchApi } from "@/lib/apiClient";

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
  const { t } = useAppSettings();
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-[var(--color-neutral-100)]">{t("dashboard.alerts.title")}</p>
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
  const { t } = useAppSettings();
  return (
    <section className="card p-5">
      <p className="m-0 mb-3 text-sm font-semibold text-[var(--color-neutral-100)]">{t("dashboard.tasks.title")}</p>
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
  const { t } = useAppSettings();
  const { user } = useAuth();
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => fetchApi<any>("/api/dw/summary/"),
  });
  const { data: analyticsData } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => fetchApi<any>("/api/phishing/analytics/"),
  });
  const { data: anomaliesData } = useQuery({
    queryKey: ["dashboard-anomalies"],
    queryFn: () => fetchApi<any>("/api/dw/ml/anomalies/"),
  });
  const { data: trendData } = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: () => fetchApi<any>("/api/dw/trend/?months=6"),
  });
  const { data: managerAlertsData } = useQuery({
    queryKey: ["dashboard-manager-alerts"],
    queryFn: () => fetchApi<any>("/api/phishing/alerts/managers/").catch(() => null),
  });

  const alerts = useMemo<Item[]>(() => {
    const items: Item[] = [];
    if (anomaliesData?.anomalies?.length) {
      items.push(...anomaliesData.anomalies.map((a: any) => ({
        title: `Anomaly: ${a.employee_name}`,
        subtitle: a.reasons?.[0] || "Significant risk score drop",
        status: "high",
      })));
    }
    if (managerAlertsData?.department_alerts?.length) {
      items.push(...managerAlertsData.department_alerts.map((a: any) => ({
        title: `Risk Alert: ${a.department}`,
        subtitle: a.recommendation?.substring(0, 80) + "...",
        status: a.risk_level === "HIGH" ? "high" : a.risk_level === "MEDIUM" ? "medium" : "low",
      })));
    }
    if (items.length === 0) {
      return [{ title: "No alerts", subtitle: "All systems operating normally.", status: "Healthy" }];
    }
    return items;
  }, [anomaliesData, managerAlertsData]);

  const tasks = useMemo<Item[]>(
    () => [
      { title: "Review active campaigns", subtitle: "Ensure phishing simulations are running smoothly.", status: "in progress" },
      { title: "Check Shadow IT alerts", subtitle: "Verify unapproved software on Registered Devices.", status: "todo" },
      { title: "Publish weekly digest", subtitle: "Summarize status for stakeholder channel.", status: "scheduled" },
    ],
    [],
  );

  const rows = useMemo(() => {
    if (summaryData?.leaderboard_top3) {
      return summaryData.leaderboard_top3.map((u: any) => ({
        name: u.name,
        owner: u.department,
        state: `Score: ${u.score}`
      }));
    }
    return [];
  }, [summaryData]);

  // Dual area chart data based on trend
  const dualData = useMemo(() => {
    if (!trendData?.trend) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return trendData.trend.map((t: any) => {
      const parts = t.month.split('-');
      const mIndex = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
      return {
        name: monthNames[mIndex] || t.month,
        primary: Math.round(t.device?.avg_risk_score || 0),
        secondary: Math.round(t.phishing?.click_rate || 0),
      };
    });
  }, [trendData]);

  // Grouped bar chart data based on quiz vs phishing
  const barData = useMemo(() => {
    if (!trendData?.trend) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return trendData.trend.map((t: any) => {
      const parts = t.month.split('-');
      const mIndex = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
      return {
        name: monthNames[mIndex] || t.month,
        primary: t.phishing?.simulations_sent || 0,
        secondary: t.quiz?.submissions || 0,
      };
    });
  }, [trendData]);

  if (isSummaryLoading || !summaryData) {
    return <PageSkeleton />;
  }

  const kpis = [
    { label: "Total Campaigns", value: String(analyticsData?.total_campaigns || 0), helper: "Active & completed", trend: 0 },
    { label: "Total Phishing Clicks", value: String(analyticsData?.total_clicked || 0), helper: "Links clicked", trend: 0 },
    { label: "Avg Device Risk", value: String(Math.round(summaryData?.device?.avg_risk_score || 0)), helper: "Out of 100", trend: 0 },
    { label: "Global Click Rate", value: `${analyticsData?.overall_click_rate || 0}%`, helper: "Org average", trend: 0 },
  ];

  return (
    <div className="page-section">
      <PageHeader title={title} description={description} />

      <StatGrid
        stats={kpis.map((k, i) => ({
          ...k,
          trend: [1.2, -3.4, 0.5, -2.1][i % 4],
          tone: i === 2 ? "danger" : i === 1 ? "warn" : "default",
        }))}
      />

      {/* Charts row */}
      <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <DualAreaChart
          data={dualData}
          title={t("dashboard.charts.activity")}
          primaryLabel={t("dashboard.charts.incidents")}
          secondaryLabel={t("dashboard.charts.resolved")}
        />
        <DonutGauge
          title={t("dashboard.charts.riskDist")}
          value={Math.round(summaryData?.device?.avg_risk_score || 0)}
          max={100}
          label={t("dashboard.charts.riskScore")}
          breakdown={[
            { label: t("dashboard.charts.critical"),  value: summaryData?.device?.risk_level_distribution?.critical || 0,  color: "#fb7185" },
            { label: t("dashboard.charts.high"),      value: summaryData?.device?.risk_level_distribution?.high || 0,  color: "#fbbf24" },
            { label: t("dashboard.charts.medium"),    value: summaryData?.device?.risk_level_distribution?.medium || 0, color: "#1d4ed8" },
            { label: t("dashboard.charts.low"),       value: summaryData?.device?.risk_level_distribution?.low || 0, color: "#38bdf8" },
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
          title={t("dashboard.charts.weekly")}
          primaryLabel={t("dashboard.charts.events")}
          secondaryLabel={t("dashboard.charts.resolved")}
        />
        <DataTable
          title={t("dashboard.table.snapshot")}
          columns={[t("table.name"), t("table.owner"), t("table.state")]}
          rows={rows.map((row) => [row.name, row.owner, row.state])}
          minWidth={380}
          filterColumn={t("table.state")}
          searchPlaceholder={t("dashboard.search")}
          renderCell={(cell, row, _rowIndex, cellIndex) =>
            cellIndex === 2 ? <span className={STATUS_COLORS[row[2]] ?? "status-neutral"}>{cell}</span> : cell
          }
        />
      </section>
    </div>
  );
}
