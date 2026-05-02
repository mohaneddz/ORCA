import { useQuery } from "@tanstack/react-query";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { DUMMY_DATA } from "@/config/runtime";

export type PageDummyData = {
  kpis: Array<{ label: string; value: string }>;
  trend: Array<{ name: string; value: number }>;
};

async function loadPageData(pageKey: string): Promise<PageDummyData> {
  if (!DUMMY_DATA) {
    if (!isTauri()) {
      throw new Error("Real data mode requires Tauri runtime.");
    }

    const report = await invoke<Record<string, unknown>>("collect_wave3_posture", { config: null });
    const software = ((report.software as Record<string, unknown> | undefined)?.software as unknown[] | undefined) ?? [];
    const lanDevices = ((report.lan as Record<string, unknown> | undefined)?.devices as unknown[] | undefined) ?? [];
    const patch = (report.patchStatus as Record<string, unknown> | undefined) ?? {};
    const antivirus = (report.antivirus as Record<string, unknown> | undefined) ?? {};

    const riskLike = Number(lanDevices.length) + Number(software.length > 50 ? 10 : 3);
    const currentLike = patch.isCurrent === true ? "Current" : "Stale";
    const avLike = String(antivirus.status ?? "unknown");

    return {
      kpis: [
        { label: "Software Assets", value: String(software.length) },
        { label: "LAN Devices", value: String(lanDevices.length) },
        { label: "Patch State", value: currentLike },
        { label: "Antivirus", value: avLike },
      ],
      trend: [
        { name: "Mon", value: Math.max(8, riskLike - 5) },
        { name: "Tue", value: Math.max(10, riskLike - 3) },
        { name: "Wed", value: Math.max(9, riskLike - 4) },
        { name: "Thu", value: Math.max(11, riskLike - 2) },
        { name: "Fri", value: Math.max(7, riskLike - 6) },
        { name: "Sat", value: Math.max(6, riskLike - 7) },
        { name: "Sun", value: Math.max(8, riskLike - 5) },
      ],
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 750));

  const base = pageKey.length * 7;

  return {
    kpis: [
      { label: "Active", value: String(200 + base) },
      { label: "Flagged", value: String(12 + (base % 9)) },
      { label: "Resolved", value: String(93 + (base % 20)) },
    ],
    trend: [
      { name: "Mon", value: 28 + (base % 8) },
      { name: "Tue", value: 35 + (base % 8) },
      { name: "Wed", value: 22 + (base % 8) },
      { name: "Thu", value: 41 + (base % 8) },
      { name: "Fri", value: 30 + (base % 8) },
      { name: "Sat", value: 45 + (base % 8) },
      { name: "Sun", value: 38 + (base % 8) },
    ],
  };
}

export function usePageDummyQuery(pageKey: string) {
  return useQuery({
    queryKey: ["page-dummy", pageKey, DUMMY_DATA ? "dummy" : "real"],
    queryFn: () => loadPageData(pageKey),
    staleTime: 60_000,
  });
}
