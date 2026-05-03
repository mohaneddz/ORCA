import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { DataTable, PageHeader } from "@/components/cards/BaseCards";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";
import PageSkeleton from "@/components/ui/PageSkeleton";

type DeviceExportRow = {
  snapshot_id: string;
  employee_id: string;
  employee_name: string;
  hostname: string;
  os_name: string;
  risk_score: number | null;
  collected_at: string;
};

export default function DeviceDetailsPage() {
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const { deviceId } = useParams();

  const { data: devicesList, isLoading: isDevicesLoading } = useQuery({
    queryKey: ["devices-list"],
    queryFn: () => fetchApi<any>("/api/dw/export/devices/?format=json"),
  });

  const matchedDevice = useMemo(() => {
    const list = (devicesList?.data || []) as DeviceExportRow[];
    if (!deviceId) return null;
    return list.find((d) => d.hostname === deviceId || d.snapshot_id === deviceId) || null;
  }, [deviceId, devicesList]);

  const snapshotId = matchedDevice?.snapshot_id || deviceId;
  const { data: snapshotDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["device-detail", snapshotId],
    enabled: Boolean(snapshotId),
    queryFn: () => fetchApi<any>(`/api/dw/device/${snapshotId}/detail/`),
  });

  if (isDevicesLoading || isDetailLoading) {
    return <PageSkeleton />;
  }

  const detail = snapshotDetail || {};
  const raw = detail.raw || {};
  const triState = (value: unknown) => (value === true ? "Yes" : value === false ? "No" : "Unknown");
  const processes = Array.isArray(raw.processes)
    ? raw.processes
    : Array.isArray(raw.processes?.items)
      ? raw.processes.items
      : [];
  const software = raw.software?.installed || raw.software?.software || raw.software?.items || [];
  const ports = raw.localPorts?.ports || raw.network?.listeningPorts || raw.ports?.open || [];
  const wifiProfiles = raw.wifi?.profiles || raw.network?.wifiProfiles || [];
  const lanDevices = raw.lan?.devices || raw.network?.lanPeers || [];
  const localUsers = raw.user?.localUsers || raw.users?.local || [];
  const legacyAntivirus = Array.isArray(raw.security?.antivirus) ? raw.security.antivirus : [];
  const modernAntivirus = raw.antivirus
    ? [
        {
          name: raw.antivirus.productName,
          enabled: raw.antivirus.enabledStatus,
          upToDate: raw.antivirus.signatureUpToDate,
        },
      ]
    : [];
  const antivirus = modernAntivirus.length > 0 ? modernAntivirus : legacyAntivirus;
  const riskSignals: string[] = detail.risk_signals || [];

  const identityRows = [
    ["Employee", detail.employee?.name || matchedDevice?.employee_name || "Unassigned"],
    ["Email", detail.employee?.email || "N/A"],
    ["Department", detail.employee?.department || "N/A"],
    ["Role", detail.employee?.role || "N/A"],
    ["Machine UUID", detail.machine_uuid || "N/A"],
    ["Primary MAC", detail.primary_mac || "N/A"],
  ];

  const postureRows = [
    ["Hostname", detail.hostname || matchedDevice?.hostname || "Unknown"],
    ["OS", `${detail.os_name || matchedDevice?.os_name || "Unknown"} ${detail.os_version || ""}`.trim()],
    ["Kernel/Build", detail.os_build || raw.device?.kernelVersion || "N/A"],
    ["CPU", detail.cpu_model || raw.hardware?.cpuModel || raw.device?.architecture || "N/A"],
    ["RAM (MB)", String(detail.ram_total_mb ?? raw.device?.hardware?.totalMemoryMb ?? "N/A")],
    ["Disk Total (GB)", String(detail.disk_total_gb ?? raw.hardware?.diskTotalGb ?? "N/A")],
    ["Disk Free (GB)", String(detail.disk_free_gb ?? raw.hardware?.diskFreeGb ?? "N/A")],
    ["Collected At", detail.collected_at ? new Date(detail.collected_at).toLocaleString() : "N/A"],
    ["Received At", detail.received_at ? new Date(detail.received_at).toLocaleString() : "N/A"],
  ];

  const securityRows = [
    ["Risk Score", String(detail.risk_score ?? "N/A")],
    ["Risk Level", detail.risk_level || "N/A"],
    ["Patch Current", String(detail.patch_is_current ?? "N/A")],
    ["Days Since Update", String(detail.patch_days_since_update ?? "N/A")],
    ["Antivirus Detected", triState(detail.antivirus_detected)],
    ["Antivirus Name", detail.antivirus_name || "N/A"],
    ["Antivirus Enabled", triState(detail.antivirus_enabled)],
    ["Antivirus Up To Date", triState(detail.antivirus_up_to_date)],
    ["Disk Encrypted", triState(detail.disk_encrypted)],
    ["USB Enabled", triState(detail.usb_enabled)],
    ["LAN Device Count", String(detail.lan_device_count ?? 0)],
    ["Local Port Count", String(detail.local_port_count ?? 0)],
    ["Open WiFi Profiles", String(detail.wifi_open_network_count ?? 0)],
  ];

  const riskRows =
    riskSignals.length > 0
      ? riskSignals.map((signal: string, index: number) => [String(index + 1), signal])
      : [["-", "No risk signals recorded"]];

  const processRows =
    processes.length > 0
      ? processes.slice(0, 120).map((p: any) => [
          String(p.pid ?? "-"),
          p.name || p.processName || "-",
          p.executablePath || p.path || "-",
          String(p.memoryBytes ?? p.memory?.bytes ?? "-"),
          p.commandLine || p.cmdline || "-",
        ])
      : [["-", "-", "-", "-", "No process data"]];

  const softwareRows =
    software.length > 0
      ? software.slice(0, 160).map((s: any) => [
          s.name || "-",
          s.version || "-",
          s.vendor || "-",
          s.installLocation || "-",
          s.source || "-",
        ])
      : [["-", "-", "-", "-", "No software data"]];

  const portRows =
    ports.length > 0
      ? ports.slice(0, 120).map((p: any) => [
          String(p.port ?? "-"),
          p.protocol || p.proto || "-",
          String(p.owningProcess ?? p.pid ?? p.processId ?? "-"),
          p.riskLevel || p.risk || "-",
        ])
      : [["-", "-", "-", "No local port data"]];

  const lanRows =
    lanDevices.length > 0
      ? lanDevices.map((d: any) => [d.ip || d.ipAddress || "-", d.mac || d.macAddress || "-", d.vendor || "-", d.deviceType || d.type || "-"])
      : [["-", "-", "-", "No LAN peer data"]];

  const wifiRows =
    wifiProfiles.length > 0
      ? wifiProfiles.slice(0, 120).map((w: any) => [
          w.ssid || "-",
          w.securityType || w.security || "-",
          String(Boolean(w.isOpenNetwork ?? w.open)),
          w.lastConnected || w.lastSeen || "-",
        ])
      : [["-", "-", "-", "No WiFi profile data"]];

  const userRows =
    localUsers.length > 0
      ? localUsers.map((u: any) => [u.username || u.name || "-", String(Boolean(u.isAdmin ?? u.admin))])
      : [[raw.user?.username || raw.username || "N/A", String(Boolean(raw.user?.isAdminEstimate ?? raw.user?.isAdmin ?? raw.isAdmin))]];

  const avRows =
    antivirus.length > 0
      ? antivirus.map((a: any) => [a.name || "-", triState(a.enabled), triState(a.upToDate)])
      : [[detail.antivirus_name || "N/A", triState(detail.antivirus_enabled), triState(detail.antivirus_up_to_date)]];

  return (
    <div className="page-section">
      <PageHeader
        badge={t("devices.details.badge")}
        title={`${t("devices.details.title")}: ${detail.snapshot_id || deviceId}`}
        description={t("devices.details.description")}
        actions={
          <button className="btn-ghost" type="button" onClick={() => navigate(ROUTES.devices)}>
            {t("devices.details.back")}
          </button>
        }
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable title="Identity & Ownership" columns={["Field", "Value"]} rows={identityRows} minWidth={420} />
        <DataTable title="Host Posture Snapshot" columns={["Field", "Value"]} rows={postureRows} minWidth={420} />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable title="Security Controls" columns={["Control", "Value"]} rows={securityRows} minWidth={420} />
        <DataTable title="Risk Signals" columns={["#", "Signal"]} rows={riskRows} minWidth={420} />
      </section>

      <DataTable
        title="Running Processes (Top 120)"
        columns={["PID", "Name", "Executable", "Memory Bytes", "Command Line"]}
        rows={processRows}
        minWidth={1200}
        maxBodyHeight={360}
      />

      <DataTable
        title="Installed Software (Top 160)"
        columns={["Name", "Version", "Vendor", "Install Location", "Source"]}
        rows={softwareRows}
        minWidth={1100}
        maxBodyHeight={360}
      />

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable title="Local Open Ports" columns={["Port", "Protocol", "Owning Process", "Risk"]} rows={portRows} minWidth={520} maxBodyHeight={300} />
        <DataTable title="LAN Peers" columns={["IP", "MAC", "Vendor", "Type"]} rows={lanRows} minWidth={520} maxBodyHeight={300} />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <DataTable title="WiFi Profiles" columns={["SSID", "Security", "Open Network", "Last Connected"]} rows={wifiRows} minWidth={620} maxBodyHeight={300} />
        <div className="grid gap-3">
          <DataTable title="Local Users" columns={["Username", "Is Admin"]} rows={userRows} minWidth={420} maxBodyHeight={220} />
          <DataTable title="Antivirus Records" columns={["Name", "Enabled", "Up To Date"]} rows={avRows} minWidth={420} maxBodyHeight={220} />
        </div>
      </section>
    </div>
  );
}
