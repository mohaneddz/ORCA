import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { DataTable, PageHeader } from "@/components/cards/BaseCards";

export default function DeviceDetailsPage() {
  const navigate = useNavigate();
  const { deviceId } = useParams();

  const details = useMemo(
    () => ({
      id: deviceId ?? "unknown",
      hostname: "TEMP-HOSTNAME",
      assignedUser: "Unassigned",
      os: "Windows 11",
      lastSeen: "2 minutes ago",
      riskScore: 68,
    }),
    [deviceId],
  );

  return (
    <div className="page-section">
      <PageHeader
        badge="Devices"
        title={`Device Details: ${details.id}`}
        description="Temporary drill-down page. This will be replaced with full live telemetry and action controls."
        actions={
          <button className="btn-ghost" type="button" onClick={() => navigate(ROUTES.devices)}>
            Back to Devices
          </button>
        }
      />

      <section className="card p-5 grid gap-3 md:grid-cols-3">
        <div><p className="m-0 text-xs text-slate-400">Hostname</p><p className="m-0 mt-1 text-white">{details.hostname}</p></div>
        <div><p className="m-0 text-xs text-slate-400">Assigned User</p><p className="m-0 mt-1 text-white">{details.assignedUser}</p></div>
        <div><p className="m-0 text-xs text-slate-400">Operating System</p><p className="m-0 mt-1 text-white">{details.os}</p></div>
        <div><p className="m-0 text-xs text-slate-400">Last Seen</p><p className="m-0 mt-1 text-white">{details.lastSeen}</p></div>
        <div><p className="m-0 text-xs text-slate-400">Risk Score</p><p className="m-0 mt-1 text-white">{details.riskScore}</p></div>
        <div><p className="m-0 text-xs text-slate-400">Status</p><p className="m-0 mt-1 text-amber-300">Under Review</p></div>
      </section>

      <DataTable
        title="Recent Device Events"
        columns={["Time", "Category", "Event", "Severity"]}
        rows={[
          ["09:47", "Endpoint", "Policy drift detected", "Medium"],
          ["09:31", "Process", "Unsigned binary launch", "High"],
          ["08:59", "Network", "Anomalous outbound query", "High"],
          ["08:12", "User", "Privilege escalation attempt", "Critical"],
        ]}
      />
    </div>
  );
}
