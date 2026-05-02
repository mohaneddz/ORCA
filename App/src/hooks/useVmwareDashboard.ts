import { useState, useCallback, useEffect, useRef } from "react";
import type {
  VmSummary, VmDetails, HostSummary, ClusterSummary, DatastoreSummary,
  InfrastructureSummary, VmwareAlert,
} from "@/lib/vmware/vmwareTypes";
import {
  listVMs, listHosts, listClusters, listDatastores,
  getVMDetails, getAlerts, buildSummaryFromParts,
  powerOnVm, powerOffVm, resetVm, suspendVm,
} from "@/lib/vmware/vmwareService";
import { getClusterPerformance } from "@/lib/vmware/performanceService";
import type { ClusterPerformance } from "@/lib/vmware/performanceService";

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
  clusterPerf: ClusterPerformance | null;
  selectedVm: VmDetails | null;
  selectedVmLoading: boolean;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
  selectVm: (vmId: string | null) => Promise<void>;
  performPowerAction: (vmId: string, action: "start" | "stop" | "reset" | "suspend") => Promise<void>;
  // local state update for dummy mode power simulation
  localVms: VmSummary[];
}

export function useVmwareDashboard(): VmwareDashboardState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vms, setVms] = useState<VmSummary[]>([]);
  const [localVms, setLocalVms] = useState<VmSummary[]>([]);
  const [hosts, setHosts] = useState<HostSummary[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [datastores, setDatastores] = useState<DatastoreSummary[]>([]);
  const [summary, setSummary] = useState<InfrastructureSummary | null>(null);
  const [alerts, setAlerts] = useState<VmwareAlert[]>([]);
  const [clusterPerf, setClusterPerf] = useState<ClusterPerformance | null>(null);
  const [selectedVm, setSelectedVm] = useState<VmDetails | null>(null);
  const [selectedVmLoading, setSelectedVmLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const [vmList, hostList, clusterList, datastoreList, alertList] = await Promise.all([
        listVMs(),
        listHosts(),
        listClusters(),
        listDatastores(),
        getAlerts(),
      ]);

      const vmNames = new Map(vmList.map(v => [v.vm, v.name]));
      const vmIds = vmList.filter(v => v.power_state === "POWERED_ON").map(v => v.vm);
      const perf = await getClusterPerformance(vmIds, vmNames).catch(() => null);

      const builtSummary = buildSummaryFromParts(vmList, hostList, clusterList, datastoreList);

      setVms(vmList);
      setLocalVms(vmList);
      setHosts(hostList);
      setClusters(clusterList);
      setDatastores(datastoreList);
      setSummary(builtSummary);
      setAlerts(alertList);
      setClusterPerf(perf);
      setLastRefresh(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load vCenter data: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectVm = useCallback(async (vmId: string | null) => {
    if (!vmId) { setSelectedVm(null); return; }
    setSelectedVmLoading(true);
    try {
      const details = await getVMDetails(vmId);
      setSelectedVm(details);
    } catch {
      setSelectedVm(null);
    } finally {
      setSelectedVmLoading(false);
    }
  }, []);

  const performPowerAction = useCallback(async (
    vmId: string,
    action: "start" | "stop" | "reset" | "suspend",
  ) => {
    const handlers = { start: powerOnVm, stop: powerOffVm, reset: resetVm, suspend: suspendVm };
    await handlers[action](vmId);

    if (IS_DUMMY) {
      // Simulate state change locally for dummy mode
      const nextState = action === "start" ? "POWERED_ON" :
                        action === "stop"  ? "POWERED_OFF" :
                        action === "suspend" ? "SUSPENDED" :
                        "POWERED_ON"; // reset stays on
      setLocalVms(prev => prev.map(v =>
        v.vm === vmId ? { ...v, power_state: nextState as VmSummary["power_state"] } : v
      ));
    } else {
      await refresh();
    }
  }, [refresh]);

  return {
    loading, error, isDummyMode: IS_DUMMY,
    vms, localVms, hosts, clusters, datastores,
    summary, alerts, clusterPerf,
    selectedVm, selectedVmLoading,
    lastRefresh, refresh, selectVm, performPowerAction,
  };
}
