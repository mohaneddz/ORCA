// Realistic, internally-consistent VMware dummy data.
// All values are stable (not randomly generated per-render).
// VMs belong to real hosts; hosts belong to real clusters; disks belong to real datastores.

import type {
  VmSummary, VmDetails, HostSummary, ClusterSummary, DatastoreSummary,
  ResourcePoolSummary, VmSnapshot, VmPerformance, HostPerformance,
  DatastorePerformance, VmwareAlert,
} from "./vmwareTypes";

// ─── Clusters ─────────────────────────────────────────────────────────────────

export const DUMMY_CLUSTERS: ClusterSummary[] = [
  {
    cluster: "domain-c1001",
    name: "prod-cluster-01",
    drs_enabled: true,
    ha_enabled: true,
    hostIds: ["host-1001", "host-1002", "host-1003", "host-1004", "host-1005"],
    hostCount: 5,
    vmCount: 36,
  },
  {
    cluster: "domain-c2001",
    name: "dev-cluster-01",
    drs_enabled: false,
    ha_enabled: false,
    hostIds: ["host-2001", "host-2002", "host-2003"],
    hostCount: 3,
    vmCount: 13,
  },
];

// ─── Hosts ────────────────────────────────────────────────────────────────────

export const DUMMY_HOSTS: HostSummary[] = [
  {
    host: "host-1001", name: "esxi-prod-01.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c1001", clusterName: "prod-cluster-01",
    cpuCapacityMhz: 73728, cpuUsageMhz: 44237, cpuUsagePct: 60,
    memoryCapacityMiB: 524288, memoryUsageMiB: 293601, memoryUsagePct: 56,
    vmCount: 12, maintenanceMode: false,
  },
  {
    host: "host-1002", name: "esxi-prod-02.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c1001", clusterName: "prod-cluster-01",
    cpuCapacityMhz: 73728, cpuUsageMhz: 49399, cpuUsagePct: 67,
    memoryCapacityMiB: 524288, memoryUsageMiB: 367002, memoryUsagePct: 70,
    vmCount: 10, maintenanceMode: false,
  },
  {
    host: "host-1003", name: "esxi-prod-03.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c1001", clusterName: "prod-cluster-01",
    cpuCapacityMhz: 49152, cpuUsageMhz: 41779, cpuUsagePct: 85,
    memoryCapacityMiB: 262144, memoryUsageMiB: 209715, memoryUsagePct: 80,
    vmCount: 8, maintenanceMode: false,
  },
  {
    host: "host-1004", name: "esxi-prod-04.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c1001", clusterName: "prod-cluster-01",
    cpuCapacityMhz: 49152, cpuUsageMhz: 9830, cpuUsagePct: 20,
    memoryCapacityMiB: 262144, memoryUsageMiB: 44040, memoryUsagePct: 17,
    vmCount: 6, maintenanceMode: false,
  },
  {
    host: "host-1005", name: "esxi-prod-05.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c1001", clusterName: "prod-cluster-01",
    cpuCapacityMhz: 49152, cpuUsageMhz: 0, cpuUsagePct: 0,
    memoryCapacityMiB: 262144, memoryUsageMiB: 0, memoryUsagePct: 0,
    vmCount: 0, maintenanceMode: true,
  },
  {
    host: "host-2001", name: "esxi-dev-01.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c2001", clusterName: "dev-cluster-01",
    cpuCapacityMhz: 32768, cpuUsageMhz: 14746, cpuUsagePct: 45,
    memoryCapacityMiB: 262144, memoryUsageMiB: 58982, memoryUsagePct: 22,
    vmCount: 8, maintenanceMode: false,
  },
  {
    host: "host-2002", name: "esxi-dev-02.corp.local",
    connection_state: "CONNECTED", clusterId: "domain-c2001", clusterName: "dev-cluster-01",
    cpuCapacityMhz: 16384, cpuUsageMhz: 8847, cpuUsagePct: 54,
    memoryCapacityMiB: 131072, memoryUsageMiB: 34078, memoryUsagePct: 26,
    vmCount: 5, maintenanceMode: false,
  },
  {
    host: "host-2003", name: "esxi-dev-03.corp.local",
    connection_state: "DISCONNECTED", clusterId: "domain-c2001", clusterName: "dev-cluster-01",
    cpuCapacityMhz: 16384, cpuUsageMhz: 0, cpuUsagePct: 0,
    memoryCapacityMiB: 131072, memoryUsageMiB: 0, memoryUsagePct: 0,
    vmCount: 0, maintenanceMode: false,
  },
];

