# Data Warehouse API Reference

> **Intended audience:** Frontend developers, BI integrators, backend contributors.

All endpoints require:
```
Authorization: Token <org_token>
```

Base URL (development): `http://localhost:8000/api/`

No models, no migrations. Every endpoint reads from existing tables in `agent`, `phishing`, `gamification`, and `organizations`.

---

## 1. Org Summary

**`GET /api/dw/summary/`**

Returns a single JSON object combining all security dimensions for the organisation. Designed for the top-level dashboard overview page.

### Request
```
GET /api/dw/summary/
Authorization: Token abc123
```

### Response `200`
```json
{
  "organization": "Acme Corp",
  "employees": {
    "total": 30,
    "active": 28
  },
  "phishing": {
    "campaigns_total": 6,
    "campaigns_draft": 1,
    "campaigns_active": 1,
    "campaigns_completed": 4,
    "simulations_sent": 140,
    "total_clicks": 42,
    "click_rate": 30.0,
    "training_enrolled": 40,
    "training_completed": 31,
    "training_completion_rate": 77.5
  },
  "quiz": {
    "quizzes_total": 8,
    "batches_total": 5,
    "total_assigned": 95,
    "total_submitted": 78,
    "correct_total": 54,
    "completion_rate": 82.1,
    "correct_rate": 69.2
  },
  "device": {
    "snapshots_total": 420,
    "devices_reporting": 22,
    "avg_risk_score": 74.3,
    "risk_level_distribution": {
      "low": 12,
      "medium": 7,
      "high": 2,
      "critical": 1
    },
    "top_signals": [
      { "signal": "Firewall status unknown", "affected_devices": 9 },
      { "signal": "OS is not up to date", "affected_devices": 7 },
      { "signal": "Current user has local admin privileges", "affected_devices": 5 }
    ]
  },
  "leaderboard_top3": [
    { "name": "Alice Martin", "department": "Engineering", "score": 12 },
    { "name": "Bob Chen", "department": "Finance", "score": 9 },
    { "name": "Sara Ali", "department": "HR", "score": 7 }
  ]
}
```

**Field notes:**
- `click_rate` = `total_clicks / simulations_sent × 100`
- `completion_rate` (quiz) = `submitted / assigned × 100`
- `correct_rate` = `correct / submitted × 100`
- `leaderboard_top3` uses score formula: `+1 per correct quiz answer − 5 per phishing click`
- `devices_reporting` = distinct employees with at least one snapshot

---

## 2. Per-Employee Full Report

**`GET /api/dw/employees/`**

Returns one object per active employee with their phishing, quiz, and device data merged. Used for the employee detail table or the "deep dive" panel.

### Request
```
GET /api/dw/employees/
Authorization: Token abc123
```

### Response `200`
```json
{
  "total": 28,
  "employees": [
    {
      "employee_id": "f1a2b3c4-...",
      "name": "Alice Martin",
      "email": "alice@acme.com",
      "department": "Engineering",
      "role": "Backend Developer",
      "seniority": "senior",
      "phishing": {
        "simulations_sent": 5,
        "clicks": 1,
        "click_rate": 20.0,
        "training_completed": 1
      },
      "quiz": {
        "assigned": 3,
        "submitted": 3,
        "correct": 2,
        "correct_rate": 66.7
      },
      "device": {
        "latest_risk_score": 85,
        "latest_risk_level": "low",
        "hostname": "LAPTOP-DEV01",
        "os_name": "Windows 11",
        "last_seen": "2026-05-01T08:00:00+00:00",
        "top_signals": []
      },
      "leaderboard_score": 2,
      "leaderboard_rank": 3
    }
  ]
}
```

**Field notes:**
- Sorted by `leaderboard_rank` ascending (best performers first).
- `device` fields are `null` if no snapshot has been received for that employee.
- `top_signals` shows the first 3 risk signals from the employee's latest device snapshot.

---

## 3. Monthly Trend

**`GET /api/dw/trend/?months=<N>`**

Returns aggregated metrics grouped by calendar month, covering the last N months. Used for line/area charts on the dashboard. Default: 6 months. Max: 24.

### Request
```
GET /api/dw/trend/?months=6
Authorization: Token abc123
```

### Response `200`
```json
{
  "months_requested": 6,
  "data_points": 4,
  "trend": [
    {
      "month": "2026-02",
      "phishing": {
        "simulations_sent": 20,
        "clicks": 8,
        "click_rate": 40.0
      },
      "quiz": {
        "submissions": 15,
        "correct": 10,
        "correct_rate": 66.7
      },
      "device": {
        "snapshots_received": 60,
        "avg_risk_score": 68.5
      }
    },
    {
      "month": "2026-03",
      "phishing": { "simulations_sent": 25, "clicks": 7, "click_rate": 28.0 },
      "quiz": { "submissions": 20, "correct": 15, "correct_rate": 75.0 },
      "device": { "snapshots_received": 80, "avg_risk_score": 72.1 }
    }
  ]
}
```

**Field notes:**
- Only months that have at least one data point appear in the array.
- `months_requested=1` returns the current partial month only.
- `avg_risk_score` is `null` for months with no device snapshots.
- Months are in `YYYY-MM` format — sort lexicographically for correct order.

