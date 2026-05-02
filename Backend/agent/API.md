# Agent API Reference

All endpoints require:
```
Authorization: Token <org_token>
```

Base URL (development): `http://localhost:8000/api/`

---

## 1. Ingest Device Snapshot

**`POST /api/agent/snapshot/`**

Receives a full PostureReport JSON payload from the Tauri agent, strips any agent-computed risk data, recomputes risk on the backend, and persists the snapshot.

### Trigger
Called automatically by the Tauri desktop agent on:
- Application startup
- Scheduled interval (e.g., every 30 minutes)
- Manual "Run Security Check" action in the app

### Request
```
POST /api/agent/snapshot/?employee_id=<uuid>
Authorization: Token abc123
Content-Type: application/json
```
```json
{
  "collectedAtUtc": "2026-05-01T10:00:00Z",
  "employee_id": "f1a2b3c4-...",
  "device": {
    "hostname": "LAPTOP-DEV01",
    "osName": "Windows 11",
    "osVersion": "22H2",
    "architecture": "x86_64",
    "uptimeSeconds": 43200,
    "hardware": { "cpuCores": 8, "totalMemoryMb": 16384 }
  },
  "security": {
    "antivirus": [{ "name": "Windows Defender", "enabled": true, "upToDate": true }],
    "firewallStatus": "enabled",
    "diskEncryptionEnabled": true,
    "osUpdatesCurrent": true
  },
  "user": {
    "isAdminEstimate": false,
    "localAdmins": ["Administrator"]
  },
  "processes": [],
  "network": { "listeningPorts": [] },
  "software": { "software": [] }
}
```

### Response `201`
```json
{
  "id": "9f1e2d3c-...",
  "received_at": "2026-05-01T10:00:05.123456+00:00",
  "risk": {
    "score": 85,
    "level": "low",
    "signals": []
  }
}
```

---

## 2. Risk Score Trend

**`GET /api/agent/risk-trend/<employee_id>/`**

Returns the last 30 snapshots for a specific employee as a chronological time-series, suitable for dashboard line/area charts.

### Trigger
Fetched by the dashboard when:
- An employee's device detail panel is opened
- The "Risk Over Time" chart widget is rendered
- A manager views an employee's security profile

### Request
```
GET /api/agent/risk-trend/f1a2b3c4-0000-0000-0000-000000000001/
Authorization: Token abc123
```

### Response `200`
```json
{
  "employee_id": "f1a2b3c4-...",
  "employee_name": "Alice Martin",
  "hostname": "LAPTOP-DEV01",
  "data_points": 12,
  "trend": [
    {
      "snapshot_id": "aaa...",
      "collected_at": "2026-04-20T08:00:00+00:00",
      "risk_score": 90,
      "risk_level": "low",
      "signals": []
    },
    {
      "snapshot_id": "bbb...",
      "collected_at": "2026-04-21T08:30:00+00:00",
      "risk_score": 72,
      "risk_level": "medium",
      "signals": ["Firewall status unknown"]
    }
  ]
}
```

**Notes:**
- Data is returned in ascending chronological order (oldest → newest) so it can be fed directly into chart libraries (Chart.js, Recharts, etc.).
- Maximum 30 points returned.

---

## 3. Device Drift Detection

**`GET /api/agent/drift/<employee_id>/`**

Compares the two most recent snapshots for an employee and returns a structured diff of changes in software, open ports, and running processes.

### Trigger
Fetched by the dashboard when:
- A new snapshot is ingested and risk score changes
- The "Device Changes" or "Drift Alert" card is rendered
- An admin investigates a risk spike on a specific device

### Request
```
GET /api/agent/drift/f1a2b3c4-0000-0000-0000-000000000001/
Authorization: Token abc123
```

### Response `200` — with changes
```json
{
  "employee_id": "f1a2b3c4-...",
  "employee_name": "Alice Martin",
  "previous_snapshot": {
    "id": "aaa...",
    "collected_at": "2026-04-30T08:00:00+00:00",
    "risk_score": 90,
    "risk_level": "low"
  },
  "latest_snapshot": {
    "id": "bbb...",
    "collected_at": "2026-05-01T08:00:00+00:00",
    "risk_score": 65,
    "risk_level": "medium"
  },
  "risk_delta": -25,
  "risk_changed": true,
  "drift": {
    "software_installed": ["TeamViewer 15.0", "uTorrent 3.6"],
    "software_removed": [],
    "ports_opened": [5900, 3389],
    "ports_closed": [],
    "processes_new": ["teamviewer.exe", "utorrent.exe"],
    "processes_gone": []
  },
  "has_changes": true
}
```

