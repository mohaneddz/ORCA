import { useQuery } from "@tanstack/react-query";
import { withQueryDefaults } from "@/lib/query/queryConfig";
import { getSourceMode } from "@/lib/query/sourceMode";
import { get_network_page_data } from "@/lib/data/networkData";

export function useNetworkPageQuery() {
  const mode = getSourceMode();
  return useQuery(withQueryDefaults({
    queryKey: ["network-page", mode],
    queryFn: get_network_page_data,
  }));
}
