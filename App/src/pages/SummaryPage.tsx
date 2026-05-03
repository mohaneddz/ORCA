import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { MetricPairCard } from "@/components/ui/TrendChart";
import { DataTable, PageHeader, StatGrid, SummaryBanner } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { logger } from "@/lib/logger";
import { SUMMARY_FALLBACK } from "@/data/mockData";
import { fetchApi } from "@/lib/apiClient";
import type { AppLanguage } from "@/types/settings";
import Skeleton from "@/components/ui/Skeleton";

type SummarySnapshot = {
  generatedAt: string;
  company: string;
  kpis: Array<{ label: string; value: string; helper: string; trend: number }>;
  chart: Array<{ name: string; primary: number; secondary: number }>;
  interpretationByLanguage: Record<AppLanguage, {
    headline: string;
    highlights: string[];
  }>;
  guidance: Array<{ action: string; why: string; priority: "High" | "Medium" | "Low" }>;
};

const CACHE_KEY = "summary-page-cache-v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const GROQ_BASE_URL = import.meta.env.VITE_GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_CHAT_MODEL = import.meta.env.VITE_GROQ_CHAT_MODEL || "openai/gpt-oss-20b";
const LANGUAGE_LABEL: Record<AppLanguage, string> = {
  en: "English",
  fr: "French",
};

interface DwSummaryResponse {
  device: { risk_level_distribution: { high: number; critical: number }; devices_reporting: number };
  phishing: { total_clicks: number; training_completed: number; click_rate: number };
  quiz: { correct_total: number; correct_rate: number };
}

interface DwTrendResponse {
  trend: Array<{
    month: string;
    device: { avg_risk_score: number };
    phishing: { click_rate: number };
  }>;
}

