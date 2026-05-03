import { DonutGauge, DualAreaChart } from "@/components/ui/TrendChart";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
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
  
  const { data: trendData } = useQuery({
    queryKey: ["home-trend"],
    queryFn: () => fetchApi<any>("/api/dw/trend/?months=7"),
  });
  const { data: dailyInsights } = useQuery({
    queryKey: ["home-daily-insights"],
    queryFn: () => fetchApi<any>("/api/dw/daily-insights/"),
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
      tone: "danger",
      trend: Number(dailyInsights?.kpis?.open_incidents?.delta_pct || 0),
    },
    {
      label: t("home.stats.devices"),
      value: String(summaryData?.device?.devices_reporting || 0),
      tone: "ok",
      trend: Number(dailyInsights?.kpis?.managed_devices?.delta_pct || 0),
    },
    {
      label: t("home.stats.policy"),
      value: `${summaryData?.quiz?.correct_rate || 0}%`,
      trend: Number(dailyInsights?.kpis?.policy_coverage?.delta_pct || 0),
    },
  ];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = (trendData?.trend || []).map((t: any) => {
    const parts = t.month.split('-');
    const mIndex = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
    return {
      name: monthNames[mIndex] || t.month,
      primary: Math.round(t.device?.avg_risk_score || 0),
      secondary: Math.round(t.phishing?.click_rate || 0),
    };
  });

  const totalDevices = summaryData?.device?.devices_reporting || 1;
  const compliantDevices = totalDevices - (summaryData?.device?.risk_level_distribution?.high || 0) - (summaryData?.device?.risk_level_distribution?.critical || 0);

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

      <StatGrid stats={kpis} />

      <section className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <div className="min-h-[280px]">
          <DualAreaChart
            data={chartData}
            title={t("home.chart.riskVsRemediation")}
            primaryLabel={t("home.chart.riskIndex")}
            secondaryLabel={"Click Rate"}
          />
        </div>
        <DonutGauge
          title={t("home.gauge.assetCompliance")}
          value={compliantDevices}
          max={totalDevices}
          label={t("home.gauge.compliant")}
          breakdown={[
            { label: t("home.gauge.compliant"), value: compliantDevices, color: "#10b981" },
            { label: t("home.gauge.pending"), value: summaryData?.device?.risk_level_distribution?.medium || 0, color: "#f59e0b" },
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
          rows={[]}
          minWidth={500}
        />
      </section>
    </div>
  );
}
