import { DonutGauge, MetricPairCard } from "@/components/ui/TrendChart";
import { DataTable, PageHeader, StatGrid, SummaryBanner } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

export default function HomePage() {
  const { t } = useAppSettings();

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["home-summary"],
    queryFn: () => fetchApi<any>("/api/dw/summary/"),
  });
  
  const { data: dailyInsights } = useQuery({
    queryKey: ["home-daily-insights"],
    queryFn: () => fetchApi<any>("/api/dw/daily-insights/"),
  });
  const { data: automationsData } = useQuery({
    queryKey: ["home-automations"],
    queryFn: () => fetchApi<any>("/api/automations/").catch(() => null),
  });

  if (isSummaryLoading || !summaryData) {
    return <PageSkeleton />;
  }

  const kpis = [
    {
      label: t("home.stats.risk"),
      value: `${Math.round(summaryData?.device?.avg_risk_score || 0)} / 100`,
      trend: Number(dailyInsights?.kpis?.risk_score?.delta_pct || 0),
    },
    {
      label: t("home.stats.incidents"),
      value: String(summaryData?.device?.risk_level_distribution?.high || 0),
      tone: "danger" as const,
      trend: Number(dailyInsights?.kpis?.open_incidents?.delta_pct || 0),
    },
    {
      label: t("home.stats.devices"),
      value: String(summaryData?.device?.devices_reporting || 0),
      tone: "ok" as const,
      trend: Number(dailyInsights?.kpis?.managed_devices?.delta_pct || 0),
    },
    {
      label: t("home.stats.policy"),
      value: `${summaryData?.quiz?.correct_rate || 0}%`,
      trend: Number(dailyInsights?.kpis?.policy_coverage?.delta_pct || 0),
    },
  ];

  const totalDevices = summaryData?.device?.devices_reporting || 1;
  const highRisk = summaryData?.device?.risk_level_distribution?.high || 0;
  const critRisk = summaryData?.device?.risk_level_distribution?.critical || 0;
  const compliantDevices = totalDevices - highRisk - critRisk;
  const atRisk = highRisk + critRisk;
  const clickRate = summaryData?.phishing?.click_rate || 0;
  const avgRisk = Math.round(summaryData?.device?.avg_risk_score || 0);

  const bannerHeadline = atRisk > 0
    ? `${compliantDevices} of ${totalDevices} devices are healthy — ${atRisk} need attention right now.`
    : `All ${totalDevices} monitored devices are healthy. Everything looks good!`;

  const incidentsRows = (summaryData?.device?.top_signals || []).map((s: any) => [
    s.signal,
    `${s.affected_devices} devices`,
    "High",
    "Open"
  ]);

  return (
    <div className="page-section">
      <PageHeader
        badge={t("home.badge")}
        title={t("home.title")}
        description={t("home.description")}
      />

      <SummaryBanner
        headline={bannerHeadline}
        subtext="This is your daily security overview. The numbers below show how secure your organisation is right now — lower risk scores and fewer incidents are better."
        bullets={[
          `Device risk score: ${avgRisk}/100 — a score above 50 means more devices need attention`,
          clickRate > 20
            ? `${clickRate}% of employees clicked a simulated phishing link — consider more training`
            : `Only ${clickRate}% of employees clicked a phishing test link — that's a good result`,
          `${compliantDevices} devices are passing all security checks`,
        ]}
      />

      <StatGrid stats={kpis} />

      <section className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <MetricPairCard
          title={t("home.chart.riskVsRemediation")}
          metrics={[
            {
              label: t("home.chart.riskIndex"),
              value: avgRisk,
              description: "Average security risk score across all monitored devices. Scores above 50 indicate more devices with problems.",
            },
            {
              label: "Phishing Click Rate",
              value: `${clickRate}%`,
              description: "Percentage of employees who clicked a simulated phishing link. Lower is better — aim for under 10%.",
              color: clickRate > 20 ? "var(--color-error)" : "var(--color-primary)",
            },
          ]}
        />
        <DonutGauge
          title={t("home.gauge.assetCompliance")}
          value={compliantDevices}
          max={totalDevices}
          label={t("home.gauge.compliant")}
          breakdown={[
            { label: t("home.gauge.compliant"), value: compliantDevices, color: "#00c6c1" },
            { label: t("home.gauge.pending"), value: summaryData?.device?.risk_level_distribution?.medium || 0, color: "#00a6d6" },
            { label: t("home.gauge.critical"), value: (summaryData?.device?.risk_level_distribution?.high || 0) + (summaryData?.device?.risk_level_distribution?.critical || 0), color: "#f43f5e" },
          ]}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable
          title={t("home.table.incidentQueue")}
          className="min-h-[350px]"
          columns={[t("table.signal"), t("table.entity"), t("table.priority"), t("table.status")]}
          rows={incidentsRows}
          minWidth={500}
        />
        <DataTable
          title={t("home.table.recentAutomations")}
          className="min-h-[350px]"
          columns={[t("table.automation"), t("table.target"), t("table.result"), t("table.time")]}
          rows={(automationsData?.automations || []).map((a: any) => [
            a.title,
            a.type,
            a.status,
            new Date(a.triggered_at).toLocaleDateString(),
          ])}
          minWidth={500}
        />
      </section>
    </div>
  );
}
