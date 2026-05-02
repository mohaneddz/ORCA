import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { VmSummary } from "@/lib/vmware/vmwareTypes";

interface VmwareInventoryTableProps {
  vms: VmSummary[];
  onSelectVm: (vmId: string) => void;
}

const POWER_OPTS = ["All", "POWERED_ON", "POWERED_OFF", "SUSPENDED"] as const;
const HEALTH_OPTS = ["All", "healthy", "warning", "critical"] as const;
const PAGE_SIZE = 10;

function PowerBadge({ state }: { state: string }) {
  if (state === "POWERED_ON")  return <span className="status-ok">On</span>;
  if (state === "POWERED_OFF") return <span className="status-neutral">Off</span>;
  return <span className="status-warn">Suspended</span>;
}

function HealthDot({ h }: { h: string }) {
  const color = h === "critical" ? "#fb7185" : h === "warning" ? "#fbbf24" : "#34d399";
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
}

function UsagePct({ val, powered }: { val: number; powered: boolean }) {
  if (!powered) return <span style={{ color: "var(--color-neutral-500)" }}>—</span>;
  const color = val >= 90 ? "#fb7185" : val >= 75 ? "#fbbf24" : "#34d399";
  return (
    <span className="font-mono font-semibold tabular-nums" style={{ color }}>
      {val}%
    </span>
  );
}

export function VmwareInventoryTable({ vms, onSelectVm }: VmwareInventoryTableProps) {
  const [search, setSearch]         = useState("");
  const [powerFilter, setPowerFilter]   = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [hostFilter, setHostFilter]     = useState("All");
  const [clusterFilter, setClusterFilter] = useState("All");
  const [sortCol, setSortCol]       = useState<number | null>(null);
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [page, setPage]             = useState(1);

  const hosts    = useMemo(() => ["All", ...Array.from(new Set(vms.map(v => v.hostName.replace(".corp.local", "")))).sort()], [vms]);
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
    if (hostFilter    !== "All") result = result.filter(v => v.hostName.replace(".corp.local", "") === hostFilter);
    if (clusterFilter !== "All") result = result.filter(v => v.clusterName === clusterFilter);
    return result;
  }, [vms, search, powerFilter, healthFilter, hostFilter, clusterFilter]);

  // Reset to page 1 when filters change
  const filteredKey = `${search}|${powerFilter}|${healthFilter}|${hostFilter}|${clusterFilter}`;
  useMemo(() => setPage(1), [filteredKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    const getKey = (v: VmSummary): string | number => {
      const keys: Array<(vm: VmSummary) => string | number> = [
        v => v.name,
        v => v.power_state,
        v => v.hostName,
        v => v.clusterName,
        v => v.cpu,
        v => v.memoryMiB / 1024,
        v => v.cpuUsage,
        v => v.memoryUsage,
        v => v.ipAddress ?? "",
        v => v.guestOS,
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(col: number) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  // Simplified columns — full details available in the drawer
  const columns = ["Name", "Power", "Host", "Cluster", "vCPU", "RAM", "CPU %", "Mem %", "IP", "OS"];

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 gap-3 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <p className="m-0 text-sm font-semibold text-white">
          VM Inventory
          <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-neutral-500)" }}>
            {sorted.length} of {vms.length}
          </span>
        </p>
        <p className="m-0 text-xs" style={{ color: "var(--color-neutral-500)" }}>
          Click any row for full details
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
          onChange={e => { setSearch(e.target.value); }}
          placeholder="Search name, OS, IP…"
          className="table-input w-full max-w-[200px]"
        />
        <select value={powerFilter} onChange={e => { setPowerFilter(e.target.value); }} className="table-input" aria-label="Power">
          {POWER_OPTS.map(o => <option key={o} value={o}>{o === "All" ? "All States" : o.replace("POWERED_", "").charAt(0) + o.replace("POWERED_", "").slice(1).toLowerCase()}</option>)}
        </select>
        <select value={healthFilter} onChange={e => { setHealthFilter(e.target.value); }} className="table-input" aria-label="Health">
          {HEALTH_OPTS.map(o => <option key={o} value={o}>{o === "All" ? "All Health" : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
        <select value={hostFilter} onChange={e => { setHostFilter(e.target.value); }} className="table-input" aria-label="Host">
          {hosts.map(o => <option key={o} value={o}>{o === "All" ? "All Hosts" : o}</option>)}
        </select>
        <select value={clusterFilter} onChange={e => { setClusterFilter(e.target.value); }} className="table-input" aria-label="Cluster">
          {clusters.map(o => <option key={o} value={o}>{o === "All" ? "All Clusters" : o}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col}
                  onClick={() => toggleSort(i)}
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  {col}{sortCol === i ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageSlice.map(vm => {
              const powered = vm.power_state === "POWERED_ON";
              return (
                <tr key={vm.vm} onClick={() => onSelectVm(vm.vm)} className="cursor-pointer">
                  <td>
                    <div className="flex items-center gap-2">
                      <HealthDot h={vm.health} />
                      <span style={{ color: "var(--color-neutral-200)", fontWeight: 500 }}>{vm.name}</span>
                    </div>
                  </td>
                  <td><PowerBadge state={vm.power_state} /></td>
                  <td className="text-xs" style={{ color: "var(--color-neutral-400)" }}>{vm.hostName.replace(".corp.local", "")}</td>
                  <td className="text-xs">{vm.clusterName}</td>
                  <td className="tabular-nums">{vm.cpu}</td>
                  <td className="tabular-nums">{(vm.memoryMiB / 1024).toFixed(0)} GiB</td>
                  <td><UsagePct val={vm.cpuUsage} powered={powered} /></td>
                  <td><UsagePct val={vm.memoryUsage} powered={powered} /></td>
                  <td className="font-mono text-xs">{vm.ipAddress ?? "—"}</td>
                  <td className="text-xs max-w-[120px] truncate" title={vm.guestOS}>{vm.guestOS}</td>
                </tr>
              );
            })}
            {pageSlice.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--color-neutral-400)", padding: "1.5rem" }}>
                  No matching VMs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-5 py-3 gap-4"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <span className="text-xs" style={{ color: "var(--color-neutral-500)" }}>
          {sorted.length === 0 ? "0 VMs" : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-ghost px-2 py-1"
            disabled={safePage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
            .reduce<(number | "…")[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs" style={{ color: "var(--color-neutral-500)" }}>…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p as number)}
                  className="btn-ghost px-2.5 py-1 text-xs tabular-nums"
                  style={safePage === p ? {
                    background: "rgba(0,198,193,0.15)",
                    borderColor: "rgba(0,198,193,0.35)",
                    color: "var(--color-primary-soft)",
                    fontWeight: 700,
                  } : {}}
                >
                  {p}
                </button>
              )
            )}
          <button
            type="button"
            className="btn-ghost px-2 py-1"
            disabled={safePage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
