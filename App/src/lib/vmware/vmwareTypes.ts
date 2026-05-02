// Normalized VMware vSphere frontend types.
// Raw VMware API shapes are NOT exposed directly to React components.

export type PowerState = "POWERED_ON" | "POWERED_OFF" | "SUSPENDED";
export type HealthStatus = "healthy" | "warning" | "critical";
export type ConnectionState = "CONNECTED" | "DISCONNECTED" | "NOT_RESPONDING";
export type VmwareToolsStatus = "RUNNING" | "NOT_RUNNING" | "NOT_INSTALLED" | "UNKNOWN";

// ─── VM ──────────────────────────────────────────────────────────────────────

export interface VmSummary {
  vm: string;               // vSphere VM MoRef / ID
  name: string;
  power_state: PowerState;
  hostId: string;
  hostName: string;
  clusterId: string;
  clusterName: string;
  datastoreId: string;
  datastoreName: string;
  resourcePoolId: string;
  resourcePoolName: string;
  guestOS: string;
  ipAddress: string | null;
  vmwareTools: VmwareToolsStatus;
  cpu: number;              // vCPU count
  memoryMiB: number;        // configured RAM in MiB
  diskCapacityGB: number;   // total disk capacity GB
  cpuUsage: number;         // live CPU usage % (from PerformanceManager)
  memoryUsage: number;      // live memory usage % (from PerformanceManager)
  snapshotCount: number;
  oldestSnapshotDays: number | null;
  uptimeDays: number | null;
  health: HealthStatus;
}

export interface VmDetails extends VmSummary {
  coresPerSocket: number;
  cpuHotAdd: boolean;
  memoryHotAdd: boolean;
  nics: VmNic[];
  disks: VmDisk[];
  snapshots: VmSnapshot[];
}

// ─── Host ─────────────────────────────────────────────────────────────────────

export interface HostSummary {
  host: string;             // vSphere Host MoRef / ID
  name: string;
  connection_state: ConnectionState;
  clusterId: string;
  clusterName: string;
  cpuCapacityMhz: number;
  cpuUsageMhz: number;
  cpuUsagePct: number;
  memoryCapacityMiB: number;
  memoryUsageMiB: number;
  memoryUsagePct: number;
  vmCount: number;
  maintenanceMode: boolean;
}

// ─── Cluster ──────────────────────────────────────────────────────────────────

export interface ClusterSummary {
  cluster: string;          // vSphere Cluster MoRef / ID
  name: string;
  drs_enabled: boolean;
  ha_enabled: boolean;
  hostIds: string[];
  hostCount: number;
  vmCount: number;
}

// ─── Datastore ────────────────────────────────────────────────────────────────

export interface DatastoreSummary {
  datastore: string;        // vSphere Datastore MoRef / ID
  name: string;
  type: string;             // VMFS, NFS, vSAN, etc.
  capacity: number;         // bytes
  free_space: number;       // bytes
  used_space: number;       // bytes (computed: capacity - free_space)
  usage_percent: number;    // computed: used_space / capacity * 100
}

// ─── Resource Pool ────────────────────────────────────────────────────────────

export interface ResourcePoolSummary {
  resource_pool: string;
  name: string;
  clusterId: string;
}

// ─── Disk / NIC / Snapshot ────────────────────────────────────────────────────

export interface VmDisk {
  disk: string;             // disk key
  label: string;
  capacityGB: number;
  datastoreId: string;
  datastoreName: string;
  backingVmdk: string;
  controllerType: string;
  unitNumber: number;
  busNumber: number;
}

export interface VmNic {
  nic: string;
  label: string;
  macAddress: string;
  connected: boolean;
  backingNetwork: string;
  ipAddress: string | null;
}

export interface VmSnapshot {
  id: string;
  name: string;
  description: string;
  created: string;          // ISO date string
  ageDays: number;
  isCurrent: boolean;
  memorySnapshot: boolean;
  children: VmSnapshot[];
}

// ─── Performance ──────────────────────────────────────────────────────────────
// Performance metrics are sourced from PerformanceManager/vStats, NOT REST inventory.

export interface VmPerformance {
  vmId: string;
  cpuUsagePct: number;      // cpu.usage.average (%)
  cpuUsageMhz: number;      // cpu.usagemhz.average
  cpuReadyMs: number;       // cpu.ready.summation (ms)
  memUsagePct: number;      // mem.usage.average (%)
  memConsumedMiB: number;   // mem.consumed.average
  memActiveMiB: number;     // mem.active.average
  memBalloonMiB: number;    // mem.balloon.average
  memSwappedMiB: number;    // mem.swapped.average
  diskReadKbps: number;
  diskWriteKbps: number;
  netRxMbps: number;
  netTxMbps: number;
  timestamp: number;        // unix ms
}

export interface HostPerformance {
  hostId: string;
  cpuUsagePct: number;
  memUsagePct: number;
  netRxMbps: number;
  netTxMbps: number;
  timestamp: number;
}

export interface DatastorePerformance {
  datastoreId: string;
  readLatencyMs: number;
  writeLatencyMs: number;
  readKbps: number;
  writeKbps: number;
  timestamp: number;
}

// ─── Aggregated dashboard summary ─────────────────────────────────────────────

export interface InfrastructureSummary {
  totalVMs: number;
  runningVMs: number;
  stoppedVMs: number;
  suspendedVMs: number;
  totalHosts: number;
  connectedHosts: number;
  disconnectedHosts: number;
  maintenanceHosts: number;
  totalClusters: number;
  drsEnabledClusters: number;
  haEnabledClusters: number;
  totalAllocatedVcpu: number;
  totalAllocatedMemoryGiB: number;
  avgVcpuPerVm: number;
  avgMemoryGiBPerVm: number;
  totalStorageCapacityTiB: number;
  totalStorageUsedTiB: number;
  totalStorageFreeTiB: number;
  storageUsagePercent: number;
  datastoresAbove85Pct: number;
  clusterCpuUsagePct: number;
  clusterMemUsagePct: number;
  healthyVMs: number;
  warningVMs: number;
  criticalVMs: number;
  vmsWithSnapshots: number;
  oldestSnapshotDays: number | null;
  criticalSnapshotCount: number;
  toolsRunning: number;
  toolsNotRunning: number;
  guestIpsAvailable: number;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType = "cpu" | "memory" | "disk" | "host" | "tools" | "snapshot" | "power";

export interface VmwareAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  entity: string;           // human-readable name
  entityId: string;         // MoRef / ID
  timestamp: number;        // unix ms
}
