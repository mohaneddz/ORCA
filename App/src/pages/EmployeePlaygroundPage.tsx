import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const resilienceTrend = [
  { week: "W1", passRate: 62, reportRate: 44, clickRate: 28 },
  { week: "W2", passRate: 67, reportRate: 51, clickRate: 25 },
  { week: "W3", passRate: 72, reportRate: 56, clickRate: 20 },
  { week: "W4", passRate: 76, reportRate: 62, clickRate: 18 },
  { week: "W5", passRate: 81, reportRate: 68, clickRate: 15 },
  { week: "W6", passRate: 86, reportRate: 73, clickRate: 14 },
];

const campaignBreakdown = [
  { group: "Finance", completed: 92 },
  { group: "Ops", completed: 84 },
  { group: "HR", completed: 88 },
  { group: "Marketing", completed: 79 },
];

const AXIS_STYLE = { fill: "var(--color-neutral-500)", fontSize: 11 };
const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";

export default function TrainingPage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Training"
        title="Awareness and Simulation Training"
        description="Campaign outcomes, user resilience progression, and guided response tooling."
      />

      <section className="grid gap-3 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2 min-h-[420px]">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Training Performance Board</p>
          <p className="m-0 mt-2 text-sm text-[var(--color-neutral-400)]">Resilience curve, suspicious-report growth, and click-risk decline across active simulations.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.65fr_1fr]">
            <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-neutral-400)]">
                <span>6-Week Behavior Trend</span>
                <span className="text-[var(--color-primary)]">Click risk: -50%</span>
              </div>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={resilienceTrend} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="passRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.46} />
                        <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="reportRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_SECONDARY} stopOpacity={0.38} />
                        <stop offset="100%" stopColor={CHART_SECONDARY} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="week" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", backdropFilter: "blur(10px)" }}
                      labelStyle={{ color: "var(--color-neutral-500)" }}
                    />
                    <Area type="monotone" dataKey="passRate" name="Pass rate %" stroke={CHART_PRIMARY} strokeWidth={2.4} fill="url(#passRateGradient)" dot={false} />
                    <Area type="monotone" dataKey="reportRate" name="Report rate %" stroke={CHART_SECONDARY} strokeWidth={2.4} fill="url(#reportRateGradient)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
              <p className="m-0 text-xs text-[var(--color-neutral-400)]">Completion by Department</p>
              <div className="mt-2 h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignBreakdown} margin={{ top: 4, right: 6, left: -20, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="group" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, color: "var(--color-neutral-200)", backdropFilter: "blur(10px)" }}
                      labelStyle={{ color: "var(--color-neutral-500)" }}
                    />
                    <Bar dataKey="completed" name="Completed %" fill={CHART_SECONDARY} radius={[5, 5, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-neutral-300)] backdrop-blur-sm">Avg Pass Rate <span className="ml-1 font-semibold text-[var(--color-neutral-100)]">74%</span></div>
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-neutral-300)]">Avg Report Rate <span className="ml-1 font-semibold text-[var(--color-neutral-100)]">59%</span></div>
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-neutral-300)]">Avg Click Rate <span className="ml-1 font-semibold text-[var(--color-neutral-100)]">20%</span></div>
          </div>
        </section>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1">
          {["Active Campaigns", "Failure Rate", "Report Rate", "Auto-Enrolled"].map((title, idx) => (
            <section key={title} className="card p-5 min-h-[96px]">
              <p className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--color-neutral-400)]">{title}</p>
              <p className="m-0 mt-2 text-xl font-bold text-[var(--color-neutral-100)]">{["9", "14%", "73%", "22"][idx]}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-5">
        <div className="xl:col-span-4">
          <DataTable
            title="Training Sessions"
            columns={["Session", "Target", "Result", "Assigned Follow-Up", "Date"]}
            rows={[
              ["Invoice Clone v2", "Finance", "5 clicks", "Mandatory module", "2026-05-02"],
              ["Credential Harvest Drill", "Operations", "2 submissions", "1:1 coaching", "2026-05-01"],
              ["Link Safety Sprint", "HR", "89% pass", "None", "2026-04-30"],
              ["Attachment Trap", "All Staff", "11 risky opens", "Micro-training", "2026-04-29"],
            ]}
          />
        </div>
        <section className="card p-5">
          <p className="m-0 text-sm font-semibold text-[var(--color-neutral-100)]">Assisting Tools</p>
          <ul className="m-0 mt-3 space-y-2 pl-5 text-sm text-[var(--color-neutral-400)]">
            <li>Template generator</li>
            <li>Adaptive difficulty</li>
            <li>Auto-remediation links</li>
            <li>Behavior score export</li>
          </ul>
        </section>
      </section>
    </div>
  );
}
