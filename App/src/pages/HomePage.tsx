import { DonutGauge, DualAreaChart } from "@/components/ui/TrendChart";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";

export default function HomePage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Home"
        title="Security Operations Home"
        description="High-level posture, risk movement, and active queues across devices, identities, and network activity."
      />

      <StatGrid
        stats={[
          { label: "Global Risk Score", value: "61 / 100", trend: -2.1 },
          { label: "Open Incidents", value: "18", tone: "danger", trend: 12.5 },
          { label: "Managed Devices", value: "142", tone: "ok", trend: 4.8 },
          { label: "Policy Coverage", value: "93%", trend: 1.4 },
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
            title="Risk vs Remediation Velocity"
            primaryLabel="Risk Index"
            secondaryLabel="Resolved Signals"
          />
        </div>
        <DonutGauge
          title="Asset Compliance"
          value={132}
          max={142}
          label="Compliant"
          breakdown={[
            { label: "Compliant", value: 132, color: "#10b981" },
            { label: "Pending", value: 7, color: "#f59e0b" },
            { label: "Critical", value: 3, color: "#f43f5e" },
          ]}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable
          title="Incident Queue"
          columns={["Signal", "Entity", "Owner", "Priority", "Status"]}
          rows={[
            ["Credential reuse", "finance@org.com", "IAM Team", "P1", "Open"],
            ["Suspicious binary", "OPS-WIN-09", "SOC", "P1", "Investigating"],
            ["Unauthorized USB", "HR-LAP-02", "Endpoint", "P2", "Queued"],
            ["Anomalous DNS", "172.16.10.77", "Network", "P2", "Monitoring"],
          ]}
        />
        <DataTable
          title="Recent Automations"
          columns={["Automation", "Target", "Result", "Executor", "Time"]}
          rows={[
            ["Force MFA", "34 accounts", "Success", "Policy Engine", "09:45"],
            ["Patch rollout", "12 devices", "In progress", "Endpoint Ops", "09:31"],
            ["Token revoke", "nadia@org.com", "Success", "Control Center", "09:21"],
            ["Network isolate", "Unknown-Lenovo", "Success", "NAC", "08:59"],
          ]}
        />
      </section>
    </div>
  );
}
