import { useQuery } from "@tanstack/react-query";

export type PageDummyData = {
  kpis: Array<{ label: string; value: string }>;
  trend: Array<{ name: string; value: number }>;
};

async function loadPageData(pageKey: string): Promise<PageDummyData> {
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
    queryKey: ["page-dummy", pageKey],
    queryFn: () => loadPageData(pageKey),
    staleTime: 60_000,
  });
}

