import { useState } from "react";
import { PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { DonutGauge, GroupedBarChart } from "@/components/ui/TrendChart";

import { USAGE_BY_CATEGORY, SUBSCRIPTION_PLANS } from "@/data/mockData";

export default function BillingUsagePage() {
  const { t } = useAppSettings();
  const [showPlans, setShowPlans] = useState(false);

  return (
    <div className="page-section">
      <PageHeader
        badge={t("billing.badge")}
        title={t("billing.title")}
        description={t("billing.description")}
      />

      <StatGrid
        stats={[
          { label: t("billing.stats.plan"), value: "Growth", helper: "Active subscription tier", tone: "ok" },
          { label: t("billing.stats.upgrade"), value: "Enterprise", helper: "Recommended next tier", tone: "warn" },
          { label: t("billing.stats.cycle"), value: "May 2026", helper: "Renews in 12 days" },
          { label: t("billing.stats.spend"), value: "64%", helper: "Against expected monthly budget", trend: 5.4, tone: "warn" },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <GroupedBarChart
          title={t("billing.chart.title")}
          data={USAGE_BY_CATEGORY}
          primaryLabel={t("billing.chart.used")}
          secondaryLabel={t("billing.chart.limit")}
        />
        <DonutGauge title={t("billing.gauge.title")} value={64} max={100} label={t("billing.chart.used")} />
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
          {USAGE_BY_CATEGORY.map((item) => (
            <div key={item.name} className="rounded-md border border-white/10 bg-white/4 px-3 py-2">
              <p className="m-0 text-xs uppercase tracking-wide text-[var(--color-neutral-500)]">{item.name}</p>
              <p className="m-0 mt-1 text-sm font-semibold text-white">
                {item.primary}% / <span className="text-[var(--color-neutral-500)]">Limit TBD</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {showPlans && (
        <section className="grid gap-3 xl:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <article key={plan.name} className={`card p-5 ${plan.accent}`}>
              <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--color-neutral-500)]">{plan.name}</p>
              <p className="m-0 mt-2 text-2xl font-bold text-white">{plan.price}</p>
              <p className="m-0 mt-3 text-sm text-[var(--color-neutral-300)]">{t(plan.seatsKey)}</p>
              <p className="m-0 mt-1 text-sm text-[var(--color-neutral-500)]">{t(plan.supportKey)}</p>
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
