import { useQuery } from "@tanstack/react-query";
import { withQueryDefaults } from "@/lib/query/queryConfig";
import { getSourceMode } from "@/lib/query/sourceMode";
import { get_billing_usage_data } from "@/lib/data/billingData";

export function useBillingUsageQuery() {
  const mode = getSourceMode();
  return useQuery(withQueryDefaults({
    queryKey: ["billing-usage", mode],
    queryFn: get_billing_usage_data,
  }));
}
