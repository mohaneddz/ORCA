import type { UseQueryOptions } from "@tanstack/react-query";

export const QUERY_DEFAULTS = {
  staleTime: 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

export function withQueryDefaults<TData, TError = Error>(
  options: Omit<UseQueryOptions<TData, TError, TData>, "staleTime" | "retry" | "refetchOnWindowFocus">,
): UseQueryOptions<TData, TError, TData> {
  return {
    ...QUERY_DEFAULTS,
    ...options,
  };
}
