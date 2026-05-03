import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import { getApiConfig } from "@/lib/apiKeysStore";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { RISK_TREND, EXPOSURE_BY_ZONE, NAC_COMPLIANCE_TREND } from "@/data/mockData";

const AXIS_STYLE = { fill: "#64748b", fontSize: 11 };
const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";
const RISK_CACHE_KEY = "network-port-risk-cache-v1";
const RISK_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type OpenPortRow = { employee_id: string; employee_name: string; hostname: string; port: number; protocol: string };
type PortRiskAnalysis = { riskLevel: "Low" | "Medium" | "High"; explanation: string };

export default function NetworkPage() {
  const { t } = useAppSettings();
  const queryClient = useQueryClient();
  const [flagMsg, setFlagMsg] = useState<string | null>(null);
  const [riskByKey, setRiskByKey] = useState<Record<string, PortRiskAnalysis>>({});

  const { isLoading: isPortsLoading } = useQuery({
    queryKey: ["network-port-audit"],
    queryFn: () => fetchApi<any>("/api/agent/port-audit/").catch(() => null),
  });

  const { isLoading: isSoftwareLoading } = useQuery({
    queryKey: ["network-software-audit"],
    queryFn: () => fetchApi<any>("/api/agent/software-audit/").catch(() => null),
  });

  const { data: remediationData } = useQuery({
    queryKey: ["network-port-remediation"],
    queryFn: () => fetchApi<any>("/api/agent/port-remediation/").catch(() => null),
  });

  const { data: devicesData } = useQuery({
    queryKey: ["network-devices-export"],
    queryFn: () => fetchApi<any>("/api/dw/export/devices/?format=json").catch(() => null),
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
    mutationFn: (id: string) => fetchApi<any>(`/api/agent/port-remediation/${id}/`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-port-remediation"] });
      setFlagMsg("Marked as resolved.");
    },
    onError: (err: any) => setFlagMsg(`Error: ${err.message}`),
  });

  const portRows = useMemo<OpenPortRow[]>(() => {
    const list = (devicesData?.data || []) as any[];
    const rows: OpenPortRow[] = [];
    for (const d of list) {
      const hostname = String(d.hostname || d.host || d.snapshot_id || "unknown-host");
      const employee_id = String(d.employee_id || d.user_id || hostname);
      const employee_name = String(d.employee_name || d.user_name || hostname);
      const portsInfo = Array.isArray(d.ports_info) ? d.ports_info : [];
      if (portsInfo.length > 0) {
        for (const p of portsInfo) {
          const port = Number(p.port);
          if (!Number.isFinite(port)) continue;
          rows.push({ employee_id, employee_name, hostname, port, protocol: String(p.protocol || "tcp").toUpperCase() });
        }
        continue;
      }
      const openPorts = Array.isArray(d.open_ports) ? d.open_ports : Array.isArray(d.ports) ? d.ports : [];
      for (const p of openPorts) {
        const port = Number(p);
        if (!Number.isFinite(port)) continue;
        rows.push({ employee_id, employee_name, hostname, port, protocol: "TCP" });
      }
    }
    return rows.sort((a, b) => a.port - b.port);
  }, [devicesData]);

  useEffect(() => {
    const loadCache = (): Record<string, { at: number; value: PortRiskAnalysis }> => {
      try {
        return JSON.parse(localStorage.getItem(RISK_CACHE_KEY) || "{}");
      } catch {
        return {};
      }
    };

    const run = async () => {
      const cache = loadCache();
      const now = Date.now();
      const primed: Record<string, PortRiskAnalysis> = {};
      const missing: OpenPortRow[] = [];

      for (const row of portRows) {
        const key = `${row.hostname}:${row.protocol}:${row.port}`;
        const hit = cache[key];
        if (hit && now - hit.at < RISK_CACHE_TTL_MS) primed[key] = hit.value;
        else missing.push(row);
      }
      if (Object.keys(primed).length > 0) setRiskByKey((prev) => ({ ...prev, ...primed }));

      if (missing.length === 0) return;
      const cfg = await getApiConfig();
      if (!cfg.groqApiKey) return;

      for (const row of missing.slice(0, 80)) {
        const key = `${row.hostname}:${row.protocol}:${row.port}`;
        if (cache[key]) continue;
        try {
          const response = await fetch(`${cfg.groqBaseUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.groqApiKey}` },
            body: JSON.stringify({
              model: cfg.groqChatModel,
              temperature: 0,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Return strict JSON only: {riskLevel:'Low|Medium|High', explanation:'max 24 words'} for an exposed network port risk." },
                { role: "user", content: `Host ${row.hostname} currently exposes ${row.protocol} port ${row.port}.` },
              ],
            }),
          });
          if (!response.ok) continue;
          const json = await response.json();
          const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
          const value: PortRiskAnalysis = {
            riskLevel: parsed?.riskLevel === "High" || parsed?.riskLevel === "Medium" ? parsed.riskLevel : "Low",
            explanation: String(parsed?.explanation || "Open port exposure detected; validate necessity and restrict reachability."),
          };
          cache[key] = { at: Date.now(), value };
          setRiskByKey((prev) => ({ ...prev, [key]: value }));
        } catch {
          // keep best-effort behavior for table rendering
        }
      }
      localStorage.setItem(RISK_CACHE_KEY, JSON.stringify(cache));
    };

    void run();
  }, [portRows]);

  const pendingSet = new Set<string>((remediationData?.remediations || []).filter((r: any) => r.status === "PENDING").map((r: any) => `${r.employee_id}-${r.port}`));
  const remediationById: Record<string, any> = {};
  for (const r of remediationData?.remediations || []) remediationById[`${r.employee_id}-${r.port}`] = r;

  if (isPortsLoading || isSoftwareLoading) return <PageSkeleton />;

  return (
    <div className="page-section">
      <PageHeader badge={t("network.badge")} title={t("network.title")} description={t("network.description")} />

      <section className="grid gap-3 xl:grid-cols-2">
        <section className="card p-5 min-h-[120px]"><p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">{t("network.throughput")}</p><p className="m-0 mt-2 text-2xl font-bold text-white">8.1 Gbps</p></section>
        <section className="card p-5 min-h-[120px]"><p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">{t("network.blocked")}</p><p className="m-0 mt-2 text-2xl font-bold text-white">3,412</p></section>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <section className="card p-5 min-h-[280px]"><p className="m-0 text-sm font-semibold text-white">{t("network.risk.title")}</p><p className="m-0 mt-2 text-sm text-slate-400">{t("network.risk.subtitle")}</p><div className="mt-3 h-[170px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={RISK_TREND} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}><defs><linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.46} /><stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.03} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} /><YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} /><Tooltip contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(29,78,216,0.45)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }} labelStyle={{ color: "#64748b" }} /><Area type="monotone" dataKey="value" name="Risk score" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#riskGradient)" dot={false} /></AreaChart></ResponsiveContainer></div></section>
        <section className="card p-5 min-h-[280px]"><p className="m-0 text-sm font-semibold text-white">{t("network.exposure.title")}</p><p className="m-0 mt-2 text-sm text-slate-400">{t("network.exposure.subtitle")}</p><div className="mt-3 h-[170px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={EXPOSURE_BY_ZONE} barCategoryGap="26%" margin={{ top: 4, right: 6, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} /><YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} /><Tooltip contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }} labelStyle={{ color: "#64748b" }} /><Bar dataKey="value" name="Open ports" fill={CHART_SECONDARY} radius={[5, 5, 0, 0]} maxBarSize={26} /></BarChart></ResponsiveContainer></div></section>
        <section className="card p-5 min-h-[280px]"><p className="m-0 text-sm font-semibold text-white">{t("network.nac.title")}</p><p className="m-0 mt-2 text-sm text-slate-400">{t("network.nac.subtitle")}</p><div className="mt-3 h-[170px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={NAC_COMPLIANCE_TREND} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}><defs><linearGradient id="nacGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_SECONDARY} stopOpacity={0.38} /><stop offset="100%" stopColor={CHART_SECONDARY} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} /><YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} domain={[80, 100]} /><Tooltip contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }} labelStyle={{ color: "#64748b" }} /><Area type="monotone" dataKey="target" name="Target" stroke="#64748b" strokeWidth={1.8} fillOpacity={0} dot={false} /><Area type="monotone" dataKey="compliant" name="Compliant %" stroke={CHART_SECONDARY} strokeWidth={2.5} fill="url(#nacGradient)" dot={false} /></AreaChart></ResponsiveContainer></div></section>
      </section>

      {flagMsg && <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${flagMsg.startsWith("Error") ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}><span>{flagMsg}</span><button type="button" onClick={() => setFlagMsg(null)} className="ml-4 opacity-60 hover:opacity-100">x</button></div>}

      <div className="card overflow-hidden">
        <div className="border-b border-white/8 px-5 py-3"><p className="m-0 text-sm font-semibold text-white">Current Open Ports - by Employee</p><p className="m-0 mt-0.5 text-xs text-slate-400">{portRows.length} open port exposure{portRows.length !== 1 ? "s" : ""} across current devices</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b border-white/6 text-xs text-slate-400"><th className="px-5 py-3 text-left font-medium">Employee</th><th className="px-4 py-3 text-left font-medium">Hostname</th><th className="px-4 py-3 text-left font-medium">Port</th><th className="px-4 py-3 text-left font-medium">Risk Level</th><th className="px-4 py-3 text-left font-medium">AI Explanation</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
            <tbody>
              {portRows.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No open ports detected across active devices.</td></tr>}
              {portRows.map((row) => {
                const key = `${row.employee_id}-${row.port}`;
                const ai = riskByKey[`${row.hostname}:${row.protocol}:${row.port}`];
                const isPending = pendingSet.has(key);
                const remReq = remediationById[key];
                return <tr key={`${key}-${row.hostname}`} className="border-b border-white/4 hover:bg-white/2 transition-colors"><td className="px-5 py-3 font-medium text-slate-200">{row.employee_name}</td><td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.hostname}</td><td className="px-4 py-3"><span className="font-mono text-rose-300 font-semibold">{row.protocol}/{row.port}</span></td><td className="px-4 py-3 text-xs text-rose-300">{ai?.riskLevel || "Analyzing..."}</td><td className="px-4 py-3 text-xs text-slate-300">{ai?.explanation || "Queued for Groq analysis (cached)."}</td><td className="px-4 py-3 text-right">{isPending ? <div className="flex items-center justify-end gap-2"><span className="inline-block rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">Pending Closure</span><button type="button" onClick={() => resolveMutation.mutate(remReq.id)} disabled={resolveMutation.isPending} className="rounded border border-slate-600/40 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-400 hover:text-white disabled:opacity-50">Mark Resolved</button></div> : <button type="button" disabled={flagMutation.isPending} onClick={() => flagMutation.mutate({ employee_id: row.employee_id, port: row.port, hostname: row.hostname, port_label: ai?.riskLevel || "Unknown" })} className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition-colors">Flag for Closure</button>}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
