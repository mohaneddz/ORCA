import { isTauri, invoke } from "@tauri-apps/api/core";
import { DUMMY_DATA } from "@/config/runtime";
import { maybeDelay } from "@/lib/query/sourceMode";

export type BillingUsageData = {
  plans: Array<{ name: string; price: string; seats: string; support: string; accent: string; disabled: boolean }>;
  usageByCategory: Array<{ name: string; primary: number; secondary: number }>;
  stats: Array<{ label: string; value: string; helper?: string; trend?: number; tone?: "default" | "ok" | "warn" | "danger" }>;
  totalUsagePct: number;
};

async function collectRealUsageSeed(): Promise<number> {
  if (!isTauri()) return 64;
  const report = await invoke<Record<string, unknown>>("collect_wave3_posture", { config: null });
  const software = ((report.software as Record<string, unknown> | undefined)?.software as unknown[] | undefined) ?? [];
  const devices = ((report.lan as Record<string, unknown> | undefined)?.devices as unknown[] | undefined) ?? [];
  const total = Math.max(1, software.length + devices.length);
  return Math.min(95, Math.max(25, Math.round((devices.length / total) * 100)));
}

export async function get_billing_usage_data(): Promise<BillingUsageData> {
  await maybeDelay(DUMMY_DATA ? 400 : 120);
  const usageSeed = DUMMY_DATA ? 64 : await collectRealUsageSeed();

  const usageByCategory = [
    { name: "API Calls", primary: Math.min(98, usageSeed + 4), secondary: 100 },
    { name: "Storage", primary: Math.max(20, usageSeed - 21), secondary: 100 },
    { name: "Team Seats", primary: Math.max(20, usageSeed - 7), secondary: 100 },
    { name: "Automations", primary: Math.max(15, usageSeed - 33), secondary: 100 },
  ];

  return {
    plans: [
      { name: "Free", price: "$0/mo", seats: "Up to 2 seats", support: "Community support", accent: "border-emerald-400/20", disabled: false },
      { name: "Growth", price: "$99/mo", seats: "Up to 20 seats", support: "Priority support", accent: "border-blue-700/35", disabled: true },
      { name: "Enterprise", price: "Custom", seats: "Unlimited seats", support: "Dedicated success manager", accent: "border-amber-400/25", disabled: true },
    ],
    usageByCategory,
    stats: [
      { label: "Current Plan", value: "Growth", helper: "Active subscription tier", tone: "ok" },
      { label: "Upgrade Plan", value: "Enterprise", helper: "Recommended next tier", tone: "warn" },
      { label: "Billing Cycle", value: "May 2026", helper: "Renews in 12 days" },
      { label: "Spend Progress", value: `${usageSeed}%`, helper: "Against expected monthly budget", trend: 5.4, tone: "warn" },
    ],
    totalUsagePct: usageSeed,
  };
}
