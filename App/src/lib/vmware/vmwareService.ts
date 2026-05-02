// VMware service layer.
// Dispatches to dummy data or live vSphere REST API based on VITE_VMWARE_DUMMY_MODE.
// Live mode calls the backend proxy at /api/vmware/* (never calls vCenter directly from UI).

import type {
  VmSummary, VmDetails, HostSummary, ClusterSummary, DatastoreSummary,
  ResourcePoolSummary, InfrastructureSummary, VmwareAlert,
} from "./vmwareTypes";
import {
  DUMMY_VMS, DUMMY_HOSTS, DUMMY_CLUSTERS, DUMMY_DATASTORES,
  DUMMY_RESOURCE_POOLS, getDummyVmDetails, buildDummyAlerts,
} from "./vmwareDummyData";

const IS_DUMMY = import.meta.env.VITE_VMWARE_DUMMY_MODE !== "false";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

// ─── Live API helpers ─────────────────────────────────────────────────────────

async function liveGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`[vmwareService] ${path} → ${resp.status} ${resp.statusText}`);
  return resp.json() as Promise<T>;
}

async function livePost(path: string, body?: unknown): Promise<void> {
  const resp = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(`[vmwareService] POST ${path} → ${resp.status} ${resp.statusText}`);
}

// ─── VM inventory ─────────────────────────────────────────────────────────────

export async function listVMs(): Promise<VmSummary[]> {
  if (IS_DUMMY) return structuredClone(DUMMY_VMS);
  return liveGet<VmSummary[]>("/api/vmware/vms");
}

export async function getVMDetails(vmId: string): Promise<VmDetails | null> {
  if (IS_DUMMY) return getDummyVmDetails(vmId);
  return liveGet<VmDetails | null>(`/api/vmware/vms/${vmId}`);
}

// ─── Hosts ────────────────────────────────────────────────────────────────────

export async function listHosts(): Promise<HostSummary[]> {
  if (IS_DUMMY) return structuredClone(DUMMY_HOSTS);
  return liveGet<HostSummary[]>("/api/vmware/hosts");
}

// ─── Clusters ─────────────────────────────────────────────────────────────────

export async function listClusters(): Promise<ClusterSummary[]> {
  if (IS_DUMMY) return structuredClone(DUMMY_CLUSTERS);
  return liveGet<ClusterSummary[]>("/api/vmware/clusters");
}

// ─── Datastores ───────────────────────────────────────────────────────────────

export async function listDatastores(): Promise<DatastoreSummary[]> {
  if (IS_DUMMY) return structuredClone(DUMMY_DATASTORES);
  return liveGet<DatastoreSummary[]>("/api/vmware/datastores");
}

// ─── Resource Pools ───────────────────────────────────────────────────────────

export async function listResourcePools(): Promise<ResourcePoolSummary[]> {
  if (IS_DUMMY) return structuredClone(DUMMY_RESOURCE_POOLS);
  return liveGet<ResourcePoolSummary[]>("/api/vmware/resource-pools");
}

// ─── VM Power Actions ─────────────────────────────────────────────────────────

export async function powerOnVm(vmId: string): Promise<void> {
  if (IS_DUMMY) { await delay(600); return; }
  return livePost(`/api/vmware/vms/${vmId}/power/start`);
}

export async function powerOffVm(vmId: string): Promise<void> {
  if (IS_DUMMY) { await delay(600); return; }
  return livePost(`/api/vmware/vms/${vmId}/power/stop`);
}

export async function resetVm(vmId: string): Promise<void> {
  if (IS_DUMMY) { await delay(800); return; }
  return livePost(`/api/vmware/vms/${vmId}/power/reset`);
}

