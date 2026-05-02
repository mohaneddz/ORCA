import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useRegisteredDevicesQuery } from "@/hooks/queries/useRegisteredDevicesQuery";

export default function DevicesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRegisteredDevicesQuery();

  if (isLoading || !data) {
    return <div className="page-section">Loading device inventory...</div>;
  }

  const totalOpenExposures = data.exposureByType.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="page-section">
      <PageHeader badge="Devices" title="Device Command Inventory" description="Complete inventory with endpoint health, ownership mapping, and drill-down into each device profile." />
      <StatGrid stats={data.stats} />

      <section className="grid gap-3 xl:grid-cols-2">
        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Compliance Snapshot</p>
          <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">6-week endpoint posture (% of fleet)</p>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.complianceTrend} barCategoryGap="22%">
                <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "var(--color-neutral-500)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} tick={{ fill: "var(--color-neutral-500)", fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip cursor={{ fill: "var(--color-surface-hover)" }} contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", fontSize: 12 }} />
                <Bar dataKey="encryption" name="Encryption" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="edr" name="EDR Online" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="patching" name="Patch Baseline" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5 min-h-[280px]">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Exposure Summary</p>
          <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">Open findings by category (last scan)</p>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.exposureByType} layout="vertical" margin={{ left: 12, right: 8 }}>
                <CartesianGrid stroke="var(--color-border-subtle)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--color-neutral-500)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-neutral-400)", fontSize: 11 }} tickLine={false} axisLine={false} width={92} />
                <Tooltip cursor={{ fill: "var(--color-surface-hover)" }} contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {data.exposureByType.map((item) => <Cell key={item.name} fill={item.color} />)}
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
          rows={data.deviceRows}
          minWidth={980}
          filterColumn="Type"
          searchPlaceholder="Search by ID, name, user, OS, or type"
          onRowClick={(row) => navigate(ROUTES.deviceDetails.replace(":deviceId", row[0]))}
        />
      </section>
    </div>
  );
}