### Response `200` — no snapshots yet
```json
{
  "employee_id": "f1a2b3c4-...",
  "employee_name": "Alice Martin",
  "message": "Not enough snapshots to compute drift (need at least 2).",
  "drift": null
}
```

**Notes:**
- `risk_delta` is `latest_score - previous_score`. Negative = risk worsened.
- `has_changes` is `true` if any of the six diff arrays are non-empty.
- Port numbers are raw integers; map to labels using the risk engine's `_RISKY_PORTS` dict.

---

## 4. Risky Port Audit

**`GET /api/agent/port-audit/`**

Aggregates the latest snapshot for every employee in the organisation and returns a breakdown of which high-risk ports are open, and on which devices.

Monitored ports: `3389` (RDP), `445` (SMB), `22` (SSH), `5900` (VNC), `23` (Telnet), `21` (FTP), `1433` (MSSQL), `3306` (MySQL), `5432` (PostgreSQL), `6379` (Redis), `27017` (MongoDB).

### Trigger
Fetched by the dashboard when:
- The "Network Exposure" or "Open Ports" panel is opened
- An admin views the Control Center security overview
- A scheduled background refresh runs for the org's security posture

### Request
```
GET /api/agent/port-audit/
Authorization: Token abc123
```

### Response `200`
```json
{
  "organization": "Acme Corp",
  "devices_scanned": 24,
  "risky_ports_found": 3,
  "port_audit": [
    {
      "port": 3389,
      "label": "RDP (3389) exposed",
      "affected_devices": [
        {
          "employee_id": "f1a2b3c4-...",
          "hostname": "LAPTOP-DEV01",
          "snapshot_id": "aaa...",
          "collected_at": "2026-05-01T08:00:00+00:00"
        },
        {
          "employee_id": "e5f6a7b8-...",
          "hostname": "DESKTOP-HR03",
          "snapshot_id": "ccc...",
          "collected_at": "2026-05-01T09:15:00+00:00"
        }
      ]
    },
    {
      "port": 22,
      "label": "SSH (22) exposed",
      "affected_devices": [
        {
          "employee_id": "f1a2b3c4-...",
          "hostname": "LAPTOP-DEV01",
          "snapshot_id": "aaa...",
          "collected_at": "2026-05-01T08:00:00+00:00"
        }
      ]
    }
  ]
}
```

**Notes:**
- Results are sorted by `affected_devices` count descending (most widespread port first).
- Only the most recent snapshot per employee is used; stale snapshots are not included.

---

## 5. Software Audit (Shadow IT)

**`GET /api/agent/software-audit/`**

Compares software found in each employee's latest snapshot against the organisation's approved software allowlist. Returns all unapproved software found across the fleet.

### Trigger
Fetched by the dashboard when:
- The "Shadow IT" or "Software Compliance" panel is opened
- An admin reviews the unapproved application inventory
- Scheduled compliance report generation runs

### Request
```
GET /api/agent/software-audit/
Authorization: Token abc123
```

### Response `200`
```json
{
  "organization": "Acme Corp",
  "approved_software_count": 12,
  "unapproved_software_count": 5,
  "unapproved_software": [
    {
      "software_name": "uTorrent 3.6",
      "install_count": 4,
      "devices": [
        {
          "employee_id": "f1a2b3c4-...",
          "employee_name": "Alice Martin",
          "hostname": "LAPTOP-DEV01"
        }
      ]
    },
    {
      "software_name": "TeamViewer 15.0",
      "install_count": 2,
      "devices": [...]
    }
  ]
}
```

**Notes:**
- Matching is case-insensitive substring: an approved entry of `"Microsoft Office"` will approve `"Microsoft Office 365"`, `"Microsoft Office 2021"`, etc.
- Results are sorted by `install_count` descending.
- Software with no name is skipped.

---

## 6. Manage Approved Software Allowlist

### List allowlist
**`GET /api/agent/approved-software/`**

```
GET /api/agent/approved-software/
Authorization: Token abc123
```

```json
{
  "approved_software": [
    {
      "id": "uuid...",
      "name": "Microsoft Office",
      "notes": "Standard productivity suite",
      "added_at": "2026-04-01T12:00:00+00:00"
    }
  ]
}
```

### Add to allowlist
**`POST /api/agent/approved-software/`**

```
POST /api/agent/approved-software/
Authorization: Token abc123
Content-Type: application/json
```
```json
{
  "name": "Microsoft Office",
  "notes": "Standard productivity suite — all versions approved"
}
```

