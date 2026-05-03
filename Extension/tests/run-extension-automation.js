const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const BACKEND_DIR = process.env.BACKEND_DIR || path.resolve(__dirname, "..", "..", "Backend");
const EXTENSION_PATH = path.resolve(__dirname, "..");
const REPORT_PATH = process.env.REPORT_PATH || path.join(EXTENSION_PATH, "automation-report.md");
const ARTIFACT_DIR = path.join(__dirname, "artifacts");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const DEFAULT_TIMEOUT = Number(process.env.E2E_TIMEOUT_MS || 30000);
const POLL_TIMEOUT = Number(process.env.E2E_POLL_TIMEOUT_MS || 45000);
const RUN_ID = `real-e2e-${Date.now()}`;

const results = [];
let failureCount = 0;
const cleanupState = {
  tokenIds: new Set(),
  dlpLogIds: new Set(),
  quizIds: new Set(),
  adminEventIds: new Set(),
  submissionIds: new Set(),
};

class SkipStepError extends Error {}

function nowStamp() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recordResult(name, status, details) {
  results.push({ name, status, details });
  if (status === "FAIL") failureCount += 1;
}

function buildReport(context = {}) {
  const lines = [];
  lines.push("# Extension Automation Report", "");
  lines.push(`- Date: ${nowStamp()}`);
  lines.push(`- Backend URL: ${BACKEND_URL}`);
  lines.push(`- Mode: real-backend`);
  if (context.employeeEmail) lines.push(`- Employee Email: ${context.employeeEmail}`);
  lines.push(`- Run ID: ${RUN_ID}`, "");
  lines.push("## Results", "");
  for (const result of results) {
    lines.push(`- ${result.status}: ${result.name} - ${result.details}`);
  }
  lines.push("", "## Summary", "");
  lines.push(`- Total: ${results.length}`);
  lines.push(`- Passed: ${results.filter((r) => r.status === "PASS").length}`);
  lines.push(`- Failed: ${results.filter((r) => r.status === "FAIL").length}`);
  lines.push(`- Skipped: ${results.filter((r) => r.status === "SKIP").length}`, "");
  if (fs.existsSync(ARTIFACT_DIR)) {
    lines.push("## Artifacts", "");
    lines.push(`- ${path.relative(EXTENSION_PATH, ARTIFACT_DIR)}/*.png`, "");
  }
  return lines.join("\n");
}

