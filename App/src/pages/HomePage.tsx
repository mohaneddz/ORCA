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

  // Derive real automations from phishing campaigns, port remediations, and device actions
  const { data: campaignsData } = useQuery({
    queryKey: ["home-campaigns"],
    queryFn: () => fetchApi<any>("/api/phishing/campaigns/").catch(() => null),
  });
  const { data: remediationData } = useQuery({
    queryKey: ["home-port-remediation"],
    queryFn: () => fetchApi<any>("/api/agent/port-remediation/").catch(() => null),
  });
  const { data: devicesData } = useQuery({
    queryKey: ["home-devices-export"],
    queryFn: () => fetchApi<any>("/api/dw/export/devices/?format=json").catch(() => null),
  });

  if (isSummaryLoading || !summaryData) {
    return <PageSkeleton />;
  }

  // ── Build real "Recent Automations" rows from multiple sources ──

  type AutoRow = { title: string; target: string; result: string; time: string; sortKey: number };
  const autoRows: AutoRow[] = [];

  // From phishing campaigns: launched = automation, completed = automation
  for (const c of (campaignsData?.campaigns || [])) {
    if (c.launched_at) {
      autoRows.push({
        title: "Phishing Campaign Launch",
        target: c.name || "Campaign",
        result: c.status === "COMPLETED" ? "Completed" : "Active",
        time: new Date(c.launched_at).toLocaleDateString(),
        sortKey: new Date(c.launched_at).getTime(),
      });
    }
    if (c.completed_at) {
      autoRows.push({
        title: "Campaign Completed",
        target: c.name || "Campaign",
        result: `${c.clicked_count || 0} clicked / ${c.total_targets || 0} targets`,
        time: new Date(c.completed_at).toLocaleDateString(),
        sortKey: new Date(c.completed_at).getTime(),
      });
    }
  }

  // From port remediations: each flagged port is an automation
  for (const r of (remediationData?.remediations || [])) {
    autoRows.push({
      title: "Port Closure Request",
      target: `${r.hostname || "Device"}:${r.port}`,
      result: r.status === "RESOLVED" ? "Resolved" : "Pending",
      time: r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
      sortKey: r.created_at ? new Date(r.created_at).getTime() : 0,
    });
  }

  // From device snapshots: each snapshot ingest is an automation event
  for (const d of (devicesData?.data || []).slice(0, 5)) {
    if (d.last_seen || d.snapshot_at) {
      const ts = d.last_seen || d.snapshot_at;
      autoRows.push({
        title: "Device Posture Scan",
        target: d.hostname || d.host || "Unknown Device",
        result: (d.risk_score ?? 0) > 60 ? "At Risk" : "Healthy",
        time: new Date(ts).toLocaleDateString(),
        sortKey: new Date(ts).getTime(),
      });
    }
  }

  // Sort by most recent and take top 8
  autoRows.sort((a, b) => b.sortKey - a.sortKey);
  const displayAutoRows = autoRows.slice(0, 8).map((r) => [r.title, r.target, r.result, r.time]);

  // If still empty, show a meaningful fallback based on summary data
  if (displayAutoRows.length === 0 && summaryData) {
    const emp = summaryData.employee?.total || 0;
    const dev = summaryData.device?.devices_reporting || 0;
    if (emp > 0) displayAutoRows.push(["Employee Sync", `${emp} accounts`, "Synced", "Today"]);
    if (dev > 0) displayAutoRows.push(["Device Inventory", `${dev} devices`, "Updated", "Today"]);
    if (summaryData.phishing?.total_campaigns > 0) {
      displayAutoRows.push(["Campaign Tracker", `${summaryData.phishing.total_campaigns} campaigns`, "Monitored", "Today"]);
    }
  }

  // ── KPIs ──

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

  // ── Compliance data ──

  const totalDevices = Math.max(summaryData?.device?.devices_reporting || 0, 1);
  const highRisk = summaryData?.device?.risk_level_distribution?.high || 0;
  const critRisk = summaryData?.device?.risk_level_distribution?.critical || 0;
  const medRisk = summaryData?.device?.risk_level_distribution?.medium || 0;
  const lowRisk = summaryData?.device?.risk_level_distribution?.low || 0;
  const compliantDevices = Math.max(totalDevices - highRisk - critRisk, 0);
  const atRisk = highRisk + critRisk;
  const clickRate = summaryData?.phishing?.click_rate || 0;
  const avgRisk = Math.round(summaryData?.device?.avg_risk_score || 0);

  // Ensure the donut shows real proportions even when most devices are compliant
  const donutMax = totalDevices;
  const donutValue = compliantDevices;

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

      <StatGrid stats={kpis} cols={4} />

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
          value={donutValue}
          max={donutMax}
          label={t("home.gauge.compliant")}
          breakdown={[
            { label: t("home.gauge.compliant"), value: compliantDevices, color: "#00c6c1" },
            { label: t("home.gauge.pending"), value: medRisk + lowRisk, color: "#00a6d6" },
            { label: t("home.gauge.critical"), value: atRisk, color: "#f43f5e" },
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
          rows={displayAutoRows}
          minWidth={500}
        />
      </section>
    </div>
  );
}
