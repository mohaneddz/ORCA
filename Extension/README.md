# CyberBase Web Guard - Chrome Extension

Manifest V3 Chrome extension for CyberBase (Module C). It enforces navigation security, DLP on file uploads, and delivers real-time admin quizzes.

---

## Install (Development)

1. Open Chrome -> `chrome://extensions` -> Enable **Developer mode**
2. Click **Load unpacked** -> select the `Extension/` folder
3. Click the CyberBase icon -> enter employee email -> `Next` -> enter password -> `Login`

---

## Configuration

| Setting | Where | Notes |
|---|---|---|
| `BACKEND_URL` | Top of `background.js` | Change before loading extension |
| Employee session | Extension popup (toolbar icon) | Stored in `chrome.storage.local` after login |
| `DEBUG_MODE` | Top of `background.js` | Set `true` to enable verbose logging |

---

## DLP Pipeline (Multi-tier)

1. **Interceptor (content script):** captures file uploads and extracts text from `.txt`, `.csv`, `.json`, `.xml`, `.pdf` (pdf.js), and `.docx` (mammoth.js).
2. **Tier 1 (Fast Fail):** regex scan for restricted markers.
3. **Tier 2 (Semantic):** if Tier 1 passes, `background.js` runs Transformers.js embeddings (`Xenova/all-MiniLM-L6-v2`) and cosine similarity against restricted topic vectors.
4. **AI Prompt Monitoring:** intercepts prompt submissions on known AI tools (plus heuristic AI pages) and applies the same regex + semantic checks.
5. **Size Thresholds:** flags uploads > `10MB` and AI prompts > `2500` chars.
6. **Decision:** if risk boundary is met, show warning and let user `cancel` or `force`.

---

## Backend Route Contract (V2)

All routes are on the backend server.
All extension routes below require:

```http
Authorization: EmployeeToken <token>
```

### `POST /api/logs/dlp`
```json
{
  "filename": "string",
  "website": "string",
  "action_taken": "allow | cancel | force",
  "event_channel": "file_upload | ai_prompt",
  "document_topic": "string",
  "semantic_score": 0.0,
  "detection_tier": "tier1_regex | tier2_semantic | size_threshold | pipeline_error",
  "detection_reason": "string",
  "matched_pattern": "string | null",
  "input_size_bytes": 0,
  "input_size_chars": 0,
  "threshold_type": "string",
  "threshold_value": 0,
  "decision_score": 0.0
}
```
Response: `200 OK`

### `GET /api/extension/ai-targets`
```json
{
  "domains": ["chatgpt.com", "claude.ai"],
  "keywords": ["chatgpt", "claude", "prompt"]
}
```
Response: `200 OK`

### `POST /api/logs/blacklist`
```json
{ "attempted_url": "string" }
```
Response: `200 OK`

### `GET /api/extension/poll`
```json
{ "hasEvent": false }
{ "hasEvent": true, "eventPayload": { "event_id": "string", "type": "QUIZ", "...": "..." } }
```
Backend marks event as delivered after first fetch (no duplicate delivery).

### `POST /api/gamification/submit-quiz`
```json
{ "quiz_id": "string", "answer_selected": "string" }
```
Response: `200 OK`

---

## Employee Session (V2)

The extension authenticates employees using:

- `POST /api/auth/employee/login`
- `GET /api/auth/employee/me`
- `POST /api/auth/employee/logout`

After login, the token is persisted in `chrome.storage.local` and attached to every protected request as `Authorization: EmployeeToken <token>`. If a protected request returns `401`, the extension auto-logs out and returns to locked mode.

---

## Local Dev (Mock Server)

```bash
cd Extension
node mock-backend.js
```

Default mock credentials:

- Email: `employee@acme.test`
- Password: `secret123`

To trigger a quiz on the employee's screen:
```bash
curl -X POST http://127.0.0.1:8000/dev/trigger \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_001","type":"QUIZ","quiz_id":"q1","question":"What should you do before sharing sensitive company data externally?","options":{"a":"Verify policy and data classification","b":"Share first and classify later","c":"Only check if asked by a colleague"}}'
```
