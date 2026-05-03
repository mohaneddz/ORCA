import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

export default function DeviceDetailsPage() {
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const { deviceId } = useParams();

  const { data: devicesList, isLoading: isDevicesLoading } = useQuery({
    queryKey: ["devices-list"],
    queryFn: () => fetchApi<any[]>("/api/dw/export/devices/?format=json"),
  });

  const { data: anomaliesData, isLoading: isAnomaliesLoading } = useQuery({
    queryKey: ["devices-anomalies"],
    queryFn: () => fetchApi<any>("/api/dw/ml/anomalies/"),
  });

  const details = useMemo(() => {
    const defaultData = {
      id: deviceId ?? "unknown",
      hostname: "Unknown Device",
      assignedUser: "Unassigned",
      os: "Unknown",
      lastSeen: "N/A",
      riskScore: 0,
      status: "N/A"
    };
    if (!devicesList || !deviceId) return defaultData;
    const device = (devicesList?.data || []).find((d: any) => d.hostname === deviceId || d.snapshot_id === deviceId);
    if (!device) return defaultData;

    return {
      id: device.snapshot_id,
      hostname: device.hostname || device.snapshot_id,
      assignedUser: device.employee_name || device.employee_id || "Unassigned",
      os: device.os_name || "Unknown",
      lastSeen: device.collected_at ? new Date(device.collected_at).toLocaleString() : "N/A",
      riskScore: device.risk_score || 0,
      status: (device.risk_score ?? 0) > 70 ? "At Risk" : "Healthy"
    };
  }, [deviceId, devicesList]);

  if (isDevicesLoading || isAnomaliesLoading) {
    return <PageSkeleton />;
  }

  const deviceAnomalies = (anomaliesData?.anomalies || []).filter((a: any) => a.device_id === deviceId || a.hostname === deviceId);
  const anomalyRows = deviceAnomalies.length > 0 
    ? deviceAnomalies.map((a: any) => [
        new Date(a.detected_at).toLocaleTimeString() || "N/A",
        "ML Anomaly",
        (a.factors || []).join(", ") || "Unknown",
        a.risk_score > 80 ? "Critical" : a.risk_score > 50 ? "High" : "Medium"
      ])
    : [["No anomalies detected", "-", "-", "-"]];

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
        <div><p className="m-0 text-xs text-slate-400">{t("devices.details.status")}</p><p className="m-0 mt-1 text-amber-300">{details.status}</p></div>
      </section>

      <DataTable
        title={t("devices.details.table")}
        columns={[t("table.time"), t("table.type"), t("table.signal"), t("table.severity")]}
        rows={anomalyRows}
      />
    </div>
  );
}
