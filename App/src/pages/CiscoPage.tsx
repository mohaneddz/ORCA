import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  Globe,
  Lock,
  Network,
  Plus,
  RefreshCw,
  Router,
  Server,
  Shield,
  ShieldAlert,
  Wifi,
  Zap,
} from "lucide-react";
import { PageHeader, StatGrid } from "@/components/cards/BaseCards";
import { DualAreaChart, GroupedBarChart } from "@/components/ui/TrendChart";

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_DEVICES = [
  {
    id: "dev-001",
    name: "CORE-RTR-01",
    ip_address: "192.168.1.1",
    device_type: "router",
    model: "Cisco ISR 4451",
    ios_version: "17.6.4",
    location: "Server Room A",
    status: "up",
    last_polled: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unresolved_alerts: 2,
    latest_risk_score: 72,
    latest_risk_level: "medium",
    latest_cpu: 34.2,
    latest_uptime_hours: 1842,
  },
  {
    id: "dev-002",
    name: "DIST-SW-01",
    ip_address: "192.168.1.2",
    device_type: "switch",
    model: "Cisco Catalyst 9300",
    ios_version: "17.3.6",
    location: "Server Room A",
    status: "degraded",
    last_polled: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    unresolved_alerts: 5,
    latest_risk_score: 41,
    latest_risk_level: "high",
    latest_cpu: 87.1,
    latest_uptime_hours: 432,
  },
  {
    id: "dev-003",
    name: "EDGE-FW-01",
    ip_address: "192.168.1.254",
    device_type: "firewall",
    model: "Cisco ASA 5525-X",
    ios_version: "9.18.3",
    location: "DMZ",
    status: "up",
    last_polled: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    unresolved_alerts: 0,
    latest_risk_score: 88,
    latest_risk_level: "low",
    latest_cpu: 12.4,
    latest_uptime_hours: 3210,
  },
  {
    id: "dev-004",
    name: "ACCESS-SW-03",
    ip_address: "192.168.2.3",
    device_type: "switch",
    model: "Cisco Catalyst 2960-X",
    ios_version: "15.2.7E8",
    location: "Floor 2",
    status: "down",
    last_polled: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unresolved_alerts: 8,
    latest_risk_score: 18,
    latest_risk_level: "critical",
    latest_cpu: null,
    latest_uptime_hours: null,
  },
  {
    id: "dev-005",
    name: "BRANCH-RTR-02",
    ip_address: "10.10.1.1",
    device_type: "router",
    model: "Cisco ISR 1100",
    ios_version: "17.9.3",
    location: "Branch Office",
    status: "up",
    last_polled: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    unresolved_alerts: 1,
    latest_risk_score: 91,
    latest_risk_level: "low",
    latest_cpu: 8.7,
    latest_uptime_hours: 892,
  },
];

