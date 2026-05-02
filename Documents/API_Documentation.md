# CyberBase WebGuard — Complete Backend API Documentation

> **Base URL:** `http://localhost:8000/api/`
>
> **Framework:** Django 5.1 (Python) &nbsp;|&nbsp; **Database:** PostgreSQL via Supabase
>
> This document covers every endpoint in the backend with example request/response payloads, explaining **why** the web dashboard (App) and browser extension (Extension) use each endpoint and **how** the data flows.

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [Organization Auth](#2-organization-auth)
3. [Employee Auth](#3-employee-auth)
4. [Employee Management](#4-employee-management)
5. [Extension Endpoints](#5-extension-endpoints)
6. [Gamification](#6-gamification)
7. [Phishing Simulation](#7-phishing-simulation)
8. [Agent — Endpoint Security](#8-agent--endpoint-security)
9. [Appendix — Data Models & Risk Scoring](#9-appendix--data-models--risk-scoring)

---

## 1. Authentication Overview

The API uses **two token-based auth schemes**:

| Scheme | Header Format | Who Uses It | Issued By |
|---|---|---|---|
| **Org Token** | `Authorization: Token <64-char-hex>` | Web Dashboard (admin/manager) | `POST /api/auth/register` or `POST /api/auth/login` |
| **Employee Token** | `Authorization: EmployeeToken <64-char-hex>` | Browser Extension, Employee-facing UI | `POST /api/auth/employee/login` |

- Tokens are random 64-character hex strings (`secrets.token_hex(32)`).
- **No expiry** — tokens remain valid until explicitly revoked via logout.
- Each login creates a **new** token (multi-session support).

---

## 2. Organization Auth

These endpoints are consumed by the **web dashboard** for org-level account management.

---

### 2.1 `POST /api/auth/register`

**Purpose:** Create a new organization account and receive an auth token.

**Consumer:** Dashboard signup page.

**Why:** First-time onboarding — an admin creates their org, which provisions the entire workspace (employees, campaigns, agent data). The returned token is stored in the browser and used for all subsequent API calls.

**Auth:** None (public)

**Request:**
```json
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@acme-corp.com",
  "name": "Acme Corporation",
  "password": "Str0ngP@ss!"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Must be unique across all orgs, valid email format |
| `name` | string | Yes | Organization display name |
| `password` | string | Yes | Minimum 8 characters |

**Response `201 Created`:**
```json
{
  "token": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "email": "admin@acme-corp.com"
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Invalid JSON."}` | Malformed request body |
| 400 | `{"error": "email, name, and password are required."}` | Missing required fields |
| 400 | `{"error": "Password must be at least 8 characters."}` | Password too short |
| 409 | `{"error": "An organization with this email already exists."}` | Duplicate email |

---

### 2.2 `POST /api/auth/login`

**Purpose:** Authenticate an existing organization and get a new auth token.

**Consumer:** Dashboard login page.

**Why:** Returning admin logs in to access their dashboard. Each login creates a fresh token (the previous one stays valid, enabling multi-device sessions).

**Auth:** None (public)

**Request:**
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@acme-corp.com",
  "password": "Str0ngP@ss!"
}
```

**Response `200 OK`:**
```json
{
  "token": "f7e8d9c0b1a23456789abcdef0123456789abcdef0123456789abcdef01234567",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "email": "admin@acme-corp.com"
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Invalid JSON."}` | Malformed body |
| 400 | `{"error": "email and password are required."}` | Missing fields |
| 401 | `{"error": "Invalid credentials."}` | Wrong email or password |

---

### 2.3 `POST /api/auth/logout`

**Purpose:** Revoke the current org token (server-side session destruction).

**Consumer:** Dashboard "Sign out" button.

**Why:** Security best practice — ensures the token cannot be reused after logout.

**Auth:** `Authorization: Token <key>`

**Request:**
```
POST /api/auth/logout
Authorization: Token a1b2c3d4e5f67890...
```
*No body required.*

**Response `200 OK`:**
```json
{}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 401 | `{"error": "Authorization header missing or malformed."}` | Missing or wrong prefix |
| 401 | `{"error": "Invalid or already revoked token."}` | Token not found in DB |

---

### 2.4 `GET /api/auth/me`

**Purpose:** Return the authenticated organization's profile.

**Consumer:** Dashboard on every page load / refresh.

**Why:** On page load, the App calls `/auth/me` to validate the stored token and hydrate the user's state (name, email, permissions). If it returns 401, the user is redirected to the login page.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/auth/me
Authorization: Token a1b2c3d4e5f67890...
```

**Response `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@acme-corp.com",
  "name": "Acme Corporation",
  "is_staff": false,
  "is_superuser": false,
  "created_at": "2025-03-15T10:30:00+00:00"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 401 | `{"error": "Authorization header missing or malformed."}` | No/bad header |
| 401 | `{"error": "Invalid token."}` | Token doesn't exist |

---

## 3. Employee Auth

These endpoints are consumed by the **browser extension** and any employee-facing UI. Employees log in with credentials created by the org admin.

---

### 3.1 `POST /api/auth/employee/login`

**Purpose:** Authenticate an employee and issue an EmployeeToken.

**Consumer:** Browser extension login screen.

**Why:** When the extension is first installed, the employee enters their email + password. The returned token is stored in `chrome.storage.local` and used for all subsequent extension API calls. The employee's org context is automatically resolved from the employee record.

**Auth:** None (public)

**Request:**
```json
POST /api/auth/employee/login
Content-Type: application/json

{
  "email": "jane.doe@acme-corp.com",
  "password": "Empl0yeeP@ss"
}
```

**Response `200 OK`:**
```json
{
  "token": "9a8b7c6d5e4f3210fedcba9876543210fedcba9876543210fedcba9876543210",
  "employee": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Jane Doe",
    "email": "jane.doe@acme-corp.com",
    "department": "Engineering",
    "role": "Developer",
    "seniority": "mid",
    "organization": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corporation"
    }
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Invalid JSON."}` | Malformed body |
| 400 | `{"error": "email and password are required."}` | Missing fields |
| 401 | `{"error": "Invalid credentials."}` | Wrong email/password or `is_active=False` |

---

### 3.2 `POST /api/auth/employee/logout`

**Purpose:** Revoke the current employee token.

**Consumer:** Extension sign-out action.

**Why:** When the employee signs out, the token is destroyed server-side and cleared from `chrome.storage.local`.

**Auth:** `Authorization: EmployeeToken <key>`

**Request:**
```
POST /api/auth/employee/logout
Authorization: EmployeeToken 9a8b7c6d5e4f3210...
```
*No body required.*

**Response `200 OK`:**
```json
{}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 401 | `{"error": "Authorization header missing or malformed."}` | Missing/wrong prefix |
| 401 | `{"error": "Invalid or already revoked token."}` | Token not found |

---

### 3.3 `GET /api/auth/employee/me`

**Purpose:** Return the authenticated employee's profile.

**Consumer:** Extension on startup.

**Why:** On extension startup, it calls `/auth/employee/me` to validate the saved token and display the employee's name, department, and org. If the call fails (401), the extension shows the login screen instead.

**Auth:** `Authorization: EmployeeToken <key>`

**Request:**
```
GET /api/auth/employee/me
Authorization: EmployeeToken 9a8b7c6d5e4f3210...
```

**Response `200 OK`:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Jane Doe",
  "email": "jane.doe@acme-corp.com",
  "department": "Engineering",
  "role": "Developer",
  "seniority": "mid",
  "is_active": true,
  "registered_at": "2025-03-20T14:00:00+00:00",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation"
  }
}
```

---

## 4. Employee Management

All endpoints require **Org Token** auth. Used by the **web dashboard** to manage the organization's employee roster.

---

### 4.1 `GET /api/employees/`

**Purpose:** List all employees belonging to the authenticated organization.

**Consumer:** Dashboard "Employees" page + campaign target selection.

**Why:** Populates the employee table on the dashboard. Admins see every employee's department, role, seniority, and active status. This list is also used when selecting targets for phishing campaigns.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/employees/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "employees": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Jane Doe",
      "email": "jane.doe@acme-corp.com",
      "department": "Engineering",
      "role": "Developer",
      "seniority": "mid",
      "is_active": true,
      "registered_at": "2025-03-20T14:00:00+00:00"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Ahmed Benali",
      "email": "ahmed.benali@acme-corp.com",
      "department": "Finance",
      "role": "Accountant",
      "seniority": "senior",
      "is_active": true,
      "registered_at": "2025-03-21T09:15:00+00:00"
    }
  ]
}
```

---

### 4.2 `POST /api/employees/`

**Purpose:** Create a new employee under the authenticated organization.

**Consumer:** Dashboard "Add Employee" form.

**Why:** Admin adds employees from the dashboard. Each employee gets login credentials for the browser extension.

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/employees/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "name": "Karim Ouali",
  "email": "karim.ouali@acme-corp.com",
  "password": "Karim2025!",
  "department": "Marketing",
  "role": "Content Manager",
  "seniority": "junior"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Employee display name |
| `email` | string | Yes | Must be globally unique across all employees |
| `password` | string | Yes | Minimum 8 characters, hashed server-side |
| `department` | string | No | Default `""` |
| `role` | string | No | Default `""` |
| `seniority` | string | No | One of: `junior`, `mid`, `senior`, `lead`, `manager`, `executive`. Default `mid` |

**Response `201 Created`:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "name": "Karim Ouali",
  "email": "karim.ouali@acme-corp.com"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "name, email, and password are required."}` | Missing fields |
| 400 | `{"error": "Password must be at least 8 characters."}` | Short password |
| 409 | `{"error": "An employee with this email already exists."}` | Duplicate email |

---

### 4.3 `PATCH /api/employees/<employee_id>/`

**Purpose:** Update fields on an existing employee.

**Consumer:** Dashboard employee edit modal.

**Why:** Admin can change an employee's department, role, seniority, deactivate them, or reset their password.

**Auth:** `Authorization: Token <key>`

**Request:**
```json
PATCH /api/employees/660e8400-e29b-41d4-a716-446655440001/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "department": "Security",
  "seniority": "senior",
  "is_active": true
}
```

| Updatable Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `department` | string | |
| `role` | string | |
| `seniority` | string | `junior`/`mid`/`senior`/`lead`/`manager`/`executive` |
| `is_active` | boolean | Setting to `false` disables employee login |
| `password` | string | Min 8 chars, re-hashed server-side |

**Response `200 OK`:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "email": "jane.doe@acme-corp.com",
  "name": "Jane Doe"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Password must be at least 8 characters."}` | Short password |
| 404 | `{"error": "Employee not found."}` | Wrong ID or belongs to different org |

---

### 4.4 `DELETE /api/employees/<employee_id>/`

**Purpose:** Permanently delete an employee and all associated data.

**Consumer:** Dashboard employee delete action.

**Why:** Admin removes an ex-employee. **Cascades** through all related records: tokens, DLP logs, blacklist logs, simulation targets, training enrollments, quiz submissions, device snapshots.

**Auth:** `Authorization: Token <key>`

**Request:**
```
DELETE /api/employees/660e8400-e29b-41d4-a716-446655440001/
Authorization: Token a1b2c3d4...
```

**Response `204 No Content`:**
```json
{}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 404 | `{"error": "Employee not found."}` | Wrong ID or wrong org |

---

## 5. Extension Endpoints

These endpoints are consumed by the **browser extension** running on employee workstations. They handle DLP event logging, URL blacklist enforcement, and admin event polling.

---

### 5.1 `POST /api/logs/dlp/`

**Purpose:** Record a DLP (Data Loss Prevention) event when the extension detects a file upload.

**Consumer:** Browser extension content script.

**Auth:** None (uses `employee_id` in body)

**Why & How:**
1. Extension's content script intercepts `<input type="file">` events on every webpage
2. Extension shows a confirmation dialog: "You are uploading `report.xlsx` to `drive.google.com`. Allow / Cancel?"
3. Whatever the employee chooses (or if the extension force-blocks), the event is logged here
4. The admin dashboard displays these logs in a DLP audit trail

**Request:**
```json
POST /api/logs/dlp/
Content-Type: application/json

{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "filename": "quarterly-report.xlsx",
  "website": "https://drive.google.com/upload",
  "action_taken": "allow"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `employee_id` | UUID string | Yes | Must match an existing Employee |
| `filename` | string | Yes | Name of the file being uploaded |
| `website` | URL string | Yes | URL where the upload was attempted |
| `action_taken` | enum string | Yes | `allow` (user approved), `cancel` (user cancelled), `force` (extension blocked) |

**Response `200 OK`:**
```json
{}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Missing required fields."}` | Any field null/empty |
| 400 | `{"error": "action_taken must be allow, cancel, or force."}` | Invalid enum value |
| 404 | `{"error": "Employee not found."}` | Bad employee_id |

---

### 5.2 `POST /api/logs/blacklist/`

**Purpose:** Record a blacklist violation — employee attempted to visit a blocked domain.

**Consumer:** Browser extension navigation listener.

**Auth:** None (uses `employee_id` in body)

**Why & How:**
1. On startup, the extension fetches the blacklist from `/api/extension/blacklist/` and caches it
2. On every `chrome.webNavigation.onBeforeNavigate`, the URL's hostname is checked against the cached list
3. If the domain matches, the navigation is **blocked**, a warning page is shown, and this endpoint is called to log the attempt
4. The admin sees these violations on the dashboard

**Request:**
```json
POST /api/logs/blacklist/
Content-Type: application/json

{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "attempted_url": "https://malware-test.local/payload"
}
```

| Field | Type | Required |
|---|---|---|
| `employee_id` | UUID string | Yes |
| `attempted_url` | URL string | Yes |

**Response `200 OK`:**
```json
{}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Missing required fields."}` | Missing fields |
| 404 | `{"error": "Employee not found."}` | Bad employee_id |

---

### 5.3 `GET /api/extension/blacklist/`

**Purpose:** Return the list of blacklisted domains for URL blocking.

**Consumer:** Browser extension on startup (and periodic refresh).

**Auth:** None (public)

**Why:** The extension needs to know which domains to block. Domains are configured server-side in `settings.py` under `EXTENSION_BLACKLIST_DOMAINS`, allowing centralized management.

**Request:**
```
GET /api/extension/blacklist/
```

**Response `200 OK`:**
```json
{
  "domains": [
    "malware-test.local",
    "credential-harvest-test.local",
    "eicar.org"
  ]
}
```

---

### 5.4 `GET /api/extension/poll/?emp_id=<uuid>`

**Purpose:** Poll for admin-pushed events (quizzes, alerts) targeting a specific employee.

**Consumer:** Browser extension (called every ~30 seconds).

**Auth:** None (uses `emp_id` query parameter)

**Why & How:**
1. Admin creates an `AdminEvent` (e.g., type `QUIZ`) targeting a specific employee via Django admin or a future dashboard feature
2. Extension polls `GET /api/extension/poll/?emp_id=<uuid>` every ~30 seconds
3. If an undelivered event exists, it's returned and immediately marked `is_delivered=True` (won't be returned again)
4. Extension renders the event as a popup (e.g., a quiz with multiple-choice options)
5. If no event is pending, `hasEvent: false` is returned

**Request:**
```
GET /api/extension/poll/?emp_id=660e8400-e29b-41d4-a716-446655440001
```

**Response — No pending event `200 OK`:**
```json
{
  "hasEvent": false
}
```

**Response — Event available `200 OK`:**
```json
{
  "hasEvent": true,
  "eventPayload": {
    "type": "QUIZ",
    "question": "Which of the following is a sign of a phishing email?",
    "options": {
      "a": "Email from your manager about a meeting",
      "b": "Urgent request with a misspelled domain in the link",
      "c": "Newsletter from a subscribed service",
      "d": "Calendar invite from a known colleague"
    }
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "emp_id is required."}` | Missing query parameter |
| 404 | `{"error": "Employee not found."}` | Bad employee ID |

---

## 6. Gamification

Security awareness quizzes managed by admins, answered by employees via the extension. Quizzes are pushed to employees via the poll mechanism (section 5.4) and answered inline.

---

### 6.1 `GET /api/gamification/quizzes/`

**Purpose:** List all available quizzes, newest first. The `correct_answer` is **never exposed** in responses.

**Consumer:** Dashboard (admin review) and extension (quiz display).

**Auth:** None (public)

**Why:** The dashboard shows available quizzes for admin review. The extension can fetch this list to display available quizzes.

**Request:**
```
GET /api/gamification/quizzes/
```

**Response `200 OK`:**
```json
{
  "quizzes": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440010",
      "question": "What should you do if you receive a suspicious email with an attachment?",
      "options": {
        "a": "Open the attachment to check if it's safe",
        "b": "Forward it to your IT security team",
        "c": "Reply asking who sent it",
        "d": "Delete it and empty the trash"
      },
      "created_at": "2025-04-01T08:00:00+00:00"
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440011",
      "question": "Which URL is most likely a phishing attempt?",
      "options": {
        "a": "https://accounts.google.com/signin",
        "b": "https://accounts-google.security-check.com/signin",
        "c": "https://mail.google.com/inbox",
        "d": "https://drive.google.com/file"
      },
      "created_at": "2025-04-02T10:30:00+00:00"
    }
  ]
}
```

---

### 6.2 `GET /api/gamification/quizzes/<quiz_id>/`

**Purpose:** Get a single quiz by ID.

**Consumer:** Extension (when it receives a quiz event via polling and needs full quiz data).

**Auth:** None (public)

**Request:**
```
GET /api/gamification/quizzes/aa0e8400-e29b-41d4-a716-446655440010/
```

**Response `200 OK`:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440010",
  "question": "What should you do if you receive a suspicious email with an attachment?",
  "options": {
    "a": "Open the attachment to check if it's safe",
    "b": "Forward it to your IT security team",
    "c": "Reply asking who sent it",
    "d": "Delete it and empty the trash"
  },
  "created_at": "2025-04-01T08:00:00+00:00"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 404 | `{"error": "Quiz not found."}` | Invalid quiz_id |

---

### 6.3 `POST /api/gamification/submit-quiz/`

**Purpose:** Submit an employee's answer to a quiz. Returns correctness and reveals the correct answer if wrong.

**Consumer:** Browser extension quiz popup.

**Auth:** None (uses `employee_id` in body)

**Why & How:**
1. Employee receives a quiz via the poll mechanism (section 5.4) or the extension UI
2. Employee selects an answer in the extension popup
3. Extension POSTs the answer here
4. Backend checks against `correct_answer` stored in the Quiz model
5. Extension shows "Correct!" or "Wrong — the correct answer was B"
6. Each employee can only submit **once per quiz** (enforced by unique constraint on `employee + quiz`)

**Request:**
```json
POST /api/gamification/submit-quiz/
Content-Type: application/json

{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "quiz_id": "aa0e8400-e29b-41d4-a716-446655440010",
  "answer_selected": "b"
}
```

| Field | Type | Required |
|---|---|---|
| `employee_id` | UUID string | Yes |
| `quiz_id` | UUID string | Yes |
| `answer_selected` | string | Yes — must match one of the option keys (e.g., `"a"`, `"b"`, `"c"`, `"d"`) |

**Response — Correct `200 OK`:**
```json
{
  "is_correct": true
}
```

**Response — Incorrect `200 OK`:**
```json
{
  "is_correct": false,
  "correct_answer": "b"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Missing required fields."}` | Any field missing |
| 404 | `{"error": "Employee not found."}` | Bad employee_id |
| 404 | `{"error": "Quiz not found."}` | Bad quiz_id |
| 409 | `{"error": "Quiz already submitted."}` | Duplicate submission |

---

## 7. Phishing Simulation

The phishing module is the **core of the platform**. It lets admins create email templates (or AI-generate them), run simulation campaigns, track clicks, auto-enroll employees who fail into training, and view rich analytics. All endpoints require **Org Token** auth unless noted otherwise.

**Enum reference for this section:**

| Field | Valid Values |
|---|---|
| `attack_type` | `IT_RESET`, `INVOICE`, `DELIVERY`, `HR_UPDATE` |
| `language` | `EN`, `FR`, `AR_MSA`, `AR_DARIJA` |
| `difficulty` | `1` (easy — obvious signals), `2` (medium — plausible but detectable), `3` (hard — spear-phishing) |
| `status` (campaign) | `DRAFT`, `ACTIVE`, `COMPLETED` |

---

### 7.1 `GET /api/phishing/templates/`

**Purpose:** List all phishing email templates in the system.

**Consumer:** Dashboard "Templates" page.

**Why:** Admin browses available templates to pick one when creating a campaign. Templates are org-agnostic (shared across all orgs).

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/templates/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "templates": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440020",
      "attack_type": "IT_RESET",
      "language": "EN",
      "difficulty": 1,
      "subject": "Urgent: Your password expires in 24 hours",
      "sender_name": "IT Helpdesk",
      "sender_domain": "it-support.acme-internal.com",
      "created_at": "2025-04-05T12:00:00+00:00"
    },
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440021",
      "attack_type": "INVOICE",
      "language": "FR",
      "difficulty": 2,
      "subject": "Facture #INV-20250401 en attente de validation",
      "sender_name": "Service Comptabilite",
      "sender_domain": "finance.acme-internal.com",
      "created_at": "2025-04-06T09:00:00+00:00"
    }
  ]
}
```

---

### 7.1b `POST /api/phishing/templates/`

**Purpose:** Manually create a phishing email template.

**Consumer:** Dashboard "Create Template" form.

**Why:** Admin writes a custom template specifying exact subject, body, sender, language, difficulty, and attack type.

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/phishing/templates/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "attack_type": "HR_UPDATE",
  "language": "AR_DARIJA",
  "difficulty": 2,
  "subject": "تحديث مهم: سياسة الإجازات الجديدة",
  "body": "<p>سلام {{employee_name}},</p><p>نعلمك بتغيير في سياسة الإجازات. اضغط هنا للتفاصيل: {{tracking_url}}</p>",
  "sender_name": "قسم الموارد البشرية",
  "sender_domain": "hr.acme-internal.com"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `attack_type` | string | Yes | `IT_RESET` / `INVOICE` / `DELIVERY` / `HR_UPDATE` |
| `language` | string | Yes | `EN` / `FR` / `AR_MSA` / `AR_DARIJA` |
| `difficulty` | int | Yes | `1`, `2`, or `3` |
| `subject` | string | Yes | Email subject line |
| `body` | string | Yes | HTML or plain-text. Supports `{{employee_name}}` and `{{tracking_url}}` placeholders |
| `sender_name` | string | Yes | Display name in From header |
| `sender_domain` | string | Yes | Spoofed domain in From header |

**Response `201 Created`:**
```json
{
  "id": "ee0e8400-e29b-41d4-a716-446655440022"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "Required fields: attack_type, language, difficulty, subject, body, sender_name, sender_domain"}` | Missing fields |
| 400 | `{"error": "attack_type must be one of {...}"}` | Invalid attack_type |
| 400 | `{"error": "language must be one of {...}"}` | Invalid language |
| 400 | `{"error": "difficulty must be 1, 2, or 3."}` | Invalid difficulty |

---

### 7.2 `POST /api/phishing/templates/generate/`

**Purpose:** AI-generate a culturally-localised phishing email template.

**Consumer:** Dashboard "Generate Template" button.

**Why & How:**
1. Admin selects attack type + language (and optionally a target employee)
2. If `OPENAI_API_KEY` is set, the backend uses OpenAI to generate a realistic template; otherwise, a built-in culturally-localised template library is used
3. If `employee_id` is provided and `difficulty` is omitted, the backend calls `recommend_difficulty()` — analyzing the employee's last 5 simulation results to auto-suggest difficulty
4. If `save=true`, the generated template is persisted to the database for use in campaigns

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/phishing/templates/generate/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "attack_type": "IT_RESET",
  "language": "FR",
  "difficulty": 2,
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "save": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `attack_type` | string | Yes | See enum table above |
| `language` | string | No | Default `EN` |
| `difficulty` | int | No | `1`/`2`/`3`. Omit to auto-recommend based on employee history |
| `employee_id` | UUID string | No | For name personalisation (spear-phishing) and difficulty recommendation |
| `save` | boolean | No | Default `false`. If `true`, persists as a PhishingTemplate |

**Response — `save=true` `201 Created`:**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440023",
  "attack_type": "IT_RESET",
  "language": "FR",
  "difficulty": 2,
  "subject": "Action requise : votre mot de passe expire dans 24h",
  "body": "<p>Bonjour Jane,</p><p>Votre mot de passe expire demain. Cliquez ici pour le renouveler : {{tracking_url}}</p><p>Service Informatique</p>",
  "sender_name": "Service Informatique",
  "sender_domain": "it-support.acme-corp.com"
}
```

**Response — `save=false` `200 OK`:** Same shape but without `"id"`.

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "attack_type must be one of [...]"}` | Invalid attack_type |
| 400 | `{"error": "language must be one of [...]"}` | Invalid language |
| 400 | `{"error": "difficulty must be 1, 2, or 3."}` | Invalid difficulty |
| 404 | `{"error": "Employee not found."}` | Bad employee_id |
| 500 | `{"error": "Generation failed: ..."}` | AI/template generation error |

---

### 7.3 `GET /api/phishing/campaigns/`

**Purpose:** List all phishing campaigns for this organization with summary stats.

**Consumer:** Dashboard "Campaigns" page.

**Why:** Admins see every campaign with its status (DRAFT / ACTIVE / COMPLETED), template info, target count, and click rate.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/campaigns/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "campaigns": [
    {
      "id": "110e8400-e29b-41d4-a716-446655440030",
      "name": "Q2 Phishing Awareness - IT Reset",
      "status": "ACTIVE",
      "template_id": "cc0e8400-e29b-41d4-a716-446655440020",
      "template_subject": "Urgent: Your password expires in 24 hours",
      "attack_type": "IT_RESET",
      "language": "EN",
      "difficulty": 1,
      "created_at": "2025-04-10T08:00:00+00:00",
      "launched_at": "2025-04-10T08:30:00+00:00",
      "completed_at": null,
      "total_targets": 25,
      "clicked_count": 7,
      "click_rate": 28.0
    }
  ]
}
```

---

### 7.3b `POST /api/phishing/campaigns/`

**Purpose:** Create a new campaign in DRAFT status, linked to an existing template.

**Consumer:** Dashboard "Create Campaign" form.

**Why:** Admin selects a template, names the campaign, and creates it. It starts as DRAFT — **no emails are sent yet**. The admin launches it separately (7.4).

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/phishing/campaigns/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "name": "Q2 Phishing Awareness - IT Reset",
  "template_id": "cc0e8400-e29b-41d4-a716-446655440020"
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `template_id` | UUID string | Yes — must reference an existing PhishingTemplate |

**Response `201 Created`:**
```json
{
  "id": "110e8400-e29b-41d4-a716-446655440030"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "name and template_id are required."}` | Missing fields |
| 404 | `{"error": "Template not found."}` | Bad template_id |

---

### 7.4 `POST /api/phishing/campaigns/<campaign_id>/launch/`

**Purpose:** Launch a DRAFT campaign — create simulation targets and send phishing emails.

**Consumer:** Dashboard "Launch" button on campaign detail page.

**Why & How:**
1. Admin clicks "Launch" on a DRAFT campaign
2. If `employee_ids` is provided, only those employees are targeted; if omitted, **all active employees** in the org are targeted
3. A `PhishingSimulationTarget` record is created for each employee with a unique `tracking_token` (UUID)
4. Campaign transitions from `DRAFT` → `ACTIVE`
5. Phishing emails are sent via SMTP (Django email backend). Each email has `{{employee_name}}` replaced with the real name and `{{tracking_url}}` replaced with `{PHISHING_BASE_URL}/api/phishing/click/{tracking_token}/`

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/phishing/campaigns/110e8400-e29b-41d4-a716-446655440030/launch/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "employee_ids": [
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002"
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `employee_ids` | array of UUID strings | No | Omit to target **all** active employees in the org |

**Response `200 OK`:**
```json
{
  "targets_created": 2,
  "status": "ACTIVE",
  "emails_sent": 2,
  "emails_failed": 0,
  "email_errors": []
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 404 | `{"error": "Campaign not found."}` | Bad campaign_id or wrong org |
| 409 | `{"error": "Only DRAFT campaigns can be launched."}` | Campaign already launched |
| 400 | `{"error": "No eligible employees found."}` | No active employees match |

---

### 7.5 `POST /api/phishing/campaigns/<campaign_id>/complete/`

**Purpose:** Mark an ACTIVE campaign as COMPLETED.

**Consumer:** Dashboard "Complete Campaign" button.

**Why:** Admin manually closes a campaign when they've gathered enough data. Sets `completed_at` timestamp.

**Auth:** `Authorization: Token <key>`

**Request:**
```
POST /api/phishing/campaigns/110e8400-e29b-41d4-a716-446655440030/complete/
Authorization: Token a1b2c3d4...
```
*No body required.*

**Response `200 OK`:**
```json
{
  "status": "COMPLETED"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 404 | `{"error": "Campaign not found."}` | Bad ID or wrong org |
| 409 | `{"error": "Only ACTIVE campaigns can be completed."}` | Not in ACTIVE status |

---

### 7.6 `GET /api/phishing/campaigns/<campaign_id>/targets/`

**Purpose:** List all simulation targets for a campaign with per-employee details.

**Consumer:** Dashboard campaign detail page.

**Why:** Shows a table of every targeted employee, whether the email was sent, and whether they clicked. Drives the "per-employee results" view.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/campaigns/110e8400-e29b-41d4-a716-446655440030/targets/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "targets": [
    {
      "id": "220e8400-e29b-41d4-a716-446655440040",
      "employee_id": "660e8400-e29b-41d4-a716-446655440001",
      "employee_email": "jane.doe@acme-corp.com",
      "employee_name": "Jane Doe",
      "department": "Engineering",
      "role": "Developer",
      "seniority": "mid",
      "tracking_token": "aabbccdd-1122-3344-5566-778899aabb00",
      "sent_at": "2025-04-10T08:35:00+00:00",
      "clicked_at": "2025-04-10T14:22:00+00:00"
    },
    {
      "id": "330e8400-e29b-41d4-a716-446655440041",
      "employee_id": "770e8400-e29b-41d4-a716-446655440002",
      "employee_email": "ahmed.benali@acme-corp.com",
      "employee_name": "Ahmed Benali",
      "department": "Finance",
      "role": "Accountant",
      "seniority": "senior",
      "tracking_token": "eeff0011-2233-4455-6677-8899aabbccdd",
      "sent_at": "2025-04-10T08:35:01+00:00",
      "clicked_at": null
    }
  ]
}
```

---

### 7.7 `GET /api/phishing/click/<token>/`

**Purpose:** Click-tracking endpoint embedded in simulated phishing emails.

**Consumer:** Employee's browser (when they click the link in the phishing email).

**Auth:** **None** (public — the `<token>` UUID is the opaque tracking identifier)

**Why & How:**
1. Each simulated phishing email contains a link like `https://yourdomain.com/api/phishing/click/aabbccdd-1122-3344-5566-778899aabb00/`
2. When the employee clicks it, this endpoint:
   - Looks up the `PhishingSimulationTarget` by `tracking_token`
   - Records `clicked_at` timestamp (**idempotent** — only set on first click)
   - **Auto-enrolls** the employee in the matching `TrainingModule` (matched by `attack_type` + `language`; falls back to English if no localised module exists)
3. Returns an HTML **awareness page** explaining this was a simulation test, with tips on spotting phishing

**Request:**
```
GET /api/phishing/click/aabbccdd-1122-3344-5566-778899aabb00/
```

**Response `200 OK` (text/html):**
```html
<!DOCTYPE html>
<html>
<head><title>Security Awareness</title></head>
<body>
  <h1>This was a simulated phishing test.</h1>
  <p>Don't worry — no harm was done.</p>
  <p>Signals you could have spotted:</p>
  <ul>
    <li>The sender's email domain did not match the official organisation domain.</li>
    <li>The message created artificial urgency.</li>
    <li>The link URL did not point to a known, trusted domain.</li>
  </ul>
  <p>A short 5-minute training module has been assigned to your profile.</p>
</body>
</html>
```

**Error:** `404 Not found.` (plain text) if the tracking token is invalid.

---

### 7.8 `POST /api/phishing/targets/<target_id>/sent/`

**Purpose:** Manually mark a simulation target as "email sent" and get its tracking token.

**Consumer:** Dashboard (backup mechanism).

**Why:** Primary send happens automatically during campaign launch (7.4). This endpoint is a fallback for cases where emails were dispatched via an external system or needed retry.

**Auth:** `Authorization: Token <key>`

**Request:**
```
POST /api/phishing/targets/220e8400-e29b-41d4-a716-446655440040/sent/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "id": "220e8400-e29b-41d4-a716-446655440040",
  "tracking_token": "aabbccdd-1122-3344-5566-778899aabb00",
  "sent_at": "2025-04-10T08:35:00+00:00"
}
```

---

### 7.9 `GET /api/phishing/analytics/`

**Purpose:** Organization-wide phishing simulation analytics summary.

**Consumer:** Dashboard main analytics page.

**Why:** Provides the big-picture view: total campaigns, total emails sent, total clicks, overall click rate. Also breaks down stats by department, role, and seniority to identify the most vulnerable groups.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/analytics/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "total_campaigns": 3,
  "total_sent": 75,
  "total_clicked": 18,
  "overall_click_rate": 24.0,
  "campaigns": [
    {
      "id": "110e8400-e29b-41d4-a716-446655440030",
      "name": "Q2 Phishing Awareness - IT Reset",
      "status": "ACTIVE",
      "attack_type": "IT_RESET",
      "difficulty": 1,
      "sent": 25,
      "clicked": 7,
      "click_rate": 28.0,
      "launched_at": "2025-04-10T08:30:00+00:00"
    }
  ],
  "departments": {
    "by_department": {
      "Engineering": { "sent": 30, "clicked": 5, "click_rate": 16.7 },
      "Finance": { "sent": 20, "clicked": 8, "click_rate": 40.0 },
      "Marketing": { "sent": 25, "clicked": 5, "click_rate": 20.0 }
    },
    "by_role": {
      "Developer": { "sent": 20, "clicked": 3, "click_rate": 15.0 },
      "Accountant": { "sent": 15, "clicked": 6, "click_rate": 40.0 }
    },
    "by_seniority": {
      "junior": { "sent": 20, "clicked": 8, "click_rate": 40.0 },
      "mid": { "sent": 30, "clicked": 7, "click_rate": 23.3 },
      "senior": { "sent": 25, "clicked": 3, "click_rate": 12.0 }
    }
  }
}
```

---

### 7.10 `GET /api/phishing/analytics/trend/`

**Purpose:** Monthly time-series of click rate and training completions.

**Consumer:** Dashboard trend chart.

**Why:** Shows whether the organization is improving over time — decreasing click rates and increasing training completions indicate the program is working.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/analytics/trend/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "trend": [
    {
      "month": "2025-01",
      "sent": 50,
      "clicked": 20,
      "click_rate": 40.0,
      "trainings_completed": 5
    },
    {
      "month": "2025-02",
      "sent": 60,
      "clicked": 15,
      "click_rate": 25.0,
      "trainings_completed": 12
    },
    {
      "month": "2025-03",
      "sent": 55,
      "clicked": 8,
      "click_rate": 14.5,
      "trainings_completed": 18
    }
  ]
}
```

---

### 7.11 `GET /api/phishing/alerts/managers/`

**Purpose:** Department-level risk alerts with AI-generated recommendations for managers.

**Consumer:** Dashboard "Manager Alerts" section.

**Why:** Shows each department's phishing risk level, the most-clicked attack type, training completion rate, and a natural-language recommendation. Designed for managers to take action on their team's security posture.

**Risk level thresholds:**
- **HIGH:** click rate >= 50%
- **MEDIUM:** click rate >= 25%
- **LOW:** click rate < 25%

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/alerts/managers/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "department_alerts": [
    {
      "department": "Finance",
      "simulations_sent": 20,
      "click_rate": 55.0,
      "risk_level": "HIGH",
      "top_attack_type": "INVOICE",
      "training_enrolled": 8,
      "training_completion_rate": 25.0,
      "recommendation": "Your team shows a high susceptibility to invoice approval fraud. Consider scheduling a live awareness session and ensuring all outstanding training modules are completed this week. Note: only 25.0% of enrolled training has been completed — following up on completion will significantly reduce future risk."
    },
    {
      "department": "Engineering",
      "simulations_sent": 30,
      "click_rate": 16.7,
      "risk_level": "LOW",
      "top_attack_type": "IT_RESET",
      "training_enrolled": 3,
      "training_completion_rate": 100.0,
      "recommendation": "Your team is performing well. Continue reinforcing good habits with periodic refresher simulations."
    }
  ]
}
```

---

### 7.12 `GET /api/phishing/training/`

**Purpose:** List all training modules available in the system.

**Consumer:** Dashboard "Training" tab.

**Why:** Admin views what training modules exist. Modules are auto-assigned to employees who click phishing links, but the admin can review them here. One module per `(attack_type, language)` pair.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/training/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "modules": [
    {
      "id": "440e8400-e29b-41d4-a716-446655440050",
      "attack_type": "IT_RESET",
      "language": "EN",
      "title": "Recognizing IT Password Reset Phishing",
      "duration_minutes": 5,
      "created_at": "2025-03-01T00:00:00+00:00"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440051",
      "attack_type": "INVOICE",
      "language": "FR",
      "title": "Reconnaitre les faux emails de facturation",
      "duration_minutes": 5,
      "created_at": "2025-03-01T00:00:00+00:00"
    }
  ]
}
```

