import { useMemo, useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  VmSummary, VmDetails, HostSummary, ClusterSummary, DatastoreSummary,
  InfrastructureSummary, VmwareAlert,
} from "@/lib/vmware/vmwareTypes";
import { powerOnVm, powerOffVm, resetVm, suspendVm } from "@/lib/vmware/vmwareService";
import { withQueryDefaults } from "@/lib/query/queryConfig";
import { get_vmware_dashboard_data, get_vmware_vm_details_data } from "@/lib/data/vmwareDashboardData";

const IS_DUMMY = import.meta.env.VITE_VMWARE_DUMMY_MODE !== "false";

export interface VmwareDashboardState {
  loading: boolean;
  error: string | null;
  isDummyMode: boolean;
  vms: VmSummary[];
  hosts: HostSummary[];
  clusters: ClusterSummary[];
  datastores: DatastoreSummary[];
  summary: InfrastructureSummary | null;
  alerts: VmwareAlert[];
  clusterPerf: import("@/lib/vmware/performanceService").ClusterPerformance | null;
  selectedVm: VmDetails | null;
  selectedVmLoading: boolean;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
  selectVm: (vmId: string | null) => Promise<void>;
  performPowerAction: (vmId: string, action: "start" | "stop" | "reset" | "suspend") => Promise<void>;
  localVms: VmSummary[];
}

export function useVmwareDashboard(): VmwareDashboardState {
  const queryClient = useQueryClient();
  const [selectedVmId, setSelectedVmId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [localVms, setLocalVms] = useState<VmSummary[]>([]);

  const dashboardQuery = useQuery(withQueryDefaults({
    queryKey: ["vmware-dashboard", IS_DUMMY ? "dummy" : "real"],
    queryFn: get_vmware_dashboard_data,
  }));

  const selectedVmQuery = useQuery(withQueryDefaults({
    queryKey: ["vmware-vm-details", selectedVmId ?? "none", IS_DUMMY ? "dummy" : "real"],
    queryFn: () => get_vmware_vm_details_data(selectedVmId as string),
    enabled: Boolean(selectedVmId),
  }));

  useEffect(() => {
    if (dashboardQuery.data?.vms) {
      setLocalVms(dashboardQuery.data.vms);
      setLastRefresh(new Date());
    }
  }, [dashboardQuery.data?.vms]);

  const powerMutation = useMutation({
    mutationFn: async ({ vmId, action }: { vmId: string; action: "start" | "stop" | "reset" | "suspend" }) => {
      const handlers = { start: powerOnVm, stop: powerOffVm, reset: resetVm, suspend: suspendVm };
      await handlers[action](vmId);
      return { vmId, action };
    },
    onSuccess: ({ vmId, action }) => {
      if (IS_DUMMY) {
        const nextState = action === "start" ? "POWERED_ON" : action === "stop" ? "POWERED_OFF" : action === "suspend" ? "SUSPENDED" : "POWERED_ON";
        setLocalVms((prev) => prev.map((v) => (v.vm === vmId ? { ...v, power_state: nextState as VmSummary["power_state"] } : v)));
      }
      void queryClient.invalidateQueries({ queryKey: ["vmware-dashboard"] });
      if (selectedVmId) {
        void queryClient.invalidateQueries({ queryKey: ["vmware-vm-details", selectedVmId] });
      }
    },
  });

  const refresh = useCallback(async () => {
    await dashboardQuery.refetch();
    setLastRefresh(new Date());
  }, [dashboardQuery]);

  const selectVm = useCallback(async (vmId: string | null) => {
    setSelectedVmId(vmId);
  }, []);

  const performPowerAction = useCallback(async (vmId: string, action: "start" | "stop" | "reset" | "suspend") => {
    await powerMutation.mutateAsync({ vmId, action });
  }, [powerMutation]);

  const error = useMemo(() => {
    if (!dashboardQuery.error) return null;
    const msg = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : String(dashboardQuery.error);
    return `Failed to load vCenter data: ${msg}`;
  }, [dashboardQuery.error]);

  const data = dashboardQuery.data;

  return {
    loading: dashboardQuery.isLoading,
    error,
    isDummyMode: IS_DUMMY,
    vms: data?.vms ?? [],
    localVms,
    hosts: data?.hosts ?? [],
    clusters: data?.clusters ?? [],
    datastores: data?.datastores ?? [],
    summary: data?.summary ?? null,
    alerts: data?.alerts ?? [],
    clusterPerf: data?.clusterPerf ?? null,
    selectedVm: selectedVmQuery.data ?? null,
    selectedVmLoading: selectedVmQuery.isLoading || selectedVmQuery.isFetching,
    lastRefresh,
    refresh,
    selectVm,
    performPowerAction,
  };
}
