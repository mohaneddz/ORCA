export const MOCK_INCIDENTS = [
  ["Credential reuse", "finance@org.com", "P1", "table.status.open"],
  ["Suspicious binary", "OPS-WIN-09", "P1", "table.status.investigating"],
  ["Unauthorized USB", "HR-LAP-02", "P2", "table.status.queued"],
  ["Anomalous DNS", "172.16.10.77", "P2", "table.status.monitoring"],
];

export const MOCK_AUTOMATIONS = [
  ["table.action.forceMfa", "34 accounts", "table.result.success", "09:45"],
  ["table.action.patchRollout", "12 devices", "table.result.inProgress", "09:31"],
  ["table.action.tokenRevoke", "nadia@org.com", "table.result.success", "09:21"],
  ["table.action.networkIsolate", "Unknown-Lenovo", "table.result.success", "08:59"],
];

export const MOCK_DEVICES = [
  ["dv-1001", "OPS-WIN-09", "Karim D.", "Windows 11", "Action Needed"],
  ["dv-1002", "FIN-WIN-04", "Nadia K.", "Windows 10", "Critical"],
  ["dv-1003", "MKT-MAC-01", "Sofia R.", "macOS 14", "Healthy"],
  ["dv-1004", "DC-EDGE-02", "Infra Team", "Ubuntu 24.04", "Monitor"],
  ["dv-1005", "Branch-R-01", "Network Team", "RouterOS", "Review"],
  ["dv-1006", "Core-SW-01", "Network Team", "IOS-XE", "Healthy"],
  ["dv-1007", "HR-WIN-12", "Amine S.", "Windows 11", "Healthy"],
  ["dv-1008", "Branch-SW-02", "Network Team", "IOS-XE", "Action Needed"],
  ["dv-1009", "Home-R-04", "Remote User", "OpenWrt", "Healthy"],
];

export const MOCK_EMPLOYEES = [
  ["Maya Rahal", "MFA reset", "table.priority.high", "table.status.pending"],
  ["Yousef Hamdi", "Session revoke", "table.priority.medium", "table.status.executed"],
  ["Sara Bensalem", "Device isolate", "table.priority.high", "table.status.inReview"],
  ["Nour Khider", "Policy override", "table.priority.low", "table.status.executed"],
  ["Karim Tarek", "Token revoke", "table.priority.medium", "table.status.pending"],
  ["Lina Farouk", "Mailbox quarantine", "table.priority.high", "table.status.escalated"],
];

export const MOCK_ACCOUNTS = [
  ["Nadia Karim", "nadia@org.com", "Admin", "Enabled", "Critical"],
  ["Karim Dali", "karim@org.com", "Staff", "Enabled", "Review"],
  ["Sofia Rahal", "sofia@org.com", "Staff", "Enabled", "Healthy"],
  ["Nour Hadj", "nour@org.com", "Staff", "Missing", "Action Needed"],
];

export const MOCK_NETWORK_NODES = [
  ["DC-EDGE-02", "172.16.10.3", "Core", "Suspicious outbound DNS", "High"],
  ["Branch-AP-03", "172.16.20.1", "Branch", "Firmware outdated", "Medium"],
  ["Unknown-Lenovo", "172.16.10.77", "Corp-WiFi", "Unauthorized join", "Critical"],
  ["FIN-WIN-04", "172.16.10.31", "Finance", "RDP scan detected", "High"],
];

export const COMPLIANCE_TREND = [
  { week: "W1", encryption: 92, edr: 95, patching: 87 },
  { week: "W2", encryption: 93, edr: 96, patching: 88 },
  { week: "W3", encryption: 94, edr: 97, patching: 89 },
  { week: "W4", encryption: 95, edr: 97, patching: 90 },
  { week: "W5", encryption: 95, edr: 98, patching: 90 },
  { week: "W6", encryption: 96, edr: 98, patching: 91 },
];

export const EXPOSURE_BY_TYPE = [
  { name: "Outdated agents", count: 9, color: "#f59e0b" },
  { name: "Firewall drift", count: 7, color: "#fb7185" },
  { name: "Unmanaged USB", count: 5, color: "#a78bfa" },
  { name: "Weak credentials", count: 3, color: "#22d3ee" },
];

export const RISK_TREND = [
  { name: "00:00", value: 41 },
  { name: "04:00", value: 46 },
  { name: "08:00", value: 54 },
  { name: "12:00", value: 58 },
  { name: "16:00", value: 63 },
  { name: "20:00", value: 58 },
];

export const EXPOSURE_BY_ZONE = [
  { name: "Core", value: 2 },
  { name: "Branch", value: 3 },
  { name: "DMZ", value: 5 },
  { name: "Guest", value: 4 },
];

export const NAC_COMPLIANCE_TREND = [
  { name: "Mon", compliant: 89, target: 95 },
  { name: "Tue", compliant: 90, target: 95 },
  { name: "Wed", compliant: 91, target: 95 },
  { name: "Thu", compliant: 92, target: 95 },
  { name: "Fri", compliant: 91, target: 95 },
];

export const RESILIENCE_TREND = [
  { week: "W1", passRate: 62, reportRate: 44, clickRate: 28 },
  { week: "W2", passRate: 67, reportRate: 51, clickRate: 25 },
  { week: "W3", passRate: 72, reportRate: 56, clickRate: 20 },
  { week: "W4", passRate: 76, reportRate: 62, clickRate: 18 },
  { week: "W5", passRate: 81, reportRate: 68, clickRate: 15 },
  { week: "W6", passRate: 86, reportRate: 73, clickRate: 14 },
];

export const CAMPAIGN_BREAKDOWN = [
  { group: "Finance", completed: 92 },
  { group: "Ops", completed: 84 },
  { group: "HR", completed: 88 },
  { group: "Marketing", completed: 79 },
];

export const MOCK_TRAINING_SESSIONS = [
  ["Invoice Clone v2", "Finance", "5 clicks", "Mandatory module", "2026-05-02"],
  ["Credential Harvest Drill", "Operations", "2 submissions", "1:1 coaching", "2026-05-01"],
  ["Link Safety Sprint", "HR", "89% pass", "None", "2026-04-30"],
  ["Attachment Trap", "All Staff", "11 risky opens", "Micro-training", "2026-04-29"],
];

export const SUMMARY_FALLBACK = {
  headline: "summary.fallback.headline",
  highlights: [
    "summary.fallback.h1",
    "summary.fallback.h2",
    "summary.fallback.h3",
  ],
};

export const USAGE_BY_CATEGORY = [
  { name: "API Calls", primary: 68, secondary: 100 },
  { name: "Storage", primary: 43, secondary: 100 },
  { name: "Team Seats", primary: 57, secondary: 100 },
  { name: "Automations", primary: 31, secondary: 100 },
];

export const SUBSCRIPTION_PLANS = [
  {
    name: "Starter",
    price: "$29/mo",
    seatsKey: "billing.plans.seats_5",
    supportKey: "billing.plans.support.email",
    accent: "border-cyan-400/20",
  },
  {
    name: "Growth",
    price: "$99/mo",
    seatsKey: "billing.plans.seats_20",
    supportKey: "billing.plans.support.priority",
    accent: "border-blue-700/35",
  },
  {
    name: "Enterprise",
    price: "Custom",
    seatsKey: "billing.plans.unlimited",
    supportKey: "billing.plans.support.dedicated",
    accent: "border-amber-400/25",
  },
];