---

### 7.13 `GET /api/phishing/training/enrollments/`

**Purpose:** List all training enrollments for employees in this organization.

**Consumer:** Dashboard "Training Enrollments" tab.

**Why:** Shows which employees have been enrolled in training (usually auto-enrolled after clicking a phishing link) and whether they've completed it. Drives follow-up actions and completion tracking.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/training/enrollments/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "enrollments": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440060",
      "employee_id": "660e8400-e29b-41d4-a716-446655440001",
      "employee_email": "jane.doe@acme-corp.com",
      "employee_name": "Jane Doe",
      "department": "Engineering",
      "module_id": "440e8400-e29b-41d4-a716-446655440050",
      "module_title": "Recognizing IT Password Reset Phishing",
      "attack_type": "IT_RESET",
      "enrolled_at": "2025-04-10T14:22:01+00:00",
      "completed_at": null
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440061",
      "employee_id": "770e8400-e29b-41d4-a716-446655440002",
      "employee_email": "ahmed.benali@acme-corp.com",
      "employee_name": "Ahmed Benali",
      "department": "Finance",
      "module_id": "550e8400-e29b-41d4-a716-446655440051",
      "module_title": "Reconnaitre les faux emails de facturation",
      "attack_type": "INVOICE",
      "enrolled_at": "2025-04-11T09:00:00+00:00",
      "completed_at": "2025-04-12T11:30:00+00:00"
    }
  ]
}
```

---

### 7.14 `POST /api/phishing/training/enrollments/<enrollment_id>/complete/`

**Purpose:** Mark a training enrollment as completed.

**Consumer:** Dashboard training management.

**Why:** After an employee completes the training module, the admin marks it complete. This updates the training completion rate in analytics and manager alerts.

**Auth:** `Authorization: Token <key>`

**Request:**
```
POST /api/phishing/training/enrollments/660e8400-e29b-41d4-a716-446655440060/complete/
Authorization: Token a1b2c3d4...
```
*No body required.*

**Response `200 OK`:**
```json
{
  "completed_at": "2025-04-15T16:00:00+00:00"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 404 | `{"error": "Enrollment not found."}` | Bad ID or wrong org |
| 409 | `{"error": "Already completed."}` | Already has `completed_at` set |

---

### 7.15 `GET /api/phishing/employees/<employee_id>/difficulty/`

**Purpose:** Get the recommended phishing difficulty level for a specific employee.

**Consumer:** Dashboard campaign creation / template generation.

**Why:** Enables **adaptive difficulty**. Employees who consistently fail get easier tests; those who pass get harder ones.

**Algorithm:** Examines the employee's last 5 simulation results:
- Fewer than 2 tests → difficulty **1** (easy — need baseline data)
- Click rate >= 60% → difficulty **1** (needs basic training first)
- Click rate >= 30% → difficulty **2** (moderate challenge)
- Click rate < 30% → difficulty **3** (ready for hard spear-phishing)

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/phishing/employees/660e8400-e29b-41d4-a716-446655440001/difficulty/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "employee_email": "jane.doe@acme-corp.com",
  "recommended_difficulty": 2,
  "history_window": 5,
  "failed_count": 2,
  "click_rate": 40.0
}
```

**Response — No history `200 OK`:**
```json
{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "employee_email": "jane.doe@acme-corp.com",
  "recommended_difficulty": 1,
  "history_window": 0,
  "failed_count": 0,
  "click_rate": null
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 404 | `{"error": "Employee not found."}` | Bad ID or wrong org |

---

## 8. Agent — Endpoint Security

The agent module handles **device health monitoring**. A lightweight desktop agent runs on each employee's workstation, collects system telemetry (OS, software, processes, network, security posture), and ships it to the backend. The backend computes a risk score and provides audit/drift analysis.

All endpoints require **Org Token** auth.

---

### 8.1 `POST /api/agent/snapshot/`

**Purpose:** Ingest a device telemetry snapshot from the desktop agent.

**Consumer:** Desktop agent (runs on employee workstation).

**Why & How:**
1. The agent periodically collects a comprehensive snapshot of the device state
2. It POSTs the full payload to this endpoint
3. The backend parses indexed fields (hostname, OS, hardware), then runs the **risk scoring engine** (100-point scale, penalty-based)
4. The full raw payload + computed risk are stored for historical analysis and drift detection

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/agent/snapshot/?employee_id=660e8400-e29b-41d4-a716-446655440001
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "collectedAtUtc": "2025-04-15T12:00:00Z",
  "device": {
    "hostname": "DESKTOP-JD01",
    "osName": "Windows",
    "osVersion": "11 Pro 23H2",
    "architecture": "x64",
    "uptimeSeconds": 86400,
    "hardware": {
      "cpuCores": 8,
      "totalMemoryMb": 16384
    }
  },
  "user": {
    "isAdminEstimate": false,
    "localAdmins": ["Administrator", "jane.doe"]
  },
  "security": {
    "antivirus": [
      { "name": "Windows Defender", "enabled": true, "upToDate": true }
    ],
    "firewallStatus": "enabled",
    "diskEncryptionEnabled": true,
    "osUpdatesCurrent": true
  },
  "network": {
    "listeningPorts": [
      { "port": 80, "process": "nginx" },
      { "port": 443, "process": "nginx" }
    ]
  },
  "processes": [
    { "name": "nginx.exe", "pid": 1234, "executablePath": "C:\\Program Files\\nginx\\nginx.exe" },
    { "name": "code.exe", "pid": 5678, "executablePath": "C:\\Program Files\\VS Code\\code.exe" }
  ],
  "software": {
    "software": [
      { "name": "Visual Studio Code", "version": "1.89.0" },
      { "name": "nginx", "version": "1.25.4" },
      { "name": "SuspiciousTool", "version": "1.0", "riskFlag": true }
    ]
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `employee_id` | UUID | Yes | Query param OR in body |
| `collectedAtUtc` | ISO 8601 string | Yes | When the agent collected data |
| `device` | object | Yes | hostname, osName, osVersion, architecture, uptimeSeconds, hardware |
| `security` | object | Yes | antivirus array, firewallStatus, diskEncryptionEnabled, osUpdatesCurrent |
| `network` | object | No | listeningPorts array |
| `processes` | array | No | Running processes with name, pid, executablePath |
| `software` | object | No | Installed software list with optional riskFlag |
| `user` | object | No | isAdminEstimate, localAdmins array |

**Response `201 Created`:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440070",
  "received_at": "2025-04-15T12:00:05+00:00",
  "risk": {
    "score": 82,
    "level": "low",
    "signals": [
      "1 software item(s) flagged as risky: SuspiciousTool"
    ]
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "employee_id is required."}` | Missing employee_id |
| 400 | `{"error": "collectedAtUtc is required."}` | Missing timestamp |
| 400 | `{"error": "Invalid collectedAtUtc format."}` | Bad datetime format |
| 404 | `{"error": "Employee not found."}` | Bad employee_id or wrong org |

---

### 8.2 `GET /api/agent/risk-trend/<employee_id>/`

**Purpose:** Return the last 30 snapshots as a time-series of risk scores.

**Consumer:** Dashboard employee detail page — "Risk Trend" chart.

**Why:** Shows how the employee's device security posture has changed over time. Decreasing scores indicate worsening security; increasing scores indicate improvement.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/agent/risk-trend/660e8400-e29b-41d4-a716-446655440001/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "employee_name": "Jane Doe",
  "hostname": "DESKTOP-JD01",
  "data_points": 3,
  "trend": [
    {
      "snapshot_id": "aa0e8400-0001-0001-0001-000000000001",
      "collected_at": "2025-04-11T12:00:00+00:00",
      "risk_score": 65,
      "risk_level": "medium",
      "signals": ["Firewall is disabled", "OS is not up to date"]
    },
    {
      "snapshot_id": "aa0e8400-0001-0001-0001-000000000002",
      "collected_at": "2025-04-12T12:00:00+00:00",
      "risk_score": 75,
      "risk_level": "medium",
      "signals": ["OS is not up to date"]
    },
    {
      "snapshot_id": "aa0e8400-0001-0001-0001-000000000003",
      "collected_at": "2025-04-13T12:00:00+00:00",
      "risk_score": 82,
      "risk_level": "low",
      "signals": []
    }
  ]
}
```

---

### 8.3 `GET /api/agent/drift/<employee_id>/`

**Purpose:** Detect changes between the last two device snapshots.

**Consumer:** Dashboard employee detail page — "Device Drift" section.

**Why:** Highlights what changed since the last snapshot: new/removed software, opened/closed ports, new/disappeared processes. Helps admins spot unauthorized installs, unexpected port openings, or suspicious activity.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/agent/drift/660e8400-e29b-41d4-a716-446655440001/
Authorization: Token a1b2c3d4...
```

**Response — Changes detected `200 OK`:**
```json
{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "employee_name": "Jane Doe",
  "previous_snapshot": {
    "id": "aa0e8400-0001-0001-0001-000000000002",
    "collected_at": "2025-04-12T12:00:00+00:00",
    "risk_score": 75,
    "risk_level": "medium"
  },
  "latest_snapshot": {
    "id": "aa0e8400-0001-0001-0001-000000000003",
    "collected_at": "2025-04-13T12:00:00+00:00",
    "risk_score": 63,
    "risk_level": "medium"
  },
  "risk_delta": -12,
  "risk_changed": true,
  "drift": {
    "software_installed": ["TeamViewer", "Wireshark"],
    "software_removed": [],
    "ports_opened": [3389, 5900],
    "ports_closed": [],
    "processes_new": ["TeamViewer.exe"],
    "processes_gone": []
  },
  "has_changes": true
}
```

**Response — Not enough snapshots `200 OK`:**
```json
{
  "employee_id": "660e8400-e29b-41d4-a716-446655440001",
  "employee_name": "Jane Doe",
  "message": "Not enough snapshots to compute drift (need at least 2).",
  "drift": null
}
```

---

### 8.4 `GET /api/agent/port-audit/`

**Purpose:** Organization-wide audit of risky open ports across all employee devices.

**Consumer:** Dashboard "Port Audit" page.

**Why:** Identifies exposed services across the org. Uses only the latest snapshot per employee. Results sorted by most affected devices first.

**Monitored risky ports:**

| Port | Label |
|---|---|
| 3389 | RDP |
| 445 | SMB |
| 22 | SSH |
| 5900 | VNC |
| 23 | Telnet |
| 21 | FTP |
| 1433 | MSSQL |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 27017 | MongoDB |

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/agent/port-audit/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "organization": "Acme Corporation",
  "devices_scanned": 25,
  "risky_ports_found": 2,
  "port_audit": [
    {
      "port": 3389,
      "label": "RDP (3389) exposed",
      "affected_devices": [
        {
          "employee_id": "660e8400-e29b-41d4-a716-446655440001",
          "hostname": "DESKTOP-JD01",
          "snapshot_id": "aa0e8400-0001-0001-0001-000000000003",
          "collected_at": "2025-04-13T12:00:00+00:00"
        },
        {
          "employee_id": "770e8400-e29b-41d4-a716-446655440002",
          "hostname": "LAPTOP-AB02",
          "snapshot_id": "bb0e8400-0002-0002-0002-000000000001",
          "collected_at": "2025-04-13T14:00:00+00:00"
        }
      ]
    },
    {
      "port": 5432,
      "label": "PostgreSQL (5432) exposed",
      "affected_devices": [
        {
          "employee_id": "660e8400-e29b-41d4-a716-446655440001",
          "hostname": "DESKTOP-JD01",
          "snapshot_id": "aa0e8400-0001-0001-0001-000000000003",
          "collected_at": "2025-04-13T12:00:00+00:00"
        }
      ]
    }
  ]
}
```

---

### 8.5 `GET /api/agent/software-audit/`

**Purpose:** Organization-wide Shadow IT detection.

**Consumer:** Dashboard "Software Audit" page.

**Why & How:**
1. Loads the org's approved software allowlist (from `ApprovedSoftware` model)
2. For each employee's latest snapshot, checks every installed software name
3. If **no approved entry** is a case-insensitive substring of the software name, it's flagged as unapproved
4. Results sorted by install count (most widespread unapproved software first)

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/agent/software-audit/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "organization": "Acme Corporation",
  "approved_software_count": 15,
  "unapproved_software_count": 3,
  "unapproved_software": [
    {
      "software_name": "TeamViewer",
      "install_count": 5,
      "devices": [
        {
          "employee_id": "660e8400-e29b-41d4-a716-446655440001",
          "employee_name": "Jane Doe",
          "hostname": "DESKTOP-JD01"
        },
        {
          "employee_id": "770e8400-e29b-41d4-a716-446655440002",
          "employee_name": "Ahmed Benali",
          "hostname": "LAPTOP-AB02"
        }
      ]
    },
    {
      "software_name": "Wireshark",
      "install_count": 2,
      "devices": [
        {
          "employee_id": "660e8400-e29b-41d4-a716-446655440001",
          "employee_name": "Jane Doe",
          "hostname": "DESKTOP-JD01"
        }
      ]
    }
  ]
}
```

---

### 8.6 Approved Software CRUD

Manage the organization's approved software allowlist.

---

#### `GET /api/agent/approved-software/`

**Purpose:** List the org's approved software allowlist.

**Consumer:** Dashboard "Approved Software" management page.

**Auth:** `Authorization: Token <key>`

**Request:**
```
GET /api/agent/approved-software/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "approved_software": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440080",
      "name": "Microsoft Office",
      "notes": "Standard office suite",
      "added_at": "2025-03-01T00:00:00+00:00"
    },
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440081",
      "name": "Visual Studio Code",
      "notes": "Approved IDE for engineering",
      "added_at": "2025-03-01T00:00:00+00:00"
    },
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440082",
      "name": "Google Chrome",
      "notes": "",
      "added_at": "2025-03-05T10:00:00+00:00"
    }
  ]
}
```

---

#### `POST /api/agent/approved-software/`

**Purpose:** Add a software name to the approved allowlist.

**Consumer:** Dashboard "Add Approved Software" form.

**Why:** Admin approves a piece of software. Matching is **case-insensitive substring** — e.g., adding `"Microsoft"` approves all software whose name contains "Microsoft". Idempotent (returns existing entry if already present).

**Auth:** `Authorization: Token <key>`

**Request:**
```json
POST /api/agent/approved-software/
Authorization: Token a1b2c3d4...
Content-Type: application/json

