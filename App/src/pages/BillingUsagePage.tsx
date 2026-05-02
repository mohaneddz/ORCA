import { PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { DonutGauge, GroupedBarChart } from "@/components/ui/TrendChart";
import { useBillingUsageQuery } from "@/hooks/queries/useBillingUsageQuery";

export default function BillingUsagePage() {
  const { data, isLoading } = useBillingUsageQuery();

  if (isLoading || !data) {
    return <div className="page-section h-[calc(100vh-120px)] overflow-y-auto pr-1">Loading billing usage...</div>;
  }

  return (
    <div className="page-section h-[calc(100vh-120px)] overflow-y-auto pr-1">
      <PageHeader
        badge="Billing"
        title="Billing & Usage"
        description="Simple overview of usage percentages, placeholder limits, and plan details."
      />

      <section className="grid gap-3 xl:grid-cols-3">
        {data.plans.map((plan) => (
          <article
            key={plan.name}
            className={`card p-5 flex flex-col justify-between ${plan.accent} ${plan.disabled ? "opacity-60 grayscale-[0.5]" : ""}`}
          >
            <div>
              <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--color-neutral-500)]">
                {plan.name} {plan.disabled && <span className="ml-2 text-[10px] text-amber-500/80 font-bold border border-amber-500/30 px-1 rounded">SOON</span>}
              </p>
              <p className="m-0 mt-2 text-2xl font-bold text-[var(--color-neutral-100)]">{plan.price}</p>
              <p className="m-0 mt-3 text-sm text-[var(--color-neutral-300)]">{plan.seats}</p>
              <p className="m-0 mt-1 text-sm text-[var(--color-neutral-500)]">{plan.support}</p>
            </div>
            <button
              type="button"
              disabled={plan.disabled}
              className={`mt-4 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                plan.disabled
                  ? "border-[var(--color-border)] text-[var(--color-neutral-500)] cursor-not-allowed"
                  : "border-[var(--color-border)] text-[var(--color-neutral-200)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {plan.disabled ? "Unavailable" : "Select Plan"}
            </button>
          </article>
        ))}
      </section>

      <StatGrid stats={data.stats} />

      <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr] flex-1">
        <GroupedBarChart
          title="Usage Percentages vs Limit"
          data={data.usageByCategory}
          primaryLabel="Used %"
          secondaryLabel="Limit %"
          className="h-full"
        />
        <DonutGauge title="Total Usage" value={data.totalUsagePct} max={100} label="Used %" />
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Limits</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">
              Limits are not configured yet. Placeholder values are shown as percentages only.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.usageByCategory.map((item) => (
            <div key={item.name} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
              <p className="m-0 text-xs uppercase tracking-wide text-[var(--color-neutral-500)]">{item.name}</p>
              <p className="m-0 mt-1 text-sm font-semibold text-[var(--color-neutral-100)]">
                {item.primary}% / <span className="text-[var(--color-neutral-400)]">Limit TBD</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
