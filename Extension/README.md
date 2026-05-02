# CyberBase Web Guard - Chrome Extension

Manifest V3 Chrome extension for CyberBase (Module C). It enforces navigation security, DLP on file uploads, and delivers real-time admin quizzes.

---

## Install (Development)

1. Open Chrome -> `chrome://extensions` -> Enable **Developer mode**
2. Click **Load unpacked** -> select the `Extension/` folder
3. Click the CyberBase icon in the toolbar -> enter your `emp_id` -> Save

---

## Configuration

| Setting | Where | Notes |
|---|---|---|
| `BACKEND_URL` | Top of `background.js` | Change before loading extension |
| `emp_id` | Extension popup (toolbar icon) | Plain string, set per device |
| `DEBUG_MODE` | Top of `background.js` | Set `true` to enable verbose logging |

---

## DLP Pipeline (Multi-tier)

1. **Interceptor (content script):** captures file uploads and extracts text from `.txt`, `.csv`, `.json`, `.xml`, `.pdf` (pdf.js), and `.docx` (mammoth.js).
2. **Tier 1 (Fast Fail):** regex scan for restricted markers.
3. **Tier 2 (Semantic):** if Tier 1 passes, `background.js` runs Transformers.js embeddings (`Xenova/all-MiniLM-L6-v2`) and cosine similarity against restricted topic vectors.
4. **Decision:** if similarity `>= 0.85`, show warning and let user `cancel` or `force`.

---

## Backend Route Contract (V2)

All routes are on the backend server.

### `POST /api/logs/dlp`
```json
{
  "employee_id": "string",
  "filename": "string",
  "website": "string",
  "action_taken": "allow | cancel | force",
  "document_topic": "string",
  "semantic_score": 0.0,
  "detection_tier": "tier1_regex | tier2_semantic | no_text | pipeline_error",
  "detection_reason": "string",
  "matched_pattern": "string | null"
}
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
{ "hasEvent": true, "eventPayload": { "event_id": "string", "type": "QUIZ", "...": "..." } }
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

## Local Dev (Mock Server)

```bash
cd Extension
node mock-backend.js
```

To trigger a quiz on the employee's screen:
```bash
curl -X POST http://127.0.0.1:8000/dev/trigger \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_001","type":"QUIZ","quiz_id":"q1","question":"What is phishing?","options":{"a":"A fishing technique","b":"A social engineering attack","c":"An antivirus"}}'
```
