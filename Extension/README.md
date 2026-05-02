# CyberBase Web Guard — Chrome Extension

Manifest V3 Chrome extension for CyberBase (Module C). Enforces navigation security, DLP on file uploads, and delivers real-time admin quizzes and fake phishing simulations to employees.

---

## Install (Development)

1. Place `sweetalert2.all.min.js` (v11.x) in `Extension/lib/`. Download from: https://github.com/sweetalert2/sweetalert2/releases
2. Open Chrome → `chrome://extensions` → Enable **Developer mode**
3. Click **Load unpacked** → select the `Extension/` folder
4. Click the CyberBase icon in the toolbar → enter your `emp_id` → Save

---

## Configuration

| Setting | Where | Notes |
|---|---|---|
| `BACKEND_URL` | Top of `background.js` | Change before loading extension |
| `emp_id` | Extension popup (toolbar icon) | Plain string, set per device |
| `DEBUG_MODE` | Top of `background.js` | Set `true` to enable verbose logging |

---

## Backend Route Contract (V1)

All routes are on the backend server. The extension assumes these exist and does not implement them.

### `POST /api/logs/dlp`
```json
{ "employee_id": "string", "filename": "string", "website": "string", "action_taken": "BLOCKED | BYPASSED" }
```
Response: `200 OK`

### `POST /api/logs/blacklist`
```json
{ "employee_id": "string", "attempted_url": "string" }
```
Response: `200 OK`

### `GET /api/extension/poll?emp_id=XYZ`
```json
{ "hasEvent": false }
{ "hasEvent": true, "eventPayload": { "event_id": "string", "type": "QUIZ | FAKE_PHISHING", ... } }
```
Backend marks event as delivered after first fetch (no duplicate delivery).

### `POST /api/gamification/submit-quiz`
```json
{ "employee_id": "string", "quiz_id": "string", "answer_selected": "string" }
```
Response: `200 OK`

---

## Employee ID Strategy (V1)

`emp_id` is a plain alphanumeric string configured manually via the extension popup. It is stored in `chrome.storage.local` (scoped to the browser profile). No OAuth or SSO for V1.

---

## SweetAlert2

- **Version:** 11.x (pin to exact version used)
- **Bundle:** `lib/sweetalert2.all.min.js` — must be local, no CDN
- **Source:** https://github.com/sweetalert2/sweetalert2/releases

---

## Local Dev (Mock Server)

```bash
cd ..
npm install express cors
node mock-server.js
```

Update `BACKEND_URL` in `background.js` to `http://localhost:3001` for local testing.

To trigger a quiz on the employee's screen:
```bash
curl -X POST http://localhost:3001/dev/trigger \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_001","type":"QUIZ","quiz_id":"q1","question":"What is phishing?","options":{"a":"A fishing technique","b":"A social engineering attack","c":"An antivirus"}}'
```
