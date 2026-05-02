import { DataTable, PageHeader, SplitCards, StatGrid, BulletActions } from "@/components/cards/BaseCards";
import { GroupedBarChart } from "@/components/ui/TrendChart";

const activityData = [
  { name: "Mon", primary: 8,  secondary: 6  },
  { name: "Tue", primary: 14, secondary: 12 },
  { name: "Wed", primary: 11, secondary: 9  },
  { name: "Thu", primary: 18, secondary: 15 },
  { name: "Fri", primary: 16, secondary: 14 },
  { name: "Sat", primary: 4,  secondary: 4  },
  { name: "Sun", primary: 6,  secondary: 5  },
];

export default function ControlCenterPage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Control Center"
        title="Control Center"
        description="Control accounts in the organization, their emails, and their devices from one operational command surface."
      />
      <StatGrid
        stats={[
          { label: "Managed Accounts",    value: "124", trend: 2.4 },
          { label: "Managed Mailboxes",   value: "124", trend: 0 },
          { label: "Managed Devices",     value: "31",  trend: 6.9 },
          { label: "Pending Lock Actions",value: "6",   tone: "danger", trend: 50.0 },
          { label: "Forced Sign-Outs Today", value: "14", trend: -12.5 },
          { label: "Policy Push Success", value: "97%", tone: "ok",    trend: 1.0 },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <GroupedBarChart
          data={activityData}
          title="Control Actions This Week"
          primaryLabel="Actions Taken"
          secondaryLabel="Completed"
        />
        <SplitCards
          left={
            <BulletActions
              title="Bulk Operations"
              items={[
                "Force password reset for selected Google accounts.",
                "Disable sign-in on risky accounts pending verification.",
                "Revoke all active sessions for selected departments.",
                "Push endpoint hardening baseline to selected devices.",
              ]}
            />
          }
          right={
            <BulletActions
              title="Email Controls"
              items={[
                "Block sender domains globally or per department.",
                "Auto-quarantine suspicious attachments by rule.",
                "Enable banner injection for external email warnings.",
                "Create one-click incident escalation from inbox events.",
              ]}
            />
          }
        />
      </section>

      <DataTable
        title="Live Control Queue"
        columns={["Target", "Type", "Owner", "Issue", "Recommended Action", "Run"]}
        rows={[
          ["nadia@org.com", "Google Account", "Nadia K.",     "Compromised sign-in pattern",  "Force reset + revoke tokens",     "Execute"],
          ["FIN-WIN-04",    "Device",         "Finance Team", "RDP left exposed",              "Apply hardening policy",          "Execute"],
          ["hr@org.com",    "Mailbox",        "HR Team",      "Phishing thread detected",      "Quarantine thread + alert users", "Execute"],
          ["karim@org.com", "Google Account", "Karim D.",     "Password reused externally",    "Require password rotation",       "Execute"],
        ]}
      />
    </div>
  );
}
