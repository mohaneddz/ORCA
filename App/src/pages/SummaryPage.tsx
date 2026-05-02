import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { DualAreaChart } from "@/components/ui/TrendChart";
import { DataTable, PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { logger } from "@/lib/logger";

type SummarySnapshot = {
  generatedAt: string;
  company: string;
  kpis: Array<{ label: string; value: string; helper: string; trend: number }>;
  chart: Array<{ name: string; primary: number; secondary: number }>;
  interpretation: {
    headline: string;
    highlights: string[];
    guidance: Array<{ action: string; why: string; priority: "High" | "Medium" | "Low" }>;
  };
};

const CACHE_KEY = "summary-page-cache-v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const GROQ_BASE_URL = import.meta.env.VITE_GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_CHAT_MODEL = import.meta.env.VITE_GROQ_CHAT_MODEL || "openai/gpt-oss-20b";

function createDummyMetrics() {
  const incidents = 9 + Math.floor(Math.random() * 6);
  const resolved = Math.max(5, incidents - 2 + Math.floor(Math.random() * 4));
  const activeDevices = 138 + Math.floor(Math.random() * 8);
  const secureAccounts = 88 + Math.floor(Math.random() * 8);

  return {
    incidents,
    resolved,
    activeDevices,
    secureAccounts,
  };
}

function buildChartData(seed: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((name, index) => {
    const drift = (seed + index * 3) % 7;
    return {
      name,
      primary: 48 + drift + index,
      secondary: 35 + Math.max(0, drift - 1) + Math.floor(index / 2),
    };
  });
}

async function explainWithGroq(input: string): Promise<{ headline: string; highlights: string[] }> {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY;
  if (!groqKey) {
    logger.info("summary.groq.skipped.no_key");
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
            "You explain company status to non-technical people. Return strict JSON with keys headline (string) and highlights (array of 3 short simple strings).",
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
    const parsed = JSON.parse(raw) as SummarySnapshot;
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

  const metrics = createDummyMetrics();
  const seed = Math.floor(Math.random() * 100);
  const chart = buildChartData(seed);
  const prompt = `Company security summary input:
- Open incidents: ${metrics.incidents}
- Resolved this cycle: ${metrics.resolved}
- Managed devices: ${metrics.activeDevices}
- Account hygiene score: ${metrics.secureAccounts}%
Explain what this means in simple terms.`;

  let interpretation: SummarySnapshot["interpretation"];
  try {
    const groq = await explainWithGroq(prompt);
    interpretation = {
      ...groq,
      guidance: [
        { action: "Handle the most urgent open issues first", why: "This quickly lowers the biggest risk to daily work.", priority: "High" },
        { action: "Check why a few devices are behind standard rules", why: "This prevents those devices from becoming future problems.", priority: "Medium" },
        { action: "Send a short status update to managers", why: "Everyone stays informed without waiting for a long report.", priority: "Low" },
      ],
    };
  } catch {
    logger.warn("summary.snapshot.groq_fallback_used");
    interpretation = {
      headline: "Overall status is stable: the team is keeping up with new issues.",
      highlights: [
        "There are active issues, but they are being managed.",
        "The response speed is close to the incoming issue rate.",
        "Most users and devices remain in good standing.",
      ],
      guidance: [
        { action: "Close a portion of urgent open issues today", why: "Fewer urgent items means less chance of disruption.", priority: "High" },
        { action: "Review older devices for missing updates", why: "This helps avoid avoidable breakdowns later.", priority: "Medium" },
        { action: "Make sure each issue has one clear owner", why: "Clear ownership reduces delays and confusion.", priority: "Low" },
      ],
    };
  }

  const snapshot: SummarySnapshot = {
    generatedAt: new Date().toISOString(),
    company: "ORCA Company",
    kpis: [
      { label: "Open Issues", value: String(metrics.incidents), helper: "Items still waiting to be fixed", trend: 4.2 },
      { label: "Fixed Today", value: String(metrics.resolved), helper: "Problems solved in this cycle", trend: 6.1 },
      { label: "Active Company Devices", value: String(metrics.activeDevices), helper: "Devices currently reporting", trend: 1.7 },
      { label: "Accounts In Good Shape", value: `${metrics.secureAccounts}%`, helper: "Accounts following safety rules", trend: 2.3 },
    ],
    chart,
    interpretation,
  };

  writeCache(snapshot);
  logger.info("summary.snapshot.build_success", { generatedAt: snapshot.generatedAt });
  return snapshot;
}

export default function SummaryPage() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["summary-page"],
    queryFn: ({ meta }) => buildSummarySnapshot(Boolean(meta?.forceRefresh)),
    staleTime: CACHE_TTL_MS,
  });

  const generatedLabel = useMemo(() => {
    if (!data?.generatedAt) return "No data yet";
    const time = new Date(data.generatedAt);
    return `Updated ${time.toLocaleTimeString()}`;
  }, [data?.generatedAt]);

  return (
    <div className="page-section pb-10">
      <PageHeader
        badge="Summary"
        title="Summary"
        description="A simple snapshot of how the company is doing right now, explained in plain language."
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
              Refresh
            </span>
          </button>
        }
      />

      <p className="m-0 text-xs" style={{ color: "#64748b" }}>
        {generatedLabel}
      </p>

      {data && (
        <>
          <section className="card p-5">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-primary-soft)" }}>
              What Is Happening
            </p>
            <p className="m-0 mt-2 text-base font-semibold text-white">{data.interpretation.headline}</p>
            <p className="m-0 mt-2 text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              This page turns technical signals into everyday language so non-technical teams can quickly understand the situation.
            </p>
          </section>

          <StatGrid
            stats={data.kpis.map((kpi, index) => ({
              label: kpi.label,
              value: kpi.value,
              helper: kpi.helper,
              trend: kpi.trend,
              tone: index === 0 ? "warn" : "default",
            }))}
          />

          <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
            <DualAreaChart
              data={data.chart}
              title="New Issues vs Fixed Issues (This Week)"
              primaryLabel="New Issues"
              secondaryLabel="Fixed Issues"
            />
            <section className="card p-5">
              <p className="m-0 text-sm font-semibold text-white">Quick Explanation</p>
              <ul className="m-0 mt-3 space-y-2 pl-5 text-sm" style={{ color: "#94a3b8" }}>
                {data.interpretation.highlights.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          </section>

          <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
            <DataTable
              title="Suggested Next Steps"
              columns={["What To Do", "Why It Helps", "Priority"]}
              rows={data.interpretation.guidance.map((item) => [item.action, item.why, item.priority])}
              minWidth={700}
              searchPlaceholder="Search actions"
              filterColumn="Priority"
              filterOptions={["High", "Medium", "Low"]}
              renderCell={(cell, row, _rowIndex, cellIndex) => {
                if (cellIndex !== 2) return cell;
                const tone =
                  row[2] === "High" ? "status-danger" : row[2] === "Medium" ? "status-warn" : "status-ok";
                return <span className={tone}>{cell}</span>;
              }}
            />
            <section className="card p-5">
              <p className="m-0 text-sm font-semibold text-white">Simple Guidance</p>
              <div className="mt-3 space-y-3 text-sm">
                <p className="m-0 leading-relaxed" style={{ color: "#94a3b8" }}>
                  First finish urgent items, then handle medium items, then send a short update.
                </p>
                <p className="m-0 leading-relaxed" style={{ color: "#94a3b8" }}>
                  If the numbers get worse after two refreshes in a row, ask for extra help from leadership.
                </p>
                <p className="m-0 leading-relaxed" style={{ color: "#94a3b8" }}>
                  After important fixes, press Refresh to get a new explanation and see if things improved.
                </p>
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
