import { useState, FormEvent } from "react";
import { PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  DRAFT:     "bg-amber-500/15 text-amber-300 border-amber-500/25",
  COMPLETED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

// ─── Small stat card ─────────────────────────────────────────────────────────

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" | "ok" }) {
  const toneClass =
    tone === "danger" ? "text-rose-300" :
    tone === "warn"   ? "text-amber-300" :
    tone === "ok"     ? "text-emerald-300" : "text-white";
  return (
    <div className="card p-4">
      <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className={`m-0 mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

// ─── Inline alert ─────────────────────────────────────────────────────────────

function InlineAlert({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  const isError = msg.toLowerCase().startsWith("error") || msg.toLowerCase().includes("failed");
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
      isError
        ? "border-rose-500/30 bg-rose-900/20 text-rose-300"
        : "border-emerald-500/30 bg-emerald-900/20 text-emerald-300"
    }`}>
      <span>{msg}</span>
      <button type="button" onClick={onDismiss} className="ml-4 text-slate-400 hover:text-white">✕</button>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const { t } = useAppSettings();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"campaigns" | "gamification" | "enrollments">("campaigns");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // AI generate state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiForm, setAiForm] = useState({
    attack_type: "IT_RESET",
    language: "EN",
    difficulty: 2,
  });
  const [aiPreview, setAiPreview] = useState<any>(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: campaignsData, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ["training-campaigns"],
    queryFn: () => fetchApi<any>("/api/phishing/campaigns/"),
  });

  const { data: templatesData } = useQuery({
    queryKey: ["training-templates"],
    queryFn: () => fetchApi<any>("/api/phishing/templates/").catch(() => null),
  });

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["training-analytics"],
    queryFn: () => fetchApi<any>("/api/phishing/analytics/"),
  });

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ["training-leaderboard"],
    queryFn: () => fetchApi<any>("/api/gamification/leaderboard/").catch(() => null),
  });

  const { data: quizzesData } = useQuery({
    queryKey: ["training-quizzes"],
    queryFn: () => fetchApi<any>("/api/gamification/quizzes/").catch(() => null),
  });

  const { data: enrollmentsData, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ["training-enrollments"],
    queryFn: () => fetchApi<any>("/api/phishing/training/enrollments/").catch(() => null),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const launchMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/phishing/campaigns/${id}/launch/`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["training-analytics"] });
      setActionMsg("Campaign launched — phishing emails are being sent.");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/api/phishing/campaigns/${id}/complete/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["training-analytics"] });
      setActionMsg("Campaign marked as completed.");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const createMutation = useMutation({
    mutationFn: ({ name, template_id }: { name: string; template_id: string }) =>
      fetchApi<any>("/api/phishing/campaigns/", {
        method: "POST",
        body: JSON.stringify({ name, template_id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-campaigns"] });
      setActionMsg("Campaign created as DRAFT. You can now launch it.");
      setShowNewCampaign(false);
      setNewName("");
      setSelectedTemplate("");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (params: { attack_type: string; language: string; difficulty: number; save: boolean }) =>
      fetchApi<any>("/api/phishing/templates/generate/", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: (res) => {
      if (res.id) {
        // saved — refresh templates and auto-select the new one
        queryClient.invalidateQueries({ queryKey: ["training-templates"] });
        setSelectedTemplate(res.id);
        setShowNewCampaign(true);
        setAiPreview(null);
        setShowAiPanel(false);
        setActionMsg("Template generated and saved — now give your campaign a name and create it.");
      } else {
        setAiPreview(res);
      }
    },
    onError: (err: any) => setActionMsg(`Error generating template: ${err.message}`),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedTemplate) {
      setActionMsg("Error: Campaign name and template are required.");
      return;
    }
    createMutation.mutate({ name: newName.trim(), template_id: selectedTemplate });
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const campaigns: any[]  = campaignsData?.campaigns  || [];
  const templates: any[]  = templatesData?.templates  || [];
  const leaderboard: any[] = leaderboardData?.leaderboard || [];
  const quizzes: any[]    = quizzesData?.quizzes       || [];
  const enrollments: any[] = enrollmentsData?.enrollments || [];

  const clickRate      = Math.round(analyticsData?.overall_click_rate || 0);
  const totalSent      = analyticsData?.total_sent       || 0;
  const totalCampaigns = analyticsData?.total_campaigns  || 0;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;

  if (isCampaignsLoading || isAnalyticsLoading) {
    return <PageSkeleton />;
  }

  const TABS = [
    { key: "campaigns",    label: "Phishing Campaigns" },
    { key: "gamification", label: "Gamification & Quizzes" },
    { key: "enrollments",  label: "Training Enrollments" },
  ] as const;

  return (
    <div className="page-section">
      <PageHeader
        badge={t("training.badge")}
        title={t("training.title")}
        description={t("training.description")}
      />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Campaigns"  value={String(totalCampaigns)} />
        <KpiCard label="Active Campaigns" value={String(activeCampaigns)} tone="ok" />
        <KpiCard label="Simulations Sent" value={String(totalSent)} />
        <KpiCard label="Avg Click Rate"   value={`${clickRate}%`}
          tone={clickRate > 30 ? "danger" : clickRate > 15 ? "warn" : "ok"} />
      </div>

      {actionMsg && <InlineAlert msg={actionMsg} onDismiss={() => setActionMsg(null)} />}

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-slate-950/40 p-1 w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={[
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === tb.key ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ──────────────────────────────────────────────────── */}
      {tab === "campaigns" && (
        <div className="grid gap-3">
          {/* AI Template Generator */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 text-sm font-semibold text-white flex items-center gap-2">
                  <span className="inline-block rounded bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-xs font-bold text-violet-300">AI</span>
                  Generate Phishing Template
                </p>
                <p className="m-0 mt-1 text-xs text-slate-400">
                  Use AI (NVIDIA NIM / Llama 4) to generate a realistic, localised phishing simulation email. Falls back to the built-in library if no API key is configured.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAiPanel((v) => !v); setAiPreview(null); }}
                className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
              >
                {showAiPanel ? "Close" : "Generate with AI"}
              </button>
            </div>

            {showAiPanel && (
              <div className="mt-5 border-t border-white/8 pt-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Attack Type</label>
                    <select
                      value={aiForm.attack_type}
                      onChange={(e) => setAiForm((p) => ({ ...p, attack_type: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="IT_RESET">IT Password Reset</option>
                      <option value="INVOICE">Fake Invoice Approval</option>
                      <option value="DELIVERY">Package Delivery</option>
                      <option value="HR_UPDATE">HR Policy Update</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Language</label>
                    <select
                      value={aiForm.language}
                      onChange={(e) => setAiForm((p) => ({ ...p, language: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="EN">English</option>
                      <option value="FR">French</option>
                      <option value="AR_MSA">Arabic (MSA)</option>
                      <option value="AR_DARIJA">Arabic (Darija)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Difficulty</label>
                    <select
                      value={aiForm.difficulty}
                      onChange={(e) => setAiForm((p) => ({ ...p, difficulty: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value={1}>1 — Easy (obvious signals)</option>
                      <option value={2}>2 — Medium (plausible)</option>
                      <option value={3}>3 — Hard (spear-phishing)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={aiGenerateMutation.isPending}
                    onClick={() => aiGenerateMutation.mutate({ ...aiForm, save: false })}
                    className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 disabled:opacity-50 transition-colors"
                  >
                    {aiGenerateMutation.isPending && !aiPreview ? "Generating…" : "Preview"}
                  </button>
                  {aiPreview && (
                    <button
                      type="button"
                      disabled={aiGenerateMutation.isPending}
                      onClick={() => aiGenerateMutation.mutate({ ...aiForm, save: true })}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                    >
                      {aiGenerateMutation.isPending ? "Saving…" : "Save & Use for Campaign"}
                    </button>
                  )}
                </div>

                {/* Preview output */}
                {aiPreview && (
                  <div className="mt-5 rounded-xl border border-violet-500/20 bg-slate-900/60 p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="m-0 text-xs text-slate-500 uppercase tracking-widest">Subject</p>
                        <p className="m-0 mt-1 text-sm font-medium text-white">{aiPreview.subject}</p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 uppercase tracking-widest">Sender</p>
                        <p className="m-0 mt-1 text-sm text-slate-300">
                          {aiPreview.sender_name} &lt;{aiPreview.sender_domain}&gt;
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="m-0 text-xs text-slate-500 uppercase tracking-widest">Email Body</p>
                      <pre className="m-0 mt-2 whitespace-pre-wrap rounded-lg border border-white/6 bg-slate-950/60 p-3 text-xs text-slate-300 leading-relaxed font-sans">
                        {aiPreview.body}
                      </pre>
                    </div>
                    <p className="m-0 text-xs text-slate-500 italic">
                      {"{{tracking_url}}"} will be replaced with a unique click-tracking link per employee when the campaign is launched.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Create campaign panel */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 text-sm font-semibold text-white">Phishing Simulation Campaigns</p>
                <p className="m-0 mt-1 text-xs text-slate-400">
                  Create a campaign from a template, then launch it to send simulation emails to all active employees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCampaign((v) => !v)}
                className="btn-primary text-sm"
              >
                {showNewCampaign ? "Cancel" : "+ New Campaign"}
              </button>
            </div>

            {showNewCampaign && (
              <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Campaign Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Q2 Credential Harvest"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-64"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 w-72"
                  >
                    <option value="">— Select a template —</option>
                    {templates.map((tmpl: any) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.subject} ({tmpl.attack_type} · Difficulty {tmpl.difficulty})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {createMutation.isPending ? "Creating…" : "Create Campaign"}
                </button>
              </form>
            )}
          </div>

          {/* Campaigns table */}
          <div className="card overflow-hidden">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="m-0 text-sm font-semibold text-white">All Campaigns</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6 text-xs text-slate-400">
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Attack Type</th>
                    <th className="px-4 py-3 text-left font-medium">Difficulty</th>
                    <th className="px-4 py-3 text-right font-medium">Targets</th>
                    <th className="px-4 py-3 text-right font-medium">Clicked</th>
                    <th className="px-4 py-3 text-right font-medium">Click Rate</th>
                    <th className="px-4 py-3 text-left font-medium">Launched</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                        No campaigns yet. Create one above.
                      </td>
                    </tr>
                  )}
                  {campaigns.map((c: any) => (
                    <tr key={c.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-200">{c.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-slate-300">{c.attack_type}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {"★".repeat(c.difficulty)}{"☆".repeat(Math.max(0, 3 - c.difficulty))}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{c.total_targets}</td>
                      <td className="px-4 py-3 text-right text-rose-300">{c.clicked_count}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={
                          c.click_rate > 30 ? "text-rose-300" :
                          c.click_rate > 15 ? "text-amber-300" : "text-emerald-300"
                        }>
                          {c.click_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {c.launched_at ? new Date(c.launched_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => launchMutation.mutate(c.id)}
                              disabled={launchMutation.isPending}
                              className="rounded border border-emerald-600/40 bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50"
                            >
                              Launch
                            </button>
                          )}
                          {c.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => completeMutation.mutate(c.id)}
                              disabled={completeMutation.isPending}
                              className="rounded border border-slate-600/40 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700/60 disabled:opacity-50"
                            >
                              Complete
                            </button>
                          )}
                          {c.status === "COMPLETED" && (
                            <span className="text-xs text-slate-500">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department breakdown */}
          {(analyticsData?.departments || []).length > 0 && (
            <div className="card p-5">
              <p className="m-0 mb-3 text-sm font-semibold text-white">Click Rate by Department</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {analyticsData.departments.map((dept: any) => {
                  const rate = dept.sent > 0 ? Math.round((dept.clicked / dept.sent) * 100) : 0;
                  return (
                    <div key={dept.department} className="rounded-lg border border-white/8 bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="m-0 text-xs font-medium text-slate-300">{dept.department}</p>
                        <span className={`text-xs font-bold ${
                          rate > 30 ? "text-rose-300" : rate > 15 ? "text-amber-300" : "text-emerald-300"
                        }`}>{rate}%</span>
                      </div>
                      <p className="m-0 mt-1 text-xs text-slate-500">
                        {dept.sent} sent · {dept.clicked} clicked
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            rate > 30 ? "bg-rose-500" : rate > 15 ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GAMIFICATION TAB ───────────────────────────────────────────────── */}
      {tab === "gamification" && (
        <div className="grid gap-3 xl:grid-cols-5">
          {/* Leaderboard */}
          <div className="card overflow-hidden xl:col-span-3">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="m-0 text-sm font-semibold text-white">Security Leaderboard</p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">
                Score = +1 per correct quiz answer · −5 per phishing link clicked
              </p>
            </div>
            {isLeaderboardLoading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6 text-xs text-slate-400">
                      <th className="px-5 py-3 text-left font-medium w-10">#</th>
                      <th className="px-4 py-3 text-left font-medium">Employee</th>
                      <th className="px-4 py-3 text-left font-medium">Department</th>
                      <th className="px-4 py-3 text-right font-medium">Quiz ✓</th>
                      <th className="px-4 py-3 text-right font-medium">Clicks</th>
                      <th className="px-4 py-3 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                          No leaderboard data yet.
                        </td>
                      </tr>
                    )}
                    {leaderboard.map((row: any, i: number) => (
                      <tr key={row.employee_id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-400 w-10">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : row.rank}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-200">{row.employee_name}</td>
                        <td className="px-4 py-3 text-slate-400">{row.department || "—"}</td>
                        <td className="px-4 py-3 text-right text-emerald-300">{row.correct_quiz_answers}</td>
                        <td className="px-4 py-3 text-right text-rose-300">{row.phishing_clicks}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${row.total_score >= 0 ? "text-cyan-300" : "text-rose-300"}`}>
                            {row.total_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quizzes */}
          <div className="card overflow-hidden xl:col-span-2">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="m-0 text-sm font-semibold text-white">Security Quizzes</p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">
                {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} available
              </p>
            </div>
            <div className="divide-y divide-white/5">
              {quizzes.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No quizzes yet.</p>
              )}
              {quizzes.map((q: any) => {
                const optionCount = q.options ? Object.keys(q.options).length : 0;
                return (
                  <div key={q.id} className="px-5 py-3 hover:bg-white/2 transition-colors">
                    <p className="m-0 text-sm text-slate-200 leading-snug">{q.question}</p>
                    <p className="m-0 mt-1 text-xs text-slate-500">
                      {optionCount} options · added {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ENROLLMENTS TAB ────────────────────────────────────────────────── */}
      {tab === "enrollments" && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/8 px-5 py-3">
            <p className="m-0 text-sm font-semibold text-white">Training Enrollments</p>
            <p className="m-0 mt-0.5 text-xs text-slate-400">
              Employees are auto-enrolled in a training module when they click a simulated phishing link.
            </p>
          </div>
          {isEnrollmentsLoading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6 text-xs text-slate-400">
                    <th className="px-5 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Module</th>
                    <th className="px-4 py-3 text-left font-medium">Attack Type</th>
                    <th className="px-4 py-3 text-left font-medium">Enrolled</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        No enrollments yet. Employees are auto-enrolled when they click a phishing simulation link.
                      </td>
                    </tr>
                  )}
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-200">
                        {e.employee_name || e.employee_id}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{e.module_title || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{e.attack_type || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {e.completed_at ? (
                          <span className="inline-block rounded border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-block rounded border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
