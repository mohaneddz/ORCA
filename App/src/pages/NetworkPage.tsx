import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { Laptop, Router, Server, Smartphone, Wifi } from "lucide-react";
import { PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { DUMMY_DATA } from "@/config/runtime";

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

const mockDevices: LiveDevice[] = [
  { id: "nw-001", kind: "laptop", name: "OPS-WIN-09", mac: "00-1A-C2-7B-00-47", ip: "172.16.10.24", assignedUser: "Karim D.", segment: "Corp-LAN", status: "review" },
  { id: "nw-002", kind: "phone", name: "Nadia-Phone", mac: "00-1A-C2-7B-00-93", ip: "172.16.10.58", assignedUser: "Nadia K.", segment: "Corp-WiFi", status: "trusted" },
  { id: "nw-003", kind: "server", name: "DC-EDGE-02", mac: "00-1A-C2-7B-00-11", ip: "172.16.10.3", assignedUser: "Infrastructure", segment: "Server-VLAN", status: "trusted" },
  { id: "nw-004", kind: "laptop", name: "Unknown-Lenovo", mac: "00-1A-C2-7B-00-FF", ip: "172.16.10.77", assignedUser: "Unassigned", segment: "Corp-WiFi", status: "blocked" },
  { id: "nw-005", kind: "router", name: "Branch-AP-03", mac: "00-1A-C2-7B-00-A0", ip: "172.16.20.1", assignedUser: "Network Team", segment: "Branch-VLAN", status: "review" },
];

function DeviceIcon({ kind }: { kind: LiveDevice["kind"] }) {
  if (kind === "laptop") return <Laptop size={15} style={{ color: "#a855f7" }} />;
  if (kind === "phone") return <Smartphone size={15} style={{ color: "#22d3ee" }} />;
  if (kind === "server") return <Server size={15} style={{ color: "#3b82f6" }} />;
  return <Router size={15} style={{ color: "#c084fc" }} />;
}

function inferKind(raw: string): LiveDevice["kind"] {
  const value = raw.toLowerCase();
  if (value.includes("phone")) return "phone";
  if (value.includes("server") || value.includes("database")) return "server";
  if (value.includes("router") || value.includes("infra")) return "router";
  return "laptop";
}

export default function NetworkPage() {
  const { data: devices = mockDevices } = useQuery({
    queryKey: ["network-devices", DUMMY_DATA ? "dummy" : "real"],
    queryFn: async (): Promise<LiveDevice[]> => {
      if (DUMMY_DATA) {
        return mockDevices;
      }
      if (!isTauri()) {
        throw new Error("Real data mode requires Tauri runtime.");
      }

      const rows = await invoke<Array<Record<string, unknown>>>("discover_devices");
      return rows.map((row, index) => {
        const riskFlags = (row.riskFlags as string[] | undefined) ?? [];
        const status: LiveDevice["status"] = riskFlags.length > 1 ? "blocked" : riskFlags.length === 1 ? "review" : "trusted";
        return {
          id: `nw-real-${index}`,
          kind: inferKind(String(row.deviceType ?? "")),
          name: String(row.hostname ?? row.ip ?? `Device-${index + 1}`),
          mac: String(row.mac ?? "unknown"),
          ip: String(row.ip ?? ""),
          assignedUser: "Unassigned",
          segment: String(row.vlan ?? row.connection ?? "Unknown"),
          status,
        };
      });
    },
  });

  const stats = useMemo(() => {
    const total = devices.length;
    const trusted = devices.filter((d) => d.status === "trusted").length;
    const review = devices.filter((d) => d.status === "review").length;
    const blocked = devices.filter((d) => d.status === "blocked").length;
    const unassigned = devices.filter((d) => d.assignedUser === "Unassigned").length;
    const guest = devices.filter((d) => d.segment.toLowerCase().includes("guest")).length;

    return [
      { label: "Connected Now", value: String(total), trend: 0 },
      { label: "Trusted", value: String(trusted), tone: "ok" as const, trend: 0 },
      { label: "Needs Review", value: String(review), trend: 0 },
      { label: "Blocked", value: String(blocked), tone: "danger" as const, trend: 0 },
      { label: "Unassigned Devices", value: String(unassigned), tone: "danger" as const, trend: 0 },
      { label: "Guest Segment Devices", value: String(guest), trend: 0 },
    ];
  }, [devices]);

  return (
    <div className="page-section">
      <PageHeader
        badge="Network"
        title="Network Device Console"
        description="Fing-style live network inventory of currently connected devices, with owner assignment and full CRUD-style management actions."
      />
      <StatGrid stats={stats} />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="m-0 text-sm font-semibold text-white">Current Connected Devices</p>
          <button type="button" className="btn-primary text-xs">
            <Wifi size={13} />
            Create Device Entry
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>MAC</th>
                <th>IP</th>
                <th>Assigned User</th>
                <th>Segment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td><div className="inline-flex items-center gap-2 text-white"><DeviceIcon kind={device.kind} /><span className="capitalize">{device.kind}</span></div></td>
                  <td>{device.name}</td>
                  <td>{device.mac}</td>
                  <td>{device.ip}</td>
                  <td>{device.assignedUser}</td>
                  <td>{device.segment}</td>
                  <td>
                    <span className={device.status === "trusted" ? "status-ok" : device.status === "review" ? "status-warn" : "status-danger"}>
                      {device.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>Read</button>
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>Update</button>
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>Assign</button>
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderColor: "rgba(244,63,94,0.3)", color: "#fb7185" }}>Delete</button>
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