---

## 4. Bulk Export

**`GET /api/dw/export/<resource>/?format=json|csv`**

Exports raw rows from a specific data resource. Designed for BI tools (Power BI, Tableau, Excel) or data pipeline ingestion.

### Resources

| Resource | What it contains |
|---|---|
| `employees` | All employee records for the org |
| `phishing` | All simulation targets across all campaigns |
| `devices` | All device snapshots |
| `quizzes` | All quiz submissions |

### Format options

| `?format=` | Response |
|---|---|
| `json` (default) | `Content-Type: application/json` — `{resource, count, data: [...]}` |
| `csv` | `Content-Type: text/csv` — file download |

---

### 4a. Export Employees

```
GET /api/dw/export/employees/?format=csv
Authorization: Token abc123
```

**JSON response:**
```json
{
  "resource": "employees",
  "count": 28,
  "data": [
    {
      "id": "f1a2b3c4-...",
      "name": "Alice Martin",
      "email": "alice@acme.com",
      "department": "Engineering",
      "role": "Backend Developer",
      "seniority": "senior",
      "is_active": true,
      "registered_at": "2025-11-01T10:00:00+00:00"
    }
  ]
}
```

**CSV columns:** `id, name, email, department, role, seniority, is_active, registered_at`

---

### 4b. Export Phishing

```
GET /api/dw/export/phishing/?format=csv
Authorization: Token abc123
```

**JSON response:**
```json
{
  "resource": "phishing",
  "count": 140,
  "data": [
    {
      "target_id": "...",
      "campaign_id": "...",
      "campaign_name": "May IT Reset Test",
      "campaign_status": "COMPLETED",
      "employee_id": "...",
      "employee_email": "alice@acme.com",
      "employee_name": "Alice Martin",
      "department": "Engineering",
      "attack_type": "IT_RESET",
      "language": "EN",
      "difficulty": 2,
      "sent_at": "2026-05-01T08:00:00+00:00",
      "clicked_at": "2026-05-01T08:43:00+00:00",
      "clicked": true
    }
  ]
}
```

**CSV columns:** `target_id, campaign_id, campaign_name, campaign_status, employee_id, employee_email, employee_name, department, attack_type, language, difficulty, sent_at, clicked_at, clicked`

---

### 4c. Export Devices

```
GET /api/dw/export/devices/?format=csv
Authorization: Token abc123
```

**JSON response:**
```json
{
  "resource": "devices",
  "count": 420,
  "data": [
    {
      "snapshot_id": "...",
      "employee_id": "...",
      "employee_name": "Alice Martin",
      "hostname": "LAPTOP-DEV01",
      "os_name": "Windows 11",
      "os_version": "22H2",
      "architecture": "x86_64",
      "is_admin": false,
      "local_admin_count": 1,
      "risk_score": 85,
      "risk_level": "low",
      "risk_signals_count": 0,
      "collected_at": "2026-05-01T08:00:00+00:00",
      "received_at": "2026-05-01T08:00:05+00:00"
    }
  ]
}
```

**CSV columns:** `snapshot_id, employee_id, employee_name, hostname, os_name, os_version, architecture, is_admin, local_admin_count, risk_score, risk_level, risk_signals_count, collected_at, received_at`

> Note: Full `risk_signals` array is not included in the export — only `risk_signals_count`. Use the Agent API for the full signal list per snapshot.

---

### 4d. Export Quizzes

```
GET /api/dw/export/quizzes/?format=csv
Authorization: Token abc123
```

**JSON response:**
```json
{
  "resource": "quizzes",
  "count": 78,
  "data": [
    {
      "submission_id": "...",
      "employee_id": "...",
      "employee_name": "Alice Martin",
      "email": "alice@acme.com",
      "quiz_id": "...",
      "quiz_question": "What is phishing?",
      "answer_selected": "b",
      "is_correct": true,
      "submitted_at": "2026-05-01T09:15:00+00:00"
    }
  ]
}
```

**CSV columns:** `submission_id, employee_id, employee_name, email, quiz_id, quiz_question, answer_selected, is_correct, submitted_at`

---

## Endpoint Summary

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/api/dw/summary/` | Org-level combined dashboard summary |
| `GET` | `/api/dw/employees/` | Per-employee merged report (phishing + quiz + device) |
| `GET` | `/api/dw/trend/?months=N` | Monthly time-series across all dimensions |
| `GET` | `/api/dw/export/employees/?format=csv\|json` | Bulk employee export |
| `GET` | `/api/dw/export/phishing/?format=csv\|json` | Bulk phishing simulation export |
| `GET` | `/api/dw/export/devices/?format=csv\|json` | Bulk device snapshot export |
| `GET` | `/api/dw/export/quizzes/?format=csv\|json` | Bulk quiz submission export |

---

## Leaderboard Score Formula

```
score = (correct_quiz_answers × 1) − (phishing_clicks × 5)
```

A higher score means better security awareness. A negative score means the employee clicked on more phishing simulations than they answered quiz questions correctly.

---

## Authentication

All endpoints use the same token as the rest of the API:
```
Authorization: Token <org_token>
```
The token is scoped to the organisation — all data returned is isolated to that org.
