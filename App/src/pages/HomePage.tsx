import TrendChart from "@/components/ui/TrendChart";
import { BulletActions, DataTable, PageHeader, SplitCards, StatGrid } from "@/components/cards/BaseCards";

export default function HomePage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Home"
        title="Organization Security Overview"
        description="General stats and current security information across accounts, devices, network traffic, and employee behavior."
      />

      <StatGrid
        stats={[
          { label: "Organization Risk Score", value: "64 / 100", helper: "Updated 2 minutes ago" },
          { label: "Connected Devices", value: "38", helper: "31 managed, 7 unmanaged" },
          { label: "Critical Threats", value: "3", helper: "Need immediate action", tone: "danger" },
          { label: "Google Accounts", value: "124", helper: "5 need password reset" },
          { label: "Suspicious Sign-Ins", value: "9", helper: "Last 24h", tone: "danger" },
          { label: "Awareness Score", value: "82%", helper: "Employee playground outcomes", tone: "ok" },
        ]}
      />

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
      />

      <DataTable
        title="Latest Security Feed"
        columns={["Category", "Signal", "Entity", "Owner", "Time", "Status"]}
        rows={[
          ["Network", "New unmanaged device discovered", "172.16.10.77", "Unknown", "09:31", "Queued"],
          ["Accounts", "Password reused on 3 external sites", "nadia@org.com", "Nadia K.", "09:18", "Open"],
          ["Device", "Local admin account enabled", "OPS-WIN-09", "Karim D.", "08:57", "Investigating"],
          ["Playground", "Phishing simulation clicked", "invoice-campaign", "Procurement Team", "08:33", "Training Needed"],
        ]}
      />
    </div>
  );
}
