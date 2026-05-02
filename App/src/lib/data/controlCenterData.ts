import { DUMMY_DATA } from "@/config/runtime";
import { maybeDelay } from "@/lib/query/sourceMode";

export type ControlCenterData = {
  stats: Array<{ label: string; value: string; trend?: number; tone?: "default" | "ok" | "warn" | "danger" }>;
  employees: string[][];
  totals: Array<{ label: string; value: number; color: string }>;
  actions: Array<{ label: string; hint: string; intent: "good" | "warn" | "danger" | "neutral" }>;
};

export async function get_control_center_data(): Promise<ControlCenterData> {
  await maybeDelay(DUMMY_DATA ? 300 : 100);
  return {
    stats: [
      { label: "Queued Actions", value: "32", trend: 8.4 },
      { label: "Executed Today", value: "147", tone: "ok", trend: 12.2 },
      { label: "Failed Actions", value: "5", tone: "danger", trend: -3.1 },
      { label: "Live Integrations", value: "11", trend: 2.7 },
    ],
    employees: [
      ["Maya Rahal", "Finance", "MFA reset", "High", "Pending Approval"],
      ["Yousef Hamdi", "Operations", "Session revoke", "Medium", "Executed"],
      ["Sara Bensalem", "HR", "Device isolate", "High", "In Review"],
      ["Nour Khider", "Engineering", "Policy override", "Low", "Executed"],
      ["Karim Tarek", "Sales", "Token revoke", "Medium", "Pending Approval"],
      ["Lina Farouk", "Legal", "Mailbox quarantine", "High", "Escalated"],
    ],
    totals: [
      { label: "Pending", value: 12, color: "#f59e0b" },
      { label: "In Review", value: 7, color: "#38bdf8" },
      { label: "Escalated", value: 4, color: "#ef4444" },
    ],
    actions: [
      { label: "Approve Batch", hint: "12 ready", intent: "good" },
      { label: "Rerun Validation", hint: "5 failed", intent: "warn" },
      { label: "Escalate Owners", hint: "4 critical", intent: "danger" },
      { label: "Export Queue", hint: "CSV report", intent: "neutral" },
    ],
  };
}