{
  "name": "Slack",
  "notes": "Approved communication tool"
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `notes` | string | No |

**Response — New entry `201 Created`:**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440083",
  "name": "Slack",
  "notes": "Approved communication tool",
  "created": true
}
```

**Response — Already exists `200 OK`:**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440083",
  "name": "Slack",
  "notes": "Approved communication tool",
  "created": false
}
```

---

#### `DELETE /api/agent/approved-software/<entry_id>/`

**Purpose:** Remove an entry from the approved software list.

**Consumer:** Dashboard approved software management.

**Why:** Admin revokes approval — the software will now appear in the software audit as unapproved.

**Auth:** `Authorization: Token <key>`

**Request:**
```
DELETE /api/agent/approved-software/ff0e8400-e29b-41d4-a716-446655440083/
Authorization: Token a1b2c3d4...
```

**Response `200 OK`:**
```json
{
  "deleted": true,
  "id": "ff0e8400-e29b-41d4-a716-446655440083"
}
```

**Error Responses:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{"error": "entry_id is required."}` | Missing entry_id in URL |
| 404 | `{"error": "Entry not found."}` | Bad ID or wrong org |

---

## 9. Appendix — Data Models & Risk Scoring

### 9.1 Risk Scoring Engine

The risk score starts at **100** and penalties are deducted based on the device snapshot payload:

| Signal | Penalty | Description |
|---|---|---|
| No antivirus detected | **-20** | No AV software found |
| AV present but disabled | **-15** | AV installed but not enabled |
| AV out of date | **-8** | AV definitions not current |
| Firewall disabled | **-20** | Firewall explicitly off |
| Firewall status unknown | **-8** | Cannot determine firewall state |
| Disk encryption disabled | **-15** | Full-disk encryption off |
| Disk encryption unknown | **-5** | Cannot determine encryption state |
| OS not up to date | **-15** | OS updates not current |
| OS update status unknown | **-5** | Cannot determine OS update state |
| User has local admin | **-10** | Current user is a local admin |
| >2 local admin accounts | **-8** | Excessive admin accounts |
| Processes from suspicious paths | **up to -15** | e.g., `%TEMP%`, `%APPDATA%`, `Downloads` |
| Each risky port open | **-12 each** | See port list in section 8.4 |
| Flagged risky software | **-5 to -15** | Software with `riskFlag: true` |

**Risk levels:**
- **`low`** — score >= 80
- **`medium`** — score >= 55
- **`high`** — score >= 30
- **`critical`** — score < 30

Score is floored at **0** (cannot go negative).

---

### 9.2 Data Models

#### Organizations App

| Model | Field | Type | Notes |
|---|---|---|---|
| **Organization** | `id` | UUID | Primary key, auto-generated |
| | `email` | string | Unique, used for login |
| | `name` | string | Display name |
| | `password` | string | bcrypt-hashed |
| | `is_staff` | boolean | Django admin access |
| | `is_superuser` | boolean | Django superuser |
| | `created_at` | datetime | Auto-set on creation |
| **Employee** | `id` | UUID | Primary key |
| | `organization` | FK → Organization | CASCADE delete |
| | `name` | string | Display name |
| | `email` | string | Unique globally |
| | `password` | string | bcrypt-hashed |
| | `department` | string | Default `""` |
| | `role` | string | Default `""` |
| | `seniority` | string | `junior`/`mid`/`senior`/`lead`/`manager`/`executive` |
| | `is_active` | boolean | Default `True` |
| | `registered_at` | datetime | Auto-set on creation |
| **AuthToken** | `key` | string (64-hex) | Unique, primary key |
| | `organization` | FK → Organization | CASCADE delete |
| | `created_at` | datetime | Auto-set |
| **EmployeeAuthToken** | `key` | string (64-hex) | Unique, primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `created_at` | datetime | Auto-set |

#### Extension App

| Model | Field | Type | Notes |
|---|---|---|---|
| **DLPLog** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `filename` | string | Uploaded file name |
| | `website` | string | Upload target URL |
| | `action_taken` | string | `allow` / `cancel` / `force` |
| | `logged_at` | datetime | Auto-set |
| **BlacklistLog** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `attempted_url` | string | Blocked URL |
| | `logged_at` | datetime | Auto-set |
| **AdminEvent** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `event_type` | string | Currently only `QUIZ` |
| | `payload` | JSON | Event-specific data |
| | `is_delivered` | boolean | Marked `True` after extension picks it up |
| | `created_at` | datetime | Auto-set |
| **PhishingLog** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `clicked` | boolean | Whether the phishing link was clicked |
| | `website` | string | Phishing URL |
| | `logged_at` | datetime | Auto-set |

#### Gamification App

| Model | Field | Type | Notes |
|---|---|---|---|
| **Quiz** | `id` | UUID | Primary key |
| | `question` | string | Quiz question text |
| | `options` | JSON | `{"a": "...", "b": "...", ...}` |
| | `correct_answer` | string | Key of correct option (never exposed to clients) |
| | `created_at` | datetime | Auto-set |
| **QuizSubmission** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `quiz` | FK → Quiz | CASCADE delete |
| | `answer_selected` | string | Employee's chosen option key |
| | `is_correct` | boolean | Computed on submission |
| | | | **Unique constraint:** `(employee, quiz)` |

#### Phishing App

| Model | Field | Type | Notes |
|---|---|---|---|
| **PhishingTemplate** | `id` | UUID | Primary key |
| | `attack_type` | string | `IT_RESET` / `INVOICE` / `DELIVERY` / `HR_UPDATE` |
| | `language` | string | `EN` / `FR` / `AR_MSA` / `AR_DARIJA` |
| | `difficulty` | int | `1`, `2`, or `3` |
| | `subject` | string | Email subject line |
| | `body` | text | HTML body with `{{employee_name}}` and `{{tracking_url}}` placeholders |
| | `sender_name` | string | From display name |
| | `sender_domain` | string | From domain |
| | `created_at` | datetime | Auto-set |
| **PhishingCampaign** | `id` | UUID | Primary key |
| | `organization` | FK → Organization | CASCADE delete |
| | `template` | FK → PhishingTemplate | CASCADE delete |
| | `name` | string | Campaign display name |
| | `status` | string | `DRAFT` / `ACTIVE` / `COMPLETED` |
| | `created_at` | datetime | Auto-set |
| | `launched_at` | datetime | Set on launch (nullable) |
| | `completed_at` | datetime | Set on completion (nullable) |
| **PhishingSimulationTarget** | `id` | UUID | Primary key |
| | `campaign` | FK → PhishingCampaign | CASCADE delete |
| | `employee` | FK → Employee | CASCADE delete |
| | `tracking_token` | UUID | Unique, auto-generated, used in click-tracking URL |
| | `sent_at` | datetime | When email was sent (nullable) |
| | `clicked_at` | datetime | When employee clicked (nullable) |
| | | | **Unique constraint:** `(campaign, employee)` |
| **TrainingModule** | `id` | UUID | Primary key |
| | `attack_type` | string | Matches template attack types |
| | `language` | string | Matches template languages |
| | `title` | string | Module display title |
| | `content` | text | Training content |
| | `duration_minutes` | int | Estimated completion time |
| | `created_at` | datetime | Auto-set |
| | | | **Unique constraint:** `(attack_type, language)` |
| **TrainingEnrollment** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `module` | FK → TrainingModule | CASCADE delete |
| | `simulation_target` | FK → PhishingSimulationTarget | Nullable, links to the sim that triggered enrollment |
| | `enrolled_at` | datetime | Auto-set |
| | `completed_at` | datetime | Nullable, set on completion |

#### Agent App

| Model | Field | Type | Notes |
|---|---|---|---|
| **DeviceSnapshot** | `id` | UUID | Primary key |
| | `employee` | FK → Employee | CASCADE delete |
| | `collected_at` | datetime | When agent collected data |
| | `received_at` | datetime | When backend received it |
| | `hostname` | string | Device hostname |
| | `os_name` | string | e.g., "Windows" |
| | `os_version` | string | e.g., "11 Pro 23H2" |
| | `architecture` | string | e.g., "x64" |
| | `cpu_cores` | int | Number of CPU cores |
| | `total_memory_mb` | int | Total RAM in MB |
| | `risk_score` | int | 0–100, computed by risk engine |
| | `risk_level` | string | `low` / `medium` / `high` / `critical` |
| | `risk_signals` | JSON | Array of signal descriptions |
| | `raw` | JSON | Full original payload from agent |
| **ApprovedSoftware** | `id` | UUID | Primary key |
| | `organization` | FK → Organization | CASCADE delete |
| | `name` | string | Software name (case-insensitive substring match) |
| | `notes` | string | Admin notes |
| | `added_at` | datetime | Auto-set |
| | | | **Unique constraint:** `(organization, name)` |

---

### 9.3 Endpoint Summary Table

| # | Method | URL | Auth | Consumer |
|---|---|---|---|---|
| 2.1 | POST | `/api/auth/register` | None | Dashboard |
| 2.2 | POST | `/api/auth/login` | None | Dashboard |
| 2.3 | POST | `/api/auth/logout` | Org Token | Dashboard |
| 2.4 | GET | `/api/auth/me` | Org Token | Dashboard |
| 3.1 | POST | `/api/auth/employee/login` | None | Extension |
| 3.2 | POST | `/api/auth/employee/logout` | Employee Token | Extension |
| 3.3 | GET | `/api/auth/employee/me` | Employee Token | Extension |
| 4.1 | GET | `/api/employees/` | Org Token | Dashboard |
| 4.2 | POST | `/api/employees/` | Org Token | Dashboard |
| 4.3 | PATCH | `/api/employees/<id>/` | Org Token | Dashboard |
| 4.4 | DELETE | `/api/employees/<id>/` | Org Token | Dashboard |
| 5.1 | POST | `/api/logs/dlp/` | None | Extension |
| 5.2 | POST | `/api/logs/blacklist/` | None | Extension |
| 5.3 | GET | `/api/extension/blacklist/` | None | Extension |
| 5.4 | GET | `/api/extension/poll/` | None | Extension |
| 6.1 | GET | `/api/gamification/quizzes/` | None | Both |
| 6.2 | GET | `/api/gamification/quizzes/<id>/` | None | Extension |
| 6.3 | POST | `/api/gamification/submit-quiz/` | None | Extension |
| 7.1 | GET | `/api/phishing/templates/` | Org Token | Dashboard |
| 7.1b | POST | `/api/phishing/templates/` | Org Token | Dashboard |
| 7.2 | POST | `/api/phishing/templates/generate/` | Org Token | Dashboard |
| 7.3 | GET | `/api/phishing/campaigns/` | Org Token | Dashboard |
| 7.3b | POST | `/api/phishing/campaigns/` | Org Token | Dashboard |
| 7.4 | POST | `/api/phishing/campaigns/<id>/launch/` | Org Token | Dashboard |
| 7.5 | POST | `/api/phishing/campaigns/<id>/complete/` | Org Token | Dashboard |
| 7.6 | GET | `/api/phishing/campaigns/<id>/targets/` | Org Token | Dashboard |
| 7.7 | GET | `/api/phishing/click/<token>/` | None | Employee browser |
| 7.8 | POST | `/api/phishing/targets/<id>/sent/` | Org Token | Dashboard |
| 7.9 | GET | `/api/phishing/analytics/` | Org Token | Dashboard |
| 7.10 | GET | `/api/phishing/analytics/trend/` | Org Token | Dashboard |
| 7.11 | GET | `/api/phishing/alerts/managers/` | Org Token | Dashboard |
| 7.12 | GET | `/api/phishing/training/` | Org Token | Dashboard |
| 7.13 | GET | `/api/phishing/training/enrollments/` | Org Token | Dashboard |
| 7.14 | POST | `/api/phishing/training/enrollments/<id>/complete/` | Org Token | Dashboard |
| 7.15 | GET | `/api/phishing/employees/<id>/difficulty/` | Org Token | Dashboard |
| 8.1 | POST | `/api/agent/snapshot/` | Org Token | Desktop Agent |
| 8.2 | GET | `/api/agent/risk-trend/<id>/` | Org Token | Dashboard |
| 8.3 | GET | `/api/agent/drift/<id>/` | Org Token | Dashboard |
| 8.4 | GET | `/api/agent/port-audit/` | Org Token | Dashboard |
| 8.5 | GET | `/api/agent/software-audit/` | Org Token | Dashboard |
| 8.6 | GET/POST/DELETE | `/api/agent/approved-software/` | Org Token | Dashboard |

---

*Total endpoints: **37** across 5 Django apps (organizations, extension, gamification, phishing, agent).*
