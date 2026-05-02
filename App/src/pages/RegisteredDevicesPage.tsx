import { DataTable, PageHeader, SplitCards, StatGrid, BulletActions } from "@/components/cards/BaseCards";

export default function RegisteredDevicesPage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Registered Devices"
        title="Registered Devices"
        description="Each registered device and its assigned user, including the latest endpoint information and activity timeline."
      />
      <StatGrid
        stats={[
          { label: "Total Registered", value: "31" },
          { label: "Healthy Devices", value: "22", tone: "ok" },
          { label: "At-Risk Devices", value: "7", tone: "danger" },
          { label: "Offline > 24h", value: "2" },
          { label: "OS Patches Pending", value: "11" },
          { label: "Encryption Disabled", value: "3", tone: "danger" },
        ]}
      />

      <SplitCards
        left={
          <BulletActions
            title="Latest Device Activities"
            items={[
              "OPS-WIN-09: local admin account created 14 minutes ago.",
              "HR-LAP-02: USB mass storage mounted at 09:12.",
              "FIN-WIN-04: firewall profile switched to public.",
              "MKT-MAC-01: endpoint protection signatures updated.",
            ]}
          />
        }
        right={
          <BulletActions
            title="Recommended Fixes"
            items={[
              "Enforce full disk encryption on all non-compliant endpoints.",
              "Auto-disable local admin creation outside IT department.",
              "Block unknown USB classes for finance and HR groups.",
              "Schedule patch wave for Windows security baseline drift.",
            ]}
          />
        }
      />

      <DataTable
        title="Device Inventory"
        columns={["Device", "Assigned User", "OS", "Last Seen", "Latest Activity", "Risk", "Status"]}
        rows={[
          ["OPS-WIN-09", "Karim D.", "Windows 11", "2 min ago", "PowerShell privilege escalation attempt", "78", "Action Needed"],
          ["FIN-WIN-04", "Nadia K.", "Windows 10", "6 min ago", "Firewall disabled by local user", "84", "Critical"],
          ["MKT-MAC-01", "Sofia R.", "macOS 14", "1 min ago", "No anomalies in last 24h", "21", "Healthy"],
          ["HR-LAP-02", "Nour H.", "Windows 11", "9 min ago", "Unknown USB attached", "62", "Monitor"],
          ["REC-CHROME-01", "Reception Desk", "ChromeOS", "31 min ago", "Missed patch cycle", "47", "Maintenance"],
        ]}
      />
    </div>
  );
}
