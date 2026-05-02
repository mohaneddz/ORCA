import { BulletActions, DataTable, PageHeader, SplitCards, StatGrid } from "@/components/cards/BaseCards";

export default function EmployeePlaygroundPage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Employee Playground"
        title="Employee Playground"
        description="Security-awareness lab to test employee resilience with phishing simulations, controlled password guess simulations, and passive guesser campaigns."
      />
      <StatGrid
        stats={[
          { label: "Simulations This Month", value: "22" },
          { label: "Phishing Click Rate", value: "14%", tone: "danger" },
          { label: "Report Rate", value: "73%", tone: "ok" },
          { label: "Password Guess Success", value: "9 accounts", tone: "danger" },
          { label: "Passive Guesser Running", value: "Yes" },
          { label: "High-Risk Employees", value: "12" },
        ]}
      />

      <SplitCards
        left={
          <BulletActions
            title="Simulation Actions"
            items={[
              "Launch fake phishing email campaign by department.",
              "Clone login pages for controlled credential-harvest drills.",
              "Trigger fake external-share alerts and measure response time.",
              "Auto-enroll failed users into targeted training modules.",
            ]}
          />
        }
        right={
          <BulletActions
            title="Password Guessing Lab"
            items={[
              "Run controlled brute-guess for workstation lock screens.",
              "Run account password guess checks against approved dictionaries.",
              "Enable passive guesser to score weak credential patterns continuously.",
              "Immediately force reset when guess confidence crosses threshold.",
            ]}
          />
        }
      />

      <DataTable
        title="Campaign and Guessing Results"
        columns={["Scenario", "Target Group", "Result", "Auto Action", "Date"]}
        rows={[
          ["Invoice-Clone-07", "Finance", "5 clicked, 3 submitted", "Force training + manager notice", "2026-05-01"],
          ["Password Guess Pass #18", "Operations", "2 weak passwords cracked", "Password reset + MFA enforce", "2026-04-30"],
          ["Passive Guesser Sweep", "All Staff", "9 high-confidence weak patterns", "Reset queued", "2026-04-29"],
          ["Secure-Share Trap", "HR", "1 suspicious upload approved", "Awareness drill assigned", "2026-04-27"],
        ]}
      />
    </div>
  );
}
