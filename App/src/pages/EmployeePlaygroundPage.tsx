import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

const AXIS_STYLE = { fill: "#64748b", fontSize: 11 };
const CHART_PRIMARY = "#1d4ed8";
const CHART_SECONDARY = "#38bdf8";

export default function TrainingPage() {
  const { t } = useAppSettings();

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["training-analytics"],
    queryFn: () => fetchApi<any>("/api/phishing/analytics/"),
  });

  const { data: quizzesData } = useQuery({
    queryKey: ["training-quizzes"],
    queryFn: () => fetchApi<any>("/api/gamification/quizzes/").catch(() => null),
  });

  const { data: enrollmentsData } = useQuery({
    queryKey: ["training-enrollments"],
    queryFn: () => fetchApi<any>("/api/phishing/training/enrollments/").catch(() => null),
  });

  if (isAnalyticsLoading || !analyticsData) {
    return <PageSkeleton />;
  }

  const tableRows = (quizzesData?.quizzes || []).map((q: any) => [
    q.title || q.question,
    q.difficulty || "Medium",
    `${q.points_reward || 10} pts`,
    "Available"
  ]);

  const enrollmentRows = (enrollmentsData?.enrollments || []).map((e: any) => [
    e.employee_name,
    e.module_title,
    new Date(e.enrolled_at).toLocaleDateString(),
    e.completed_at ? "Completed" : "Pending"
  ]);

  const trendData = (analyticsData?.trend || []).map((t: any) => ({
    week: t.month,
    passRate: t.trainings_completed ? 100 : 0, // Mock pass rate from trainings
    reportRate: t.click_rate ? 100 - t.click_rate : 100, // Inverse of click rate
  }));

  const clickRate = Math.round(analyticsData?.overall_click_rate || 0);
  const reportRate = 100 - clickRate;

  return (
    <div className="page-section">
      <PageHeader
        badge={t("training.badge")}
        title={t("training.title")}
        description={t("training.description")}
      />

      <section className="grid gap-3 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2 min-h-[420px]">
          <p className="m-0 text-sm font-semibold text-white">{t("training.board.title")}</p>
          <p className="m-0 mt-2 text-sm text-slate-400">{t("training.board.description")}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.65fr_1fr]">
            <section className="rounded-xl border border-white/8 bg-slate-900/30 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                <span>{t("training.trend.title")}</span>
                <span className="text-cyan-300">{t("training.trend.risk")}</span>
              </div>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData.length ? trendData : [{ week: "Current", passRate: 0, reportRate: 0 }]} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
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
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="week" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(29,78,216,0.45)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }}
                      labelStyle={{ color: "#64748b" }}
                    />
                    <Area type="monotone" dataKey="passRate" name="Pass rate %" stroke={CHART_PRIMARY} strokeWidth={2.4} fill="url(#passRateGradient)" dot={false} />
                    <Area type="monotone" dataKey="reportRate" name="Report rate %" stroke={CHART_SECONDARY} strokeWidth={2.4} fill="url(#reportRateGradient)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-xl border border-white/8 bg-slate-900/30 p-3">
              <p className="m-0 text-xs text-slate-400">{t("training.completion.title")}</p>
              <div className="mt-2 h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.length ? trendData.map((d: any) => ({ group: d.week, completed: d.passRate })) : []} margin={{ top: 4, right: 6, left: -20, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="group" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "rgba(10, 25, 49, 0.76)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, color: "#e2e8f0", backdropFilter: "blur(10px)" }}
                      labelStyle={{ color: "#64748b" }}
                    />
                    <Bar dataKey="completed" name="Completed %" fill={CHART_SECONDARY} radius={[5, 5, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-blue-700/35 bg-blue-900/20 px-3 py-2 text-slate-300 backdrop-blur-sm">{t("training.stats.passRate")} <span className="ml-1 font-semibold text-white">N/A</span></div>
            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-slate-300">{t("training.stats.reportRate")} <span className="ml-1 font-semibold text-white">{reportRate}%</span></div>
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-slate-300">{t("training.stats.clickRate")} <span className="ml-1 font-semibold text-white">{clickRate}%</span></div>
          </div>
        </section>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1">
          {[
            { key: "training.kpi.active", val: String(analyticsData?.total_campaigns || 0) },
            { key: "training.kpi.failure", val: `${clickRate}%` },
            { key: "training.kpi.report", val: `${reportRate}%` },
            { key: "training.kpi.enrolled", val: String(analyticsData?.total_sent || 0) }
          ].map((item) => (
            <section key={item.key} className="card p-5 min-h-[96px]">
              <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">{t(item.key)}</p>
              <p className="m-0 mt-2 text-xl font-bold text-white">{item.val}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-5">
        <div className="xl:col-span-4 grid gap-3">
          <DataTable
            title={t("training.table.title") + " (Quizzes)"}
            columns={["Quiz", "Difficulty", "Reward", "Status"]}
            rows={tableRows}
            minWidth={500}
          />
          <DataTable
            title="Training Enrollments"
            columns={["Employee", "Module", "Enrolled", "Status"]}
            rows={enrollmentRows}
            minWidth={500}
            filterColumn="Status"
          />
        </div>
        <section className="card p-5">
          <p className="m-0 text-sm font-semibold text-white">{t("training.tools.title")}</p>
          <ul className="m-0 mt-3 space-y-2 pl-5 text-sm text-slate-400">
            <li>{t("training.tools.generator")}</li>
            <li>{t("training.tools.difficulty")}</li>
            <li>{t("training.tools.remediation")}</li>
            <li>{t("training.tools.export")}</li>
          </ul>
        </section>
      </section>
    </div>
  );
}
