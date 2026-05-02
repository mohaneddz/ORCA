import { DataTable, PageHeader, SplitCards, StatGrid, BulletActions } from "@/components/cards/BaseCards";

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
          { label: "Managed Accounts", value: "124" },
          { label: "Managed Mailboxes", value: "124" },
          { label: "Managed Devices", value: "31" },
          { label: "Pending Lock Actions", value: "6", tone: "danger" },
          { label: "Forced Sign-Outs Today", value: "14" },
          { label: "Policy Push Success", value: "97%", tone: "ok" },
        ]}
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

      <DataTable
        title="Live Control Queue"
        columns={["Target", "Type", "Owner", "Issue", "Recommended Action", "Run"]}
        rows={[
          ["nadia@org.com", "Google Account", "Nadia K.", "Compromised sign-in pattern", "Force reset + revoke tokens", "Execute"],
          ["FIN-WIN-04", "Device", "Finance Team", "RDP left exposed", "Apply hardening policy", "Execute"],
          ["hr@org.com", "Mailbox", "HR Team", "Phishing thread detected", "Quarantine thread + alert users", "Execute"],
          ["karim@org.com", "Google Account", "Karim D.", "Password reused externally", "Require password rotation", "Execute"],
        ]}
      />
    </div>
  );
}
