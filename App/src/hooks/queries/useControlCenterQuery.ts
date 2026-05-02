import { useQuery } from "@tanstack/react-query";
import { withQueryDefaults } from "@/lib/query/queryConfig";
import { getSourceMode } from "@/lib/query/sourceMode";
import { get_control_center_data } from "@/lib/data/controlCenterData";

export function useControlCenterQuery() {
  const mode = getSourceMode();
  return useQuery(withQueryDefaults({
    queryKey: ["control-center", mode],
    queryFn: get_control_center_data,
  }));
}
