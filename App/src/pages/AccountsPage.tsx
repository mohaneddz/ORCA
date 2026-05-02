import { useQuery } from "@tanstack/react-query";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

export default function AccountsPage() {
  const { t } = useAppSettings();

  const { data, isLoading } = useQuery({
    queryKey: ["accounts-page"],
    queryFn: () => fetchApi<any>("/api/dw/employees/"),
  });

  if (isLoading || !data) {
    return <PageSkeleton />;
  }

  const rows = (data?.employees || []).map((emp: any) => [
    emp.name || "Unknown",
    emp.email || "No email",
    emp.role || emp.department || "Employee",
    "Enabled", // Mocking MFA status as API doesn't return it
    "Active"
  ]);

  const stats = [
    { label: t("accounts.stats.total"), value: String(data?.total || 0) },
    { label: t("accounts.stats.admins"), value: String(data?.employees?.filter((e: any) => e.role?.toLowerCase() === "admin").length || 0) },
    { label: t("accounts.stats.staff"), value: String(data?.employees?.filter((e: any) => e.role?.toLowerCase() !== "admin").length || 0) },
    { label: t("accounts.stats.atRisk"), value: String(data?.employees?.filter((e: any) => e.device?.latest_risk_score < 50).length || 0), tone: "danger" },
  ];
  return (
    <div className="page-section min-h-0">
      <PageHeader
        badge={t("accounts.badge")}
        title={t("accounts.title")}
        description={t("accounts.description")}
      />

      <StatGrid stats={stats} />

      <section className="grid flex-1 min-h-0 gap-3 xl:grid-cols-5">
        <div className="xl:col-span-4 min-h-0 flex">
          <DataTable
            className="h-full flex-1"
            title={t("accounts.table.title")}
            columns={[t("table.name"), t("table.email"), t("table.role"), t("table.mfa"), t("table.status")]}
            filterColumn={t("table.status")}
            searchPlaceholder={t("accounts.search")}
            rows={rows}
            minWidth={500}
          />
        </div>
        <section className="card p-5 h-full">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">{t("accounts.assist.title")}</p>
          <ul className="m-0 mt-3 space-y-2 pl-5 text-sm text-[var(--color-neutral-400)]">
            <li>{t("accounts.assist.forcePassword")}</li>
            <li>{t("accounts.assist.bulkMfa")}</li>
            <li>{t("accounts.assist.suspend")}</li>
            <li>{t("accounts.assist.review")}</li>
          </ul>
        </section>
      </section>

      <StatGrid
        stats={[
          { label: t("accounts.stats2.passwordResets"), value: "12" },
          { label: t("accounts.stats2.privileged"), value: "14", tone: "warn" },
          { label: t("accounts.stats2.noMfa"), value: "5", tone: "danger" },
          { label: t("accounts.stats2.lastSync"), value: "2m ago" },
        ]}
      />
    </div>
  );
}
