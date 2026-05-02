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
  if (kind === "laptop") return <Laptop size={15} style={{ color: "#a855f7" }} />;
  if (kind === "phone")  return <Smartphone size={15} style={{ color: "#22d3ee" }} />;
  if (kind === "server") return <Server size={15} style={{ color: "#3b82f6" }} />;
  return <Router size={15} style={{ color: "#c084fc" }} />;
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
          { label: "Connected Now",         value: "38", trend: 5.2 },
          { label: "Trusted",               value: "29", tone: "ok",     trend: 3.4 },
          { label: "Needs Review",          value: "6",  trend: -10.0 },
          { label: "Blocked",               value: "3",  tone: "danger", trend: 50.0 },
          { label: "Unassigned Devices",    value: "4",  tone: "danger", trend: 33.3 },
          { label: "Guest Segment Devices", value: "5",  trend: 0 },
        ]}
      />

      <section className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
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
              {liveDevices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <div className="inline-flex items-center gap-2 text-white">
                      <DeviceIcon kind={device.kind} />
                      <span className="capitalize">{device.kind}</span>
                    </div>
                  </td>
                  <td>{device.name}</td>
                  <td>{device.mac}</td>
                  <td>{device.ip}</td>
                  <td>{device.assignedUser}</td>
                  <td>{device.segment}</td>
                  <td>
                    <span
                      className={
                        device.status === "trusted"
                          ? "status-ok"
                          : device.status === "review"
                          ? "status-warn"
                          : "status-danger"
                      }
                    >
                      {device.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>Read</button>
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>Update</button>
                      <button type="button" className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>Assign</button>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderColor: "rgba(244,63,94,0.3)", color: "#fb7185" }}
                      >
                        Delete
                      </button>
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
