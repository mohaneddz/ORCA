import { DUMMY_DATA } from "@/config/runtime";
import { maybeDelay } from "@/lib/query/sourceMode";

export type TrainingPageData = {
  resilienceTrend: Array<{ week: string; passRate: number; reportRate: number; clickRate: number }>;
  campaignBreakdown: Array<{ group: string; completed: number }>;
  sessions: string[][];
  kpis: string[];
};

export async function get_training_page_data(): Promise<TrainingPageData> {
  await maybeDelay(DUMMY_DATA ? 350 : 100);
  return {
    resilienceTrend: [
      { week: "W1", passRate: 62, reportRate: 44, clickRate: 28 },
      { week: "W2", passRate: 67, reportRate: 51, clickRate: 25 },
      { week: "W3", passRate: 72, reportRate: 56, clickRate: 20 },
      { week: "W4", passRate: 76, reportRate: 62, clickRate: 18 },
      { week: "W5", passRate: 81, reportRate: 68, clickRate: 15 },
      { week: "W6", passRate: 86, reportRate: 73, clickRate: 14 },
    ],
    campaignBreakdown: [
      { group: "Finance", completed: 92 },
      { group: "Ops", completed: 84 },
      { group: "HR", completed: 88 },
      { group: "Marketing", completed: 79 },
    ],
    sessions: [
      ["Invoice Clone v2", "Finance", "5 clicks", "Mandatory module", "2026-05-02"],
      ["Credential Harvest Drill", "Operations", "2 submissions", "1:1 coaching", "2026-05-01"],
      ["Link Safety Sprint", "HR", "89% pass", "None", "2026-04-30"],
      ["Attachment Trap", "All Staff", "11 risky opens", "Micro-training", "2026-04-29"],
    ],
    kpis: ["9", "14%", "73%", "22"],
  };
}
