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
