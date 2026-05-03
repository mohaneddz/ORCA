const crypto = require("crypto");
const http = require("http");
const { URL } = require("url");

const HOST = process.env.MOCK_HOST || "127.0.0.1";
const PORT = Number(process.env.MOCK_PORT || 8000);

const EMPLOYEE_ID =
  process.env.MOCK_EMPLOYEE_ID || "550e8400-e29b-41d4-a716-446655440001";
const ORG_ID = process.env.MOCK_ORG_ID || "550e8400-e29b-41d4-a716-446655440000";
const EMPLOYEE_EMAIL = (process.env.MOCK_EMPLOYEE_EMAIL || "employee@acme.test").toLowerCase();
const EMPLOYEE_PASSWORD = process.env.MOCK_EMPLOYEE_PASSWORD || "secret123";

const EMPLOYEE_PROFILE = {
  id: EMPLOYEE_ID,
  name: process.env.MOCK_EMPLOYEE_NAME || "Alice Smith",
  email: EMPLOYEE_EMAIL,
  department: "Engineering",
  role: "Security Analyst",
  seniority: "mid",
  organization: {
    id: ORG_ID,
    name: process.env.MOCK_ORG_NAME || "Acme Corp",
  },
};

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
  employeeTokens: new Map(),
  reputation: {
    blockedUrls: [],
    blockedHosts: [],
    degraded: false,
  },
  falsePositiveReports: [],
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function enqueueEvent(employeeId, eventPayload) {
  if (!state.eventsByEmployee.has(employeeId)) state.eventsByEmployee.set(employeeId, []);
  state.eventsByEmployee.get(employeeId).push(eventPayload);
}

function dequeueEvent(employeeId) {
  const queue = state.eventsByEmployee.get(employeeId);
  if (!queue || !queue.length) return null;
  return queue.shift();
}

function normalizeHttpUrl(raw) {
  try {
    const parsed = new URL(String(raw || ""));
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return "";
    parsed.hash = "";
    if ((protocol === "http:" && parsed.port === "80") || (protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }
    return parsed.toString();
  } catch (_) {
    return "";
  }
}

function isHostnameBlocked(hostname, blockedHosts) {
  const host = String(hostname || "").toLowerCase().trim();
  return blockedHosts.some((entry) => host === entry || host.endsWith("." + entry));
}

function issueEmployeeToken(employeeId) {
  const token = crypto.randomBytes(24).toString("hex");
  state.employeeTokens.set(token, employeeId);
  return token;
}

function getEmployeeFromRequest(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("EmployeeToken ")) return null;
  const token = header.slice("EmployeeToken ".length).trim();
  if (!token) return null;
  const employeeId = state.employeeTokens.get(token);
  if (!employeeId) return null;
  if (employeeId !== EMPLOYEE_PROFILE.id) return null;
  return EMPLOYEE_PROFILE;
}

function requireEmployeeAuth(req, res) {
  const employee = getEmployeeFromRequest(req);
  if (!employee) {
    sendJson(res, 401, { error: "Authorization header missing or malformed." });
    return null;
  }
  return employee;
}

