import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { ShieldUser, UserCog, Users, UserX, AlertTriangle } from "lucide-react";

export default function AccountsPage() {
  return (
    <div className="page-section min-h-0">
      <PageHeader
        badge="Accounts"
        title="Identity and Account Surface"
        description="Central account visibility with posture distribution, role concentration, and high-risk account tracking."
      />

      <StatGrid
        stats={[
          { label: "Total", value: "124" },
          { label: "Admins", value: "14" },
          { label: "Staff", value: "98" },
          { label: "At Risk", value: "5", tone: "danger" },
        ]}
      />

      <section className="grid flex-1 min-h-0 gap-3 xl:grid-cols-5">
        <div className="xl:col-span-4 min-h-0 flex">
          <DataTable
            className="h-full flex-1"
            title="Organization Accounts"
            columns={["Name", "Email", "Role", "Department", "MFA", "Risk", "Status"]}
            filterColumn="Status"
            searchPlaceholder="Search account name, email, role, or department"
            rows={[
              ["Nadia Karim", "nadia@org.com", "Admin", "Finance", "Enabled", "84", "Critical"],
              ["Karim Dali", "karim@org.com", "Staff", "Operations", "Enabled", "63", "Review"],
              ["Sofia Rahal", "sofia@org.com", "Staff", "Marketing", "Enabled", "21", "Healthy"],
              ["Nour Hadj", "nour@org.com", "Staff", "HR", "Missing", "74", "Action Needed"],
            ]}
          />
        </div>
        <section className="card p-5 h-full">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Assist</p>
          <ul className="m-0 mt-3 space-y-2 pl-5 text-sm text-[var(--color-neutral-400)]">
            <li>Force password rotation</li>
            <li>Bulk MFA enforcement</li>
            <li>Suspend dormant accounts</li>
            <li>Review privileged roles</li>
          </ul>
        </section>
      </section>

      <StatGrid
        stats={[
          { label: "Password Resets (24h)", value: "12" },
          { label: "Privileged Accounts", value: "14", tone: "warn" },
          { label: "No MFA", value: "5", tone: "danger" },
          { label: "Last Sync", value: "2m ago" },
        ]}
      />
    </div>
  );
}