Response `201` (new) or `200` (already existed):
```json
{
  "id": "uuid...",
  "name": "Microsoft Office",
  "notes": "Standard productivity suite — all versions approved",
  "created": true
}
```

### Remove from allowlist
**`DELETE /api/agent/approved-software/<entry_id>/`**

```
DELETE /api/agent/approved-software/uuid.../
Authorization: Token abc123
```

Response `200`:
```json
{
  "deleted": true,
  "id": "uuid..."
}
```

---

## Risk Score Reference

| Score | Level    |
|-------|----------|
| 80–100 | `low`    |
| 55–79  | `medium` |
| 30–54  | `high`   |
| 0–29   | `critical` |

### Penalty table

| Signal | Deduction |
|---|---|
| No antivirus detected | −20 |
| Antivirus present but not enabled | −15 |
| Antivirus out of date | −8 |
| Firewall disabled | −20 |
| Firewall status unknown | −8 |
| Disk encryption disabled | −15 |
| Disk encryption status unknown | −5 |
| OS not up to date | −15 |
| OS update status unknown | −5 |
| Current user is local admin | −10 |
| More than 2 local admin accounts | −8 |
| Processes running from suspicious paths | up to −15 |
| High-risk port open | −12 per port |
| Risk-flagged software installed | up to −15 |

---

## Network Device Monitoring (SNMP / NetFlow)

### `POST /api/agent/network-snapshot/`

Ingest telemetry collected from a **Cisco router, switch, or access point** via SNMP (pysnmp / net-snmp) or Telegraf. The backend scores the device health and stores the snapshot for trend analysis.

**Authentication:** `Authorization: Token <org_token>`

**Query param or body field:** `employee_id` (UUID of the submitting employee)

**Request body:**

```json
{
  "collectedAtUtc": "2026-05-02T11:00:00+00:00",
  "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "device": {
    "ip": "192.168.1.1",
    "hostname": "core-switch-01",
    "type": "switch",
    "vendor": "Cisco",
    "sysDescr": "Cisco IOS Software, Version 15.2(7)E4"
  },
  "interfaces": [
    {
      "name": "GigabitEthernet0/1",
      "operStatus": "up",
      "ifInErrors": 0,
      "ifOutErrors": 0
    },
    {
      "name": "GigabitEthernet0/2",
      "operStatus": "down",
      "ifInErrors": 0,
      "ifOutErrors": 0
    }
  ],
  "traffic": {
    "inBytes": 1234567890,
    "outBytes": 987654321
  }
}
```

**Field reference:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `collectedAtUtc` | ISO 8601 datetime | ✅ | When the data was collected on the device |
| `employee_id` | UUID string | ✅ | Can also be passed as `?employee_id=` query param |
| `device.ip` | string (IP) | — | Device management IP |
| `device.hostname` | string | — | SNMP sysName or DNS hostname |
| `device.type` | string | — | `router` / `switch` / `ap` |
| `device.vendor` | string | — | e.g. `Cisco`, `Juniper`, `Ubiquiti` |
| `device.sysDescr` | string | — | SNMP OID 1.3.6.1.2.1.1.1.0 |
| `interfaces[]` | array | — | One entry per network interface |
| `interfaces[].name` | string | — | Interface name (e.g. `Gi0/1`) |
| `interfaces[].operStatus` | string | — | `up` or `down` (or SNMP integer `1`/`2`) |
| `interfaces[].ifInErrors` | int | — | Inbound error counter |
| `interfaces[].ifOutErrors` | int | — | Outbound error counter |
| `traffic.inBytes` | int | — | Total received bytes (NetFlow / SNMP counter) |
| `traffic.outBytes` | int | — | Total transmitted bytes |

> All fields except `collectedAtUtc` and `employee_id` are optional. Missing fields produce no risk penalty — they are stored as-is in `raw`.

**Success response `201 Created`:**

```json
{
  "id": "a1b2c3d4-...",
  "received_at": "2026-05-02T11:00:01.123456+00:00",
  "risk": {
    "score": 80,
    "level": "low",
    "signals": []
  }
}
```

**Risk scoring — Network:**

| Signal | Penalty |
|---|---|
| 1 interface down | −10 per interface (max −30) |
| Interface error count > 1,000 | −8 per interface (max −25) |
| No interface data reported | −10 |

**How to collect SNMP data (Python):**

```bash
pip install pysnmp
```