function serializeMe(employee) {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    role: employee.role,
    seniority: employee.seniority,
    is_active: true,
    registered_at: "2026-05-02T10:00:00Z",
    organization: employee.organization,
  };
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
    function write(msg) { log.textContent += msg + "\\n"; }
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
      state.employeeTokens.clear();
      state.reputation = {
        blockedUrls: [],
        blockedHosts: [],
        degraded: false,
      };
      return sendJson(res, 200, { ok: true, message: "Mock backend state reset." });
    }

    if (req.method === "POST" && path === "/dev/reputation") {
      const body = await readJsonBody(req);
      const blockedUrls = Array.isArray(body.blockedUrls) ? body.blockedUrls : [];
      const blockedHosts = Array.isArray(body.blockedHosts) ? body.blockedHosts : [];
      state.reputation = {
        blockedUrls: blockedUrls
          .map((item) => normalizeHttpUrl(item))
          .filter(Boolean),
        blockedHosts: blockedHosts
          .map((item) => String(item || "").toLowerCase().trim())
          .filter(Boolean),
        degraded: Boolean(body.degraded),
      };
      return sendJson(res, 200, { ok: true, reputation: state.reputation });
    }

    if (req.method === "POST" && path === "/dev/trigger") {
      const body = await readJsonBody(req);
      const employeeId = body.emp_id || body.employee_id || EMPLOYEE_PROFILE.id;
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

    if (req.method === "POST" && path === "/api/auth/employee/login") {
      const body = await readJsonBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!email || !password) {
        return sendJson(res, 400, { error: "email and password are required." });
      }

      if (email !== EMPLOYEE_EMAIL || password !== EMPLOYEE_PASSWORD) {
        return sendJson(res, 401, { error: "Invalid credentials." });
      }

      const token = issueEmployeeToken(EMPLOYEE_PROFILE.id);
      return sendJson(res, 200, {
        token,
        employee: EMPLOYEE_PROFILE,
      });
    }

    if (req.method === "POST" && path === "/api/auth/employee/logout") {
      const header = req.headers.authorization || "";
      if (!header.startsWith("EmployeeToken ")) {
        return sendJson(res, 401, { error: "Authorization header missing or malformed." });
      }
      const token = header.slice("EmployeeToken ".length).trim();
      if (!token || !state.employeeTokens.has(token)) {
        return sendJson(res, 401, { error: "Invalid or already revoked token." });
      }
      state.employeeTokens.delete(token);
      return sendJson(res, 200, {});
    }

    if (req.method === "GET" && path === "/api/auth/employee/me") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;
      return sendJson(res, 200, serializeMe(employee));
    }

    if (req.method === "GET" && path === "/api/extension/poll") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;

      const eventPayload = dequeueEvent(employee.id);
      if (!eventPayload) return sendJson(res, 200, { hasEvent: false });
      return sendJson(res, 200, { hasEvent: true, eventPayload });
    }

    if (req.method === "GET" && path === "/api/extension/blacklist") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;
      return sendJson(res, 200, { domains: state.blacklistDomains });
    }

    if (req.method === "GET" && path === "/api/extension/ai-targets") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;
      return sendJson(res, 200, state.aiTargets);
    }

    if (req.method === "POST" && path === "/api/extension/reputation/check") {
      const body = await readJsonBody(req);
      const target = normalizeHttpUrl(body.url);
      if (!target) {
        return sendJson(res, 400, { error: "A valid http/https URL is required." });
      }

      const parsedTarget = new URL(target);
      const blockedByPolicy = isHostnameBlocked(parsedTarget.hostname, state.blacklistDomains);
      const blockedByFeedUrl = state.reputation.blockedUrls.includes(target);
      const blockedByFeedHost = isHostnameBlocked(parsedTarget.hostname, state.reputation.blockedHosts);

      if (blockedByPolicy) {
        return sendJson(res, 200, {
          decision: "block",
          verdict: "policy_block",
          matched_sources: ["policy_blacklist"],
          degraded: false,
          reason: "policy_blacklist_match",
        });
      }

      if (blockedByFeedUrl || blockedByFeedHost) {
        return sendJson(res, 200, {
          decision: "block",
          verdict: "phishing",
          matched_sources: ["openphish", "phishtank"],
          degraded: false,
          reason: "threat_match",
        });
      }

      if (state.reputation.degraded) {
        return sendJson(res, 200, {
          decision: "allow",
          verdict: "unknown",
          matched_sources: [],
          degraded: true,
          reason: "provider_degraded_allow",
        });
      }

      return sendJson(res, 200, {
        decision: "allow",
        verdict: "clean",
        matched_sources: [],
        degraded: false,
        reason: "no_match",
      });
    }

    if (req.method === "POST" && path === "/api/logs/dlp") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;

      const body = await readJsonBody(req);
      const required = ["filename", "website", "action_taken"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const allowedActions = new Set(["allow", "cancel", "force", "report_mistake"]);
      if (!allowedActions.has(body.action_taken)) {
        return sendJson(res, 400, { error: "action_taken must be allow, cancel, force, or report_mistake." });
      }

      const logEntry = {
        ...body,
        employee_id: employee.id,
        logged_at: new Date().toISOString(),
      };
      state.dlpLogs.push(logEntry);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/api/logs/dlp/report-mistake") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;

      const body = await readJsonBody(req);
      const required = ["filename", "website"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const report = {
        ...body,
        id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        employee_id: employee.id,
        status: "pending",
        reported_at: new Date().toISOString(),
      };
      state.falsePositiveReports.push(report);
      return sendJson(res, 200, { ok: true, report_id: report.id });
    }

    if (req.method === "POST" && path === "/api/logs/blacklist") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;

      const body = await readJsonBody(req);
      const required = ["attempted_url"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const logEntry = {
        ...body,
        employee_id: employee.id,
        logged_at: new Date().toISOString(),
      };
      state.blacklistLogs.push(logEntry);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/api/gamification/submit-quiz") {
      const employee = requireEmployeeAuth(req, res);
      if (!employee) return;

      const body = await readJsonBody(req);
      const required = ["quiz_id", "answer_selected"];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });

      const submission = {
        ...body,
        employee_id: employee.id,
        submitted_at: new Date().toISOString(),
      };
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
  console.log(`[mock-backend] Employee login: ${EMPLOYEE_EMAIL} / ${EMPLOYEE_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log("[mock-backend] Endpoints: /api/*, /dev/health, /dev/logs, /dev/trigger, /dev/reset");
});
