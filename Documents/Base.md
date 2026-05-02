# CyberBase - Main Project Document

**Project Name:** CyberBase  
**Track:** Innobyte 2.0 - Track A: Cybersecurity & Digital Governance  
**Problematic:** Problematic 1 - Cyber Maturity Cockpit  
**Audience:** SMEs, schools, factories, and small organizations with little or no IT staff  
**Status:** Incomplete working template  
**Version:** 0.1  

---

<!-- PAGE BREAK -->

# 1. Solution

## 1.1 Overview

CyberBase is a **Zero-IT Cyber Maturity Cockpit** designed for small Algerian organizations that do not have a dedicated cybersecurity team.

The system collects simple security signals from:

- **Desktop App**
- **Browser Extension**
- **Backend**
- **Database**
- Future modules such as network scanning, email monitoring, and phishing simulations

The goal is not to overwhelm the user with technical cybersecurity terms, but to translate cyber risks into simple business language.

Example:

> Instead of saying: "Endpoint has weak hygiene posture"  
> CyberBase says: "Amina's PC may expose the company to ransomware risk."

---

## 1.2 Core Product Idea

CyberBase acts like a lightweight **Virtual CISO** for non-technical business owners.

It helps the CEO/admin:

- See company security status
- Detect risky devices or users
- Understand exposure in simple terms
- Trigger simple actions
- Generate compliance-style reports
- Track security maturity over time

---

## 1.3 Main Solution Stack

| Layer | Technology |
|---|---|
| Desktop App | Tauri + ReactJS + TypeScript + TailwindCSS |
| Browser Extension | TypeScript |
| Backend API | Django REST Framework |
| Database | Supabase |
| Frontend UI | ReactJS + TailwindCSS |
| Auth | Supabase Auth / TODO |
| Reports | Backend-generated PDF / TODO |
| Notifications | Email / WhatsApp / SMS / TODO |

---

## 1.4 Main Modules

### 1.4.1 Desktop Sentinel

Collects basic security posture data from employee computers.

Main checks:

- OS information
- Firewall status
- Antivirus status
- Screen lock status
- Installed risky software
- Admin privilege status
- Device identity

---

### 1.4.2 Web Guard Extension

Protects employees while browsing.

Main checks:

- Dangerous URLs
- HTTP password input
- Suspicious uploads
- Uploads to unapproved AI tools
- Phishing-like pages
- Unsafe file-sharing websites

---

### 1.4.3 Backend Core

Central API responsible for:

- Receiving device signals
- Receiving extension events
- Storing security events
- Calculating risk scores
- Generating admin dashboard data
- Managing organizations, users, devices, and incidents

---

### 1.4.4 Risk-to-DZD Engine

Converts technical events into simple business impact.

Example:

```txt
Risk = Severity x Probability x Business Impact
```

Output example:

```txt
Estimated exposure: 250,000 DZD
```

---

### 1.4.5 CEO/Admin Dashboard

The dashboard shows:

* Company risk overview
* Devices status
* Employees security status
* Recent alerts
* Recommended actions
* Compliance progress
* Reports

---

<!-- PAGE BREAK -->

# 2. Desktop App

## 2.1 Purpose

The Desktop App is installed on employee computers to collect basic cybersecurity hygiene data.

It should be lightweight, simple, and not look like complex enterprise security software.

---

## 2.2 Tech Stack

| Part              | Technology                  |
| ----------------- | --------------------------- |
| App Shell         | Tauri                       |
| UI                | ReactJS                     |
| Language          | TypeScript                  |
| Styling           | TailwindCSS                 |
| API Communication | REST                        |
| Local Storage     | Tauri Store / SQLite / TODO |
| OS Commands       | Tauri backend commands      |

---

## 2.3 Main Features

### Done

* TODO

### In Progress

* TODO

### To Do

* Device registration
* Send device health data to backend
* Detect OS type/version
* Detect firewall status
* Detect antivirus status
* Detect screen lock status
* Detect installed applications
* Detect risky apps
* Detect admin privileges
* Show local device status to user
* Sync periodically with backend

---

## 2.4 Desktop App Pages

### 2.4.1 Welcome Page

Purpose:

* Introduce CyberBase to the employee
* Explain that the app checks basic security hygiene
* Ask for organization/device connection

Fields:

* Organization code
* Employee email
* Device name

Actions:

* Connect device
* Continue

---

### 2.4.2 Device Status Page

Shows the employee their current device health.

