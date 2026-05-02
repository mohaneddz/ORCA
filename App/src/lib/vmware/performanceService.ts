// Performance metrics service.
// Abstracts the data source for CPU/RAM/disk/network metrics.
//
// Dummy mode: returns stable pre-computed values from vmwareDummyData.
// Live mode: calls the backend proxy at /api/vmware/vms/:id/performance
//            which in turn uses PerformanceManager QueryPerf over SOAP.
//
// IMPORTANT: Real vSphere performance metrics come from PerformanceManager,
// NOT from the REST inventory API. These are kept strictly separate.

import type { VmPerformance, HostPerformance, DatastorePerformance } from "./vmwareTypes";
import {
  getDummyVmPerformance,
  getDummyHostPerformance,
  getDummyDatastorePerformance,
} from "./vmwareDummyData";

const IS_DUMMY = import.meta.env.VITE_VMWARE_DUMMY_MODE !== "false";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

// ─── VM Performance ───────────────────────────────────────────────────────────

export async function getVmPerformance(vmId: string): Promise<VmPerformance> {
  if (IS_DUMMY) return getDummyVmPerformance(vmId);

  const resp = await fetch(`${BACKEND_URL}/api/vmware/vms/${vmId}/performance`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    console.warn(`[performanceService] getVmPerformance failed for ${vmId}, using zeros`);
    return zeroVmPerformance(vmId);
  }
  return resp.json() as Promise<VmPerformance>;
}

export async function getAllVmPerformance(vmIds: string[]): Promise<Map<string, VmPerformance>> {
  const results = await Promise.all(vmIds.map(id => getVmPerformance(id)));
  return new Map(results.map(r => [r.vmId, r]));
}

// ─── Host Performance ─────────────────────────────────────────────────────────

export async function getHostPerformance(hostId: string): Promise<HostPerformance> {
  if (IS_DUMMY) return getDummyHostPerformance(hostId);

  const resp = await fetch(`${BACKEND_URL}/api/vmware/hosts/${hostId}/performance`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    console.warn(`[performanceService] getHostPerformance failed for ${hostId}`);
    return { hostId, cpuUsagePct: 0, memUsagePct: 0, netRxMbps: 0, netTxMbps: 0, timestamp: Date.now() };
  }
  return resp.json() as Promise<HostPerformance>;
}

// ─── Datastore Performance ────────────────────────────────────────────────────

export async function getDatastorePerformance(datastoreId: string): Promise<DatastorePerformance> {
  if (IS_DUMMY) return getDummyDatastorePerformance(datastoreId);

  const resp = await fetch(`${BACKEND_URL}/api/vmware/datastores/${datastoreId}/performance`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    console.warn(`[performanceService] getDatastorePerformance failed for ${datastoreId}`);
    return { datastoreId, readLatencyMs: 0, writeLatencyMs: 0, readKbps: 0, writeKbps: 0, timestamp: Date.now() };
  }
  return resp.json() as Promise<DatastorePerformance>;
}

// ─── Cluster aggregate ────────────────────────────────────────────────────────

export interface ClusterPerformance {
  cpuUsagePct: number;
  memUsagePct: number;
  topCpuVms: Array<{ vmId: string; name: string; cpuPct: number }>;
  topMemVms: Array<{ vmId: string; name: string; memPct: number }>;
}

export async function getClusterPerformance(
  vmIds: string[],
  vmNames: Map<string, string>,
): Promise<ClusterPerformance> {
  if (IS_DUMMY) {
    const { DUMMY_VMS, DUMMY_HOSTS } = await import("./vmwareDummyData");
    const runningVms = DUMMY_VMS.filter(v => v.power_state === "POWERED_ON");
    const cpuAvg = runningVms.reduce((s, v) => s + v.cpuUsage, 0) / (runningVms.length || 1);
    const memAvg = runningVms.reduce((s, v) => s + v.memoryUsage, 0) / (runningVms.length || 1);
    const connectedHosts = DUMMY_HOSTS.filter(h => h.connection_state === "CONNECTED" && !h.maintenanceMode);
    const hostCpuAvg = connectedHosts.reduce((s, h) => s + h.cpuUsagePct, 0) / (connectedHosts.length || 1);
    const hostMemAvg = connectedHosts.reduce((s, h) => s + h.memoryUsagePct, 0) / (connectedHosts.length || 1);
    const topCpu = [...runningVms].sort((a, b) => b.cpuUsage - a.cpuUsage).slice(0, 3).map(v => ({ vmId: v.vm, name: v.name, cpuPct: v.cpuUsage }));
    const topMem = [...runningVms].sort((a, b) => b.memoryUsage - a.memoryUsage).slice(0, 3).map(v => ({ vmId: v.vm, name: v.name, memPct: v.memoryUsage }));
    void cpuAvg; void memAvg;
    return { cpuUsagePct: Math.round(hostCpuAvg), memUsagePct: Math.round(hostMemAvg), topCpuVms: topCpu, topMemVms: topMem };
  }

  const perfs = await getAllVmPerformance(vmIds);
  const sorted = [...perfs.values()];
  const cpuAvg = sorted.reduce((s, p) => s + p.cpuUsagePct, 0) / (sorted.length || 1);
  const memAvg = sorted.reduce((s, p) => s + p.memUsagePct, 0) / (sorted.length || 1);
  const topCpu = [...sorted].sort((a, b) => b.cpuUsagePct - a.cpuUsagePct).slice(0, 3)
    .map(p => ({ vmId: p.vmId, name: vmNames.get(p.vmId) ?? p.vmId, cpuPct: p.cpuUsagePct }));
  const topMem = [...sorted].sort((a, b) => b.memUsagePct - a.memUsagePct).slice(0, 3)
    .map(p => ({ vmId: p.vmId, name: vmNames.get(p.vmId) ?? p.vmId, memPct: p.memUsagePct }));
  return { cpuUsagePct: Math.round(cpuAvg), memUsagePct: Math.round(memAvg), topCpuVms: topCpu, topMemVms: topMem };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function zeroVmPerformance(vmId: string): VmPerformance {
  return { vmId, cpuUsagePct: 0, cpuUsageMhz: 0, cpuReadyMs: 0, memUsagePct: 0, memConsumedMiB: 0, memActiveMiB: 0, memBalloonMiB: 0, memSwappedMiB: 0, diskReadKbps: 0, diskWriteKbps: 0, netRxMbps: 0, netTxMbps: 0, timestamp: Date.now() };
}