export async function suspendVm(vmId: string): Promise<void> {
  if (IS_DUMMY) { await delay(600); return; }
  return livePost(`/api/vmware/vms/${vmId}/power/suspend`);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<VmwareAlert[]> {
  if (IS_DUMMY) return buildDummyAlerts();
  return liveGet<VmwareAlert[]>("/api/vmware/alerts");
}

// ─── Aggregated summary ───────────────────────────────────────────────────────

export async function getInfrastructureSummary(): Promise<InfrastructureSummary> {
  if (IS_DUMMY) {
    return liveGet<InfrastructureSummary>("/api/vmware/summary").catch(() =>
      buildSummaryFromParts(DUMMY_VMS, DUMMY_HOSTS, DUMMY_CLUSTERS, DUMMY_DATASTORES)
    );
  }
  return liveGet<InfrastructureSummary>("/api/vmware/summary");
}

// ─── Local summary builder (used for dummy mode when backend is absent) ───────

export function buildSummaryFromParts(
  vms: VmSummary[],
  hosts: HostSummary[],
  clusters: ClusterSummary[],
  datastores: DatastoreSummary[],
): InfrastructureSummary {
  const running = vms.filter(v => v.power_state === "POWERED_ON");
  const stopped = vms.filter(v => v.power_state === "POWERED_OFF");
  const suspended = vms.filter(v => v.power_state === "SUSPENDED");

  const totalVcpu = vms.reduce((s, v) => s + v.cpu, 0);
  const totalMemMiB = vms.reduce((s, v) => s + v.memoryMiB, 0);

  const totalCapBytes = datastores.reduce((s, d) => s + d.capacity, 0);
  const totalFreeBytes = datastores.reduce((s, d) => s + d.free_space, 0);
  const totalUsedBytes = totalCapBytes - totalFreeBytes;
  const TiB = 1024 ** 4;

  const criticalVMs = running.filter(v => v.health === "critical").length;
  const warningVMs = running.filter(v => v.health === "warning").length;
  const healthyVMs = running.length - criticalVMs - warningVMs;

  const connHosts = hosts.filter(h => h.connection_state === "CONNECTED");
  const clusterCpuPct = connHosts.reduce((s, h) => s + h.cpuUsagePct, 0) / (connHosts.length || 1);
  const clusterMemPct = connHosts.reduce((s, h) => s + h.memoryUsagePct, 0) / (connHosts.length || 1);

  const vmsWithSnaps = vms.filter(v => v.snapshotCount > 0);
  const snapDays = vmsWithSnaps.flatMap(v => v.oldestSnapshotDays !== null ? [v.oldestSnapshotDays] : []);
  const oldestSnap = snapDays.length > 0 ? Math.max(...snapDays) : null;
  const critSnaps = vms.filter(v => v.oldestSnapshotDays !== null && v.oldestSnapshotDays > 30).length;

  const toolsRunning = running.filter(v => v.vmwareTools === "RUNNING").length;
  const toolsNotRunning = running.filter(v => v.vmwareTools !== "RUNNING").length;
  const guestIps = vms.filter(v => v.ipAddress !== null).length;

  return {
    totalVMs: vms.length,
    runningVMs: running.length,
    stoppedVMs: stopped.length,
    suspendedVMs: suspended.length,
    totalHosts: hosts.length,
    connectedHosts: hosts.filter(h => h.connection_state === "CONNECTED").length,
    disconnectedHosts: hosts.filter(h => h.connection_state !== "CONNECTED").length,
    maintenanceHosts: hosts.filter(h => h.maintenanceMode).length,
    totalClusters: clusters.length,
    drsEnabledClusters: clusters.filter(c => c.drs_enabled).length,
    haEnabledClusters: clusters.filter(c => c.ha_enabled).length,
    totalAllocatedVcpu: totalVcpu,
    totalAllocatedMemoryGiB: Math.round(totalMemMiB / 1024),
    avgVcpuPerVm: Math.round((totalVcpu / (vms.length || 1)) * 10) / 10,
    avgMemoryGiBPerVm: Math.round((totalMemMiB / 1024 / (vms.length || 1)) * 10) / 10,
    totalStorageCapacityTiB: Math.round(totalCapBytes / TiB * 10) / 10,
    totalStorageUsedTiB: Math.round(totalUsedBytes / TiB * 10) / 10,
    totalStorageFreeTiB: Math.round(totalFreeBytes / TiB * 10) / 10,
    storageUsagePercent: Math.round((totalUsedBytes / totalCapBytes) * 1000) / 10,
    datastoresAbove85Pct: datastores.filter(d => d.usage_percent >= 85).length,
    clusterCpuUsagePct: Math.round(clusterCpuPct),
    clusterMemUsagePct: Math.round(clusterMemPct),
    healthyVMs,
    warningVMs,
    criticalVMs,
    vmsWithSnapshots: vmsWithSnaps.length,
    oldestSnapshotDays: oldestSnap,
    criticalSnapshotCount: critSnaps,
    toolsRunning,
    toolsNotRunning,
    guestIpsAvailable: guestIps,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
