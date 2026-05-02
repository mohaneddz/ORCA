import { useQuery } from "@tanstack/react-query";
import { withQueryDefaults } from "@/lib/query/queryConfig";
import { getSourceMode } from "@/lib/query/sourceMode";
import { get_registered_devices_data } from "@/lib/data/registeredDevicesData";

export function useRegisteredDevicesQuery() {
  const mode = getSourceMode();
  return useQuery(withQueryDefaults({
    queryKey: ["registered-devices", mode],
    queryFn: get_registered_devices_data,
  }));
}
