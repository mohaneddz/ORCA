import { useState } from "react";
import { PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { DonutGauge, GroupedBarChart } from "@/components/ui/TrendChart";

const usageByCategory = [
  { name: "API Calls", primary: 68, secondary: 100 },
  { name: "Storage", primary: 43, secondary: 100 },
  { name: "Team Seats", primary: 57, secondary: 100 },
  { name: "Automations", primary: 31, secondary: 100 },
];

const plans = [
  {
    name: "Starter",
    price: "$29/mo",
    seats: "Up to 5 seats",
    support: "Email support",
    accent: "border-cyan-400/20",
  },
  {
    name: "Growth",
    price: "$99/mo",
    seats: "Up to 20 seats",
    support: "Priority support",
    accent: "border-blue-700/35",
  },
  {
    name: "Enterprise",
    price: "Custom",
    seats: "Unlimited seats",
    support: "Dedicated success manager",
    accent: "border-amber-400/25",
  },
];

export default function BillingUsagePage() {
  const [showPlans, setShowPlans] = useState(false);

  return (
    <div className="page-section">
      <PageHeader
        badge="Billing"
        title="Billing & Usage"
        description="Simple overview of usage percentages, placeholder limits, and plan details."
      />

      <StatGrid
        stats={[
          { label: "Current Plan", value: "Growth", helper: "Active subscription tier", tone: "ok" },
          { label: "Upgrade Plan", value: "Enterprise", helper: "Recommended next tier", tone: "warn" },
          { label: "Billing Cycle", value: "May 2026", helper: "Renews in 12 days" },
          { label: "Spend Progress", value: "64%", helper: "Against expected monthly budget", trend: 5.4, tone: "warn" },
        ]}
      />

      <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <GroupedBarChart
          title="Usage Percentages vs Limit"
          data={usageByCategory}
          primaryLabel="Used %"
          secondaryLabel="Limit %"
        />
        <DonutGauge title="Total Usage" value={64} max={100} label="Used %" />
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-black dark:text-white">Limits</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">
              Limits are not configured yet. Placeholder values are shown as percentages only.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPlans((current) => !current)}
            className="btn-ghost text-xs uppercase tracking-wider"
          >
            {showPlans ? "Hide Plans" : "View Plans"}
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {usageByCategory.map((item) => (
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
          {plans.map((plan) => (
            <article key={plan.name} className={`card p-5 ${plan.accent}`}>
              <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--color-neutral-500)]">{plan.name}</p>
              <p className="m-0 mt-2 text-2xl font-bold text-white">{plan.price}</p>
              <p className="m-0 mt-3 text-sm text-[var(--color-neutral-300)]">{plan.seats}</p>
              <p className="m-0 mt-1 text-sm text-[var(--color-neutral-500)]">{plan.support}</p>
              <button type="button" className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-white/8">
                Select Plan
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
