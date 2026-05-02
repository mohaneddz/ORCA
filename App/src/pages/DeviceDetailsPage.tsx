import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { DataTable, PageHeader } from "@/components/cards/BaseCards";

export default function DeviceDetailsPage() {
  const { t } = useAppSettings();
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
        badge={t("devices.details.badge")}
        title={`${t("devices.details.title")}: ${details.id}`}
        description={t("devices.details.description")}
        actions={
          <button className="btn-ghost" type="button" onClick={() => navigate(ROUTES.devices)}>
            {t("devices.details.back")}
          </button>
        }
      />

      <section className="card p-5 grid gap-3 md:grid-cols-3">
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.hostname")}</p><p className="m-0 mt-1 text-white">{details.hostname}</p></div>
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.assigned")}</p><p className="m-0 mt-1 text-white">{details.assignedUser}</p></div>
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.os")}</p><p className="m-0 mt-1 text-white">{details.os}</p></div>
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.lastSeen")}</p><p className="m-0 mt-1 text-white">{details.lastSeen}</p></div>
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.risk")}</p><p className="m-0 mt-1 text-white">{details.riskScore}</p></div>
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.status")}</p><p className="m-0 mt-1 text-amber-300">Under Review</p></div>
      </section>

      <DataTable
        title={t("devices.details.table")}
        columns={[t("table.time"), t("table.type"), t("table.signal"), t("table.severity")]}
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