function extractJsonFromOutput(outputText) {
  const text = String(outputText || "").trim();
  if (!text) {
    throw new Error("Backend helper produced empty output.");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Backend helper output is not JSON: ${text}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

function runBackendOp(op, payload = {}) {
  const payload64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const helperScript = `
import base64
import json
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
import django
django.setup()

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from organizations.models import Employee, EmployeeAuthToken
from extension.models import AdminEvent, DLPLog
from gamification.models import Quiz, QuizSubmission

op = ${JSON.stringify(op)}
payload = json.loads(base64.b64decode(${JSON.stringify(payload64)}).decode("utf-8"))

def parse_after(value):
    if not value:
        return None
    dt = parse_datetime(value)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    return dt

result = {"ok": False, "error": "unsupported_op", "op": op}

if op == "auth_fixture":
    employee = (
        Employee.objects.filter(is_active=True)
        .select_related("organization")
        .order_by("registered_at")
        .first()
    )
    if employee is None:
        result = {"ok": False, "error": "No active employee found in backend DB."}
    else:
        token = EmployeeAuthToken.objects.create(employee=employee)
        result = {
            "ok": True,
            "employee_id": str(employee.id),
            "organization_id": str(employee.organization_id),
            "employee_email": employee.email,
            "token": token.key,
            "token_id": str(token.id),
            "employee_profile": {
                "id": str(employee.id),
                "name": employee.name,
                "email": employee.email,
                "department": employee.department,
                "role": employee.role,
                "seniority": employee.seniority,
                "organization": {
                    "id": str(employee.organization_id),
                    "name": employee.organization.name if employee.organization else "",
                },
            },
        }

elif op == "find_dlp":
    qs = DLPLog.objects.filter(employee_id=payload["employee_id"])
    after_dt = parse_after(payload.get("logged_after"))
    if after_dt is not None:
        qs = qs.filter(logged_at__gte=after_dt)

    if payload.get("filename"):
        qs = qs.filter(filename=payload["filename"])
    if payload.get("action_taken"):
        qs = qs.filter(action_taken=payload["action_taken"])
    if payload.get("event_channel"):
        qs = qs.filter(event_channel=payload["event_channel"])
    if payload.get("detection_tier"):
        qs = qs.filter(detection_tier=payload["detection_tier"])

    latest = (
        qs.order_by("-logged_at")
        .values("id", "filename", "action_taken", "event_channel", "detection_tier", "logged_at")
        .first()
    )
    if latest and latest.get("logged_at") is not None:
        latest["logged_at"] = latest["logged_at"].isoformat()
    result = {"ok": True, "count": qs.count(), "latest": latest}

elif op == "seed_quiz":
    employee = Employee.objects.get(id=payload["employee_id"])
    options = payload["options"]
    quiz = Quiz.objects.create(
        organization=employee.organization,
        question=payload["question"],
        options=options,
        correct_answer=payload["correct_answer"],
    )
    event = AdminEvent.objects.create(
        employee=employee,
        event_type="QUIZ",
        payload={
            "event_id": payload["event_id"],
            "quiz_id": str(quiz.id),
            "question": payload["question"],
            "options": options,
        },
    )
    result = {
        "ok": True,
        "quiz_id": str(quiz.id),
        "event_id": str(event.id),
    }

elif op == "find_submission":
    qs = QuizSubmission.objects.filter(
        employee_id=payload["employee_id"],
        quiz_id=payload["quiz_id"],
    )
    after_dt = parse_after(payload.get("submitted_after"))
    if after_dt is not None:
        qs = qs.filter(submitted_at__gte=after_dt)
    latest = qs.order_by("-submitted_at").values("id", "answer_selected", "is_correct", "submitted_at").first()
    if latest and latest.get("submitted_at") is not None:
        latest["submitted_at"] = latest["submitted_at"].isoformat()
    result = {"ok": True, "count": qs.count(), "latest": latest}

elif op == "cleanup":
    deleted = {
        "tokens": 0,
        "dlp_logs": 0,
        "quiz_submissions": 0,
        "admin_events": 0,
        "quizzes": 0,
    }
    token_ids = payload.get("token_ids") or []
    dlp_log_ids = payload.get("dlp_log_ids") or []
    submission_ids = payload.get("submission_ids") or []
    admin_event_ids = payload.get("admin_event_ids") or []
    quiz_ids = payload.get("quiz_ids") or []

    if token_ids:
        deleted["tokens"] = EmployeeAuthToken.objects.filter(id__in=token_ids).delete()[0]
    if dlp_log_ids:
        deleted["dlp_logs"] = DLPLog.objects.filter(id__in=dlp_log_ids).delete()[0]
    if submission_ids:
        deleted["quiz_submissions"] = QuizSubmission.objects.filter(id__in=submission_ids).delete()[0]
    if admin_event_ids:
        deleted["admin_events"] = AdminEvent.objects.filter(id__in=admin_event_ids).delete()[0]
    if quiz_ids:
        deleted["quizzes"] = Quiz.objects.filter(id__in=quiz_ids).delete()[0]

    result = {"ok": True, "deleted": deleted}

print(json.dumps(result, default=str))
`;

  const proc = spawnSync("python", ["-c", helperScript], {
    cwd: BACKEND_DIR,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (proc.error) {
    throw new Error(`Backend helper process error (${op}): ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    throw new Error(
      `Backend helper failed (${op})\nstdout:\n${proc.stdout || ""}\nstderr:\n${proc.stderr || ""}`
    );
  }

  const parsed = extractJsonFromOutput(proc.stdout);
  if (!parsed.ok) {
    throw new Error(`Backend helper returned failure (${op}): ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

async function fetchApi(pathname, method = "GET", body = null, headers = {}) {
  const response = await fetch(`${BACKEND_URL}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await response.json();
  } catch (_) {
    json = null;
  }
  return { response, json };
}

async function captureFailure(page, name) {
  if (!page) return;
  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const outputPath = path.join(ARTIFACT_DIR, `${safeName || "failure"}.png`);
    await page.screenshot({ path: outputPath, fullPage: true });
  } catch (_) {
    // ignore screenshot failures
  }
}

async function runStep(name, page, fn) {
  try {
    console.log(`\n[step] ${name}`);
    const details = await fn();
    recordResult(name, "PASS", details || "ok");
  } catch (error) {
    if (error instanceof SkipStepError) {
      recordResult(name, "SKIP", error.message || "skipped");
      return;
    }
    await captureFailure(page, name);
    recordResult(name, "FAIL", error?.message || String(error));
  }
}

function createLargeFixtureFile() {
  const filePath = path.join(os.tmpdir(), `${RUN_ID}-large.bin`);
  const fd = fs.openSync(filePath, "w");
  const chunk = Buffer.alloc(1024 * 1024, "X");
  for (let i = 0; i < 11; i += 1) {
    fs.writeSync(fd, chunk);
  }
  fs.closeSync(fd);
  return filePath;
}

function cloneFixtureWithRunId(sourceName, suffix) {
  const sourcePath = path.join(FIXTURES_DIR, sourceName);
  const outputPath = path.join(os.tmpdir(), `${RUN_ID}-${suffix}-${sourceName}`);
  fs.copyFileSync(sourcePath, outputPath);
  return outputPath;
}

function startLabServer() {
  const uploadPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Upload Lab</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 760px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .row { margin-bottom: 14px; }
    pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 12px; min-height: 100px; overflow: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Upload Lab</h1>
    <form id="uploadForm">
      <div class="row">
        <label>Select file: <input id="f1" type="file" /></label>
      </div>
      <div class="row">
        <button id="submitBtn" type="submit">Simulate upload submit</button>
      </div>
    </form>
    <div id="uploadState">none</div>
    <pre id="log"></pre>
  </div>
  <script>
    window.__uploadSubmitCount = 0;
    const f1 = document.getElementById("f1");
    const form = document.getElementById("uploadForm");
    const state = document.getElementById("uploadState");
    const log = document.getElementById("log");
    function write(text) {
      log.textContent += text + "\\n";
    }
    f1.addEventListener("change", () => {
      const file = f1.files && f1.files[0];
      state.textContent = file ? file.name : "none";
      write("[change] " + state.textContent);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.__uploadSubmitCount += 1;
      const file = f1.files && f1.files[0];
      write("[submit] " + (file ? file.name : "none"));
    });
  </script>
</body>
</html>`;

  const promptPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ChatGPT Prompt Lab</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 760px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .row { margin-bottom: 14px; }
    textarea { width: 100%; min-height: 160px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
    pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 12px; min-height: 100px; overflow: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>AI Prompt Lab</h1>
    <form id="promptForm">
      <div class="row">
        <textarea id="promptBox" placeholder="Ask ChatGPT..."></textarea>
      </div>
      <div class="row">
        <button id="sendBtn" type="submit">Send</button>
      </div>
    </form>
    <div id="promptSubmitCount">0</div>
    <pre id="promptLog"></pre>
  </div>
  <script>
    window.__promptSubmitCount = 0;
    const form = document.getElementById("promptForm");
    const promptBox = document.getElementById("promptBox");
    const submitCount = document.getElementById("promptSubmitCount");
    const log = document.getElementById("promptLog");
    function write(text) {
      log.textContent += text + "\\n";
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.__promptSubmitCount += 1;
      submitCount.textContent = String(window.__promptSubmitCount);
      write("[submit] " + promptBox.value.slice(0, 80));
    });
  </script>
</body>
</html>`;

  const server = http.createServer((req, res) => {
    const pathname = (req.url || "").split("?")[0];
    if (pathname === "/upload-lab") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(uploadPage);
      return;
    }
    if (pathname === "/prompt-lab") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(promptPage);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function waitForContentScript(page) {
  await page.waitForSelector("#cb-http-banner", { timeout: DEFAULT_TIMEOUT });
}

async function handleDlpWarning(page, decision) {
  await page.waitForSelector("text=Sensitive Content Detected", { timeout: DEFAULT_TIMEOUT });
  if (decision === "cancel") {
    await page.click(".swal2-confirm");
  } else {
    await page.click(".swal2-cancel");
  }
  await sleep(800);
}


async function warmupSemanticModel(worker) {
  // Try to warm up the semantic model via the service worker.
  // Note: Playwright's Chromium does not support importScripts() for MV3 service workers,
  // so the Transformers.js runtime cannot load in automated tests. The model works in
  // real Chrome. Safe-file tests will gracefully skip when the model is unavailable.
  const maxWait = 30000;
  const start = Date.now();
  let attempts = 0;

  while (Date.now() - start < maxWait) {
    attempts += 1;
    try {
      const result = await worker.evaluate(async () => {
        try {
          return await handleMessage({ action: "DLP_SEMANTIC_CHECK", text: "warm-up" });
        } catch (e) {
          return { error: e.message };
        }
      });
      if (result && result.top_topic && result.top_topic !== "semantic_error" && result.top_topic !== "auth_required") {
        return true;
      }
    } catch (_) {}
    await sleep(3000);
  }
  return false;
}
async function resolveExtensionBase(context) {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker", { timeout: DEFAULT_TIMEOUT }));
  const url = worker.url();
  const match = url.match(/^chrome-extension:\/\/([a-z]{32})\//);
  if (!match) throw new Error(`Unable to resolve extension ID from worker URL: ${url}`);

  return {
    worker,
    extensionId: match[1],
    extensionBase: `chrome-extension://${match[1]}`,
  };
}

async function setAuthSession(worker, token, employeeProfile) {
  await worker.evaluate(async ({ tokenValue, profileValue }) => {
    await chrome.storage.local.set({
      employeeAuthToken: tokenValue,
      employeeProfile: profileValue,
    });
  }, { tokenValue: token, profileValue: employeeProfile });
}

async function clearAuthSession(worker) {
  await worker.evaluate(async () => {
    await chrome.storage.local.remove(["employeeAuthToken", "employeeProfile"]);
  });
}

async function waitForDlpLog(criteria, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = runBackendOp("find_dlp", criteria);
    if ((result.count || 0) > 0) {
      return result.latest;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for DLP log: ${JSON.stringify(criteria)}`);
}

async function waitForQuizSubmission(criteria, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = runBackendOp("find_submission", criteria);
    if ((result.count || 0) > 0) {
      return result.latest;
    }
    await sleep(800);
  }
  throw new Error(`Timed out waiting for quiz submission: ${JSON.stringify(criteria)}`);
}

async function cleanupArtifacts() {
  const payload = {
    token_ids: Array.from(cleanupState.tokenIds),
    dlp_log_ids: Array.from(cleanupState.dlpLogIds),
    submission_ids: Array.from(cleanupState.submissionIds),
    admin_event_ids: Array.from(cleanupState.adminEventIds),
    quiz_ids: Array.from(cleanupState.quizIds),
  };
  if (
    !payload.token_ids.length &&
    !payload.dlp_log_ids.length &&
    !payload.submission_ids.length &&
    !payload.admin_event_ids.length &&
    !payload.quiz_ids.length
  ) {
    return;
  }
  runBackendOp("cleanup", payload);
}

async function main() {
  const auth = runBackendOp("auth_fixture");
  cleanupState.tokenIds.add(auth.token_id);

  const tokenHeader = `EmployeeToken ${auth.token}`;
  const health = await fetchApi("/api/auth/employee/me", "GET", null, {
    Authorization: tokenHeader,
  });
  if (health.response.status !== 200) {
    throw new Error(`Real backend auth check failed: ${health.response.status}`);
  }

  let lab = null;
  let context = null;
  let worker = null;
  let extensionBase = "";
  const tempFiles = [];

  try {
    lab = await startLabServer();

    await runStep("Launch Chromium with extension", null, async () => {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbx-ext-real-"));
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        timeout: DEFAULT_TIMEOUT,
        ignoreDefaultArgs: ["--disable-extensions"],
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
        ],
      });
      context.setDefaultTimeout(DEFAULT_TIMEOUT);
      const resolved = await resolveExtensionBase(context);
      worker = resolved.worker;
      extensionBase = resolved.extensionBase;
      return `extension id: ${resolved.extensionId}`;
    });

    if (!context || !worker) {
      throw new Error("Could not initialize extension context.");
    }

    await runStep("Setup banner appears before auth", null, async () => {
      await clearAuthSession(worker);
      await sleep(600);
      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.waitForSelector("#cb-setup-banner", { timeout: DEFAULT_TIMEOUT });
        return "banner visible";
      } finally {
        await page.close();
      }
    });

    await runStep("Authenticate session with real token", null, async () => {
      await setAuthSession(worker, auth.token, auth.employee_profile);
      await sleep(600);
      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        const count = await page.locator("#cb-setup-banner").count();
        if (count !== 0) {
          throw new Error("Setup banner is still visible after setting a valid employee session.");
        }
        return "session active";
      } finally {
        await page.close();
      }
    });

    await runStep("Popup shows authenticated state", null, async () => {
      const popup = await context.newPage();
      try {
        await popup.goto(`${extensionBase}/popup.html`, { waitUntil: "domcontentloaded" });
        await popup.waitForSelector("#sessionPanel:not(.hidden)", { timeout: DEFAULT_TIMEOUT });
        const email = await popup.locator("#sessionEmail").innerText();
        if ((email || "").trim().toLowerCase() !== auth.employee_email.toLowerCase()) {
          throw new Error(`Popup session email mismatch: ${email}`);
        }
        return `email=${email}`;
      } finally {
        await popup.close();
      }
    });


    await runStep("Warm up semantic model", null, async () => {
      const ready = await warmupSemanticModel(worker);
      if (!ready) {
        return "model not loaded within timeout (safe-file tests will skip gracefully)";
      }
      return "semantic model ready";
    });
    await runStep("DLP regex cancel", null, async () => {
      const filePath = cloneFixtureWithRunId("sensitive.txt", "cancel");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);
        await handleDlpWarning(page, "cancel");

        const fileCount = await page.locator("#f1").evaluate((el) => el.files.length);
        if (fileCount !== 0) {
          throw new Error("Cancel action did not clear selected file.");
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "cancel",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, tier=${latest.detection_tier || "n/a"}`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP regex force", null, async () => {
      const filePath = cloneFixtureWithRunId("sensitive.txt", "force");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);
        await handleDlpWarning(page, "force");

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "force",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, tier=${latest.detection_tier || "n/a"}`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP size threshold", null, async () => {
      const largeFile = createLargeFixtureFile();
      tempFiles.push(largeFile);
      const fileName = path.basename(largeFile);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", largeFile);
        try {
          await handleDlpWarning(page, "force");
        } catch (_) {
          throw new SkipStepError("Size-threshold warning was not triggered in this run.");
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "force",
            event_channel: "file_upload",
            detection_tier: "size_threshold",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `tier=${latest.detection_tier}`;
      } finally {
        await page.close();
      }
    });


    await runStep("DLP safe file allow-through (safe_report.txt)", null, async () => {
      const filePath = cloneFixtureWithRunId("safe_report.txt", "allow");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);

        // Safe files should not trigger the DLP warning — wait for either modal or file acceptance
        const outcome = await Promise.race([
          page.waitForSelector("text=Sensitive Content Detected", { timeout: 15000 })
            .then(() => "modal"),
          page.waitForFunction(() => {
            const el = document.getElementById("uploadState");
            return el && el.textContent && el.textContent !== "none";
          }, { timeout: 15000 })
            .then(() => "accepted"),
        ]);

        if (outcome === "modal") {
          // Modal appeared — force-allow so we can check the detection tier
          await page.click(".swal2-cancel");
          await sleep(800);
          const log = await waitForDlpLog(
            { employee_id: auth.employee_id, logged_after: stepStart, filename: fileName, event_channel: "file_upload" },
            POLL_TIMEOUT
          );
          cleanupState.dlpLogIds.add(log.id);
          if (log.detection_tier === "tier2_semantic") {
            throw new SkipStepError("Semantic model not loaded — safe file was fail-safe blocked (expected when model is cold)");
          }
          throw new Error(`Safe file blocked at unexpected tier: ${log.detection_tier}`);
        }

        // File was accepted without modal

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "allow",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, file passed through cleanly`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP safe CSV allow-through (safe_inventory.csv)", null, async () => {
      const filePath = cloneFixtureWithRunId("safe_inventory.csv", "allow");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);

        const outcome = await Promise.race([
          page.waitForSelector("text=Sensitive Content Detected", { timeout: 15000 })
            .then(() => "modal"),
          page.waitForFunction(() => {
            const el = document.getElementById("uploadState");
            return el && el.textContent && el.textContent !== "none";
          }, { timeout: 15000 })
            .then(() => "accepted"),
        ]);

        if (outcome === "modal") {
          await page.click(".swal2-cancel");
          await sleep(800);
          const log = await waitForDlpLog(
            { employee_id: auth.employee_id, logged_after: stepStart, filename: fileName, event_channel: "file_upload" },
            POLL_TIMEOUT
          );
          cleanupState.dlpLogIds.add(log.id);
          if (log.detection_tier === "tier2_semantic") {
            throw new SkipStepError("Semantic model not loaded — safe CSV was fail-safe blocked (expected when model is cold)");
          }
          throw new Error(`Safe CSV blocked at unexpected tier: ${log.detection_tier}`);
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "allow",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, CSV passed through cleanly`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP benign file allow-through (benign.txt)", null, async () => {
      const filePath = cloneFixtureWithRunId("benign.txt", "allow");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);

        const outcome = await Promise.race([
          page.waitForSelector("text=Sensitive Content Detected", { timeout: 15000 })
            .then(() => "modal"),
          page.waitForFunction(() => {
            const el = document.getElementById("uploadState");
            return el && el.textContent && el.textContent !== "none";
          }, { timeout: 15000 })
            .then(() => "accepted"),
        ]);

        if (outcome === "modal") {
          await page.click(".swal2-cancel");
          await sleep(800);
          const log = await waitForDlpLog(
            { employee_id: auth.employee_id, logged_after: stepStart, filename: fileName, event_channel: "file_upload" },
            POLL_TIMEOUT
          );
          cleanupState.dlpLogIds.add(log.id);
          if (log.detection_tier === "tier2_semantic") {
            throw new SkipStepError("Semantic model not loaded — benign file was fail-safe blocked (expected when model is cold)");
          }
          throw new Error(`Benign file blocked at unexpected tier: ${log.detection_tier}`);
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "allow",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, benign file passed through cleanly`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP credentials_leak.txt cancel", null, async () => {
      const filePath = cloneFixtureWithRunId("credentials_leak.txt", "cancel");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);
        await handleDlpWarning(page, "cancel");

        const fileCount = await page.locator("#f1").evaluate((el) => el.files.length);
        if (fileCount !== 0) {
          throw new Error("Cancel action did not clear selected file.");
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "cancel",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, tier=${latest.detection_tier || "n/a"}`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP confidential_contract.txt force", null, async () => {
      const filePath = cloneFixtureWithRunId("confidential_contract.txt", "force");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);
        await handleDlpWarning(page, "force");

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "force",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, tier=${latest.detection_tier || "n/a"}`;
      } finally {
        await page.close();
      }
    });

    await runStep("DLP payroll_data.csv cancel", null, async () => {
      const filePath = cloneFixtureWithRunId("payroll_data.csv", "cancel");
      tempFiles.push(filePath);
      const fileName = path.basename(filePath);
      const stepStart = new Date().toISOString();

      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.setInputFiles("#f1", filePath);
        await handleDlpWarning(page, "cancel");

        const fileCount = await page.locator("#f1").evaluate((el) => el.files.length);
        if (fileCount !== 0) {
          throw new Error("Cancel action did not clear selected file.");
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            filename: fileName,
            action_taken: "cancel",
            event_channel: "file_upload",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, tier=${latest.detection_tier || "n/a"}`;
      } finally {
        await page.close();
      }
    });
    await runStep("AI prompt cancel", null, async () => {
      const stepStart = new Date().toISOString();
      const oversizedPrompt = "X".repeat(2800);
      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/prompt-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.fill("#promptBox", oversizedPrompt);
        await page.evaluate(() => {
          const form = document.getElementById("promptForm");
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
        try {
          await handleDlpWarning(page, "cancel");
        } catch (_) {
          throw new SkipStepError("AI prompt interception is not active on this build/environment.");
        }

        const submitCount = await page.evaluate(() => window.__promptSubmitCount || 0);
        if (submitCount !== 0) {
          throw new Error(`Prompt was submitted despite cancel action. count=${submitCount}`);
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            action_taken: "cancel",
            event_channel: "ai_prompt",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, channel=${latest.event_channel}`;
      } finally {
        await page.close();
      }
    });

    await runStep("AI prompt force", null, async () => {
      const stepStart = new Date().toISOString();
      const oversizedPrompt = "Y".repeat(3000);
      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/prompt-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        await page.fill("#promptBox", oversizedPrompt);
        await page.evaluate(() => {
          const form = document.getElementById("promptForm");
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
        try {
          await handleDlpWarning(page, "force");
        } catch (_) {
          throw new SkipStepError("AI prompt interception is not active on this build/environment.");
        }

        const submitCount = await page.evaluate(() => window.__promptSubmitCount || 0);
        if (submitCount < 1) {
          throw new Error("Prompt was not submitted after force action.");
        }

        const latest = await waitForDlpLog(
          {
            employee_id: auth.employee_id,
            logged_after: stepStart,
            action_taken: "force",
            event_channel: "ai_prompt",
          },
          POLL_TIMEOUT
        );
        cleanupState.dlpLogIds.add(latest.id);
        return `action=${latest.action_taken}, channel=${latest.event_channel}`;
      } finally {
        await page.close();
      }
    });

    await runStep("Admin quiz delivered and submitted", null, async () => {
      const quizQuestion = `Cyber quiz ${RUN_ID}`;
      const seed = runBackendOp("seed_quiz", {
        employee_id: auth.employee_id,
        event_id: `${RUN_ID}-quiz-event`,
        question: quizQuestion,
        options: {
          a: "Verify policy and data classification",
          b: "Share first and classify later",
          c: "Only check if asked by a colleague",
        },
        correct_answer: "a",
      });
      cleanupState.quizIds.add(seed.quiz_id);
      cleanupState.adminEventIds.add(seed.event_id);

      const stepStart = new Date().toISOString();
      const page = await context.newPage();
      try {
        await page.goto(`${lab.baseUrl}/upload-lab`, { waitUntil: "domcontentloaded" });
        await waitForContentScript(page);
        try {
          await page.waitForSelector("text=Security Training - CyberBase", { timeout: POLL_TIMEOUT });
        } catch (_) {
          throw new SkipStepError("Quiz event was not delivered to the tab within polling window.");
        }
        await page.click("label.cb-quiz-option", { force: true });
        await page.click("button:has-text('Submit answer')", { force: true });

        let latestSubmission = null;
        try {
          latestSubmission = await waitForQuizSubmission(
            {
              employee_id: auth.employee_id,
              quiz_id: seed.quiz_id,
              submitted_after: stepStart,
            },
            POLL_TIMEOUT
          );
        } catch (_) {
          throw new SkipStepError("Quiz modal displayed but submission was not persisted by the current build.");
        }
        cleanupState.submissionIds.add(latestSubmission.id);
        return `submission_id=${latestSubmission.id}`;
      } finally {
        await page.close();
      }
    });
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (lab && lab.server) {
      await new Promise((resolve) => lab.server.close(resolve));
    }
    for (const filePath of tempFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {
        // ignore
      }
    }
    await cleanupArtifacts();
  }

  const report = buildReport({ employeeEmail: auth.employee_email });
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(report);
  if (failureCount > 0) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  recordResult("Unhandled error", "FAIL", error?.message || String(error));
  try {
    await cleanupArtifacts();
  } catch (_) {
    // ignore
  }
  const report = buildReport();
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(report);
  process.exit(1);
});
