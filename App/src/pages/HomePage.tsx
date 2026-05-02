import { DonutGauge, DualAreaChart } from "@/components/ui/TrendChart";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { MOCK_INCIDENTS, MOCK_AUTOMATIONS } from "@/data/mockData";

export default function HomePage() {
  const { t } = useAppSettings();

  return (
    <div className="page-section">
      <PageHeader
        badge={t("home.badge")}
        title={t("home.title")}
        description={t("home.description")}
      />

      <StatGrid
        stats={[
          { label: t("home.stats.risk"), value: "61 / 100", trend: -2.1 },
          { label: t("home.stats.incidents"), value: "18", tone: "danger", trend: 12.5 },
          { label: t("home.stats.devices"), value: "142", tone: "ok", trend: 4.8 },
          { label: t("home.stats.policy"), value: "93%", trend: 1.4 },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <div className="min-h-[280px]">
          <DualAreaChart
            data={[
              { name: "Mon", primary: 72, secondary: 38 },
              { name: "Tue", primary: 66, secondary: 44 },
              { name: "Wed", primary: 63, secondary: 47 },
              { name: "Thu", primary: 68, secondary: 51 },
              { name: "Fri", primary: 64, secondary: 54 },
              { name: "Sat", primary: 59, secondary: 46 },
              { name: "Sun", primary: 61, secondary: 58 },
            ]}
            title={t("home.chart.riskVsRemediation")}
            primaryLabel={t("home.chart.riskIndex")}
            secondaryLabel={t("home.chart.resolvedSignals")}
          />
        </div>
        <DonutGauge
          title={t("home.gauge.assetCompliance")}
          value={132}
          max={142}
          label={t("home.gauge.compliant")}
          breakdown={[
            { label: t("home.gauge.compliant"), value: 132, color: "#10b981" },
            { label: t("home.gauge.pending"), value: 7, color: "#f59e0b" },
            { label: t("home.gauge.critical"), value: 3, color: "#f43f5e" },
          ]}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable
          title={t("home.table.incidentQueue")}
          columns={[t("table.signal"), t("table.entity"), t("table.priority"), t("table.status")]}
          rows={MOCK_INCIDENTS.map(row => [row[0], row[1], row[2], t(row[3])])}
          minWidth={500}
        />
        <DataTable
          title={t("home.table.recentAutomations")}
          columns={[t("table.automation"), t("table.target"), t("table.result"), t("table.time")]}
          rows={MOCK_AUTOMATIONS.map(row => [t(row[0]), row[1], t(row[2]), row[3]])}
          minWidth={500}
        />
      </section>
    </div>
  );
}
