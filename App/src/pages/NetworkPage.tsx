import { Laptop, Router, Server, Smartphone, Wifi } from "lucide-react";
import { PageHeader, StatGrid } from "@/components/cards/BaseCards";

type LiveDevice = {
  id: string;
  name: string;
  mac: string;
  ip: string;
  assignedUser: string;
  segment: string;
  status: "trusted" | "review" | "blocked";
  kind: "laptop" | "phone" | "server" | "router";
};

const liveDevices: LiveDevice[] = [
  {
    id: "nw-001",
    kind: "laptop",
    name: "OPS-WIN-09",
    mac: "00-1A-C2-7B-00-47",
    ip: "172.16.10.24",
    assignedUser: "Karim D.",
    segment: "Corp-LAN",
    status: "review",
  },
  {
    id: "nw-002",
    kind: "phone",
    name: "Nadia-Phone",
    mac: "00-1A-C2-7B-00-93",
    ip: "172.16.10.58",
    assignedUser: "Nadia K.",
    segment: "Corp-WiFi",
    status: "trusted",
  },
  {
    id: "nw-003",
    kind: "server",
    name: "DC-EDGE-02",
    mac: "00-1A-C2-7B-00-11",
    ip: "172.16.10.3",
    assignedUser: "Infrastructure",
    segment: "Server-VLAN",
    status: "trusted",
  },
  {
    id: "nw-004",
    kind: "laptop",
    name: "Unknown-Lenovo",
    mac: "00-1A-C2-7B-00-FF",
    ip: "172.16.10.77",
    assignedUser: "Unassigned",
    segment: "Corp-WiFi",
    status: "blocked",
  },
  {
    id: "nw-005",
    kind: "router",
    name: "Branch-AP-03",
    mac: "00-1A-C2-7B-00-A0",
    ip: "172.16.20.1",
    assignedUser: "Network Team",
    segment: "Branch-VLAN",
    status: "review",
  },
];

function DeviceIcon({ kind }: { kind: LiveDevice["kind"] }) {
  if (kind === "laptop") return <Laptop size={15} className="text-cyan-100" />;
  if (kind === "phone") return <Smartphone size={15} className="text-cyan-100" />;
  if (kind === "server") return <Server size={15} className="text-cyan-100" />;
  return <Router size={15} className="text-cyan-100" />;
}

export default function NetworkPage() {
  return (
    <div className="page-section">
      <PageHeader
        badge="Network"
        title="Network Device Console"
        description="Fing-style live network inventory of currently connected devices, with owner assignment and full CRUD-style management actions."
      />
      <StatGrid
        stats={[
          { label: "Connected Now", value: "38" },
          { label: "Trusted", value: "29", tone: "ok" },
          { label: "Needs Review", value: "6" },
          { label: "Blocked", value: "3", tone: "danger" },
          { label: "Unassigned Devices", value: "4", tone: "danger" },
          { label: "Guest Segment Devices", value: "5" },
        ]}
      />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="m-0 text-sm font-semibold text-white">Current Connected Devices</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/20"
          >
            <Wifi size={13} />
            Create Device Entry
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[var(--color-dim)]">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">MAC</th>
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">Assigned User</th>
                <th className="px-4 py-2 font-medium">Segment</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {liveDevices.map((device) => (
                <tr key={device.id} className="border-t border-white/8">
                  <td className="px-4 py-2">
                    <div className="inline-flex items-center gap-2 text-white">
                      <DeviceIcon kind={device.kind} />
                      <span className="capitalize">{device.kind}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-white">{device.name}</td>
                  <td className="px-4 py-2 text-[var(--color-dim)]">{device.mac}</td>
                  <td className="px-4 py-2 text-[var(--color-dim)]">{device.ip}</td>
                  <td className="px-4 py-2 text-[var(--color-dim)]">{device.assignedUser}</td>
                  <td className="px-4 py-2 text-[var(--color-dim)]">{device.segment}</td>
                  <td className="px-4 py-2">
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                        device.status === "trusted"
                          ? "bg-emerald-500/18 text-emerald-200"
                          : device.status === "review"
                            ? "bg-amber-500/18 text-amber-200"
                            : "bg-red-500/18 text-red-200",
                      ].join(" ")}
                    >
                      {device.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">Read</button>
                      <button type="button" className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">Update</button>
                      <button type="button" className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">Assign</button>
                      <button type="button" className="rounded-md border border-red-400/30 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