// ─── Datastores ───────────────────────────────────────────────────────────────

const TB = 1024 * 1024 * 1024 * 1024; // bytes per TiB

function ds(id: string, name: string, type: string, capTiB: number, freeTiB: number): DatastoreSummary {
  const capacity = capTiB * TB;
  const free_space = freeTiB * TB;
  const used_space = capacity - free_space;
  return { datastore: id, name, type, capacity, free_space, used_space, usage_percent: (used_space / capacity) * 100 };
}

export const DUMMY_DATASTORES: DatastoreSummary[] = [
  ds("datastore-1001", "ds-prod-ssd-01", "VMFS", 20, 6),    // 70% used
  ds("datastore-1002", "ds-prod-ssd-02", "VMFS", 20, 4),    // 80% used  [warning]
  ds("datastore-1003", "ds-prod-hdd-01", "VMFS", 50, 6),    // 88% used  [warning]
  ds("datastore-2001", "ds-dev-ssd-01",  "VMFS", 10, 4),    // 60% used
  ds("datastore-2002", "ds-dev-hdd-01",  "VMFS", 20, 2),    // 90% used  [critical]
  ds("datastore-3001", "ds-backup-01",   "NFS",  100, 4),   // 96% used  [critical]
];

// ─── Resource Pools ───────────────────────────────────────────────────────────

export const DUMMY_RESOURCE_POOLS: ResourcePoolSummary[] = [
  { resource_pool: "resgroup-1001", name: "Production", clusterId: "domain-c1001" },
  { resource_pool: "resgroup-2001", name: "Development", clusterId: "domain-c2001" },
];

// ─── VM helper ────────────────────────────────────────────────────────────────

type VmInput = {
  id: string; name: string; power: "POWERED_ON" | "POWERED_OFF" | "SUSPENDED";
  hostId: string; hostName: string; clusterId: string; clusterName: string;
  dsId: string; dsName: string; rpId: string; rpName: string;
  os: string; cpu: number; memGiB: number; diskGB: number;
  ip: string | null; tools: "RUNNING" | "NOT_RUNNING" | "NOT_INSTALLED" | "UNKNOWN";
  snaps: number; oldestSnapDays: number | null; cpuPct: number; memPct: number;
  uptimeDays: number | null;
};

function computeHealth(v: VmInput): "healthy" | "warning" | "critical" {
  if (v.power !== "POWERED_ON") return "healthy";
  if (v.cpuPct >= 90 || v.memPct >= 90) return "critical";
  if (v.cpuPct >= 75 || v.memPct >= 75 || v.tools === "NOT_RUNNING" || v.tools === "NOT_INSTALLED") return "warning";
  return "healthy";
}

function makeVm(v: VmInput): VmSummary {
  return {
    vm: v.id, name: v.name, power_state: v.power,
    hostId: v.hostId, hostName: v.hostName,
    clusterId: v.clusterId, clusterName: v.clusterName,
    datastoreId: v.dsId, datastoreName: v.dsName,
    resourcePoolId: v.rpId, resourcePoolName: v.rpName,
    guestOS: v.os, ipAddress: v.ip, vmwareTools: v.tools,
    cpu: v.cpu, memoryMiB: v.memGiB * 1024, diskCapacityGB: v.diskGB,
    cpuUsage: v.cpuPct, memoryUsage: v.memPct,
    snapshotCount: v.snaps, oldestSnapshotDays: v.oldestSnapDays,
    uptimeDays: v.uptimeDays, health: computeHealth(v),
  };
}

// ─── VM list ──────────────────────────────────────────────────────────────────