```python
from pysnmp.hlapi import *
import json, datetime

def snmp_get(host, oid, community="public"):
    iterator = getCmd(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((host, 161)),
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
    )
    errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
    if errorIndication or errorStatus:
        return None
    return str(varBinds[0][1])

payload = {
    "collectedAtUtc": datetime.datetime.utcnow().isoformat() + "+00:00",
    "employee_id": "<uuid>",
    "device": {
        "ip": "192.168.1.1",
        "sysDescr": snmp_get("192.168.1.1", "1.3.6.1.2.1.1.1.0"),
    },
    # Populate interfaces[] from ifTable (OID 1.3.6.1.2.1.2.2.1)
}
```

**Errors:**

| Status | Error |
|---|---|
| `400` | `collectedAtUtc` missing or invalid format |
| `400` | `employee_id` missing |
| `404` | Employee not found or does not belong to org |
| `401` | Missing or invalid org token |

---

## Server & Workstation System Metrics

### `POST /api/agent/system-metrics/`

Ingest **CPU, RAM, and process** telemetry from **Node Exporter** (Prometheus), **Telegraf**, or any custom script. Used to monitor server load, detect resource saturation, and flag zombie processes.

**Authentication:** `Authorization: Token <org_token>`

**Request body:**

```json
{
  "collectedAtUtc": "2026-05-02T11:00:00+00:00",
  "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "hostname": "prod-server-01",
  "cpu": {
    "usagePercent": 45.2,
    "cores": 8,
    "load1m": 2.1,
    "load5m": 1.8,
    "load15m": 1.5
  },
  "memory": {
    "totalMb": 16384,
    "usedMb": 12000,
    "usagePercent": 73.2,
    "swapUsagePercent": 10.0
  },
  "processes": {
    "total": 312,
    "zombies": 0,
    "topByCpu": [
      { "name": "chrome.exe", "pid": 1234, "cpuPercent": 18.5 },
      { "name": "python.exe", "pid": 5678, "cpuPercent": 12.1 }
    ]
  }
}
```

**Field reference:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `collectedAtUtc` | ISO 8601 datetime | ✅ | |
| `employee_id` | UUID string | ✅ | |
| `hostname` | string | — | Machine hostname |
| `cpu.usagePercent` | float | — | Overall CPU usage 0–100 |
| `cpu.cores` | int | — | Logical core count (used to normalise load avg) |
| `cpu.load1m` | float | — | 1-minute load average |
| `cpu.load5m` | float | — | 5-minute load average |
| `cpu.load15m` | float | — | 15-minute load average |
| `memory.totalMb` | int | — | Total installed RAM in MB |
| `memory.usedMb` | int | — | Used RAM in MB |
| `memory.usagePercent` | float | — | RAM usage 0–100 |
| `memory.swapUsagePercent` | float | — | Swap usage 0–100 |
| `processes.total` | int | — | Total running processes |
| `processes.zombies` | int | — | Zombie (defunct) process count |
| `processes.topByCpu` | array | — | Top processes by CPU (name, pid, cpuPercent) |

**Success response `201 Created`:**

```json
{
  "id": "b2c3d4e5-...",
  "received_at": "2026-05-02T11:00:02.000000+00:00",
  "risk": {
    "score": 90,
    "level": "low",
    "signals": []
  }
}
```

**Risk scoring — System Metrics:**

| Signal | Penalty |
|---|---|
| CPU usage ≥ 95% | −20 |
| CPU usage ≥ 80% | −10 |
| Load avg / cores ≥ 2.0 | −15 |
| Load avg / cores ≥ 1.0 | −7 |
| RAM usage ≥ 95% | −20 |
| RAM usage ≥ 85% | −10 |
| Swap usage ≥ 80% | −10 |
| Zombie processes ≥ 5 | −10 |
| Zombie processes > 0 | −3 |

**How to collect with Node Exporter / Telegraf (Linux):**

```bash
# Node Exporter exposes /metrics — scrape and convert to this schema
curl http://localhost:9100/metrics | grep -E "^(node_cpu|node_memory|node_load)"
```

```bash
# Telegraf with outputs.http plugin — configure to POST to this endpoint
[outputs.http]
  url = "http://localhost:8000/api/agent/system-metrics/?employee_id=<uuid>"
  method = "POST"
  data_format = "json"
```

**Errors:**

| Status | Error |
|---|---|
| `400` | `collectedAtUtc` missing or invalid |
| `400` | `employee_id` missing |
| `404` | Employee not found |
| `401` | Invalid org token |

---

## Disk Health (SMART)

### `POST /api/agent/disk-health/`

Ingest **SMART diagnostic data** from `smartctl` or `pySMART` for a **single physical disk**. Send one request per disk. The backend scores failure risk based on reallocated sectors, pending sectors, temperature, and power-on hours.

**Authentication:** `Authorization: Token <org_token>`

**Request body:**

