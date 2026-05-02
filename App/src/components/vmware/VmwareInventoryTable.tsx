import { useState, useMemo } from "react";
import type { VmSummary } from "@/lib/vmware/vmwareTypes";

interface VmwareInventoryTableProps {
  vms: VmSummary[];
  onSelectVm: (vmId: string) => void;
}

const POWER_OPTS = ["All", "POWERED_ON", "POWERED_OFF", "SUSPENDED"] as const;
const HEALTH_OPTS = ["All", "healthy", "warning", "critical"] as const;

function PowerBadge({ state }: { state: string }) {
  if (state === "POWERED_ON")  return <span className="status-ok">On</span>;
  if (state === "POWERED_OFF") return <span className="status-neutral">Off</span>;
  return <span className="status-warn">Suspended</span>;
}

function HealthBadge({ h }: { h: string }) {
  if (h === "critical") return <span className="status-danger">Critical</span>;
  if (h === "warning")  return <span className="status-warn">Warning</span>;
  return <span className="status-ok">Healthy</span>;
}

function UsagePct({ val, powered }: { val: number; powered: boolean }) {
  if (!powered) return <span style={{ color: "var(--color-neutral-500)" }}>—</span>;
  const color = val >= 90 ? "#fb7185" : val >= 75 ? "#fbbf24" : "#34d399";
  return <span className="font-mono font-semibold" style={{ color }}>{val}%</span>;
}

function ToolsBadge({ status }: { status: string }) {
  if (status === "RUNNING") return <span className="status-ok">Running</span>;
  if (status === "NOT_INSTALLED") return <span className="status-neutral">Not installed</span>;
  return <span className="status-neutral">—</span>;
}

export function VmwareInventoryTable({ vms, onSelectVm }: VmwareInventoryTableProps) {
  const [search, setSearch] = useState("");
  const [powerFilter, setPowerFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [hostFilter, setHostFilter] = useState("All");
  const [clusterFilter, setClusterFilter] = useState("All");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const hosts    = useMemo(() => ["All", ...Array.from(new Set(vms.map(v => v.hostName))).sort()], [vms]);
  const clusters = useMemo(() => ["All", ...Array.from(new Set(vms.map(v => v.clusterName))).sort()], [vms]);

  const filtered = useMemo(() => {
    let result = vms;
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(s) ||
        v.vm.toLowerCase().includes(s) ||
        v.guestOS.toLowerCase().includes(s) ||
        (v.ipAddress ?? "").includes(s)
      );
    }
    if (powerFilter   !== "All") result = result.filter(v => v.power_state === powerFilter);
    if (healthFilter  !== "All") result = result.filter(v => v.health === healthFilter);
    if (hostFilter    !== "All") result = result.filter(v => v.hostName === hostFilter);
    if (clusterFilter !== "All") result = result.filter(v => v.clusterName === clusterFilter);
    return result;
  }, [vms, search, powerFilter, healthFilter, hostFilter, clusterFilter]);

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    const getKey = (v: VmSummary): string | number => {
      const keys: Array<(vm: VmSummary) => string | number> = [
        v => v.vm, v => v.name, v => v.power_state, v => v.hostName, v => v.clusterName,
        v => v.cpu, v => v.memoryMiB / 1024, v => v.cpuUsage, v => v.memoryUsage,
        v => v.diskCapacityGB, v => v.datastoreName, v => v.guestOS,
        v => v.ipAddress ?? "", v => v.vmwareTools, v => v.snapshotCount,
        v => v.uptimeDays ?? 0,
      ];
      return keys[sortCol]?.(v) ?? "";
    };
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getKey(a); const bv = getKey(b);
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  function toggleSort(col: number) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const columns = ["VM ID","Name","Power","Host","Cluster","vCPU","RAM (GiB)","CPU %","Mem %","Disk (GB)","Datastore","Guest OS","IP Address","Tools","Snaps","Uptime"];

  return (
    <div className="card overflow-hidden flex flex-col">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <p className="m-0 text-sm font-semibold text-black dark:text-white">
          VM Inventory
          <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-neutral-500)" }}>
            {sorted.length} of {vms.length}
          </span>
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search VMs, OS, IP…"
          className="table-input w-full max-w-xs"
        />
        <select value={powerFilter} onChange={e => setPowerFilter(e.target.value)} className="table-input" aria-label="Power state filter">
          {POWER_OPTS.map(o => <option key={o} value={o}>{o === "All" ? "All Power States" : o.replace("_", " ").replace("POWERED ", "")}</option>)}
        </select>
        <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="table-input" aria-label="Health filter">
          {HEALTH_OPTS.map(o => <option key={o} value={o}>{o === "All" ? "All Health" : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
        <select value={hostFilter} onChange={e => setHostFilter(e.target.value)} className="table-input" aria-label="Host filter">
          {hosts.map(o => <option key={o} value={o}>{o === "All" ? "All Hosts" : o.replace(".corp.local", "")}</option>)}
        </select>
        <select value={clusterFilter} onChange={e => setClusterFilter(e.target.value)} className="table-input" aria-label="Cluster filter">
          {clusters.map(o => <option key={o} value={o}>{o === "All" ? "All Clusters" : o}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table" style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col}
                  onClick={() => toggleSort(i)}
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  {col}
                  {sortCol === i ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(vm => {
              const powered = vm.power_state === "POWERED_ON";
              return (
                <tr
                  key={vm.vm}
                  onClick={() => onSelectVm(vm.vm)}
                  className="cursor-pointer"
                >
                  <td className="font-mono text-xs" style={{ color: "var(--color-neutral-400)" }}>{vm.vm}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <HealthBadge h={vm.health} />
                      <span style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{vm.name}</span>
                    </div>
                  </td>
                  <td><PowerBadge state={vm.power_state} /></td>
                  <td className="text-xs" style={{ color: "var(--color-neutral-400)" }}>{vm.hostName.replace(".corp.local","")}</td>
                  <td className="text-xs">{vm.clusterName}</td>
                  <td className="tabular-nums">{vm.cpu}</td>
                  <td className="tabular-nums">{(vm.memoryMiB / 1024).toFixed(0)}</td>
                  <td><UsagePct val={vm.cpuUsage} powered={powered} /></td>
                  <td><UsagePct val={vm.memoryUsage} powered={powered} /></td>
                  <td className="tabular-nums">{vm.diskCapacityGB}</td>
                  <td className="text-xs">{vm.datastoreName}</td>
                  <td className="text-xs max-w-[120px] truncate">{vm.guestOS}</td>
                  <td className="font-mono text-xs">{vm.ipAddress ?? "—"}</td>
                  <td><ToolsBadge status={vm.vmwareTools} /></td>
                  <td>
                    {vm.snapshotCount > 0 ? (
                      <span
                        className={vm.oldestSnapshotDays !== null && vm.oldestSnapshotDays > 30 ? "status-danger" : "status-warn"}
                      >
                        {vm.snapshotCount}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-neutral-500)" }}>—</span>
                    )}
                  </td>
                  <td>
                    {vm.uptimeDays !== null
                      ? <span className="tabular-nums">{vm.uptimeDays}d</span>
                      : <span style={{ color: "var(--color-neutral-500)" }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--color-neutral-400)" }}>
                  No matching VMs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
