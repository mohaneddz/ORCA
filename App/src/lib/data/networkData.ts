import { DUMMY_DATA } from "@/config/runtime";
import { maybeDelay } from "@/lib/query/sourceMode";

export type NetworkPageData = {
  throughputGbps: string;
  blockedConnections24h: string;
  riskTrend: Array<{ name: string; value: number }>;
  exposureByZone: Array<{ name: string; value: number }>;
  complianceTrend: Array<{ name: string; compliant: number; target: number }>;
  tableRows: string[][];
};

export async function get_network_page_data(): Promise<NetworkPageData> {
  await maybeDelay(DUMMY_DATA ? 350 : 100);
  return {
    throughputGbps: DUMMY_DATA ? "8.1" : "8.4",
    blockedConnections24h: DUMMY_DATA ? "3,412" : "3,105",
    riskTrend: [
      { name: "00:00", value: 41 }, { name: "04:00", value: 46 }, { name: "08:00", value: 54 },
      { name: "12:00", value: 58 }, { name: "16:00", value: 63 }, { name: "20:00", value: 58 },
    ],
    exposureByZone: [
      { name: "Core", value: 2 }, { name: "Branch", value: 3 }, { name: "DMZ", value: 5 }, { name: "Guest", value: 4 },
    ],
    complianceTrend: [
      { name: "Mon", compliant: 89, target: 95 }, { name: "Tue", compliant: 90, target: 95 },
      { name: "Wed", compliant: 91, target: 95 }, { name: "Thu", compliant: 92, target: 95 }, { name: "Fri", compliant: 91, target: 95 },
    ],
    tableRows: [
      ["DC-EDGE-02", "Server", "172.16.10.3", "Core", "Suspicious outbound DNS", "High", "Infra"],
      ["Branch-AP-03", "Access Point", "172.16.20.1", "Branch", "Firmware outdated", "Medium", "Network"],
      ["Unknown-Lenovo", "Laptop", "172.16.10.77", "Corp-WiFi", "Unauthorized join", "Critical", "Unassigned"],
      ["FIN-WIN-04", "Workstation", "172.16.10.31", "Finance", "RDP scan detected", "High", "Finance IT"],
    ],
  };
}
