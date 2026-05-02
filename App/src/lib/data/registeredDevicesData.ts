import { DUMMY_DATA } from "@/config/runtime";
import { maybeDelay } from "@/lib/query/sourceMode";

export type RegisteredDevicesData = {
  deviceRows: string[][];
  complianceTrend: Array<{ week: string; encryption: number; edr: number; patching: number }>;
  exposureByType: Array<{ name: string; count: number; color: string }>;
  stats: Array<{ label: string; value: string; trend?: number; tone?: "default" | "ok" | "warn" | "danger" }>;
};

export async function get_registered_devices_data(): Promise<RegisteredDevicesData> {
  await maybeDelay(DUMMY_DATA ? 350 : 100);
  return {
    deviceRows: [
      ["dv-1001", "OPS-WIN-09", "Laptop", "Karim D.", "Windows 11", "78", "Action Needed"],
      ["dv-1002", "FIN-WIN-04", "Laptop", "Nadia K.", "Windows 10", "84", "Critical"],
      ["dv-1003", "MKT-MAC-01", "Laptop", "Sofia R.", "macOS 14", "21", "Healthy"],
      ["dv-1004", "DC-EDGE-02", "Server", "Infra Team", "Ubuntu 24.04", "35", "Monitor"],
      ["dv-1005", "Branch-R-01", "Router", "Network Team", "RouterOS", "62", "Review"],
      ["dv-1006", "Core-SW-01", "Switch", "Network Team", "IOS-XE", "12", "Healthy"],
      ["dv-1007", "HR-WIN-12", "Laptop", "Amine S.", "Windows 11", "45", "Healthy"],
      ["dv-1008", "Branch-SW-02", "Switch", "Network Team", "IOS-XE", "88", "Action Needed"],
      ["dv-1009", "Home-R-04", "Router", "Remote User", "OpenWrt", "15", "Healthy"],
    ],
    complianceTrend: [
      { week: "W1", encryption: 92, edr: 95, patching: 87 },
      { week: "W2", encryption: 93, edr: 96, patching: 88 },
      { week: "W3", encryption: 94, edr: 97, patching: 89 },
      { week: "W4", encryption: 95, edr: 97, patching: 90 },
      { week: "W5", encryption: 95, edr: 98, patching: 90 },
      { week: "W6", encryption: 96, edr: 98, patching: 91 },
    ],
    exposureByType: [
      { name: "Outdated agents", count: 9, color: "#f59e0b" },
      { name: "Firewall drift", count: 7, color: "#fb7185" },
      { name: "Unmanaged USB", count: 5, color: "#a78bfa" },
      { name: "Weak credentials", count: 3, color: "#22d3ee" },
    ],
    stats: [
      { label: "Total Devices", value: "142", trend: 6.4 },
      { label: "Healthy", value: "113", tone: "ok", trend: 3.1 },
      { label: "At Risk", value: "24", tone: "warn", trend: -2.4 },
      { label: "Critical", value: "5", tone: "danger", trend: 25 },
    ],
  };
}
