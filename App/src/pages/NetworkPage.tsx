import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { RISK_TREND, EXPOSURE_BY_ZONE, NAC_COMPLIANCE_TREND } from "@/data/mockData";

const AXIS_STYLE = { fill: "#64748b", fontSize: 11 };
const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";

export default function NetworkPage() {
  const { t } = useAppSettings();

  const { data: portAuditData, isLoading: isPortsLoading } = useQuery({
    queryKey: ["network-port-audit"],
    queryFn: () => fetchApi<any>("/api/agent/port-audit/").catch(() => null),
  });

  const { data: softwareAuditData, isLoading: isSoftwareLoading } = useQuery({
    queryKey: ["network-software-audit"],
    queryFn: () => fetchApi<any>("/api/agent/software-audit/").catch(() => null),
  });

  if (isPortsLoading || isSoftwareLoading) {
    return <PageSkeleton />;
  }

  const tableRows = [...(portAuditData?.port_audit || []), ...(softwareAuditData?.unapproved_software || [])].map((item: any) => [
    item.hostname || item.device_id || "Unknown Node",
    item.ip_address || item.port || "N/A",
    item.process_name || item.software_name || "Service",
    item.state || item.status || "Active",
    item.is_approved === false ? "High" : "Low"
  ]);

  return (
    <div className="page-section">
      <PageHeader
        badge={t("network.badge")}
        title={t("network.title")}
        description={t("network.description")}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <section className="card p-5 min-h-[120px]">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">{t("network.throughput")}</p>
          <p className="m-0 mt-2 text-2xl font-bold text-white">8.1 Gbps</p>
        </section>
        <section className="card p-5 min-h-[120px]">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">{t("network.blocked")}</p>
          <p className="m-0 mt-2 text-2xl font-bold text-white">3,412</p>
        </section>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">{t("network.risk.title")}</p>
          <p className="m-0 mt-2 text-sm text-slate-400">{t("network.risk.subtitle")}</p>
          <div className="mt-3 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RISK_TREND} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.46} />
                    <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(29,78,216,0.45)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }}
                  labelStyle={{ color: "#64748b" }}
                />
                <Area type="monotone" dataKey="value" name="Risk score" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#riskGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">{t("network.exposure.title")}</p>
          <p className="m-0 mt-2 text-sm text-slate-400">{t("network.exposure.subtitle")}</p>
          <div className="mt-3 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EXPOSURE_BY_ZONE} barCategoryGap="26%" margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }}
                  labelStyle={{ color: "#64748b" }}
                />
                <Bar dataKey="value" name="Open ports" fill={CHART_SECONDARY} radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">{t("network.nac.title")}</p>
          <p className="m-0 mt-2 text-sm text-slate-400">{t("network.nac.subtitle")}</p>
          <div className="mt-3 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={NAC_COMPLIANCE_TREND} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="nacGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_SECONDARY} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={CHART_SECONDARY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} domain={[80, 100]} />
                <Tooltip
                  contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }}
                  labelStyle={{ color: "#64748b" }}
                />
                <Area type="monotone" dataKey="target" name="Target" stroke="#64748b" strokeWidth={1.8} fillOpacity={0} dot={false} />
                <Area type="monotone" dataKey="compliant" name="Compliant %" stroke={CHART_SECONDARY} strokeWidth={2.5} fill="url(#nacGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <DataTable
        className="flex-1 min-h-[420px]"
        title={t("network.table.title")}
        columns={[t("table.node"), t("table.ip"), "Process / Software", "State", t("table.severity")]}
        rows={tableRows}
        minWidth={500}
      />
    </div>
  );
}
