import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { DataTable, PageHeader, StatGrid, SummaryBanner } from "@/components/cards/BaseCards";
import { ProgressBars } from "@/components/ui/TrendChart";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


type DeviceRow = {
  snapshot_id: string;
  hostname: string;
  os_name: string;
  employee_name: string;
  risk_score: number | null;
  risk_level: string;
  patch_is_current: boolean | null;
  antivirus_enabled: boolean | null;
  disk_encrypted: boolean | null;
  collected_at: string;
};

type CompliancePoint = {
  week: string;
  encryption: number;
  edr: number;
  patching: number;
};

export default function DevicesPage() {
  const navigate = useNavigate();
  const { t } = useAppSettings();

  const { data: summaryData } = useQuery({
    queryKey: ["devices-summary"],
    queryFn: () => fetchApi<any>("/api/dw/summary/"),
  });

  const { data: devicesList, isLoading } = useQuery({
    queryKey: ["devices-list"],
    queryFn: () => fetchApi<any>("/api/dw/export/devices/?format=json"),
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  const devices = (devicesList?.data || []) as DeviceRow[];

  const tableRows = devices.map((d) => [
    d.hostname || d.snapshot_id,
    d.os_name || "Unknown",
    d.employee_name || "N/A",
    (d.risk_score ?? 0) > 70 ? "At Risk" : "Healthy"
  ]);

  const sortedByDate = [...devices].sort(
    (a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime(),
  );
  const bucketSize = Math.max(1, Math.ceil(sortedByDate.length / 6));
  const complianceTrend: CompliancePoint[] = Array.from({ length: 6 }, (_, i) => {
    const slice = sortedByDate.slice(i * bucketSize, (i + 1) * bucketSize);
    const denom = slice.length || 1;
    const pct = (count: number) => Math.round((count / denom) * 100);
    const encryption = pct(slice.filter((d) => d.disk_encrypted === true).length);
    const edr = pct(slice.filter((d) => d.antivirus_enabled === true).length);
    const patching = pct(slice.filter((d) => d.patch_is_current === true).length);
    return { week: `W${i + 1}`, encryption, edr, patching };
  });

  const complianceLatest = complianceTrend[complianceTrend.length - 1] || {
    encryption: 0,
    edr: 0,
    patching: 0,
  };

  const signalRows = (summaryData?.device?.top_signals || []) as Array<{ signal: string; affected_devices: number }>;
  const chartPalette = ["#00c6c1", "#00a6d6", "#66f7f0", "#0891b2", "#0e7490", "#155e75"];
  const exposureByType = (signalRows.length > 0
    ? signalRows.slice(0, 6).map((s, idx) => ({
        name: s.signal.length > 32 ? `${s.signal.slice(0, 32)}...` : s.signal,
        count: s.affected_devices,
        color: chartPalette[idx % chartPalette.length],
      }))
    : [{ name: "No open exposure signals", count: 0, color: "#334155" }]
  );
  const totalOpenExposures = exposureByType.reduce((acc, item) => acc + item.count, 0);

  const totalDevs = summaryData?.device?.devices_reporting || 0;
  const healthyDevs = summaryData?.device?.risk_level_distribution?.low || 0;
  const atRiskDevs = (summaryData?.device?.risk_level_distribution?.high || 0) + (summaryData?.device?.risk_level_distribution?.critical || 0);

  const deviceBannerHeadline = atRiskDevs > 0
    ? `${healthyDevs} of ${totalDevs} devices are healthy — ${atRiskDevs} need attention.`
    : `All ${totalDevs} devices are in good health. No issues detected.`;

  return (
    <div className="page-section">
      <PageHeader
        badge={t("devices.badge")}
        title={t("devices.title")}
        description={t("devices.description")}
      />

      <SummaryBanner
        headline={deviceBannerHeadline}
        subtext="Each device gets a health score based on its security settings. Click any row in the table to see the full details for that device."
        bullets={[
          `Disk encryption: ${complianceLatest.encryption}% of devices have their hard drive encrypted (protects data if the device is lost or stolen)`,
          `Antivirus: ${complianceLatest.edr}% of devices have active endpoint protection running`,
          `Patches: ${complianceLatest.patching}% of devices are up-to-date with the latest security updates`,
        ]}
      />

      <StatGrid
        stats={[
          { label: t("devices.stats.total"), value: String(totalDevs), trend: 0 },
          { label: t("devices.stats.healthy"), value: String(healthyDevs), tone: "ok", trend: 0 },
          { label: t("devices.stats.atRisk"), value: String(summaryData?.device?.risk_level_distribution?.high || 0), trend: 0 },
          { label: t("devices.stats.critical"), value: String(summaryData?.device?.risk_level_distribution?.critical || 0), tone: atRiskDevs > 0 ? "danger" : "default", trend: 0 },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <ProgressBars
          title={t("devices.compliance.title")}
          subtitle={t("devices.compliance.subtitle")}
          items={[
            {
              label: `${t("devices.compliance.encryption")} — hard drive data is locked`,
              value: complianceLatest.encryption,
              description: `${complianceLatest.encryption}% of devices have disk encryption enabled. Protects company data if a device is lost or stolen.`,
            },
            {
              label: `${t("devices.compliance.edr")} — antivirus is running`,
              value: complianceLatest.edr,
              description: `${complianceLatest.edr}% of devices have active endpoint protection. Detects and blocks malware in real time.`,
            },
            {
              label: `${t("devices.compliance.patching")} — software is up to date`,
              value: complianceLatest.patching,
              description: `${complianceLatest.patching}% of devices have all the latest security patches installed. Unpatched devices are easy targets.`,
            },
          ]}
        />
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">{t("devices.exposure.title")}</p>
          <p className="m-0 mt-1 text-xs text-slate-400">{t("devices.exposure.subtitle")}</p>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureByType} layout="vertical" margin={{ left: 12, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={92}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "#0c1220",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 10,
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {exposureByType.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
            <span className="text-slate-400">{t("devices.exposure.total")}</span>
            <span className="font-semibold" style={{ color: "var(--color-primary)" }}>{totalOpenExposures}</span>
          </div>
        </section>
      </section>

      <section className="card overflow-hidden">
        <DataTable
          title={t("devices.table.title")}
          actions={<span className="text-xs text-slate-400">{t("devices.table.hint")}</span>}
          columns={["Hostname", "OS", "Employee", "Status"]}
          rows={tableRows}
          minWidth={500}
          filterColumn="Status"
          searchPlaceholder={t("devices.search")}
          onRowClick={(row) => {
            const selected = devices.find((d) => d.hostname === row[0] && d.employee_name === row[2]);
            const target = selected?.snapshot_id || row[0];
            navigate(ROUTES.deviceDetails.replace(":deviceId", target));
          }}
        />
      </section>
    </div>
  );
}
