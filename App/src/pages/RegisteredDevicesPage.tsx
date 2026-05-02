import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
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

const deviceRows = [
  ["dv-1001", "OPS-WIN-09", "Laptop", "Karim D.", "Windows 11", "78", "Action Needed"],
  ["dv-1002", "FIN-WIN-04", "Laptop", "Nadia K.", "Windows 10", "84", "Critical"],
  ["dv-1003", "MKT-MAC-01", "Laptop", "Sofia R.", "macOS 14", "21", "Healthy"],
  ["dv-1004", "DC-EDGE-02", "Server", "Infra Team", "Ubuntu 24.04", "35", "Monitor"],
  ["dv-1005", "Branch-R-01", "Router", "Network Team", "RouterOS", "62", "Review"],
  ["dv-1006", "Core-SW-01", "Switch", "Network Team", "IOS-XE", "12", "Healthy"],
  ["dv-1007", "HR-WIN-12", "Laptop", "Amine S.", "Windows 11", "45", "Healthy"],
  ["dv-1008", "Branch-SW-02", "Switch", "Network Team", "IOS-XE", "88", "Action Needed"],
  ["dv-1009", "Home-R-04", "Router", "Remote User", "OpenWrt", "15", "Healthy"],
];

const complianceTrend = [
  { week: "W1", encryption: 92, edr: 95, patching: 87 },
  { week: "W2", encryption: 93, edr: 96, patching: 88 },
  { week: "W3", encryption: 94, edr: 97, patching: 89 },
  { week: "W4", encryption: 95, edr: 97, patching: 90 },
  { week: "W5", encryption: 95, edr: 98, patching: 90 },
  { week: "W6", encryption: 96, edr: 98, patching: 91 },
];

const exposureByType = [
  { name: "Outdated agents", count: 9, color: "#f59e0b" },
  { name: "Firewall drift", count: 7, color: "#fb7185" },
  { name: "Unmanaged USB", count: 5, color: "#a78bfa" },
  { name: "Weak credentials", count: 3, color: "#22d3ee" },
];

const totalOpenExposures = exposureByType.reduce((acc, item) => acc + item.count, 0);

export default function DevicesPage() {
  const navigate = useNavigate();

  return (
    <div className="page-section">
      <PageHeader
        badge="Devices"
        title="Device Command Inventory"
        description="Complete inventory with endpoint health, ownership mapping, and drill-down into each device profile."
      />

      <StatGrid
        stats={[
          { label: "Total Devices", value: "142", trend: 6.4 },
          { label: "Healthy", value: "113", tone: "ok", trend: 3.1 },
          { label: "At Risk", value: "24", tone: "warn", trend: -2.4 },
          { label: "Critical", value: "5", tone: "danger", trend: 25 },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">Compliance Snapshot</p>
          <p className="m-0 mt-1 text-xs text-slate-400">6-week endpoint posture (% of fleet)</p>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceTrend} barCategoryGap="22%">
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
              <p className="m-0 text-slate-400">Encryption</p>
              <p className="m-0 mt-1 font-semibold text-cyan-300">96%</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <p className="m-0 text-slate-400">EDR Online</p>
              <p className="m-0 mt-1 font-semibold text-emerald-300">98%</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <p className="m-0 text-slate-400">Patch Baseline</p>
              <p className="m-0 mt-1 font-semibold text-violet-300">91%</p>
            </div>
          </div>
        </section>
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-white">Exposure Summary</p>
          <p className="m-0 mt-1 text-xs text-slate-400">Open findings by category (last scan)</p>
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
            <span className="text-slate-400">Total Open Exposures</span>
            <span className="font-semibold text-amber-300">{totalOpenExposures}</span>
          </div>
        </section>
      </section>

      <section className="card overflow-hidden">
        <DataTable
          title="All Devices"
          actions={<span className="text-xs text-slate-400">Click any row to open temporary details page</span>}
          columns={["ID", "Name", "Type", "User", "OS", "Risk", "Status"]}
          rows={deviceRows}
          minWidth={980}
          filterColumn="Type"
          searchPlaceholder="Search by ID, name, user, OS, or type"
          onRowClick={(row) => navigate(ROUTES.deviceDetails.replace(":deviceId", row[0]))}
        />
      </section>
    </div>
  );
}