```json
{
  "collectedAtUtc": "2026-05-02T11:00:00+00:00",
  "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "hostname": "DESKTOP-M7DKHI4",
  "device": {
    "path": "/dev/sda",
    "model": "Samsung SSD 870 EVO 500GB",
    "serial": "S4PBNX0T123456",
    "capacityGb": 500,
    "type": "SSD"
  },
  "smart": {
    "health": "PASSED",
    "reallocatedSectors": 0,
    "pendingSectors": 0,
    "uncorrectableErrors": 0,
    "powerOnHours": 4821,
    "temperatureC": 38
  }
}
```

**Field reference:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `collectedAtUtc` | ISO 8601 datetime | ✅ | |
| `employee_id` | UUID string | ✅ | |
| `hostname` | string | — | Machine the disk is installed in |
| `device.path` | string | — | `/dev/sda` on Linux, `PhysicalDrive0` on Windows |
| `device.model` | string | — | Disk model string |
| `device.serial` | string | — | Disk serial number |
| `device.capacityGb` | float | — | Formatted capacity in GB |
| `device.type` | string | — | `HDD` / `SSD` / `NVMe` |
| `smart.health` | string | — | `PASSED` / `FAILED` / `UNKNOWN` |
| `smart.reallocatedSectors` | int | — | SMART attribute 5 — remapped bad sectors |
| `smart.pendingSectors` | int | — | SMART attribute 197 — unstable sectors |
| `smart.uncorrectableErrors` | int | — | SMART attribute 198 — offline uncorrectable |
| `smart.powerOnHours` | int | — | SMART attribute 9 — total drive runtime |
| `smart.temperatureC` | int | — | Current drive temperature |

**Success response `201 Created`:**

```json
{
  "id": "c3d4e5f6-...",
  "received_at": "2026-05-02T11:00:03.000000+00:00",
  "risk": {
    "score": 95,
    "level": "low",
    "signals": []
  }
}
```

**Risk scoring — Disk Health:**

| Signal | Penalty |
|---|---|
| SMART health = `FAILED` | −40 |
| SMART health = `UNKNOWN` | −5 |
| Reallocated sectors ≥ 50 | −25 |
| Reallocated sectors ≥ 10 | −15 |
| Reallocated sectors > 0 | −5 |
| Pending sectors > 0 | −2 per sector (max −20) |
| Uncorrectable errors > 0 | −4 per error (max −20) |
| Temperature ≥ 60°C | −15 |
| Temperature ≥ 50°C | −7 |
| Power-on hours ≥ end-of-life threshold | −10 |
| Power-on hours ≥ 75% of threshold | −5 |

> End-of-life threshold: **35,000 h** for HDD, **40,000 h** for SSD/NVMe.

**How to collect SMART data:**

```bash
# Linux / macOS
sudo smartctl -a /dev/sda -j   # -j = JSON output

# Windows (PowerShell) — requires smartmontools
smartctl -a /dev/sda -j
```

```python
# pySMART (Python)
pip install pySMART

from pySMART import Device
import json, datetime

disk = Device("/dev/sda")
payload = {
    "collectedAtUtc": datetime.datetime.utcnow().isoformat() + "+00:00",
    "employee_id": "<uuid>",
    "hostname": "my-server",
    "device": {
        "path": "/dev/sda",
        "model": disk.model,
        "serial": disk.serial,
        "type": disk.interface.upper(),
    },
    "smart": {
        "health": "PASSED" if disk.assessment == "PASS" else "FAILED",
        "reallocatedSectors": int(disk.attributes[5].raw) if disk.attributes[5] else None,
        "pendingSectors":     int(disk.attributes[197].raw) if disk.attributes[197] else None,
        "uncorrectableErrors":int(disk.attributes[198].raw) if disk.attributes[198] else None,
        "powerOnHours":       int(disk.attributes[9].raw)   if disk.attributes[9]   else None,
        "temperatureC":       int(disk.attributes[194].raw) if disk.attributes[194] else None,
    }
}
```

**Errors:**

| Status | Error |
|---|---|
| `400` | `collectedAtUtc` missing or invalid |
| `400` | `employee_id` missing |
| `404` | Employee not found |
| `401` | Invalid org token |

---

## Risk Level Reference (all agent endpoints)

| Score | Level |
|---|---|
| 80 – 100 | `low` ✅ |
| 55 – 79 | `medium` ⚠️ |
| 30 – 54 | `high` 🔴 |
| 0 – 29 | `critical` 💀 |

All three new endpoints return the same `{ score, level, signals }` risk block as the existing `POST /api/agent/snapshot/` endpoint.
