const http = require("http");
const { URL } = require("url");

const HOST = process.env.MOCK_HOST || "127.0.0.1";
const PORT = Number(process.env.MOCK_PORT || 8000);

const state = {
  dlpLogs: [],
  blacklistLogs: [],
  quizSubmissions: [],
  eventsByEmployee: new Map(),
  blacklistDomains: ["malware-test.local", "credential-harvest-test.local", "eicar.org"],
  aiTargets: {
    domains: [
      "chat.openai.com",
      "chatgpt.com",
      "claude.ai",
      "gemini.google.com",
      "copilot.microsoft.com",
    ],
    keywords: ["chatgpt", "claude", "gemini", "copilot", "assistant", "ai chat", "prompt"],
  },
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(html);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function enqueueEvent(empId, eventPayload) {
  if (!state.eventsByEmployee.has(empId)) state.eventsByEmployee.set(empId, []);
  state.eventsByEmployee.get(empId).push(eventPayload);
}

function dequeueEvent(empId) {
  const queue = state.eventsByEmployee.get(empId);
  if (!queue || !queue.length) return null;
  return queue.shift();
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  const parsed = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = normalizePath(parsed.pathname);

  try {
    if (req.method === "GET" && path === "/dev/health") {
      return sendJson(res, 200, { ok: true, service: "mock-backend", now: new Date().toISOString() });
    }

    if (req.method === "GET" && path === "/dev/logs") {
      return sendJson(res, 200, {
        dlpLogs: state.dlpLogs,
        blacklistLogs: state.blacklistLogs,
        quizSubmissions: state.quizSubmissions,
        pendingEvents: Object.fromEntries(state.eventsByEmployee.entries()),
      });
    }

    if (req.method === "GET" && path === "/dev/upload-lab") {
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Upload Lab</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 760px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .row { margin-bottom: 14px; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 12px; min-height: 120px; overflow: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Extension Upload Lab</h1>
    <p>Use this page to test upload interception and warning behavior.</p>
    <div class="row">
      <label>Select file: <input id="f1" type="file" /></label>
    </div>
    <div class="row">
      <button id="submitBtn" type="button">Simulate upload submit</button>
    </div>
    <p>Event log:</p>
    <pre id="log"></pre>
  </div>
  <script>
    const log = document.getElementById("log");
    const f1 = document.getElementById("f1");
    const btn = document.getElementById("submitBtn");
    function write(msg) { log.textContent += msg + "\\n"; }
    f1.addEventListener("change", () => {
      const f = f1.files && f1.files[0];
      write("[change] " + (f ? (f.name + " (" + f.size + " bytes)") : "none"));
    });
    btn.addEventListener("click", () => {
      const f = f1.files && f1.files[0];
      write("[submit] " + (f ? f.name : "no file selected"));
    });
  </script>
</body>
</html>`;
      return sendHtml(res, 200, html);
    }

    if (req.method === "GET" && path === "/dev/prompt-lab") {
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ChatGPT Prompt Lab</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 760px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .row { margin-bottom: 14px; }
    textarea { width: 100%; min-height: 160px; padding: 12px; border-radius: 8px; border: 1px solid #cbd5f5; }
    button { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
    pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 12px; min-height: 120px; overflow: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>AI Prompt Lab</h1>
    <p>Use this page to test AI prompt interception and warning behavior.</p>
    <form id="promptForm">
      <div class="row">
        <textarea id="promptBox" placeholder="Ask ChatGPT something..."></textarea>
      </div>
      <div class="row">
        <button id="sendBtn" type="submit">Send</button>
      </div>
    </form>
    <p>Event log:</p>
    <pre id="log"></pre>
  </div>
  <script>
    const log = document.getElementById("log");
    const promptBox = document.getElementById("promptBox");
    const form = document.getElementById("promptForm");
    function write(msg) { log.textContent += msg + "\n"; }
    promptBox.addEventListener("input", () => {
      write("[input] " + promptBox.value.slice(0, 80));
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      write("[submit] " + promptBox.value.slice(0, 80));
    });
  </script>
</body>
</html>`;
      return sendHtml(res, 200, html);
    }

    if (req.method === "POST" && path === "/dev/reset") {
      state.dlpLogs = [];
      state.blacklistLogs = [];
      state.quizSubmissions = [];
      state.eventsByEmployee.clear();
      return sendJson(res, 200, { ok: true, message: "Mock backend state reset." });
    }

    if (req.method === "POST" && path === "/dev/trigger") {
      const body = await readJsonBody(req);
      const employeeId = body.emp_id || body.employee_id || "EMP001";
      const eventPayload = {
        event_id: body.event_id || `evt_${Date.now()}`,
        type: "QUIZ",
        quiz_id: body.quiz_id || "quiz_demo_001",
        question: body.question || "What should you do before sharing sensitive company data externally?",
        options:
          body.options || {
            a: "Verify policy and data classification",
            b: "Share first and classify later",
            c: "Only check if asked by a colleague",
          },
      };
      enqueueEvent(employeeId, eventPayload);
      return sendJson(res, 200, { ok: true, queued_for: employeeId, event: eventPayload });
    }

    if (req.method === "GET" && path === "/api/extension/poll") {
      const empId = parsed.searchParams.get("emp_id");
      if (!empId) return sendJson(res, 400, { error: "emp_id is required." });

      const eventPayload = dequeueEvent(empId);
      if (!eventPayload) return sendJson(res, 200, { hasEvent: false });
      return sendJson(res, 200, { hasEvent: true, eventPayload });
    }

    if (req.method === "GET" && path === "/api/extension/blacklist") {
      return sendJson(res, 200, { domains: state.blacklistDomains });
    }

    if (req.method === "GET" && path === "/api/extension/ai-targets") {
      return sendJson(res, 200, state.aiTargets);
    }

    if (req.method === "POST" && path === "/api/logs/dlp") {
      const body = await readJsonBody(req);
      const required = ["employee_id", "filename", "website", "action_taken"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const allowedActions = new Set(["allow", "cancel", "force"]);
      if (!allowedActions.has(body.action_taken)) {
        return sendJson(res, 400, { error: "action_taken must be allow, cancel, or force." });
      }

      const logEntry = { ...body, logged_at: new Date().toISOString() };
      state.dlpLogs.push(logEntry);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/api/logs/blacklist") {
      const body = await readJsonBody(req);
      const required = ["employee_id", "attempted_url"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const logEntry = { ...body, logged_at: new Date().toISOString() };
      state.blacklistLogs.push(logEntry);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/api/gamification/submit-quiz") {
      const body = await readJsonBody(req);
      const required = ["employee_id", "quiz_id", "answer_selected"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const submission = { ...body, submitted_at: new Date().toISOString() };
      state.quizSubmissions.push(submission);
      return sendJson(res, 200, { ok: true, is_correct: null });
    }

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    return sendJson(res, 500, { error: "Internal mock backend error.", details: error.message });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-backend] Listening on http://${HOST}:${PORT}`);
  // eslint-disable-next-line no-console
  console.log("[mock-backend] Endpoints: /api/*, /dev/health, /dev/logs, /dev/trigger, /dev/reset");
});