Sections:

* Firewall status
* Antivirus status
* OS update status
* Screen lock status
* Risky software status

Example states:

* Safe
* Warning
* Critical
* Unknown

---

### 2.4.3 Fix Guide Page

Shows simple instructions when something is wrong.

Example:

> Your firewall is disabled.
> Click below to open Windows Defender settings.

Actions:

* Open system settings
* Mark as fixed
* Recheck device

---

### 2.4.4 Background Sync Status Page

Shows whether the desktop app is connected to the backend.

Data shown:

* Last sync time
* Device ID
* Organization name
* Connection status

---

## 2.5 Needed Permissions

Desktop app may need permission to:

* Read OS version
* Read installed applications
* Check firewall status
* Check antivirus status
* Check screen lock configuration
* Run local system commands
* Send device status to backend

TODO:

* Define exact Windows permissions
* Define exact macOS permissions
* Define what can be done without admin access

---

## 2.6 Desktop Data Sent to Backend

```json
{
  "device_id": "string",
  "organization_id": "string",
  "employee_id": "string",
  "os": "Windows 11",
  "firewall_enabled": true,
  "antivirus_enabled": true,
  "screen_lock_enabled": false,
  "is_admin": true,
  "risky_apps": ["AnyDesk", "uTorrent"],
  "last_scan_at": "2026-05-02T12:00:00Z"
}
```

---

<!-- PAGE BREAK -->

# 3. Backend

## 3.1 Purpose

The backend is the central brain of CyberBase.

It receives signals from the Desktop App and Browser Extension, stores them, calculates risks, and exposes clean APIs for the dashboard.

---

## 3.2 Tech Stack

| Part              | Technology               |
| ----------------- | ------------------------ |
| Backend Framework | Django REST Framework    |
| Database          | Supabase                 |
| Auth              | Supabase Auth / TODO     |
| API Style         | REST                     |
| File Storage      | Supabase Storage / TODO  |
| Background Jobs   | Celery / Django Q / TODO |
| Deployment        | TODO                     |

---

## 3.3 Backend Responsibilities

The backend handles:

* Organizations
* Users/employees
* Devices
* Browser extension events
* Desktop app scans
* Risk calculation
* Alerts
* Recommended actions
* Reports
* Audit logs
* API authentication

---

## 3.4 Database Entities

### Organization

Fields:

* id
* name
* industry
* company_size
* daily_revenue_estimate
* created_at

---

### User / Employee

Fields:

* id
* organization_id
* full_name
* email
* role
* department
* risk_score
* created_at

---

### Device

Fields:

* id
* organization_id
* employee_id
* device_name
* os
* status
* risk_score
* last_seen_at

---

### Desktop Scan

Fields:

* id
* device_id
* firewall_enabled
* antivirus_enabled
* screen_lock_enabled
* os_updated
* risky_apps
* admin_privileges
* created_at

---

### Extension Event

Fields:

* id
* organization_id
* employee_id
* device_id
* event_type
* url
* severity
* blocked
* metadata
* created_at

---

### Alert

Fields:

* id
* organization_id
* source
* title
* description
* severity
* status
* estimated_dzd_risk
* created_at

---

### Audit Log

Fields:

* id
* organization_id
* actor_id
* action
* target_type
* target_id
* metadata
* created_at

---

## 3.5 API Documentation Template

> This section is very important. Every endpoint must clearly define input, output, auth, and errors.

---

## 3.5.1 API Rules

Base URL:

```txt
/api/v1/
```

Response format:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Error format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## 3.5.2 Auth API

### POST `/auth/login`

Purpose:

Authenticate admin/user.

Input:

```json
{
  "email": "admin@company.com",
  "password": "password"
}
```

