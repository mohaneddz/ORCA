import TrendChart, { DonutGauge, DualAreaChart } from "@/components/ui/TrendChart";
import { BulletActions, DataTable, PageHeader, SplitCards, StatGrid } from "@/components/cards/BaseCards";

export default function HomePage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Overview"
        title="Organization Security Overview"
        description="General stats and current security posture across accounts, devices, network traffic, and employee behavior."
      />

      <StatGrid
        stats={[
          { label: "Organization Risk Score", value: "64 / 100", helper: "Updated 2 minutes ago",  trend: -3.2 },
          { label: "Connected Devices",        value: "38",        helper: "31 managed, 7 unmanaged", trend: 8.1 },
          { label: "Critical Threats",         value: "3",         helper: "Need immediate action",   trend: -50, tone: "danger" },
          { label: "Google Accounts",          value: "124",       helper: "5 need password reset",   trend: 0 },
          { label: "Suspicious Sign-Ins",      value: "9",         helper: "Last 24h",                trend: 12.5, tone: "danger" },
          { label: "Awareness Score",          value: "82%",       helper: "Employee playground outcomes", trend: 9.0, tone: "ok" },
        ]}
      />

      {/* Main chart split */}
      <section className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <DualAreaChart
          data={[
            { name: "Mon", primary: 58, secondary: 45 },
            { name: "Tue", primary: 62, secondary: 50 },
            { name: "Wed", primary: 55, secondary: 48 },
            { name: "Thu", primary: 67, secondary: 52 },
            { name: "Fri", primary: 64, secondary: 58 },
            { name: "Sat", primary: 60, secondary: 55 },
            { name: "Sun", primary: 66, secondary: 60 },
          ]}
          title="Risk Score vs Resolved Events"
          primaryLabel="Risk Score"
          secondaryLabel="Resolved"
        />
        <DonutGauge
          title="Device Distribution"
          value={31}
          max={38}
          label="Managed"
          breakdown={[
            { label: "Trusted",      value: 29, color: "#10b981" },
            { label: "Needs Review", value: 6,  color: "#f59e0b" },
            { label: "Blocked",      value: 3,  color: "#f43f5e" },
          ]}
        />
      </section>

      <SplitCards
        left={
          <BulletActions
            title="Executive Highlights"
            items={[
              "Most exposed area: endpoint passwords reused on unmanaged SaaS.",
              "Network drift detected: 4 unknown devices joined in the last 6 hours.",
              "Phishing resilience improved by 9% after last simulation cycle.",
              "2 departments have not completed policy acknowledgment this week.",
            ]}
          />
        }
        right={
          <BulletActions
            title="Immediate Priorities"
            items={[
              "Force password rotation for all accounts flagged as reused.",
              "Review control center queue for device + account lock actions.",
              "Quarantine unknown network devices pending owner assignment.",
              "Run high-risk phishing simulation for finance and procurement teams.",
            ]}
          />
        }
      />

      <TrendChart
        data={[
          { name: "Mon", value: 58 },
          { name: "Tue", value: 62 },
          { name: "Wed", value: 55 },
          { name: "Thu", value: 67 },
          { name: "Fri", value: 64 },
          { name: "Sat", value: 60 },
          { name: "Sun", value: 66 },
        ]}
        title="7-Day Risk Score Trend"
        color="cyan"
      />

      <DataTable
        title="Latest Security Feed"
        columns={["Category", "Signal", "Entity", "Owner", "Time", "Status"]}
        rows={[
          ["Network",    "New unmanaged device discovered",     "172.16.10.77",       "Unknown",         "09:31", "Queued"],
          ["Accounts",   "Password reused on 3 external sites", "nadia@org.com",       "Nadia K.",        "09:18", "Open"],
          ["Device",     "Local admin account enabled",          "OPS-WIN-09",          "Karim D.",        "08:57", "Investigating"],
          ["Playground", "Phishing simulation clicked",          "invoice-campaign",    "Procurement Team","08:33", "Training Needed"],
        ]}
      />
    </div>
  );
}
