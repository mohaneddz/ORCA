# Network Discovery Module — Cyber Maturity Cockpit

## Purpose

This module gives the admin a live view of devices connected to the organization network.

It supports the Cyber Maturity Cockpit goal: making invisible assets visible, because the problematic says many organizations do not know what devices are connected to their networks. :contentReference[oaicite:0]{index=0}

## What It Does

The scanner discovers devices using three layers:

1. **Local machine scan**
   - Detects the local IP/subnet.
   - Reads the OS ARP table.
   - Checks reachable devices.
   - Scans safe common ports.
   - Tries to infer services and device type.

2. **Router data**
   - DHCP leases.
   - Router ARP table.
   - Wi-Fi client list.
   - DNS hostnames.
   - Bandwidth stats.

3. **Merged asset record**
   - Combines real scan results and router data into one device profile.

## Why Router Data Matters

A local scan alone can miss devices because some devices block ping, sit on Wi-Fi isolation, or stay silent.

Router/admin data gives much better coverage:
- DHCP leases show devices that requested an IP.
- Router ARP shows devices the router recently saw.
- Wi-Fi clients show connected wireless devices.
- DNS records improve hostname detection.
- Bandwidth stats show active clients.

This matches the discovery methods we selected earlier: DHCP leases, ARP/neighbor table, Wi-Fi clients, active scans, mDNS/UPnP/NetBIOS, and SNMP/LLDP later. :contentReference[oaicite:1]{index=1}

## What Is Real

The following parts are real or production-shaped:

- Local subnet detection.
- Local ARP table parsing.
- TCP port connection checks.
- Open-port based service detection.
- Device type inference.
- MAC vendor guessing using OUI prefixes.
- Risk flag generation.
- Evidence merging.
- Tauri command interface.
- JSON returned to the frontend.

## What Is Mocked

The router integration is mocked for now.

Mocked router data includes:

- DHCP leases.
- Wi-Fi connected clients.
- Router ARP entries.
- DNS hostname records.
- Bandwidth usage.
- Access point name.
- VLAN.
- Switch port.

This is mocked because every router brand has a different API.

Examples:
- MikroTik uses RouterOS API.
- UniFi uses UniFi API.
- OpenWrt can expose data through ubus.
- Enterprise switches may expose SNMP, LLDP, or CDP.

## Why Mocking Router Data Is Acceptable

In the final solution, the admin using the app should also have admin access to the router.

So the current mock structure represents the real data we would pull later from router APIs.

The frontend and backend can already be built around the final data shape.

## Example Device Record

```json
{
  "ip": "192.168.1.23",
  "mac": "AA:BB:CC:DD:EE:FF",
  "hostname": "office-printer",
  "vendor": "HP",
  "device_type": "printer",
  "connection": "wifi",
  "ssid": "Office-WiFi",
  "ap": "AP-1",
  "switch_port": null,
  "vlan": 10,
  "open_ports": [80, 443, 9100],
  "services": ["HTTP", "HTTPS", "Printer"],
  "source_evidence": ["router_dhcp", "router_wifi", "arp_table", "port_scan"],
  "first_seen": "2026-05-02T10:00:00Z",
  "last_seen": "2026-05-02T10:04:00Z",
  "bandwidth_down_mbps": 1.4,
  "bandwidth_up_mbps": 0.2,
  "risk_flags": ["printer_detected", "exposed_admin_panel"],
  "confidence": 0.94
}
Risk Flags

The scanner adds simple security flags:

Flag	Meaning
exposed_admin_panel	Web admin panel found on HTTP/HTTPS
printer_detected	Printer service detected
smb_open	SMB file sharing is open
rdp_open	Remote Desktop is open
database_port_open	Database port detected
unknown_device	Device identity is unclear
low_confidence_identity	Weak evidence
router_only_device	Seen by router only
scan_only_device	Seen by local scan only
Expected Coverage

Approximate coverage:

Setup	Expected Coverage
App scan only	50–90%
App + router DHCP/ARP/Wi-Fi	85–98%
App + router + switches/APs/SNMP	95–99%+

This follows the discovery strategy from the previous research.

Limitations

The scanner may miss:

Offline devices.
Devices on another VLAN.
Devices behind NAT.
Devices blocked by client isolation.
Devices with firewalls blocking probes.
Static silent devices.
Devices not recently seen by the router.
Security Boundaries

This module is for authorized internal admin use only.

It does not:

Exploit devices.
Brute force credentials.
Capture private traffic.
Modify router settings.
Attack services.

It only discovers assets and basic exposed services.

Frontend Usage

The React/Tauri frontend can call:

import { invoke } from "@tauri-apps/api/core";

const devices = await invoke("scan_network");
console.log(devices);
Future Improvements

Planned real integrations:

MikroTik RouterOS API.
UniFi controller API.
OpenWrt ubus.
SNMP switch MAC tables.
LLDP/CDP topology mapping.
mDNS discovery.
SSDP/UPnP discovery.
NetBIOS/LLMNR hostname detection.
Persistent asset history in Supabase.
Risk scoring and roadmap generation.