const P = { hId: "host-1001", hN: "esxi-prod-01.corp.local", cId: "domain-c1001", cN: "prod-cluster-01", d1Id: "datastore-1001", d1N: "ds-prod-ssd-01", d2Id: "datastore-1002", d2N: "ds-prod-ssd-02", d3Id: "datastore-1003", d3N: "ds-prod-hdd-01", rpId: "resgroup-1001", rpN: "Production" };

const rawVms: VmInput[] = [
  // ── esxi-prod-01 (12 VMs) ────────────────────────────────────────────────
  { id:"vm-001", name:"prod-web-01",         power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 22.04 LTS",       cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.1.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:45, memPct:62, uptimeDays:92  },
  { id:"vm-002", name:"prod-web-02",         power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 22.04 LTS",       cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.1.2",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:92, memPct:71, uptimeDays:92  },
  { id:"vm-003", name:"prod-web-03",         power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 22.04 LTS",       cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.1.3",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:38, memPct:55, uptimeDays:86  },
  { id:"vm-004", name:"prod-api-01",         power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Rocky Linux 9",          cpu:8,  memGiB:16, diskGB:200, ip:"10.1.2.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:78, memPct:68, uptimeDays:45  },
  { id:"vm-005", name:"prod-api-02",         power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"Rocky Linux 9",          cpu:8,  memGiB:16, diskGB:200, ip:"10.1.2.2",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:52, memPct:61, uptimeDays:45  },
  { id:"vm-006", name:"prod-db-01",          power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"RHEL 9.2",               cpu:8,  memGiB:32, diskGB:500, ip:"10.1.3.1",   tools:"RUNNING",      snaps:3, oldestSnapDays:45,   cpuPct:91, memPct:77, uptimeDays:180 },
  { id:"vm-007", name:"prod-db-02",          power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"RHEL 9.2",               cpu:8,  memGiB:32, diskGB:500, ip:"10.1.3.2",   tools:"RUNNING",      snaps:2, oldestSnapDays:38,   cpuPct:62, memPct:82, uptimeDays:180 },
  { id:"vm-008", name:"prod-cache-01",       power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2019",    cpu:4,  memGiB:16, diskGB:150, ip:"10.1.4.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:35, memPct:72, uptimeDays:120 },
  { id:"vm-009", name:"prod-queue-01",       power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 22.04 LTS",       cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.5.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:28, memPct:48, uptimeDays:60  },
  { id:"vm-010", name:"prod-monitor-01",     power:"POWERED_ON",  hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 22.04 LTS",       cpu:4,  memGiB:8,  diskGB:200, ip:"10.1.6.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:22, memPct:56, uptimeDays:75  },
  { id:"vm-011", name:"prod-backup-agent-01",power:"POWERED_OFF", hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 20.04 LTS",       cpu:2,  memGiB:4,  diskGB:100, ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },
  { id:"vm-012", name:"prod-migration-01",   power:"SUSPENDED",   hostId:"host-1001", hostName:"esxi-prod-01.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 20.04 LTS",       cpu:4,  memGiB:8,  diskGB:200, ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },

  // ── esxi-prod-02 (10 VMs) ────────────────────────────────────────────────
  { id:"vm-013", name:"prod-web-04",         power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2019",    cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.1.4",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:41, memPct:59, uptimeDays:88  },
  { id:"vm-014", name:"prod-web-05",         power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2019",    cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.1.5",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:55, memPct:63, uptimeDays:88  },
  { id:"vm-015", name:"prod-app-01",         power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2022",    cpu:8,  memGiB:32, diskGB:300, ip:"10.1.7.1",   tools:"RUNNING",      snaps:3, oldestSnapDays:15,   cpuPct:67, memPct:93, uptimeDays:150 },
  { id:"vm-016", name:"prod-app-02",         power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2022",    cpu:8,  memGiB:32, diskGB:300, ip:"10.1.7.2",   tools:"RUNNING",      snaps:2, oldestSnapDays:32,   cpuPct:58, memPct:77, uptimeDays:150 },
  { id:"vm-017", name:"prod-lb-01",          power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Rocky Linux 9",          cpu:2,  memGiB:4,  diskGB:50,  ip:"10.1.8.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:18, memPct:34, uptimeDays:200 },
  { id:"vm-018", name:"prod-lb-02",          power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Rocky Linux 9",          cpu:2,  memGiB:4,  diskGB:50,  ip:"10.1.8.2",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:15, memPct:31, uptimeDays:200 },
  { id:"vm-019", name:"prod-auth-01",        power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Rocky Linux 9",          cpu:4,  memGiB:8,  diskGB:100, ip:"10.1.9.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:33, memPct:44, uptimeDays:110 },
  { id:"vm-020", name:"prod-mail-01",        power:"POWERED_ON",  hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2022",    cpu:4,  memGiB:16, diskGB:200, ip:"10.1.10.1",  tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:47, memPct:65, uptimeDays:35  },
  { id:"vm-021", name:"prod-test-env-01",    power:"POWERED_OFF", hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 20.04 LTS",       cpu:4,  memGiB:8,  diskGB:100, ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },
  { id:"vm-022", name:"prod-dr-standby-01",  power:"SUSPENDED",   hostId:"host-1002", hostName:"esxi-prod-02.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 20.04 LTS",       cpu:4,  memGiB:16, diskGB:200, ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },

  // ── esxi-prod-03 (8 VMs) ─────────────────────────────────────────────────
  { id:"vm-023", name:"prod-analytics-01",   power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"CentOS Stream 9",        cpu:8,  memGiB:32, diskGB:500, ip:"10.1.11.1",  tools:"RUNNING",      snaps:1, oldestSnapDays:25,   cpuPct:94, memPct:71, uptimeDays:30  },
  { id:"vm-024", name:"prod-analytics-02",   power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"CentOS Stream 9",        cpu:8,  memGiB:32, diskGB:500, ip:"10.1.11.2",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:76, memPct:64, uptimeDays:30  },
  { id:"vm-025", name:"prod-search-01",      power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"CentOS Stream 9",        cpu:4,  memGiB:16, diskGB:300, ip:"10.1.12.1",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:48, memPct:57, uptimeDays:55  },
  { id:"vm-026", name:"prod-search-02",      power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"CentOS Stream 9",        cpu:4,  memGiB:16, diskGB:300, ip:"10.1.12.2",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:52, memPct:61, uptimeDays:55  },
  { id:"vm-027", name:"prod-storage-01",     power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 20.04 LTS",       cpu:4,  memGiB:8,  diskGB:200, ip:"10.1.13.1",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:24, memPct:43, uptimeDays:90  },
  { id:"vm-028", name:"prod-ci-01",          power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2019",    cpu:4,  memGiB:8,  diskGB:200, ip:"10.1.14.1",  tools:"RUNNING",      snaps:1, oldestSnapDays:1,    cpuPct:61, memPct:52, uptimeDays:22  },
  { id:"vm-029", name:"prod-registry-01",    power:"POWERED_ON",  hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d2Id, dsName:P.d2N, rpId:P.rpId, rpName:P.rpN, os:"Windows Server 2019",    cpu:4,  memGiB:8,  diskGB:150, ip:"10.1.15.1",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:31, memPct:47, uptimeDays:112 },
  { id:"vm-030", name:"prod-test-db-01",     power:"POWERED_OFF", hostId:"host-1003", hostName:"esxi-prod-03.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Ubuntu 20.04 LTS",       cpu:4,  memGiB:8,  diskGB:100, ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },

  // ── esxi-prod-04 (6 VMs) ─────────────────────────────────────────────────
  { id:"vm-031", name:"infra-dns-01",        power:"POWERED_ON",  hostId:"host-1004", hostName:"esxi-prod-04.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Debian 12 (Bookworm)",   cpu:2,  memGiB:4,  diskGB:50,  ip:"10.0.0.53",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:8,  memPct:22, uptimeDays:365 },
  { id:"vm-032", name:"infra-dns-02",        power:"POWERED_ON",  hostId:"host-1004", hostName:"esxi-prod-04.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Debian 12 (Bookworm)",   cpu:2,  memGiB:4,  diskGB:50,  ip:"10.0.0.54",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:7,  memPct:21, uptimeDays:365 },
  { id:"vm-033", name:"infra-ntp-01",        power:"POWERED_ON",  hostId:"host-1004", hostName:"esxi-prod-04.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Debian 12 (Bookworm)",   cpu:2,  memGiB:2,  diskGB:30,  ip:"10.0.0.123", tools:"RUNNING",      snaps:1, oldestSnapDays:5,    cpuPct:5,  memPct:18, uptimeDays:365 },
  { id:"vm-034", name:"infra-proxy-01",      power:"POWERED_ON",  hostId:"host-1004", hostName:"esxi-prod-04.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Debian 12 (Bookworm)",   cpu:4,  memGiB:8,  diskGB:100, ip:"10.0.0.80",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:29, memPct:41, uptimeDays:120 },
  { id:"vm-035", name:"infra-jump-01",       power:"POWERED_ON",  hostId:"host-1004", hostName:"esxi-prod-04.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d1Id, dsName:P.d1N, rpId:P.rpId, rpName:P.rpN, os:"Debian 12 (Bookworm)",   cpu:4,  memGiB:8,  diskGB:100, ip:"10.0.0.22",  tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:12, memPct:28, uptimeDays:180 },
  { id:"vm-036", name:"infra-syslog-01",     power:"POWERED_ON",  hostId:"host-1004", hostName:"esxi-prod-04.corp.local", clusterId:"domain-c1001", clusterName:"prod-cluster-01", dsId:P.d3Id, dsName:P.d3N, rpId:P.rpId, rpName:P.rpN, os:"Debian 12 (Bookworm)",   cpu:4,  memGiB:16, diskGB:500, ip:"10.0.0.514", tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:37, memPct:55, uptimeDays:250 },

  // ── esxi-dev-01 (8 VMs) ──────────────────────────────────────────────────
  { id:"vm-037", name:"dev-web-01",          power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:2,  memGiB:4,  diskGB:50,  ip:"10.2.1.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:25, memPct:38, uptimeDays:14  },
  { id:"vm-038", name:"dev-web-02",          power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:2,  memGiB:4,  diskGB:50,  ip:"10.2.1.2",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:31, memPct:42, uptimeDays:14  },
  { id:"vm-039", name:"dev-api-01",          power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 20.04 LTS",  cpu:4,  memGiB:8,  diskGB:100, ip:"10.2.2.1",   tools:"RUNNING",      snaps:2, oldestSnapDays:2,    cpuPct:44, memPct:53, uptimeDays:7   },
  { id:"vm-040", name:"dev-db-01",           power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2002", dsName:"ds-dev-hdd-01",  rpId:"resgroup-2001", rpName:"Development", os:"RHEL 9.2",          cpu:4,  memGiB:16, diskGB:300, ip:"10.2.3.1",   tools:"RUNNING",      snaps:5, oldestSnapDays:8,    cpuPct:79, memPct:68, uptimeDays:28  },
  { id:"vm-041", name:"dev-test-01",         power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:2,  memGiB:4,  diskGB:50,  ip:"10.2.4.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:19, memPct:31, uptimeDays:3   },
  { id:"vm-042", name:"dev-test-02",         power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:2,  memGiB:4,  diskGB:50,  ip:"10.2.4.2",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:22, memPct:35, uptimeDays:3   },
  { id:"vm-043", name:"dev-staging-01",      power:"POWERED_OFF", hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2002", dsName:"ds-dev-hdd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 20.04 LTS",  cpu:4,  memGiB:8,  diskGB:100, ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },
  { id:"vm-044", name:"dev-tools-01",        power:"POWERED_ON",  hostId:"host-2001", hostName:"esxi-dev-01.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2002", dsName:"ds-dev-hdd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:4,  memGiB:8,  diskGB:100, ip:"10.2.5.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:33, memPct:47, uptimeDays:40  },

  // ── esxi-dev-02 (5 VMs) ──────────────────────────────────────────────────
  { id:"vm-045", name:"dev-build-01",        power:"POWERED_ON",  hostId:"host-2002", hostName:"esxi-dev-02.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:4,  memGiB:8,  diskGB:100, ip:"10.2.6.1",   tools:"RUNNING",      snaps:1, oldestSnapDays:3,    cpuPct:67, memPct:58, uptimeDays:5   },
  { id:"vm-046", name:"dev-build-02",        power:"POWERED_ON",  hostId:"host-2002", hostName:"esxi-dev-02.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2001", dsName:"ds-dev-ssd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 22.04 LTS",  cpu:4,  memGiB:8,  diskGB:100, ip:"10.2.6.2",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:71, memPct:62, uptimeDays:5   },
  { id:"vm-047", name:"dev-demo-01",         power:"POWERED_ON",  hostId:"host-2002", hostName:"esxi-dev-02.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2002", dsName:"ds-dev-hdd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Debian 12 (Bookworm)",cpu:2, memGiB:4,  diskGB:50,  ip:"10.2.7.1",   tools:"RUNNING",      snaps:0, oldestSnapDays:null, cpuPct:14, memPct:27, uptimeDays:20  },
  { id:"vm-048", name:"dev-demo-02",         power:"POWERED_OFF", hostId:"host-2002", hostName:"esxi-dev-02.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-2002", dsName:"ds-dev-hdd-01",  rpId:"resgroup-2001", rpName:"Development", os:"Ubuntu 20.04 LTS",  cpu:2,  memGiB:4,  diskGB:50,  ip:null,         tools:"NOT_RUNNING",  snaps:0, oldestSnapDays:null, cpuPct:0,  memPct:0,  uptimeDays:null },
  { id:"vm-049", name:"backup-srv-01",       power:"POWERED_ON",  hostId:"host-2002", hostName:"esxi-dev-02.corp.local",  clusterId:"domain-c2001", clusterName:"dev-cluster-01",  dsId:"datastore-3001", dsName:"ds-backup-01",   rpId:"resgroup-2001", rpName:"Development", os:"Debian 12 (Bookworm)",cpu:4, memGiB:8,  diskGB:200, ip:"10.0.0.200", tools:"RUNNING",      snaps:1, oldestSnapDays:43,   cpuPct:19, memPct:41, uptimeDays:180 },
];

export const DUMMY_VMS: VmSummary[] = rawVms.map(makeVm);

// ─── VM Details (extended) ────────────────────────────────────────────────────

function makeSnap(id: string, name: string, ageDays: number, isCurrent: boolean): VmSnapshot {
  const d = new Date(Date.now() - ageDays * 86400000);
  return { id, name, description: "", created: d.toISOString(), ageDays, isCurrent, memorySnapshot: false, children: [] };
}

const DETAIL_OVERRIDES: Record<string, Partial<VmDetails>> = {
  "vm-006": {
    coresPerSocket: 4, cpuHotAdd: false, memoryHotAdd: true,
    disks: [
      { disk:"disk-1", label:"Hard disk 1", capacityGB:100, datastoreId:"datastore-1002", datastoreName:"ds-prod-ssd-02", backingVmdk:"[ds-prod-ssd-02] prod-db-01/prod-db-01.vmdk",                  controllerType:"PVSCSI", unitNumber:0, busNumber:0 },
      { disk:"disk-2", label:"Hard disk 2", capacityGB:400, datastoreId:"datastore-1002", datastoreName:"ds-prod-ssd-02", backingVmdk:"[ds-prod-ssd-02] prod-db-01/prod-db-01_1.vmdk",                controllerType:"PVSCSI", unitNumber:1, busNumber:0 },
    ],
    nics: [{ nic:"nic-1", label:"Network adapter 1", macAddress:"00:50:56:ab:01:06", connected:true, backingNetwork:"prod-vlan-100", ipAddress:"10.1.3.1" }],
    snapshots: [makeSnap("snap-001","Pre-Upgrade-2025-03",45,false), makeSnap("snap-002","Post-Patch-Q1",20,false), makeSnap("snap-003","Current",3,true)],
  },
  "vm-015": {
    coresPerSocket: 4, cpuHotAdd: true, memoryHotAdd: true,
    disks: [
      { disk:"disk-1", label:"Hard disk 1", capacityGB:100, datastoreId:"datastore-1002", datastoreName:"ds-prod-ssd-02", backingVmdk:"[ds-prod-ssd-02] prod-app-01/prod-app-01.vmdk",                controllerType:"LSI_LOGIC_SAS", unitNumber:0, busNumber:0 },
      { disk:"disk-2", label:"Hard disk 2", capacityGB:200, datastoreId:"datastore-1002", datastoreName:"ds-prod-ssd-02", backingVmdk:"[ds-prod-ssd-02] prod-app-01/prod-app-01_1.vmdk",              controllerType:"LSI_LOGIC_SAS", unitNumber:1, busNumber:0 },
    ],
    nics: [{ nic:"nic-1", label:"Network adapter 1", macAddress:"00:50:56:ab:01:15", connected:true, backingNetwork:"prod-vlan-100", ipAddress:"10.1.7.1" }],
    snapshots: [makeSnap("snap-010","Pre-Deployment",15,false), makeSnap("snap-011","Current",2,true)],
  },
};

export function getDummyVmDetails(vmId: string): VmDetails | null {
  const summary = DUMMY_VMS.find(v => v.vm === vmId);
  if (!summary) return null;
  const override = DETAIL_OVERRIDES[vmId] ?? {};
  const base: VmDetails = {
    ...summary,
    coresPerSocket: 1,
    cpuHotAdd: false,
    memoryHotAdd: false,
    nics: [{ nic:"nic-1", label:"Network adapter 1", macAddress:`00:50:56:ab:${vmId.slice(-2).padStart(2,"0")}:${vmId.charCodeAt(3).toString(16).padStart(2,"0")}`, connected: summary.power_state === "POWERED_ON", backingNetwork: summary.clusterId === "domain-c1001" ? "prod-vlan-100" : "dev-vlan-200", ipAddress: summary.ipAddress }],
    disks: [{ disk:"disk-1", label:"Hard disk 1", capacityGB: summary.diskCapacityGB, datastoreId: summary.datastoreId, datastoreName: summary.datastoreName, backingVmdk:`[${summary.datastoreName}] ${summary.name}/${summary.name}.vmdk`, controllerType:"PVSCSI", unitNumber:0, busNumber:0 }],
    snapshots: [],
    ...override,
  };
  return base;
}

// ─── Performance data ─────────────────────────────────────────────────────────

export function getDummyVmPerformance(vmId: string): VmPerformance {
  const vm = DUMMY_VMS.find(v => v.vm === vmId);
  const cpu = vm?.cpuUsage ?? 0;
  const mem = vm?.memoryUsage ?? 0;
  const memMiB = vm?.memoryMiB ?? 0;
  return {
    vmId,
    cpuUsagePct: cpu,
    cpuUsageMhz: Math.round(cpu * 36 * 1.5),
    cpuReadyMs: Math.round(cpu * 0.8),
    memUsagePct: mem,
    memConsumedMiB: Math.round(memMiB * mem / 100),
    memActiveMiB: Math.round(memMiB * mem * 0.7 / 100),
    memBalloonMiB: cpu > 85 ? Math.round(memMiB * 0.02) : 0,
    memSwappedMiB: cpu > 90 ? Math.round(memMiB * 0.005) : 0,
    diskReadKbps: Math.round(cpu * 120),
    diskWriteKbps: Math.round(cpu * 80),
    netRxMbps: Math.round(cpu * 0.18 * 100) / 100,
    netTxMbps: Math.round(cpu * 0.09 * 100) / 100,
    timestamp: Date.now(),
  };
}

export function getDummyHostPerformance(hostId: string): HostPerformance {
  const h = DUMMY_HOSTS.find(x => x.host === hostId);
  return {
    hostId,
    cpuUsagePct: h?.cpuUsagePct ?? 0,
    memUsagePct: h?.memoryUsagePct ?? 0,
    netRxMbps: Math.round((h?.cpuUsagePct ?? 0) * 1.2 * 10) / 10,
    netTxMbps: Math.round((h?.cpuUsagePct ?? 0) * 0.6 * 10) / 10,
    timestamp: Date.now(),
  };
}

export function getDummyDatastorePerformance(datastoreId: string): DatastorePerformance {
  const ds = DUMMY_DATASTORES.find(x => x.datastore === datastoreId);
  const load = ds ? ds.usage_percent / 100 : 0.5;
  return {
    datastoreId,
    readLatencyMs: Math.round(load * 8 * 10) / 10,
    writeLatencyMs: Math.round(load * 12 * 10) / 10,
    readKbps: Math.round(load * 50000),
    writeKbps: Math.round(load * 30000),
    timestamp: Date.now(),
  };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function buildDummyAlerts(): VmwareAlert[] {
  const now = Date.now();
  const alerts: VmwareAlert[] = [];
  let i = 0;

  for (const vm of DUMMY_VMS) {
    if (vm.power_state !== "POWERED_ON") continue;
    if (vm.cpuUsage >= 90) alerts.push({ id: `alert-${++i}`, severity:"critical", type:"cpu",  message:`CPU usage at ${vm.cpuUsage}%`,      entity:vm.name, entityId:vm.vm, timestamp:now });
    else if (vm.cpuUsage >= 75) alerts.push({ id:`alert-${++i}`, severity:"warning", type:"cpu",  message:`CPU usage at ${vm.cpuUsage}%`,      entity:vm.name, entityId:vm.vm, timestamp:now });
    if (vm.memoryUsage >= 90) alerts.push({ id:`alert-${++i}`, severity:"critical", type:"memory",message:`Memory usage at ${vm.memoryUsage}%`, entity:vm.name, entityId:vm.vm, timestamp:now });
    else if (vm.memoryUsage >= 75) alerts.push({ id:`alert-${++i}`, severity:"warning",  type:"memory",message:`Memory usage at ${vm.memoryUsage}%`, entity:vm.name, entityId:vm.vm, timestamp:now });
    if (vm.vmwareTools === "NOT_RUNNING" || vm.vmwareTools === "NOT_INSTALLED") alerts.push({ id:`alert-${++i}`, severity:"warning", type:"tools",  message:`VMware Tools not running`,           entity:vm.name, entityId:vm.vm, timestamp:now });
    if (vm.oldestSnapshotDays !== null && vm.oldestSnapshotDays > 30) alerts.push({ id:`alert-${++i}`, severity:"critical", type:"snapshot",message:`Snapshot ${vm.oldestSnapshotDays}d old`,  entity:vm.name, entityId:vm.vm, timestamp:now });
    else if (vm.oldestSnapshotDays !== null && vm.oldestSnapshotDays > 14) alerts.push({ id:`alert-${++i}`, severity:"warning",  type:"snapshot",message:`Snapshot ${vm.oldestSnapshotDays}d old`,  entity:vm.name, entityId:vm.vm, timestamp:now });
  }
  for (const h of DUMMY_HOSTS) {
    if (h.connection_state !== "CONNECTED") alerts.push({ id:`alert-${++i}`, severity:"critical", type:"host", message:`Host ${h.connection_state.toLowerCase().replace("_"," ")}`, entity:h.name, entityId:h.host, timestamp:now });
    if (h.maintenanceMode) alerts.push({ id:`alert-${++i}`, severity:"info", type:"host", message:`Host in maintenance mode`, entity:h.name, entityId:h.host, timestamp:now });
  }
  for (const ds of DUMMY_DATASTORES) {
    if (ds.usage_percent >= 90) alerts.push({ id:`alert-${++i}`, severity:"critical", type:"disk",  message:`Datastore ${ds.usage_percent.toFixed(0)}% used`,  entity:ds.name, entityId:ds.datastore, timestamp:now });
    else if (ds.usage_percent >= 80) alerts.push({ id:`alert-${++i}`, severity:"warning", type:"disk",  message:`Datastore ${ds.usage_percent.toFixed(0)}% used`,  entity:ds.name, entityId:ds.datastore, timestamp:now });
  }

  alerts.sort((a, b) => {
    const order = { critical:0, warning:1, info:2 };
    return order[a.severity] - order[b.severity];
  });
  return alerts;
}
