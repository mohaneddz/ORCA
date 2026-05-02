import type {
  VmSummary, VmDetails, HostSummary, ClusterSummary, DatastoreSummary,
  InfrastructureSummary, VmwareAlert,
} from "@/lib/vmware/vmwareTypes";
import {
  listVMs, listHosts, listClusters, listDatastores,
  getAlerts, buildSummaryFromParts, getVMDetails,
} from "@/lib/vmware/vmwareService";
import { getClusterPerformance, type ClusterPerformance } from "@/lib/vmware/performanceService";

export type VmwareDashboardData = {
  vms: VmSummary[];
  hosts: HostSummary[];
  clusters: ClusterSummary[];
  datastores: DatastoreSummary[];
  summary: InfrastructureSummary;
  alerts: VmwareAlert[];
  clusterPerf: ClusterPerformance | null;
};

export async function get_vmware_dashboard_data(): Promise<VmwareDashboardData> {
  const [vmList, hostList, clusterList, datastoreList, alertList] = await Promise.all([
    listVMs(),
    listHosts(),
    listClusters(),
    listDatastores(),
    getAlerts(),
  ]);

  const vmNames = new Map(vmList.map((v) => [v.vm, v.name]));
  const vmIds = vmList.filter((v) => v.power_state === "POWERED_ON").map((v) => v.vm);
  const perf = await getClusterPerformance(vmIds, vmNames).catch(() => null);

  return {
    vms: vmList,
    hosts: hostList,
    clusters: clusterList,
    datastores: datastoreList,
    summary: buildSummaryFromParts(vmList, hostList, clusterList, datastoreList),
    alerts: alertList,
    clusterPerf: perf,
  };
}

export async function get_vmware_vm_details_data(vmId: string): Promise<VmDetails | null> {
  return getVMDetails(vmId);
}