async function explainWithGroq(input: string, language: AppLanguage): Promise<{ headline: string; highlights: string[] }> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
  if (!groqKey) {
    logger.info("summary.groq.skipped.no_key");
    if (language === "fr") {
      return {
        headline: "La situation est globalement sous controle aujourd'hui, mais quelques points demandent encore de l'attention.",
        highlights: [
          "L'equipe corrige les problemes presque aussi vite qu'ils apparaissent.",
          "La plupart des appareils et comptes de l'entreprise sont dans un etat sain.",
          "Un petit groupe d'elements urgents doit etre traite en priorite.",
        ],
      };
    }
    return {
      headline: "Things are generally under control today, but a few issues still need attention.",
      highlights: [
        "The team is fixing problems almost as fast as they appear.",
        "Most company devices and accounts are in a healthy state.",
        "A small set of urgent items should be handled first.",
      ],
    };
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            `You explain company status to non-technical people. Respond only in ${LANGUAGE_LABEL[language]} and never switch languages. Return strict JSON with keys headline (string) and highlights (array of 3 short simple strings), all written in ${LANGUAGE_LABEL[language]}.`,
        },
        {
          role: "user",
          content: input,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    logger.warn("summary.groq.failed", { status: response.status });
    throw new Error(`Groq interpretation failed (${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("Groq interpretation returned empty content");
  }

  const parsed = JSON.parse(raw) as { headline?: string; highlights?: string[] };
  return {
    headline: parsed.headline || "Posture summary unavailable.",
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [],
  };
}

function readCache(): SummarySnapshot | null {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SummarySnapshot & {
      interpretation?: { headline: string; highlights: string[] };
    };
    if (!parsed.interpretationByLanguage && parsed.interpretation) {
      parsed.interpretationByLanguage = {
        en: parsed.interpretation,
        fr: parsed.interpretation,
      };
    }
    if (!parsed.interpretationByLanguage?.en || !parsed.interpretationByLanguage?.fr) return null;
    const age = Date.now() - new Date(parsed.generatedAt).getTime();
    if (Number.isNaN(age) || age > CACHE_TTL_MS) return null;
    logger.debug("summary.cache.hit", { ageMs: age });
    return parsed;
  } catch {
    logger.warn("summary.cache.parse_failed");
    return null;
  }
}

function writeCache(snapshot: SummarySnapshot) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
}

async function buildSummarySnapshot(forceRefresh: boolean): Promise<SummarySnapshot> {
  logger.info("summary.snapshot.build_start", { forceRefresh });
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  try {
    const [summary, trendData] = await Promise.all([
      fetchApi<DwSummaryResponse>("/api/dw/summary/"),
      fetchApi<DwTrendResponse>("/api/dw/trend/?months=7")
    ]);

    const metrics = {
      incidents: (summary.device?.risk_level_distribution?.high || 0) + (summary.device?.risk_level_distribution?.critical || 0) + (summary.phishing?.total_clicks || 0),
      resolved: (summary.phishing?.training_completed || 0) + (summary.quiz?.correct_total || 0),
      activeDevices: summary.device?.devices_reporting || 0,
      secureAccounts: Math.round(((summary.quiz?.correct_rate || 0) + (100 - (summary.phishing?.click_rate || 0))) / 2) || 0
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chart = (trendData.trend || []).map(t => {
      const monthParts = t.month.split('-');
      const monthIndex = monthParts.length > 1 ? parseInt(monthParts[1], 10) - 1 : 0;
      return {
        name: monthNames[monthIndex] || t.month,
        primary: Math.round(t.device?.avg_risk_score || 0),
        secondary: Math.round(t.phishing?.click_rate || 0)
      };
    });

    const prompt = `Company security summary input:
- Open incidents: ${metrics.incidents}
- Resolved this cycle: ${metrics.resolved}
- Managed devices: ${metrics.activeDevices}
- Account hygiene score: ${metrics.secureAccounts}%
Explain what this means in simple terms.`;

  let interpretationByLanguage: SummarySnapshot["interpretationByLanguage"];
  try {
    const [enSummary, frSummary] = await Promise.all([
      explainWithGroq(prompt, "en"),
      explainWithGroq(prompt, "fr"),
    ]);
    interpretationByLanguage = {
      en: enSummary,
      fr: frSummary,
    };
  } catch {
    logger.warn("summary.snapshot.groq_fallback_used");
    interpretationByLanguage = {
      en: {
        headline: SUMMARY_FALLBACK.headline,
        highlights: SUMMARY_FALLBACK.highlights,
      },
      fr: {
        headline: SUMMARY_FALLBACK.headline,
        highlights: SUMMARY_FALLBACK.highlights,
      },
    };
  }

    const snapshot: SummarySnapshot = {
      generatedAt: new Date().toISOString(),
      company: "ORCA Company",
      kpis: [
        { label: "summary.stats.openIssues", value: String(metrics.incidents), helper: "summary.stats.openIssuesDesc", trend: 4.2 },
        { label: "summary.stats.fixedToday", value: String(metrics.resolved), helper: "summary.stats.fixedTodayDesc", trend: 6.1 },
        { label: "summary.stats.activeDevices", value: String(metrics.activeDevices), helper: "summary.stats.activeDevicesDesc", trend: 1.7 },
        { label: "summary.stats.accountsGood", value: `${metrics.secureAccounts}%`, helper: "summary.stats.accountsGoodDesc", trend: 2.3 },
      ],
      chart,
      interpretationByLanguage,
      guidance: [
        { action: "summary.step1.title", why: "summary.step1.desc", priority: "High" },
        { action: "summary.step2.title", why: "summary.step2.desc", priority: "Medium" },
        { action: "summary.step3.title", why: "summary.step3.desc", priority: "Low" },
      ],
    };

    writeCache(snapshot);
    logger.info("summary.snapshot.build_success", { generatedAt: snapshot.generatedAt });
    return snapshot;
  } catch (error) {
    logger.error("summary.snapshot.build_error", { error });
    throw error;
  }
}

function SummarySkeleton() {
  return (
    <div className="page-section">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <Skeleton className="mt-6 h-40 w-full" />
      
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      
      <Skeleton className="mt-6 h-[300px] w-full" />
    </div>
  );
}

export default function SummaryPage() {
  const { t, settings } = useAppSettings();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["summary-page"],
    queryFn: ({ meta }) => buildSummarySnapshot(Boolean(meta?.forceRefresh)),
    staleTime: CACHE_TTL_MS,
  });

  const generatedLabel = useMemo(() => {
    if (!data?.generatedAt) return t("summary.badge");
    const time = new Date(data.generatedAt);
    return `${t("summary.refresh")} ${time.toLocaleTimeString()}`;
  }, [data?.generatedAt, t]);

  if (isLoading) {
    return <SummarySkeleton />;
  }
  const interpretation = data?.interpretationByLanguage?.[settings.language] ?? data?.interpretationByLanguage?.en;

  return (
    <div className="page-section">
      <PageHeader
        badge={t("summary.badge")}
        title={t("summary.title")}
        description={t("summary.description")}
        actions={
          <button
            type="button"
            className="btn-ghost text-xs uppercase tracking-wider"
            onClick={() => {
              localStorage.removeItem(CACHE_KEY);
              logger.info("summary.refresh.clicked");
              void refetch({ throwOnError: false, cancelRefetch: true });
            }}
            disabled={isFetching}
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              {t("summary.refresh")}
            </span>
          </button>
        }
      />

      <p className="m-0 text-xs text-neutral-500">
        {generatedLabel}
      </p>

      {data && interpretation && (
        <>
          <SummaryBanner
            headline={t(interpretation.headline)}
            subtext={t("summary.explanation")}
            bullets={interpretation.highlights.map((h) => t(h))}
          />

          <StatGrid
            cols={data.kpis.length === 4 || data.kpis.length === 8 ? 4 : 3}
            stats={data.kpis.map((kpi, index) => ({
              label: t(kpi.label),
              value: kpi.value,
              helper: t(kpi.helper),
              trend: kpi.trend,
              tone: index === 0 ? "warn" : "default",
            }))}
          />

          <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
            <MetricPairCard
              title={t("summary.chart.title")}
              metrics={[
                {
                  label: t("summary.chart.primary"),
                  value: data.chart.length > 0 ? data.chart[data.chart.length - 1].primary : "-",
                  description: "Average device risk score this month. Lower is healthier - below 30 is your target.",
                },
                {
                  label: t("summary.chart.secondary"),
                  value: data.chart.length > 0 ? `${data.chart[data.chart.length - 1].secondary}%` : "-",
                  description: "Phishing click rate this month. Shows how often employees fall for simulated phishing emails.",
                  color: (() => {
                    const rate = data.chart.length > 0 ? data.chart[data.chart.length - 1].secondary : 0;
                    return rate > 20 ? "var(--color-error)" : "var(--color-primary)";
                  })(),
                },
              ]}
            />
            <section className="card p-5">
              <p className="m-0 text-sm font-semibold text-neutral-100">{t("summary.guidance.title")}</p>
              <div className="mt-3 space-y-3 text-sm">
                <p className="m-0 leading-relaxed text-neutral-400">
                  {t("summary.guidance.p1")}
                </p>
                <p className="m-0 leading-relaxed text-neutral-400">
                  {t("summary.guidance.p2")}
                </p>
                <p className="m-0 leading-relaxed text-neutral-400">
                  {t("summary.guidance.p3")}
                </p>
              </div>
            </section>
          </section>

          <DataTable
            title={t("summary.table.steps")}
            columns={[t("table.action"), t("table.why"), t("table.priority")]}
            rows={data.guidance.map((item) => [t(item.action), t(item.why), t(`table.priority.${item.priority.toLowerCase()}`)])}
            minWidth={500}
            searchPlaceholder={t("summary.table.search")}
            filterColumn={t("table.priority")}
            filterOptions={[t("table.priority.high"), t("table.priority.medium"), t("table.priority.low")]}
            renderCell={(cell, row, _rowIndex, cellIndex) => {
              if (cellIndex !== 2) return cell;
              const tone =
                row[2] === t("table.priority.high") ? "status-danger" : row[2] === t("table.priority.medium") ? "status-warn" : "status-ok";
              return <span className={tone}>{cell}</span>;
            }}
          />
        </>
      )}
    </div>
  );
}
