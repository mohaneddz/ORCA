import { DUMMY_DATA } from "@/config/runtime";

export function getSourceMode() {
  return DUMMY_DATA ? "dummy" : "real";
}

export async function maybeDelay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
