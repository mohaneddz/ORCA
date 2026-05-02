import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS_STYLE = { fill: "var(--color-neutral-500)", fontSize: 11 };
const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";

const riskTrend = [
  { name: "00:00", value: 41 },
  { name: "04:00", value: 46 },
  { name: "08:00", value: 54 },
  { name: "12:00", value: 58 },
  { name: "16:00", value: 63 },
  { name: "20:00", value: 58 },
];

const exposureByZone = [
  { name: "Core", value: 2 },
  { name: "Branch", value: 3 },
  { name: "DMZ", value: 5 },
  { name: "Guest", value: 4 },
];

const complianceTrend = [
  { name: "Mon", compliant: 89, target: 95 },
  { name: "Tue", compliant: 90, target: 95 },
  { name: "Wed", compliant: 91, target: 95 },
  { name: "Thu", compliant: 92, target: 95 },
  { name: "Fri", compliant: 91, target: 95 },
];

export default function NetworkPage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Network"
        title="Network Security Operations"
        description="Segment health, live traffic anomalies, and broad infrastructure posture at a glance."
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <section className="card p-5 min-h-[120px]">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">Traffic Throughput</p>
          <p className="m-0 mt-2 text-2xl font-bold text-white">8.1 Gbps</p>
        </section>
        <section className="card p-5 min-h-[120px]">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">Blocked Connections (24h)</p>
          <p className="m-0 mt-2 text-2xl font-bold text-white">3,412</p>
        </section>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-black dark:text-white">Core Segment Risk</p>
          <p className="m-0 mt-2 text-sm text-slate-400">Score 58/100</p>
          <div className="mt-3 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrend} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.46} />
                    <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", backdropFilter: "blur(10px)" }}
                  labelStyle={{ color: "var(--color-neutral-500)" }}
                />
                <Area type="monotone" dataKey="value" name="Risk score" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#riskGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-black dark:text-white">External Exposure</p>
          <p className="m-0 mt-2 text-sm text-slate-400">7 critical open ports</p>
          <div className="mt-3 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureByZone} barCategoryGap="26%" margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", backdropFilter: "blur(10px)" }}
                  labelStyle={{ color: "var(--color-neutral-500)" }}
                />
                <Bar dataKey="value" name="Open ports" fill={CHART_SECONDARY} radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-black dark:text-white">NAC Compliance</p>
          <p className="m-0 mt-2 text-sm text-slate-400">91% compliant endpoints</p>
          <div className="mt-3 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={complianceTrend} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="nacGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_SECONDARY} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={CHART_SECONDARY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={34} domain={[80, 100]} />
                <Tooltip
                  contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", backdropFilter: "blur(10px)" }}
                  labelStyle={{ color: "var(--color-neutral-500)" }}
                />
                <Area type="monotone" dataKey="target" name="Target" stroke="var(--color-neutral-500)" strokeWidth={1.8} fillOpacity={0} dot={false} />
                <Area type="monotone" dataKey="compliant" name="Compliant %" stroke={CHART_SECONDARY} strokeWidth={2.5} fill="url(#nacGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <DataTable
        className="flex-1 min-h-[420px]"
        title="Network Asset and Event Table"
        columns={["Node", "Type", "IP", "Segment", "Latest Event", "Severity", "Owner"]}
        rows={[
          ["DC-EDGE-02", "Server", "172.16.10.3", "Core", "Suspicious outbound DNS", "High", "Infra"],
          ["Branch-AP-03", "Access Point", "172.16.20.1", "Branch", "Firmware outdated", "Medium", "Network"],
          ["Unknown-Lenovo", "Laptop", "172.16.10.77", "Corp-WiFi", "Unauthorized join", "Critical", "Unassigned"],
          ["FIN-WIN-04", "Workstation", "172.16.10.31", "Finance", "RDP scan detected", "High", "Finance IT"],
        ]}
      />
    </div>
  );
}
