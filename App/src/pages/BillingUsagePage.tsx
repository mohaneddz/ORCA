import { useState } from "react";
import { PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { DonutGauge, GroupedBarChart } from "@/components/ui/TrendChart";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

type BillingUsageResponse = {
  organization: string;
  plan: "free" | "pro" | "business";
  cycle_start: string;
  cycle_end: string;
  limits: {
    members: number;
    projects: number;
    devices: number;
    api_requests_per_month: number;
    storage_gb: number;
    support_tickets_per_month: number;
    data_retention_days: number;
  };
  usage: {
    members: number;
    projects: number;
    devices: number;
    api_requests_per_month: number;
    storage_gb: number;
    support_tickets_per_month: number;
    data_retention_days: number;
  };
};

export default function BillingUsagePage() {
  const { t } = useAppSettings();
  const [showPlans, setShowPlans] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["billing-usage"],
    queryFn: () => fetchApi<BillingUsageResponse>("/api/billing/usage/"),
  });

  if (isLoading || !data) return <PageSkeleton />;

  const pct = (used: number, max: number) => (max <= 0 ? 0 : Math.min(100, Math.round((used / max) * 100)));
  const usageByCategory = [
    { name: "Members", primary: pct(data.usage.members, data.limits.members), secondary: 100 },
    { name: "Projects", primary: pct(data.usage.projects, data.limits.projects), secondary: 100 },
    { name: "Devices", primary: pct(data.usage.devices, data.limits.devices), secondary: 100 },
    { name: "API Requests", primary: pct(data.usage.api_requests_per_month, data.limits.api_requests_per_month), secondary: 100 },
    { name: "Storage", primary: pct(data.usage.storage_gb, data.limits.storage_gb), secondary: 100 },
    { name: "Support Tickets", primary: data.limits.support_tickets_per_month > 100000 ? 0 : pct(data.usage.support_tickets_per_month, data.limits.support_tickets_per_month), secondary: 100 },
  ];
  const totalUsage = Math.round(usageByCategory.reduce((acc, it) => acc + it.primary, 0) / usageByCategory.length);

  return (
    <div className="page-section">
      <PageHeader
        badge={t("billing.badge")}
        title={t("billing.title")}
        description={t("billing.description")}
      />

      <StatGrid
        stats={[
          { label: t("billing.stats.plan"), value: data.plan.toUpperCase(), helper: data.organization, tone: "ok" },
          { label: t("billing.stats.upgrade"), value: data.plan === "free" ? "PRO" : data.plan === "pro" ? "BUSINESS" : "BUSINESS", helper: "Recommended next tier", tone: "warn" },
          { label: t("billing.stats.cycle"), value: new Date(data.cycle_start).toLocaleDateString(), helper: `Until ${new Date(data.cycle_end).toLocaleDateString()}` },
          { label: t("billing.stats.spend"), value: `${totalUsage}%`, helper: "Average usage across limits", tone: totalUsage >= 80 ? "warn" : "ok" },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <GroupedBarChart
          title={t("billing.chart.title")}
          data={usageByCategory}
          primaryLabel={t("billing.chart.used")}
          secondaryLabel={t("billing.chart.limit")}
        />
        <DonutGauge title={t("billing.gauge.title")} value={totalUsage} max={100} label={t("billing.chart.used")} />
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-white">{t("billing.limits.title")}</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">
              {t("billing.limits.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPlans((current) => !current)}
            className="btn-ghost text-xs uppercase tracking-wider"
          >
            {showPlans ? t("billing.plans.hide") : t("billing.plans.show")}
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {usageByCategory.map((item) => (
            <div key={item.name} className="rounded-md border border-white/10 bg-white/4 px-3 py-2">
              <p className="m-0 text-xs uppercase tracking-wide text-[var(--color-neutral-500)]">{item.name}</p>
              <p className="m-0 mt-1 text-sm font-semibold text-white">
                {item.primary}% / <span className="text-[var(--color-neutral-500)]">100%</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {showPlans && (
        <section className="grid gap-3 xl:grid-cols-3">
          {[
            { name: "Free", limits: "Members: 1-3 | Projects: 1-3 | Devices: 3-5 | API: 1k | Storage: 1 GB | Support: Community only | Retention: 7-30 days" },
            { name: "Pro", limits: "Members: 10 | Projects: 20 | Devices: 25 | API: 50k | Storage: 50 GB | Support: 5-10 tickets/mo | Retention: 90 days" },
            { name: "Business", limits: "Members: 50+ | Projects: Unlimited | Devices: 100+ | API: 500k+ | Storage: 500 GB+ | Support: Priority/unlimited | Retention: 1 year+" },
          ].map((plan) => (
            <article key={plan.name} className="card p-5">
              <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--color-neutral-500)]">{plan.name}</p>
              <p className="m-0 mt-3 text-sm text-[var(--color-neutral-300)]">{plan.limits}</p>
              <button type="button" className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-white/8">
                {t("billing.plans.select")}
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