Output:

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "string",
    "email": "admin@company.com",
    "role": "admin"
  }
}
```

Status:

* TODO

---

## 3.5.3 Organization API

### GET `/organizations/me`

Purpose:

Get current organization profile.

Input:

```json
{}
```

Output:

```json
{
  "id": "string",
  "name": "Company Name",
  "industry": "Factory",
  "company_size": 25,
  "daily_revenue_estimate": 100000
}
```

---

## 3.5.4 Desktop App API

### POST `/desktop/register-device`

Purpose:

Register a new employee device.

Input:

```json
{
  "organization_code": "ABC123",
  "employee_email": "amina@company.com",
  "device_name": "Amina Laptop",
  "os": "Windows 11"
}
```

Output:

```json
{
  "device_id": "string",
  "employee_id": "string",
  "organization_id": "string"
}
```

---

### POST `/desktop/scan`

Purpose:

Receive desktop security scan data.

Input:

```json
{
  "device_id": "string",
  "firewall_enabled": true,
  "antivirus_enabled": true,
  "screen_lock_enabled": false,
  "os_updated": true,
  "admin_privileges": false,
  "risky_apps": ["AnyDesk"]
}
```

Output:

```json
{
  "scan_id": "string",
  "device_risk_score": 42,
  "alerts_created": [
    {
      "id": "string",
      "title": "Screen lock disabled",
      "severity": "medium"
    }
  ]
}
```

---

### GET `/desktop/device-status/:device_id`

Purpose:

Return current device status.

Output:

```json
{
  "device_id": "string",
  "status": "warning",
  "risk_score": 42,
  "issues": [
    {
      "type": "screen_lock_disabled",
      "severity": "medium",
      "message": "Screen lock is disabled"
    }
  ]
}
```

---

## 3.5.5 Extension API

### POST `/extension/event`

Purpose:

Receive security event from browser extension.

Input:

```json
{
  "device_id": "string",
  "employee_id": "string",
  "event_type": "blocked_upload",
  "url": "https://example.com/upload",
  "severity": "high",
  "blocked": true,
  "metadata": {
    "file_type": "pdf",
    "reason": "Public AI tool upload"
  }
}
```

Output:

```json
{
  "event_id": "string",
  "alert_created": true,
  "risk_score_added": 20
}
```

---

### GET `/extension/policy`

Purpose:

Return extension rules and blocked domains.

Output:

```json
{
  "blocked_domains": [
    "malicious-site.com",
    "fake-login.com"
  ],
  "monitored_upload_domains": [
    "chat.openai.com",
    "file-converter.com"
  ],
  "http_password_warning": true
}
```

---

## 3.5.6 Dashboard API

### GET `/dashboard/overview`

Purpose:

Return main CEO cockpit data.

Output:

```json
{
  "current_financial_exposure_dzd": 2500000,
  "company_risk_score": 68,
  "devices_total": 12,
  "devices_at_risk": 4,
  "critical_alerts": 2,
  "human_defense_score": 85
}
```

---

### GET `/dashboard/alerts`

Purpose:

Return alerts list.

Output:

```json
{
  "alerts": [
    {
      "id": "string",
      "title": "Risky software detected",
      "severity": "high",
      "source": "desktop",
      "estimated_dzd_risk": 300000,
      "status": "open"
    }
  ]
}
```

---

### POST `/dashboard/actions/:alert_id/resolve`

Purpose:

Mark alert as resolved or trigger a fix flow.

Input:

```json
{
  "action_type": "send_fix_guide",
  "target_employee_id": "string"
}
```

Output:

```json
{
  "resolved": false,
  "action_sent": true,
  "message": "Fix guide sent to employee"
}
```

---

## 3.5.7 Reports API

### POST `/reports/generate`

Purpose:

Generate cyber maturity report.

Input:

```json
{
  "organization_id": "string",
  "period": "monthly",
  "format": "pdf"
}
```

Output:

```json
{
  "report_id": "string",
  "download_url": "string",
  "status": "generated"
}
```

---

## 3.6 Backend TODO

* Finalize database schema
* Finalize Supabase auth integration
* Define all risk calculation formulas
* Define alert severity rules
* Define dashboard aggregation queries
* Define report generation system
* Define API authentication method
* Add rate limiting
* Add audit logging
* Add validation for all inputs

---

<!-- PAGE BREAK -->

# 4. Browser Extension

## 4.1 Purpose

The Browser Extension protects employees from risky web behavior and sends security events to the backend.

It should work silently most of the time, only interrupting the user when something is risky.

---

## 4.2 Tech Stack

| Part              | Technology         |
| ----------------- | ------------------ |
| Language          | TypeScript         |
| Browser Target    | Chrome / Chromium  |
| Manifest          | Manifest V3        |
| API Communication | REST               |
| Storage           | Chrome Storage API |

---

## 4.3 Main Features

### Done

* TODO

### In Progress

* TODO

### To Do

* Detect unsafe HTTP pages
* Warn when password is typed on HTTP
* Detect uploads to risky domains
* Block specific domains
* Send events to backend
* Fetch security policy from backend
* Show warning popup
* Show blocked page
* Identify employee/device
* Support organization-specific rules

---

## 4.4 Extension Pages / UI

### 4.4.1 Popup Page

Shown when employee clicks the extension icon.

Displays:

* Protection status
* Connected organization
* Last sync time
* Number of blocked actions

---

### 4.4.2 Warning Popup

Shown when risky behavior is detected.

Example:

> This website is not secure.
> Do not enter your password here.

Actions:

* Go back
* Continue anyway / TODO permission rule
* Report false positive

---

### 4.4.3 Blocked Upload Page

Shown when the extension blocks a file upload.

Example:

> Upload blocked.
> This file may contain company data and the website is not approved.

Actions:

* Cancel upload
* Request approval
* Learn why

---

### 4.4.4 Training Page

Used for fake stakes / human firewall training.

Example:

> This was a simulated phishing test.
> Here is what gave it away.

---

## 4.5 Needed Permissions

Chrome extension permissions:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "webRequest",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

TODO:

* Reduce permissions if possible
* Confirm Manifest V3 limitations
* Define exact upload-blocking method
* Define privacy boundaries

---

## 4.6 Extension Data Sent to Backend

```json
{
  "device_id": "string",
  "employee_id": "string",
  "event_type": "http_password_warning",
  "url": "http://example.com/login",
  "severity": "high",
  "blocked": true,
  "metadata": {
    "field_detected": "password"
  }
}
```

---

<!-- PAGE BREAK -->

# 5. Dashboard

## 5.1 Purpose

The dashboard is for the CEO/admin, not a cybersecurity expert.

It must be clear, simple, and action-focused.

---

## 5.2 Main Pages

### 5.2.1 Overview Page

Shows:

* Current financial exposure in DZD
* Company risk score
* Critical alerts
* Devices at risk
* Human defense score
* Recommended actions

---

### 5.2.2 Devices Page

Shows:

* All devices
* Owner
* OS
* Last seen
* Risk score
* Current issues

---

### 5.2.3 Employees Page

Shows:

* Employee list
* Assigned devices
* Security behavior score
* Training status
* Recent issues

---

### 5.2.4 Alerts Page

Shows:

* Alert title
* Severity
* Source
* Affected user/device
* Estimated DZD risk
* Status
* Recommended action

---

### 5.2.5 Reports Page

Shows:

* Generate report button
* Monthly reports
* Compliance mapping
* Download PDF

---

### 5.2.6 Settings Page

Shows:

* Organization info
* Risk settings
* Approved domains
* Blocked domains
* Employee management
* Notification settings

---

<!-- PAGE BREAK -->

# 6. Current Development Priorities

## 6.1 Must Build First

1. Backend API foundation
2. Supabase schema
3. Desktop app basic scan
4. Extension basic event detection
5. Dashboard overview page
6. Alert creation flow

---

## 6.2 Hackathon Demo Scope

The demo should show:

* Desktop app sends device issue
* Extension blocks unsafe behavior
* Backend receives events
* Dashboard updates risk score
* CEO sees simple action
* Report generation is shown as prototype

---

## 6.3 Nice To Have

* WhatsApp/SMS fix guide
* AI cyber coach
* Phishing simulation
* Compliance PDF
* Network scanner
* Email anomaly detection

---

<!-- PAGE BREAK -->

# 7. Open Decisions

## 7.1 Product Decisions

* Should employees see their own risk score?
* Can employees bypass extension warnings?
* Should CEO see employee names or anonymized behavior?
* How aggressive should blocking be?

---

## 7.2 Technical Decisions

* Supabase Auth or custom Django auth?
* Celery or simple scheduled jobs?
* How to securely identify desktop devices?
* How often should desktop app sync?
* How often should extension fetch policy?
* How to generate reports?

---

## 7.3 Privacy Decisions

* What browser data is stored?
* Should full URLs be stored or only domains?
* Should installed software names be fully stored?
* How long are security events retained?

---

# 8. Glossary

| Term             | Meaning                                      |
| ---------------- | -------------------------------------------- |
| CyberBase        | The project/product name                     |
| Desktop Sentinel | Desktop app security checker                 |
| Web Guard        | Browser extension protection layer           |
| Risk-to-DZD      | Translating cyber risk into financial impact |
| Alert            | A security issue shown to the admin          |
| Device           | Employee computer connected to CyberBase     |
| Organization     | Company using the platform                   |
| Employee         | Normal user being protected                  |
| Admin / CEO      | Main dashboard user                          |

---