const MOCK_ALERTS = [
  {
    id: "al-001",
    device__name: "DIST-SW-01",
    device__ip_address: "192.168.1.2",
    alert_type: "high_cpu",
    severity: "critical",
    title: "CRITICAL: CPU at 87.1% (1-min avg) — device may be overloaded",
    description: "CPU has been above 80% for 12 consecutive minutes. Process thrashing suspected.",
    recommendation: "Run 'show processes cpu sorted' and investigate top consumers. Consider redistributing routing load.",
    ai_generated: false,
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: "al-002",
    device__name: "ACCESS-SW-03",
    device__ip_address: "192.168.2.3",
    alert_type: "interface_down",
    severity: "critical",
    title: "CRITICAL: 6/8 interfaces down (75%) — major connectivity loss",
    description: "Most interfaces are reporting oper-down status. Possible power or uplink failure.",
    recommendation: "Check physical connections and power. Run 'show interface status' remotely if reachable.",
    ai_generated: false,
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: "al-003",
    device__name: "CORE-RTR-01",
    device__ip_address: "192.168.1.1",
    alert_type: "security_vuln",
    severity: "critical",
    title: "Critical CVE: CVE-2023-20198 — Cisco IOS XE Web UI Privilege Escalation",
    description: "IOS version 17.6.4 is affected by CVE-2023-20198 (CVSS 10.0). Unauthenticated RCE possible.",
    recommendation: "Upgrade IOS to 17.9.4a immediately or disable HTTP server: 'no ip http server'.",
    ai_generated: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "al-004",
    device__name: "DIST-SW-01",
    device__ip_address: "192.168.1.2",
    alert_type: "ai_prediction",
    severity: "high",
    title: "AI Failure Prediction: 2 failure indicator(s) detected",
    description: "CPU climbing +40% over last 24h. High memory usage trending upward.",
    recommendation: "Proactive intervention recommended within 2 hours.",
    ai_generated: true,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "al-005",
    device__name: "ACCESS-SW-03",
    device__ip_address: "192.168.2.3",
    alert_type: "auth_failure",
    severity: "high",
    title: "Authentication failures: 12 — possible brute-force attempt",
    description: "12 failed SSH login attempts from 203.0.113.45 in the last 5 minutes.",
    recommendation: "Enable login block-for 60 attempts 3 within 30. Block source IP at perimeter.",
    ai_generated: false,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "al-006",
    device__name: "CORE-RTR-01",
    device__ip_address: "192.168.1.1",
    alert_type: "config_change",
    severity: "medium",
    title: "Configuration changed on CORE-RTR-01",
    description: "Running config diff: +3 lines added, -1 line removed. ACL 120 modified.",
    recommendation: "Verify change was authorized and matches change management records.",
    ai_generated: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

const MOCK_TREND = [
  { name: "Mon", primary: 42, secondary: 28 },
  { name: "Tue", primary: 55, secondary: 34 },
  { name: "Wed", primary: 38, secondary: 40 },
  { name: "Thu", primary: 71, secondary: 22 },
  { name: "Fri", primary: 64, secondary: 48 },
  { name: "Sat", primary: 29, secondary: 55 },
  { name: "Sun", primary: 45, secondary: 60 },
];

const MOCK_VULN_TREND = [
  { name: "Mon", primary: 3, secondary: 1 },
  { name: "Tue", primary: 3, secondary: 2 },
  { name: "Wed", primary: 5, secondary: 2 },
  { name: "Thu", primary: 5, secondary: 3 },
  { name: "Fri", primary: 6, secondary: 3 },
  { name: "Sat", primary: 6, secondary: 4 },
  { name: "Sun", primary: 8, secondary: 4 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEVICE_ICONS: Record<string, LucideIcon> = {
  router: Router,
  switch: Network,
  firewall: Shield,
  ap: Wifi,
  other: Server,
};

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function riskColor(level: string): string {
  const map: Record<string, string> = {
    low: "#34d399",
    medium: "#fbbf24",
    high: "#fb7185",
    critical: "#f43f5e",
  };
  return map[level] ?? "#94a3b8";
}

function statusChip(status: string) {
  const cfg: Record<string, { cls: string; dot: string }> = {
    up:       { cls: "status-ok",      dot: "#34d399" },
    degraded: { cls: "status-warn",    dot: "#fbbf24" },
    down:     { cls: "status-danger",  dot: "#fb7185" },
    unknown:  { cls: "status-neutral", dot: "#94a3b8" },
  };
  const c = cfg[status] ?? cfg.unknown;
  return (
    <span className={c.cls}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

function severityChip(severity: string) {
  const cls: Record<string, string> = {
    critical: "status-danger",
    high: "status-warn",
    medium: "status-neutral",
    low: "status-ok",
    info: "status-neutral",
  };
  return <span className={cls[severity] ?? "status-neutral"}>{severity}</span>;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DeviceCard({ device, onClick, selected }: {
  device: typeof MOCK_DEVICES[0];
  onClick: () => void;
  selected: boolean;
}) {
  const Icon = DEVICE_ICONS[device.device_type] ?? Server;
  const riskPct = device.latest_risk_score ?? 0;

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer transition-all duration-200"
      style={{
        borderColor: selected ? "rgba(168,85,247,0.5)" : undefined,
        background: selected ? "rgba(124,58,237,0.08)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 34,
              height: 34,
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.2)",
            }}
          >
            <span style={{ color: "#a855f7", display: "flex" }}>
              <Icon size={16} />
            </span>
          </div>
          <div>
            <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{device.name}</p>
            <p className="m-0 text-xs text-slate-500 dark:text-neutral-400">{device.ip_address}</p>
          </div>
        </div>
        {statusChip(device.status)}
      </div>

      {/* Risk bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-500 dark:text-neutral-400">Health Score</span>
          <span className="text-xs font-bold" style={{ color: riskColor(device.latest_risk_level ?? "") }}>
            {riskPct}/100
          </span>
        </div>
        <div style={{ height: 4, background: "var(--border-color, rgba(0,0,0,0.06))", borderRadius: 9999 }}>
          <div
            style={{
              height: "100%",
              width: `${riskPct}%`,
              background: riskColor(device.latest_risk_level ?? ""),
              borderRadius: 9999,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-slate-500 dark:text-neutral-400">
          CPU:{" "}
          <span style={{ color: (device.latest_cpu ?? 0) > 80 ? "#fb7185" : "currentColor" }}>
            {device.latest_cpu != null ? `${device.latest_cpu.toFixed(1)}%` : "N/A"}
          </span>
        </div>
        <div className="text-slate-500 dark:text-neutral-400">
          Uptime: <span style={{ color: "currentColor" }}>
            {device.latest_uptime_hours != null ? `${device.latest_uptime_hours}h` : "—"}
          </span>
        </div>
        <div className="text-slate-500 dark:text-neutral-400">
          Model: <span style={{ color: "currentColor" }}>{device.model || "—"}</span>
        </div>
        <div className="text-slate-500 dark:text-neutral-400">
          Polled: <span style={{ color: "currentColor" }}>{timeAgo(device.last_polled)}</span>
        </div>
      </div>

      {device.unresolved_alerts > 0 && (
        <div
          className="mt-3 flex items-center gap-1.5 rounded-md px-2 py-1.5"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}
        >
          <AlertTriangle size={11} style={{ color: "#fb7185" }} />
          <span className="text-xs font-semibold" style={{ color: "#fb7185" }}>
            {device.unresolved_alerts} active alert{device.unresolved_alerts !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onResolve }: {
  alert: typeof MOCK_ALERTS[0];
  onResolve: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const alertTypeIcons: Record<string, LucideIcon> = {
    high_cpu: Cpu,
    interface_down: Network,
    security_vuln: Lock,
    ai_prediction: Brain,
    auth_failure: ShieldAlert,
    config_change: FileText,
    default: AlertTriangle,
  };
  const Icon = alertTypeIcons[alert.alert_type] ?? alertTypeIcons.default;
  const iconColor = alert.severity === "critical" ? "#fb7185" : "#fbbf24";

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border-color, rgba(0,0,0,0.06))" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ color: iconColor, flexShrink: 0, display: "flex" }}>
          <Icon size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="m-0 text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{alert.title}</p>
            {alert.ai_generated && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}
              >
                <Brain size={9} /> AI
              </span>
            )}
          </div>
          <p className="m-0 text-xs text-slate-500 dark:text-neutral-400">
            {alert["device__name"]} · {timeAgo(alert.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {severityChip(alert.severity)}
          {expanded ? <ChevronDown size={13} className="text-slate-500 dark:text-neutral-400" /> : <ChevronRight size={13} className="text-slate-500 dark:text-neutral-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="mt-3 text-sm text-neutral-400">{alert.description}</p>
          {alert.recommendation && (
            <div
              className="mt-3 rounded-lg px-3 py-2"
              style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.12)" }}
            >
              <p className="m-0 text-xs font-semibold mb-1" style={{ color: "#22d3ee" }}>Recommendation</p>
              <p className="m-0 text-xs font-mono text-neutral-400">{alert.recommendation}</p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: "0.72rem", padding: "0.25rem 0.75rem", borderColor: "rgba(16,185,129,0.3)", color: "#34d399" }}
              onClick={() => onResolve(alert.id)}
            >
              <CheckCircle size={11} /> Mark Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AIInsightPanel({ device }: { device: typeof MOCK_DEVICES[0] | null }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<null | { recommendation: string; failure_prediction: { level: string; summary: string; probability_pct: number | null } }>(null);

  const runAnalysis = () => {
    setAnalyzing(true);
    setResult(null);
    // Simulate AI analysis
    setTimeout(() => {
      setAnalyzing(false);
      if (!device) return;
      if (device.latest_risk_level === "critical" || device.latest_risk_level === "high") {
        setResult({
          recommendation: `Immediate action required on ${device.name}. Run 'show processes cpu sorted' to identify top CPU consumers. Consider 'clear ip bgp *' only if BGP instability is confirmed. Apply QoS policy-map to limit low-priority traffic. Check for routing loops with 'show ip route | include directly'. Enable NetFlow to capture anomalous traffic: 'ip flow-export destination <collector> 2055'.`,
          failure_prediction: { level: "high", summary: "2 failure indicators detected", probability_pct: 68 },
        });
      } else {
        setResult({
          recommendation: `${device.name} is performing well. Continue monitoring. Consider scheduling a maintenance window to apply IOS updates. Run periodic 'show version' audits to verify uptime and config register settings.`,
          failure_prediction: { level: "low", summary: "No failure indicators", probability_pct: 5 },
        });
      }
    }, 2200);
  };

  if (!device) {
    return (
      <div className="card p-5 flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
        <Brain size={28} style={{ color: "#475569" }} />
        <p className="m-0 mt-2 text-sm" style={{ color: "#475569" }}>Select a device to run AI analysis</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color: "#22d3ee" }} />
          <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">AI Analysis — {device.name}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ fontSize: "0.72rem", padding: "0.3rem 0.8rem" }}
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <RefreshCw size={11} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap size={11} />
              Run AI Analysis
            </>
          )}
        </button>
      </div>

      {analyzing && (
        <div className="space-y-2">
          {["Collecting SNMP metrics...", "Running anomaly detection...", "Generating recommendation..."].map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
              <div className="animate-pulse w-1.5 h-1.5 rounded-full" style={{ background: "#a855f7" }} />
              {msg}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-3 animate-fade-up">
          {/* Failure prediction */}
          <div
            className="rounded-xl p-3"
            style={{
              background: result.failure_prediction.level === "low" ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)",
              border: `1px solid ${result.failure_prediction.level === "low" ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: result.failure_prediction.level === "low" ? "#34d399" : "#fb7185" }}>
                Failure Prediction
              </span>
              {result.failure_prediction.probability_pct !== null && (
                <span className="text-xs font-bold" style={{ color: result.failure_prediction.level === "low" ? "#34d399" : "#fb7185" }}>
                  {result.failure_prediction.probability_pct}% risk
                </span>
              )}
            </div>
            <p className="m-0 text-xs text-neutral-400">{result.failure_prediction.summary}</p>
            {result.failure_prediction.probability_pct !== null && (
              <div className="mt-2" style={{ height: 3, background: "var(--border-color, rgba(0,0,0,0.06))", borderRadius: 9999 }}>
                <div style={{
                  height: "100%",
                  width: `${result.failure_prediction.probability_pct}%`,
                  background: result.failure_prediction.level === "low" ? "#34d399" : "#fb7185",
                  borderRadius: 9999,
                }} />
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div className="rounded-xl p-3" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.15)" }}>
            <p className="m-0 text-xs font-semibold mb-2" style={{ color: "#22d3ee" }}>
              <Brain size={10} className="inline mr-1" />
              AI Recommendation
            </p>
            <p className="m-0 text-xs leading-relaxed text-neutral-400">{result.recommendation}</p>
          </div>
        </div>
      )}

      {!analyzing && !result && (
        <p className="m-0 text-xs text-center py-4" style={{ color: "#475569" }}>
          Click "Run AI Analysis" to get failure prediction and recommendations powered by LLaMA 4.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CiscoPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"devices" | "alerts" | "vulns" | "config">("devices");
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceIp, setNewDeviceIp] = useState("");

  const selectedDevice = useMemo(
    () => MOCK_DEVICES.find(d => d.id === selectedDeviceId) ?? null,
    [selectedDeviceId]
  );

  const stats = useMemo(() => {
    const total = MOCK_DEVICES.length;
    const up = MOCK_DEVICES.filter(d => d.status === "up").length;
    const down = MOCK_DEVICES.filter(d => d.status === "down").length;
    const degraded = MOCK_DEVICES.filter(d => d.status === "degraded").length;
    const critAlerts = alerts.filter(a => a.severity === "critical").length;
    return [
      { label: "Total Devices", value: String(total), trend: 0 },
      { label: "Online", value: String(up), tone: "ok" as const, trend: 0 },
      { label: "Degraded", value: String(degraded), tone: "warn" as const, trend: 0 },
      { label: "Down", value: String(down), tone: "danger" as const, trend: 0 },
      { label: "Critical Alerts", value: String(critAlerts), tone: "danger" as const, trend: 25.0 },
      { label: "Availability", value: `${Math.round((up / total) * 100)}%`, tone: "ok" as const, trend: -2.1 },
    ];
  }, [alerts]);

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const tabs = [
    { key: "devices" as const, label: "Devices", icon: Router },
    { key: "alerts" as const, label: `Alerts (${alerts.length})`, icon: AlertTriangle },
    { key: "vulns" as const, label: "CVE Scanner", icon: Lock },
    { key: "config" as const, label: "Config Backups", icon: FileText },
  ];

  return (
    <div className="page-section">
      <PageHeader
        badge="Network Infrastructure"
        title="Cisco Device Management"
        description="AI-powered SNMP monitoring, security analysis, config backup, CVE scanning, and failure prediction for Cisco routers and switches."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddDevice(s => !s)}
          >
            <Plus size={13} />
            Add Device
          </button>
        }
      />

      {/* Add Device Form */}
      {showAddDevice && (
        <section className="card p-5 animate-fade-up">
          <p className="m-0 mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Register New Cisco Device</p>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Device Name", value: newDeviceName, setter: setNewDeviceName, placeholder: "CORE-RTR-01" },
              { label: "IP Address", value: newDeviceIp, setter: setNewDeviceIp, placeholder: "192.168.1.1" },
            ].map(({ label, value, setter, placeholder }) => (
              <label key={label} className="grid gap-1.5" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                {label}
                <input
                  type="text"
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "0.5rem 0.75rem",
                    color: "#fff",
                    fontSize: "0.84rem",
                    outline: "none",
                  }}
                />
              </label>
            ))}
            <div className="flex items-end">
              <button
                type="button"
                className="btn-primary w-full justify-center"
                onClick={() => setShowAddDevice(false)}
              >
                Register Device
              </button>
            </div>
          </div>
          <p className="m-0 mt-2 text-xs" style={{ color: "#475569" }}>
            After registration, deploy the SNMP collector script to start receiving data from this device.
          </p>
        </section>
      )}

      <StatGrid stats={stats} />

      {/* Charts */}
      <section className="grid gap-3 xl:grid-cols-2">
        <DualAreaChart
          data={MOCK_TREND}
          title="CPU Usage vs Interface Errors (7-day)"
          primaryLabel="Avg CPU %"
          secondaryLabel="Interface Errors"
        />
        <GroupedBarChart
          data={MOCK_VULN_TREND}
          title="CVE Findings vs Resolved (7-day)"
          primaryLabel="CVEs Found"
          secondaryLabel="Resolved"
        />
      </section>

      {/* Tabs */}
      <section className="card p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                activeTab === key
                  ? "bg-purple-500/20 text-purple-200"
                  : "bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-neutral-900 dark:text-neutral-100",
              ].join(" ")}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <section className="grid gap-3 xl:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {MOCK_DEVICES.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onClick={() => setSelectedDeviceId(
                    selectedDeviceId === device.id ? null : device.id
                  )}
                  selected={selectedDeviceId === device.id}
                />
              ))}
            </div>

            {selectedDevice && (
              <section className="card p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedDevice.name} — SNMP Metrics
                  </p>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#475569" }}>
                    <Activity size={11} />
                    Live via SNMP
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "CPU 1m", value: selectedDevice.latest_cpu != null ? `${selectedDevice.latest_cpu.toFixed(1)}%` : "N/A", warn: (selectedDevice.latest_cpu ?? 0) > 80 },
                    { label: "Health Score", value: selectedDevice.latest_risk_score != null ? `${selectedDevice.latest_risk_score}/100` : "N/A", warn: (selectedDevice.latest_risk_score ?? 100) < 60 },
                    { label: "Uptime", value: selectedDevice.latest_uptime_hours != null ? `${selectedDevice.latest_uptime_hours}h` : "—", warn: false },
                    { label: "IOS Version", value: selectedDevice.ios_version || "Unknown", warn: false },
                    { label: "Location", value: selectedDevice.location || "—", warn: false },
                    { label: "Model", value: selectedDevice.model || "—", warn: false },
                    { label: "Active Alerts", value: String(selectedDevice.unresolved_alerts), warn: selectedDevice.unresolved_alerts > 0 },
                    { label: "Last Poll", value: timeAgo(selectedDevice.last_polled), warn: false },
                  ].map(({ label, value, warn }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5"
                    >
                      <p className="m-0 text-[10px] font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                      <p className={`m-0 text-sm font-bold ${warn ? "text-rose-500 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <AIInsightPanel device={selectedDevice} />
        </section>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <section className="page-section">
          <div className="flex items-center justify-between">
            <p className="m-0 text-sm text-slate-500 dark:text-neutral-400">
              {alerts.filter(a => a.severity === "critical").length} critical,{" "}
              {alerts.filter(a => a.severity === "high").length} high,{" "}
              {alerts.filter(a => a.ai_generated).length} AI-generated
            </p>
            <span className="pill">
              <Brain size={9} style={{ marginRight: 4 }} />
              AI alerts auto-resolve after fix
            </span>
          </div>

          <div className="space-y-2">
            {alerts.length === 0 && (
              <div className="card p-8 text-center">
                <CheckCircle size={28} style={{ color: "#34d399", margin: "0 auto" }} />
                <p className="m-0 mt-2 text-sm text-neutral-900 dark:text-neutral-100">All clear — no active alerts.</p>
              </div>
            )}
            {alerts.map(alert => (
              <AlertRow key={alert.id} alert={alert} onResolve={resolveAlert} />
            ))}
          </div>
        </section>
      )}

      {/* CVE Scanner Tab */}
      {activeTab === "vulns" && (
        <section className="card overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.06))" }}
          >
            <div>
              <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Cisco IOS CVE Vulnerability Scan</p>
              <p className="m-0 text-xs text-slate-500 dark:text-neutral-400">
                Cross-referencing IOS versions against Cisco PSIRT database
              </p>
            </div>
            <span className="status-danger">3 Critical CVEs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>IOS Version</th>
                  <th>CVE ID</th>
                  <th>CVSS</th>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Fix Available</th>
                  <th>Fix Version</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { device: "CORE-RTR-01", ios: "17.6.4", cve: "CVE-2023-20198", cvss: 10.0, severity: "critical", title: "Web UI Privilege Escalation", fix: true, fixVer: "17.9.4a" },
                  { device: "CORE-RTR-01", ios: "17.6.4", cve: "CVE-2023-44487", cvss: 7.5, severity: "high", title: "HTTP/2 Rapid Reset DDoS", fix: false, fixVer: "—" },
                  { device: "DIST-SW-01", ios: "17.3.6", cve: "CVE-2023-20198", cvss: 10.0, severity: "critical", title: "Web UI Privilege Escalation", fix: true, fixVer: "17.9.4a" },
                  { device: "DIST-SW-01", ios: "17.3.6", cve: "CVE-2024-20272", cvss: 5.3, severity: "medium", title: "SNMP Information Disclosure", fix: true, fixVer: "17.12.1" },
                  { device: "BRANCH-RTR-02", ios: "17.9.3", cve: "CVE-2024-20272", cvss: 5.3, severity: "medium", title: "SNMP Information Disclosure", fix: true, fixVer: "17.12.1" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td>{row.device}</td>
                    <td><code style={{ fontSize: "0.75rem", color: "#c084fc" }}>{row.ios}</code></td>
                    <td>
                      <span style={{ color: "#22d3ee", fontSize: "0.78rem", fontFamily: "monospace" }}>
                        {row.cve}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: row.cvss >= 9 ? "#fb7185" : row.cvss >= 7 ? "#fbbf24" : "#94a3b8" }}>
                        {row.cvss.toFixed(1)}
                      </span>
                    </td>
                    <td>{severityChip(row.severity)}</td>
                    <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.title}
                    </td>
                    <td>
                      {row.fix
                        ? <span className="status-ok"><CheckCircle size={10} /> Yes</span>
                        : <span className="status-danger">No patch</span>
                      }
                    </td>
                    <td>
                      <code style={{ fontSize: "0.72rem", color: "#a855f7" }}>{row.fixVer}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Config Backups Tab */}
      {activeTab === "config" && (
        <section className="card overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.06))" }}
          >
            <div>
              <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Configuration Backup History</p>
              <p className="m-0 text-xs text-slate-500 dark:text-neutral-400">
                SHA-256 checksums · automatic change detection · security diff analysis
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Type</th>
                  <th>Checksum (SHA-256)</th>
                  <th>Size</th>
                  <th>Changed</th>
                  <th>Diff Summary</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { device: "CORE-RTR-01", type: "running", checksum: "a3f8e2...c912d4", size: "14.2 KB", changed: true, diff: "+3 lines, ACL 120 modified", time: "2 hours ago" },
                  { device: "CORE-RTR-01", type: "running", checksum: "b91c3a...ff2108", size: "14.1 KB", changed: false, diff: "No changes", time: "26 hours ago" },
                  { device: "DIST-SW-01", type: "running", checksum: "c44d1b...8a73e9", size: "9.8 KB", changed: true, diff: "+1 line, VLAN 30 added", time: "6 hours ago" },
                  { device: "EDGE-FW-01", type: "running", checksum: "d72f0c...310bcf", size: "22.4 KB", changed: false, diff: "No changes", time: "1 hour ago" },
                  { device: "BRANCH-RTR-02", type: "startup", checksum: "e81a4d...9c55f1", size: "7.1 KB", changed: false, diff: "No changes", time: "12 hours ago" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td>{row.device}</td>
                    <td>
                      <span className={row.type === "running" ? "status-ok" : "status-neutral"}>
                        {row.type}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.72rem", color: "#a855f7" }}>{row.checksum}</code>
                    </td>
                    <td>{row.size}</td>
                    <td>
                      {row.changed
                        ? <span className="status-warn">Modified</span>
                        : <span className="status-ok">Unchanged</span>
                      }
                    </td>
                    <td style={{ fontSize: "0.78rem", color: row.changed ? "#fbbf24" : "#64748b" }}>
                      {row.diff}
                    </td>
                    <td className="text-slate-500 dark:text-neutral-400">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SNMP Collector Setup Guide */}
      <section
        className="card p-5 bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/10 dark:border-purple-500/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <Globe size={15} style={{ color: "#a855f7" }} />
          <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">SNMP Collector Setup</p>
          <span className="pill">Integration Guide</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "1. pysnmp Collector",
              code: "pip install pysnmp\npython cisco_collector.py\n  --host 192.168.1.1\n  --community public\n  --backend http://localhost:8000/api/cisco/snapshot/",
            },
            {
              title: "2. Telegraf (alternative)",
              code: "[[inputs.snmp]]\n  agents = [\"192.168.1.1:161\"]\n  community = \"public\"\n  version = 2\n  [[outputs.http]]\n  url = \"http://localhost:8000/api/cisco/snapshot/\"",
            },
            {
              title: "3. Config Backup (Netmiko)",
              code: "pip install netmiko\npython backup_configs.py\n  --device CORE-RTR-01\n  --backend http://localhost:8000/api/cisco/config/",
            },
          ].map(({ title, code }) => (
            <div key={title}>
              <p className="m-0 mb-1 text-xs font-semibold" style={{ color: "#a855f7" }}>{title}</p>
              <pre
                className="bg-black/5 dark:bg-black/30 border border-purple-500/15 rounded-lg py-2.5 px-3 text-[0.68rem] text-slate-700 dark:text-slate-400 m-0 whitespace-pre-wrap font-mono"
              >
                {code}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
