import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader, StatGrid, SummaryBanner } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

type TabKey = "campaigns" | "gamification" | "enrollments" | "accounts";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
  DRAFT: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? "border-slate-500/30 bg-slate-500/10 text-slate-300"}`}
    >
      {status}
    </span>
  );
}

function InlineAlert({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  const isError = msg.toLowerCase().startsWith("error") || msg.toLowerCase().includes("failed");
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
        isError
          ? "border-rose-500/30 bg-rose-900/20 text-rose-200"
          : "border-cyan-500/35 bg-cyan-900/20 text-cyan-200"
      }`}
    >
      <span>{msg}</span>
      <button type="button" onClick={onDismiss} className="ml-4 text-slate-400 hover:text-white">
        x
      </button>
    </div>
  );
}

function scoreClass(rate: number) {
  if (rate > 30) return "text-rose-300";
  if (rate > 15) return "text-amber-300";
  return "text-emerald-300";
}

export default function TrainingPage() {
  const { t } = useAppSettings();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("campaigns");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [recipientPickerCampaignId, setRecipientPickerCampaignId] = useState<string | null>(null);
  const [campaignRecipientSelections, setCampaignRecipientSelections] = useState<Record<string, string[]>>({});

  const [showNewQuiz, setShowNewQuiz] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptionA, setQuizOptionA] = useState("");
  const [quizOptionB, setQuizOptionB] = useState("");
  const [quizOptionC, setQuizOptionC] = useState("");
  const [quizCorrect, setQuizCorrect] = useState<"a" | "b" | "c">("a");

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

  const { data: trainingModulesData } = useQuery({
    queryKey: ["training-modules"],
    queryFn: () => fetchApi<any>("/api/phishing/training/").catch(() => null),
  });

  const { data: alertsData } = useQuery({
    queryKey: ["training-alerts"],
    queryFn: () => fetchApi<any>("/api/phishing/alerts/managers/").catch(() => null),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["training-employees"],
    queryFn: () => fetchApi<any>("/api/dw/employees/").catch(() => null),
  });

  const { data: campaignTargetsData, isLoading: isTargetsLoading } = useQuery({
    queryKey: ["training-campaign-targets", selectedCampaignId],
    queryFn: () => fetchApi<any>(`/api/phishing/campaigns/${selectedCampaignId}/targets/`),
    enabled: Boolean(selectedCampaignId),
  });

  const campaigns: any[] = campaignsData?.campaigns || [];
  const templates: any[] = templatesData?.templates || [];
  const leaderboard: any[] = leaderboardData?.leaderboard || [];
  const quizzes: any[] = quizzesData?.quizzes || [];
  const enrollments: any[] = enrollmentsData?.enrollments || [];
  const trainingModules: any[] = trainingModulesData?.modules || trainingModulesData?.trainings || [];
  const deptAlerts: any[] = alertsData?.department_alerts || [];
  const employees: any[] = employeesData?.employees || [];
  const campaignTargets: any[] = campaignTargetsData?.targets || [];

  const launchMutation = useMutation({
    mutationFn: ({ id, employeeIds }: { id: string; employeeIds?: string[] }) =>
      fetchApi(`/api/phishing/campaigns/${id}/launch/`, {
        method: "POST",
        body: JSON.stringify(employeeIds?.length ? { employee_ids: employeeIds } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["training-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["training-analytics-trend"] });
      setActionMsg("Campaign launched. Phishing emails are being sent.");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/phishing/campaigns/${id}/complete/`, { method: "POST" }),
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
      setActionMsg("Campaign created as DRAFT.");
      setShowNewCampaign(false);
      setNewName("");
      setSelectedTemplate("");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const completeEnrollmentMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/phishing/training/enrollments/${id}/complete/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-enrollments"] });
      setActionMsg("Enrollment marked as completed.");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const createQuizMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi("/api/gamification/quizzes/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-quizzes"] });
      setActionMsg("Quiz created and added to gamification.");
      setShowNewQuiz(false);
      setQuizQuestion("");
      setQuizOptionA("");
      setQuizOptionB("");
      setQuizOptionC("");
      setQuizCorrect("a");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const aiAutopilotMutation = useMutation({
    mutationFn: async () => {
      const activeEmployees = employees.filter((e) => e.is_active);
      if (activeEmployees.length === 0) throw new Error("No active employees available.");

      const sortedByRisk = [...activeEmployees].sort((a, b) => {
        const ra = a.device?.latest_risk_score ?? a.risk_score ?? 100;
        const rb = b.device?.latest_risk_score ?? b.risk_score ?? 100;
        return ra - rb;
      });
      const focusEmployee = sortedByRisk[0];

      const diffResp = await fetchApi<any>(`/api/phishing/employees/${focusEmployee.id}/difficulty/`);
      const recommendedDifficulty = diffResp?.recommended_difficulty || 2;

      const attackType = "IT_RESET";

      const generated = await fetchApi<any>("/api/phishing/templates/generate/", {
        method: "POST",
        body: JSON.stringify({
          attack_type: attackType,
          language: "EN",
          difficulty: recommendedDifficulty,
          employee_id: focusEmployee.id,
          save: true,
        }),
      });

      const campaignName = `AI Autopilot ${new Date().toLocaleDateString()}`;
      const createdCampaign = await fetchApi<any>("/api/phishing/campaigns/", {
        method: "POST",
        body: JSON.stringify({ name: campaignName, template_id: generated.id }),
      });

      const targetEmployeeIds = sortedByRisk
        .filter((e) => (e.device?.latest_risk_score ?? e.risk_score ?? 100) < 70)
        .map((e) => e.id);

      await fetchApi(`/api/phishing/campaigns/${createdCampaign.id}/launch/`, {
        method: "POST",
        body: JSON.stringify({
          employee_ids: targetEmployeeIds.length > 0 ? targetEmployeeIds : activeEmployees.map((e) => e.id),
        }),
      });

      return { campaignId: createdCampaign.id };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["training-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["training-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["training-analytics-trend"] });
      queryClient.invalidateQueries({ queryKey: ["training-enrollments"] });
      setSelectedCampaignId(res?.campaignId || null);
      setActionMsg("AI autopilot created, configured, and launched a campaign.");
    },
    onError: (err: any) => setActionMsg(`Error: ${err.message}`),
  });

  const handleCreateCampaign = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedTemplate) {
      setActionMsg("Error: Campaign name and template are required.");
      return;
    }
    createMutation.mutate({ name: newName.trim(), template_id: selectedTemplate });
  };

  const handleCreateQuiz = (e: FormEvent) => {
    e.preventDefault();
    if (!quizQuestion.trim() || !quizOptionA.trim() || !quizOptionB.trim()) {
      setActionMsg("Error: quiz question and at least two options are required.");
      return;
    }

    const options: Record<string, string> = {
      a: quizOptionA.trim(),
      b: quizOptionB.trim(),
    };
    if (quizOptionC.trim()) options.c = quizOptionC.trim();

    createQuizMutation.mutate({
      question: quizQuestion.trim(),
      options,
      correct_answer: quizCorrect,
    });
  };

  const clickRate = Math.round(analyticsData?.overall_click_rate || 0);
  const totalSent = analyticsData?.total_sent || 0;
  const totalCampaigns = analyticsData?.total_campaigns || 0;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const completedCount = campaigns.filter((c) => c.status === "COMPLETED").length;
  const enrolledCount = enrollments.length;
  const completedEnrollments = enrollments.filter((e) => Boolean(e.completed_at)).length;

  const exposureRows = useMemo(() => {
    const leaderboardMap = new Map(leaderboard.map((l) => [l.employee_id, l]));
    return employees.map((emp) => {
      const score = emp.device?.latest_risk_score ?? emp.risk_score ?? null;
      const lb = leaderboardMap.get(emp.id);
      return {
        ...emp,
        riskScore: score,
        quizScore: lb?.total_score ?? 0,
        phishingClicks: lb?.phishing_clicks ?? 0,
      };
    });
  }, [employees, leaderboard]);

  const selectableEmployees = useMemo(
    () => employees.filter((e) => e?.is_active !== false && e?.id != null),
    [employees]
  );
  const defaultRecipientIds = useMemo(() => selectableEmployees.map((e) => String(e.id)), [selectableEmployees]);

  useEffect(() => {
    if (campaigns.length === 0 || defaultRecipientIds.length === 0) return;
    setCampaignRecipientSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of campaigns) {
        if (!next[c.id]) {
          next[c.id] = [...defaultRecipientIds];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [campaigns, defaultRecipientIds]);

  const toggleCampaignRecipient = (campaignId: string, employeeId: string) => {
    setCampaignRecipientSelections((prev) => {
      const current = prev[campaignId] ?? [...defaultRecipientIds];
      const nextSet = new Set(current);
      if (nextSet.has(employeeId)) nextSet.delete(employeeId);
      else nextSet.add(employeeId);
      return { ...prev, [campaignId]: Array.from(nextSet) };
    });
  };

  const badDeptAlerts = useMemo(() => {
    return deptAlerts.filter((a: any) => {
      const severity = String(a?.severity || "").toLowerCase();
      const recommendation = String(a?.recommendation || "").toLowerCase();

      if (["critical", "high", "warning", "warn", "danger", "bad"].includes(severity)) return true;

      if (recommendation.includes("performing well")) return false;
      if (recommendation.includes("all systems operating normally")) return false;

      return true;
    });
  }, [deptAlerts]);

  if (isCampaignsLoading || isAnalyticsLoading) return <PageSkeleton />;

  const tabs = [
    { key: "campaigns", label: "Phishing Campaigns" },
    { key: "gamification", label: "Gamification & Quizzes" },
    { key: "enrollments", label: "Training Enrollments" },
    { key: "accounts", label: "Employee Exposure" },
  ] as const;

  const kpiStats = [
    { label: "Total Campaigns", value: String(totalCampaigns) },
    { label: "Active Campaigns", value: String(activeCampaigns), tone: "ok" as const },
    { label: "Simulations Sent", value: String(totalSent) },
    {
      label: "Avg Click Rate",
      value: `${clickRate}%`,
      tone: (clickRate > 30 ? "danger" : clickRate > 15 ? "warn" : "ok") as "danger" | "warn" | "ok",
    },
    { label: "Completed", value: String(completedCount) },
    { label: "Auto-Enrolled", value: String(enrolledCount) },
    { label: "Completed Training", value: String(completedEnrollments) },
    { label: "Quizzes", value: String(quizzes.length) },
  ];

  return (
    <div className="page-section min-h-0">
      <PageHeader badge={t("training.badge")} title={t("training.title")} description={t("training.description")} />

      <SummaryBanner
        headline="Simulate, train, and track your organisation's phishing resilience."
        subtext="Create campaigns, execute AI-selected simulations, complete training follow-up, and monitor exposure by employee."
        bullets={[
          "Campaigns: create and launch manually or by AI autopilot",
          "Enrollments: complete pending training directly from this page",
          "Gamification: create quizzes and monitor leaderboard impact",
          "Exposure: unified view of risk, phishing clicks, and quiz score",
        ]}
      />

      <StatGrid stats={kpiStats} cols={4} />

      {badDeptAlerts.length > 0 && (
        <div className="card p-4 border border-cyan-500/15">
          <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">Manager Alerts</p>
          <div className="flex flex-col gap-2">
            {badDeptAlerts.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-900/10 px-4 py-2.5 text-sm text-cyan-100">
                <span className="mt-0.5 shrink-0 text-cyan-300">!</span>
                <span>{a.recommendation || JSON.stringify(a)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {actionMsg && <InlineAlert msg={actionMsg} onDismiss={() => setActionMsg(null)} />}

      
      <div className="flex flex-wrap gap-1 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-1 w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={[
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === tb.key ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/40" : "text-slate-400 hover:text-cyan-100",
            ].join(" ")}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "campaigns" && (
        <div className="grid gap-3">
          <div className="card p-5 border border-cyan-500/15">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-semibold text-white">Phishing Simulation Campaigns</p>
                <p className="m-0 mt-1 text-xs text-slate-400">Create manually or let AI choose template, difficulty, and recipients.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowNewCampaign((v) => !v)} className="btn-primary text-sm">
                  {showNewCampaign ? "Cancel" : "+ New Campaign"}
                </button>
                <button
                  type="button"
                  onClick={() => aiAutopilotMutation.mutate()}
                  disabled={aiAutopilotMutation.isPending}
                  className="rounded-md border border-cyan-500/45 bg-cyan-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                >
                  {aiAutopilotMutation.isPending ? "AI Running..." : "AI Autopilot"}
                </button>
              </div>
            </div>

            {showNewCampaign && (
              <form onSubmit={handleCreateCampaign} className="mt-4 flex flex-wrap items-end gap-3 border-t border-cyan-500/15 pt-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Campaign Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Q2 Credential Harvest"
                    className="rounded-lg border border-cyan-500/25 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-64"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="rounded-lg border border-cyan-500/25 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 w-80"
                  >
                    <option value="">Select a template</option>
                    {templates.map((tmpl: any) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.subject} ({tmpl.attack_type} / Difficulty {tmpl.difficulty})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary text-sm">
                  {createMutation.isPending ? "Creating..." : "Create Campaign"}
                </button>
              </form>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-cyan-500/15 px-5 py-3.5">
              <p className="m-0 text-sm font-semibold text-white">All Campaigns</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Attack Type</th>
                    <th>Difficulty</th>
                    <th style={{ textAlign: "right" }}>Targets</th>
                    <th>Recipients</th>
                    <th style={{ textAlign: "right" }}>Clicked</th>
                    <th style={{ textAlign: "right" }}>Click Rate</th>
                    <th>Launched</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", color: "var(--color-neutral-400)" }}>
                        No campaigns yet.
                      </td>
                    </tr>
                  )}
                  {campaigns.map((c: any) => (
                    <tr key={c.id}>
                      {(() => {
                        const selectedRecipientIds = campaignRecipientSelections[c.id] ?? defaultRecipientIds;
                        const selectedCount = selectedRecipientIds.length;
                        const totalSelectable = defaultRecipientIds.length;
                        return (
                          <>
                      <td style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{c.name}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.attack_type}</td>
                      <td>{"*".repeat(c.difficulty)}</td>
                      <td style={{ textAlign: "right" }}>{c.total_targets}</td>
                      <td>
                        {c.status === "DRAFT" ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setRecipientPickerCampaignId((prev) => (prev === c.id ? null : c.id))}
                              className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                            >
                              {selectedCount}/{totalSelectable} selected
                            </button>
                            {recipientPickerCampaignId === c.id && (
                              <div className="absolute z-10 mt-2 w-72 rounded-lg border border-cyan-500/25 bg-slate-950 p-2 shadow-xl">
                                <div className="mb-2 flex items-center justify-between gap-2 border-b border-cyan-500/15 pb-2">
                                  <button
                                    type="button"
                                    className="text-xs text-cyan-200 hover:text-cyan-100"
                                    onClick={() =>
                                      setCampaignRecipientSelections((prev) => ({ ...prev, [c.id]: [...defaultRecipientIds] }))
                                    }
                                  >
                                    Select all
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-slate-400 hover:text-slate-200"
                                    onClick={() =>
                                      setCampaignRecipientSelections((prev) => ({ ...prev, [c.id]: [] }))
                                    }
                                  >
                                    Clear
                                  </button>
                                </div>
                                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                                  {selectableEmployees.map((emp: any) => {
                                    const empId = String(emp.id);
                                    const checked = selectedRecipientIds.includes(empId);
                                    return (
                                      <label key={empId} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-slate-200 hover:bg-cyan-500/10">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleCampaignRecipient(c.id, empId)}
                                        />
                                        <span className="truncate">{emp.name || emp.email || empId}</span>
                                      </label>
                                    );
                                  })}
                                  {selectableEmployees.length === 0 && (
                                    <p className="m-0 text-xs text-slate-500">No active employees available.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }} className="text-rose-300">{c.clicked_count}</td>
                      <td style={{ textAlign: "right" }} className={scoreClass(c.click_rate)}>{c.click_rate}%</td>
                      <td className="text-xs text-slate-400">{c.launched_at ? new Date(c.launched_at).toLocaleDateString() : "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCampaignId(c.id)}
                            className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                          >
                            Track
                          </button>
                          {c.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => launchMutation.mutate({ id: c.id, employeeIds: selectedRecipientIds })}
                              disabled={launchMutation.isPending || selectedCount === 0}
                              className="rounded border border-cyan-600/40 bg-cyan-900/35 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/55 disabled:opacity-50"
                            >
                              Launch
                            </button>
                          )}
                          {c.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => completeMutation.mutate(c.id)}
                              disabled={completeMutation.isPending}
                              className="rounded border border-emerald-500/30 bg-emerald-900/20 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/35 disabled:opacity-50"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedCampaignId && (
            <div className="card overflow-hidden border border-cyan-500/15">
              <div className="border-b border-cyan-500/15 px-5 py-3.5 flex items-center justify-between">
                <p className="m-0 text-sm font-semibold text-white">Campaign Target Tracking</p>
                <button type="button" className="text-xs text-cyan-200 hover:text-cyan-100" onClick={() => setSelectedCampaignId(null)}>
                  Close
                </button>
              </div>
              {isTargetsLoading ? (
                <div className="px-5 py-6 text-sm text-slate-400">Loading targets...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table" style={{ minWidth: 760 }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Sent</th>
                        <th>Clicked</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignTargets.map((trg: any) => (
                        <tr key={trg.id}>
                          <td style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{trg.employee_name}</td>
                          <td>{trg.department || "-"}</td>
                          <td className="text-xs text-slate-400">{trg.sent_at ? new Date(trg.sent_at).toLocaleString() : "-"}</td>
                          <td className="text-xs text-slate-400">{trg.clicked_at ? new Date(trg.clicked_at).toLocaleString() : "-"}</td>
                          <td>
                            {trg.clicked_at ? (
                              <span className="inline-block rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-200">Clicked</span>
                            ) : trg.sent_at ? (
                              <span className="inline-block rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-100">Sent</span>
                            ) : (
                              <span className="inline-block rounded border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-300">Pending</span>
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

          {trainingModules.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-cyan-500/15 px-5 py-3.5">
                <p className="m-0 text-sm font-semibold text-white">Training Modules Library</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Attack Type</th>
                      <th>Duration</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingModules.map((m: any) => (
                      <tr key={m.id}>
                        <td style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{m.title || "-"}</td>
                        <td>{m.attack_type || "-"}</td>
                        <td>{m.duration_minutes != null ? `${m.duration_minutes} min` : "-"}</td>
                        <td className="text-xs text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "gamification" && (
        <div className="grid gap-3 xl:grid-cols-5">
          <div className="card overflow-hidden xl:col-span-3">
            <div className="border-b border-cyan-500/15 px-5 py-3.5">
              <p className="m-0 text-sm font-semibold text-white">Security Leaderboard</p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">Score = +1 per correct quiz answer, -5 per phishing click</p>
            </div>
            {isLeaderboardLoading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th style={{ textAlign: "right" }}>Quiz</th>
                      <th style={{ textAlign: "right" }}>Clicks</th>
                      <th style={{ textAlign: "right" }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row: any) => (
                      <tr key={row.employee_id}>
                        <td>{row.rank}</td>
                        <td style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{row.employee_name}</td>
                        <td>{row.department || "-"}</td>
                        <td style={{ textAlign: "right" }} className="text-emerald-300">{row.correct_quiz_answers}</td>
                        <td style={{ textAlign: "right" }} className="text-rose-300">{row.phishing_clicks}</td>
                        <td style={{ textAlign: "right" }} className={row.total_score >= 0 ? "text-cyan-300" : "text-rose-300"}>{row.total_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card overflow-hidden xl:col-span-2 border border-cyan-500/15">
            <div className="border-b border-cyan-500/15 px-5 py-3.5 flex items-center justify-between">
              <p className="m-0 text-sm font-semibold text-white">Security Quizzes</p>
              <button type="button" onClick={() => setShowNewQuiz((v) => !v)} className="text-xs rounded border border-cyan-500/35 px-2 py-1 text-cyan-100 hover:bg-cyan-500/15">
                {showNewQuiz ? "Cancel" : "New Quiz"}
              </button>
            </div>

            {showNewQuiz && (
              <form onSubmit={handleCreateQuiz} className="px-5 py-3 border-b border-cyan-500/15 space-y-2">
                <input value={quizQuestion} onChange={(e) => setQuizQuestion(e.target.value)} placeholder="Question" className="w-full rounded border border-cyan-500/25 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input value={quizOptionA} onChange={(e) => setQuizOptionA(e.target.value)} placeholder="Option A" className="w-full rounded border border-cyan-500/25 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input value={quizOptionB} onChange={(e) => setQuizOptionB(e.target.value)} placeholder="Option B" className="w-full rounded border border-cyan-500/25 bg-slate-900 px-3 py-2 text-sm text-white" />
                <input value={quizOptionC} onChange={(e) => setQuizOptionC(e.target.value)} placeholder="Option C (optional)" className="w-full rounded border border-cyan-500/25 bg-slate-900 px-3 py-2 text-sm text-white" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300">Correct:</label>
                  <select value={quizCorrect} onChange={(e) => setQuizCorrect(e.target.value as "a" | "b" | "c")} className="rounded border border-cyan-500/25 bg-slate-900 px-2 py-1 text-sm text-white">
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                  </select>
                  <button type="submit" disabled={createQuizMutation.isPending} className="ml-auto rounded border border-cyan-500/35 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {createQuizMutation.isPending ? "Saving..." : "Create"}
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-cyan-500/10">
              {quizzes.map((q: any) => {
                const optionCount = q.options ? Object.keys(q.options).length : 0;
                return (
                  <div key={q.id} className="px-5 py-3 hover:bg-cyan-500/5 transition-colors">
                    <p className="m-0 text-sm text-slate-200 leading-snug">{q.question}</p>
                    <p className="m-0 mt-1 text-xs text-slate-500">{optionCount} options</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "enrollments" && (
        <div className="card overflow-hidden border border-cyan-500/15">
          <div className="border-b border-cyan-500/15 px-5 py-3.5">
            <p className="m-0 text-sm font-semibold text-white">Training Enrollments</p>
            <p className="m-0 mt-0.5 text-xs text-slate-400">Complete pending enrollments directly to keep training tracking accurate.</p>
          </div>
          {isEnrollmentsLoading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Module</th>
                    <th>Attack Type</th>
                    <th>Enrolled</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{e.employee_name || e.employee_id}</td>
                      <td>{e.module_title || "-"}</td>
                      <td>{e.attack_type || "-"}</td>
                      <td className="text-xs text-slate-400">{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "-"}</td>
                      <td>
                        {e.completed_at ? (
                          <span className="inline-block rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">Completed</span>
                        ) : (
                          <span className="inline-block rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-200">In Progress</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!e.completed_at ? (
                          <button
                            type="button"
                            onClick={() => completeEnrollmentMutation.mutate(e.id)}
                            disabled={completeEnrollmentMutation.isPending}
                            className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                          >
                            Mark Complete
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Done</span>
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

      {tab === "accounts" && (
        <div className="grid gap-3">
          <div className="card overflow-hidden border border-cyan-500/15">
            <div className="border-b border-cyan-500/15 px-5 py-3.5">
              <p className="m-0 text-sm font-semibold text-white">Employee Exposure</p>
              <p className="m-0 mt-0.5 text-xs text-slate-400">Risk, phishing click behavior, and quiz score combined.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th style={{ textAlign: "right" }}>Risk</th>
                    <th style={{ textAlign: "right" }}>Phishing Clicks</th>
                    <th style={{ textAlign: "right" }}>Quiz Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exposureRows.map((emp: any) => (
                    <tr key={emp.id || emp.email}>
                      <td style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{emp.name || "Unknown"}</td>
                      <td className="text-slate-400 text-xs">{emp.email || "-"}</td>
                      <td>{emp.department || "-"}</td>
                      <td>{emp.role || "-"}</td>
                      <td style={{ textAlign: "right" }} className={emp.riskScore != null && emp.riskScore < 50 ? "text-rose-300" : "text-emerald-300"}>{emp.riskScore ?? "-"}</td>
                      <td style={{ textAlign: "right" }} className="text-rose-300">{emp.phishingClicks}</td>
                      <td style={{ textAlign: "right" }} className={emp.quizScore >= 0 ? "text-cyan-300" : "text-rose-300"}>{emp.quizScore}</td>
                      <td>
                        {emp.is_active ? (
                          <span className="inline-block rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">Active</span>
                        ) : (
                          <span className="inline-block rounded border border-slate-500/25 bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-300">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


