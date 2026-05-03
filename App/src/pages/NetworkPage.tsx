import { useState } from "react";
import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { RISK_TREND, EXPOSURE_BY_ZONE, NAC_COMPLIANCE_TREND } from "@/data/mockData";

const AXIS_STYLE = { fill: "#64748b", fontSize: 11 };
const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";

export default function NetworkPage() {
  const { t } = useAppSettings();
  const queryClient = useQueryClient();
  const [flagMsg, setFlagMsg] = useState<string | null>(null);

  const { data: portAuditData, isLoading: isPortsLoading } = useQuery({
    queryKey: ["network-port-audit"],
    queryFn: () => fetchApi<any>("/api/agent/port-audit/").catch(() => null),
  });

  const { data: softwareAuditData, isLoading: isSoftwareLoading } = useQuery({
    queryKey: ["network-software-audit"],
    queryFn: () => fetchApi<any>("/api/agent/software-audit/").catch(() => null),
  });

  const { data: remediationData } = useQuery({
    queryKey: ["network-port-remediation"],
    queryFn: () => fetchApi<any>("/api/agent/port-remediation/").catch(() => null),
  });

  const flagMutation = useMutation({
    mutationFn: (payload: { employee_id: string; port: number; hostname: string; port_label: string }) =>
      fetchApi<any>("/api/agent/port-remediation/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-port-remediation"] });
      setFlagMsg("Port flagged for closure. The employee's agent will close it on next check-in.");
    },
    onError: (err: any) => setFlagMsg(`Error: ${err.message}`),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<any>(`/api/agent/port-remediation/${id}/`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-port-remediation"] });
      setFlagMsg("Marked as resolved.");
    },
    onError: (err: any) => setFlagMsg(`Error: ${err.message}`),
  });

  if (isPortsLoading || isSoftwareLoading) {
    return <PageSkeleton />;
  }

  // Transform port_audit (grouped by port) into per-employee rows
  const portRows: Array<{ employee_id: string; employee_name: string; hostname: string; port: number; label: string }> = [];
  for (const entry of portAuditData?.port_audit || []) {
    for (const dev of entry.affected_devices || []) {
      portRows.push({
        employee_id: dev.employee_id,
        employee_name: dev.employee_name || dev.hostname,
        hostname: dev.hostname,
        port: entry.port,
        label: entry.label,
      });
    }
  }

  // Index pending remediations: key = `${employee_id}-${port}`
  const pendingSet = new Set<string>(
    (remediationData?.remediations || [])
      .filter((r: any) => r.status === "PENDING")
      .map((r: any) => `${r.employee_id}-${r.port}`)
  );
  const remediationById: Record<string, any> = {};
  for (const r of remediationData?.remediations || []) {
    remediationById[`${r.employee_id}-${r.port}`] = r;
  }

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

      {flagMsg && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
          flagMsg.startsWith("Error")
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        }`}>
          <span>{flagMsg}</span>
          <button type="button" onClick={() => setFlagMsg(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Per-employee open port table */}
      <div className="card overflow-hidden">
        <div className="border-b border-white/8 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-white">Risky Open Ports — by Employee</p>
            <p className="m-0 mt-0.5 text-xs text-slate-400">
              {portAuditData?.devices_scanned ?? 0} devices scanned · {portRows.length} risky port exposure{portRows.length !== 1 ? "s" : ""} detected
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-xs text-slate-400">
                <th className="px-5 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-left font-medium">Hostname</th>
                <th className="px-4 py-3 text-left font-medium">Port</th>
                <th className="px-4 py-3 text-left font-medium">Risk</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {portRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No risky open ports detected across active devices.
                  </td>
                </tr>
              )}
              {portRows.map((row) => {
                const key = `${row.employee_id}-${row.port}`;
                const isPending = pendingSet.has(key);
                const remReq = remediationById[key];
                return (
                  <tr key={key} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-200">{row.employee_name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.hostname}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-rose-300 font-semibold">{row.port}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-300">{row.label}</td>
                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-block rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            Pending Closure
                          </span>
                          <button
                            type="button"
                            onClick={() => resolveMutation.mutate(remReq.id)}
                            disabled={resolveMutation.isPending}
                            className="rounded border border-slate-600/40 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-400 hover:text-white disabled:opacity-50"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={flagMutation.isPending}
                          onClick={() => flagMutation.mutate({
                            employee_id: row.employee_id,
                            port: row.port,
                            hostname: row.hostname,
                            port_label: row.label,
                          })}
                          className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
                        >
                          Flag for Closure
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
