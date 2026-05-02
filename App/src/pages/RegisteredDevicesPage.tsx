import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { COMPLIANCE_TREND, EXPOSURE_BY_TYPE } from "@/data/mockData";
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

const totalOpenExposures = EXPOSURE_BY_TYPE.reduce((acc, item) => acc + item.count, 0);

export default function DevicesPage() {
  const navigate = useNavigate();
  const { t } = useAppSettings();

  const { data: summaryData } = useQuery({
    queryKey: ["devices-summary"],
    queryFn: () => fetchApi<any>("/api/dw/summary/"),
  });

  const { data: devicesList, isLoading } = useQuery({
    queryKey: ["devices-list"],
    queryFn: () => fetchApi<any[]>("/api/dw/export/devices/?format=json"),
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  const tableRows = (devicesList || []).map((d: any) => [
    d.hostname || d.id,
    d.os_info?.os || "Unknown",
    d.ip_address || "N/A",
    d.latest_risk_score > 70 ? "At Risk" : "Healthy"
  ]);

  return (
    <div className="page-section">
      <PageHeader
        badge={t("devices.badge")}
        title={t("devices.title")}
        description={t("devices.description")}
      />

      <StatGrid
        stats={[
          { label: t("devices.stats.total"), value: String(summaryData?.device?.devices_reporting || 0), trend: 0 },
          { label: t("devices.stats.healthy"), value: String(summaryData?.device?.risk_level_distribution?.low || 0), tone: "ok", trend: 0 },
          { label: t("devices.stats.atRisk"), value: String(summaryData?.device?.risk_level_distribution?.high || 0), tone: "warn", trend: 0 },
          { label: t("devices.stats.critical"), value: String(summaryData?.device?.risk_level_distribution?.critical || 0), tone: "danger", trend: 0 },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">{t("devices.compliance.title")}</p>
          <p className="m-0 mt-1 text-xs text-slate-400">{t("devices.compliance.subtitle")}</p>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COMPLIANCE_TREND} barCategoryGap="22%">
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
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
                <Bar dataKey="encryption" name="Encryption" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="edr" name="EDR Online" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="patching" name="Patch Baseline" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <p className="m-0 text-slate-400">{t("devices.compliance.encryption")}</p>
              <p className="m-0 mt-1 font-semibold text-cyan-300">96%</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <p className="m-0 text-slate-400">{t("devices.compliance.edr")}</p>
              <p className="m-0 mt-1 font-semibold text-emerald-300">98%</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <p className="m-0 text-slate-400">{t("devices.compliance.patching")}</p>
              <p className="m-0 mt-1 font-semibold text-violet-300">91%</p>
            </div>
          </div>
        </section>
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">{t("devices.exposure.title")}</p>
          <p className="m-0 mt-1 text-xs text-slate-400">{t("devices.exposure.subtitle")}</p>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EXPOSURE_BY_TYPE} layout="vertical" margin={{ left: 12, right: 8 }}>
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
                  {EXPOSURE_BY_TYPE.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
            <span className="text-slate-400">{t("devices.exposure.total")}</span>
            <span className="font-semibold text-amber-300">{totalOpenExposures}</span>
          </div>
        </section>
      </section>

      <section className="card overflow-hidden">
        <DataTable
          title={t("devices.table.title")}
          actions={<span className="text-xs text-slate-400">{t("devices.table.hint")}</span>}
          columns={["Hostname", "OS", "IP Address", "Status"]}
          rows={tableRows}
          minWidth={500}
          filterColumn="Status"
          searchPlaceholder={t("devices.search")}
          onRowClick={(row) => navigate(ROUTES.deviceDetails.replace(":deviceId", row[0]))}
        />
      </section>
    </div>
  );
}
