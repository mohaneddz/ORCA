const readBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

declare const __DUMMY_DATA__: string | undefined;

export const DUMMY_DATA = readBoolean(
  typeof __DUMMY_DATA__ === "string" ? __DUMMY_DATA__ : undefined,
  true,
);

