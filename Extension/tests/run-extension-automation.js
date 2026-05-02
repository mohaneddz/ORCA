const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.MOCK_BASE_URL || "http://127.0.0.1:8000";
const EXTENSION_PATH = path.resolve(__dirname, "..");
const REPORT_PATH = process.env.REPORT_PATH || path.join(EXTENSION_PATH, "automation-report.md");
const ARTIFACT_DIR = path.join(__dirname, "artifacts");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL || "employee@acme.test";
const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD || "secret123";
const DEFAULT_TIMEOUT = 25000;

const results = [];
let failureCount = 0;

function nowStamp() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(pathname, method = "GET", body = null) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch (_) {
    json = {};
  }
  return { res, json };
}

async function waitForLogs(predicate, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { res, json } = await fetchJson("/dev/logs");
    if (!res.ok) throw new Error(`Failed to read logs: ${res.status}`);
    if (predicate(json)) return json;
    await sleep(400);
  }
  throw new Error(`Timed out waiting for logs: ${label}`);
}

function getLogCounts(logs) {
  return {
    dlp: Array.isArray(logs?.dlpLogs) ? logs.dlpLogs.length : 0,
    blacklist: Array.isArray(logs?.blacklistLogs) ? logs.blacklistLogs.length : 0,
    quiz: Array.isArray(logs?.quizSubmissions) ? logs.quizSubmissions.length : 0,
  };
}

function recordResult(name, status, details) {
  results.push({ name, status, details });
  if (status === "FAIL") failureCount += 1;
}

async function captureFailure(page, name) {
  if (!page) return;
  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const out = path.join(ARTIFACT_DIR, `${safeName || "failure"}.png`);
    await page.screenshot({ path: out, fullPage: true });
  } catch (_) {
    // ignore
  }
}

async function runStep(name, page, fn) {
  try {
    console.log(`\n[step] ${name}`);
    const details = await fn();
    recordResult(name, "PASS", details || "ok");
  } catch (error) {
    await captureFailure(page, name);
    recordResult(name, "FAIL", error?.message || String(error));
  }
}

function buildReport() {
  const lines = [];
  lines.push("# Extension Automation Report", "");
  lines.push(`- Date: ${nowStamp()}`);
  lines.push(`- Base URL: ${BASE_URL}`);
  lines.push(`- Employee Email: ${EMPLOYEE_EMAIL}`, "");
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

async function waitForContentScript(page) {
  await page.waitForSelector("#cb-http-banner", { timeout: DEFAULT_TIMEOUT });
}

async function handleDlpWarning(page, decision) {
  await page.waitForSelector("text=Sensitive Content Detected", { timeout: DEFAULT_TIMEOUT });
  if (decision === "cancel") await page.click(".swal2-confirm");
  if (decision === "force") await page.click(".swal2-cancel");
  await sleep(700);
}

async function loginEmployee(context, extensionBaseUrl) {
  const popup = await context.newPage();
  try {
    await popup.goto(`${extensionBaseUrl}/popup.html`, { waitUntil: "domcontentloaded" });
    await popup.fill("#emailInput", EMPLOYEE_EMAIL);
    await popup.click("#nextBtn");
    await popup.waitForSelector("#passwordInput", { timeout: DEFAULT_TIMEOUT });
    await popup.fill("#passwordInput", EMPLOYEE_PASSWORD);
    await popup.click("#loginBtn");
    await popup.waitForSelector("#sessionPanel:not(.hidden)", { timeout: DEFAULT_TIMEOUT });
  } finally {
    await popup.close();
  }
}

async function resolveExtensionBase(context) {
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker", { timeout: DEFAULT_TIMEOUT }));
  const url = worker.url();
  const match = url.match(/^chrome-extension:\/\/([a-z]{32})\//);
  if (!match) throw new Error(`Unable to resolve extension ID from worker url: ${url}`);
  return {
    worker,
    extensionId: match[1],
    extensionBase: `chrome-extension://${match[1]}`,
  };
}

function createLargeFixtureFile() {
  const outPath = path.join(os.tmpdir(), `cbx-large-${Date.now()}.txt`);
  const fd = fs.openSync(outPath, "w");
  const chunk = Buffer.alloc(1024 * 1024, "X");
  for (let i = 0; i < 11; i += 1) {
    fs.writeSync(fd, chunk);
  }
  fs.closeSync(fd);
  return outPath;
}

async function main() {
  const health = await fetchJson("/dev/health");
  if (!health.res.ok) {
    recordResult("Mock backend health", "FAIL", `Backend not healthy: ${health.res.status}`);
    const report = buildReport();
    fs.writeFileSync(REPORT_PATH, report, "utf8");
    console.log(report);
    process.exit(1);
  }
  recordResult("Mock backend health", "PASS", "ok");

  await fetchJson("/dev/reset", "POST", {});

  let context = null;
  let worker = null;
  let extensionBase = "";

  await runStep("Launch Chromium with extension", null, async () => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbx-ext-"));
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

  if (!context) {
    const report = buildReport();
    fs.writeFileSync(REPORT_PATH, report, "utf8");
    console.log(report);
    process.exit(1);
  }

  await runStep("Setup banner appears", null, async () => {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.waitForSelector("#cb-setup-banner", { timeout: DEFAULT_TIMEOUT });
      return "banner visible before login";
    } finally {
      await page.close();
    }
  });

  await runStep("Authenticate employee", null, async () => {
    await loginEmployee(context, extensionBase);
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      const count = await page.locator("#cb-setup-banner").count();
      if (count !== 0) throw new Error("setup banner still visible after employee login");
      return "employee authenticated";
    } finally {
      await page.close();
    }
  });

  await runStep("DLP regex cancel", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).dlp;
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.setInputFiles("#f1", path.join(FIXTURES_DIR, "sensitive.txt"));
      await page.evaluate(() => {
        const input = document.querySelector("#f1");
        input?.dispatchEvent(new Event("input", { bubbles: true }));
        input?.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await handleDlpWarning(page, "cancel");
      const logs = await waitForLogs((payload) => (payload?.dlpLogs || []).length === before + 1, DEFAULT_TIMEOUT, "dlp cancel");
      const last = logs.dlpLogs[logs.dlpLogs.length - 1];
      if (last.action_taken !== "cancel") throw new Error(`unexpected action_taken: ${last.action_taken}`);
      return `action_taken=${last.action_taken}`;
    } finally {
      await page.close();
    }
  });

  await runStep("DLP regex force", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).dlp;
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.setInputFiles("#f1", path.join(FIXTURES_DIR, "sensitive.txt"));
      await page.evaluate(() => {
        const input = document.querySelector("#f1");
        input?.dispatchEvent(new Event("input", { bubbles: true }));
        input?.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await handleDlpWarning(page, "force");
      const logs = await waitForLogs((payload) => (payload?.dlpLogs || []).length === before + 1, DEFAULT_TIMEOUT, "dlp force");
      const last = logs.dlpLogs[logs.dlpLogs.length - 1];
      if (last.action_taken !== "force") throw new Error(`unexpected action_taken: ${last.action_taken}`);
      return `action_taken=${last.action_taken}`;
    } finally {
      await page.close();
    }
  });

  await runStep("DLP size threshold", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).dlp;
    const largeFile = createLargeFixtureFile();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.setInputFiles("#f1", largeFile);
      await page.evaluate(() => {
        const input = document.querySelector("#f1");
        input?.dispatchEvent(new Event("input", { bubbles: true }));
        input?.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await handleDlpWarning(page, "force");
      const logs = await waitForLogs((payload) => (payload?.dlpLogs || []).length === before + 1, DEFAULT_TIMEOUT, "dlp size");
      const last = logs.dlpLogs[logs.dlpLogs.length - 1];
      if (last.action_taken !== "force") throw new Error(`unexpected action_taken: ${last.action_taken}`);
      if (last.detection_tier !== "size_threshold") throw new Error(`unexpected detection_tier: ${last.detection_tier}`);
      return `tier=${last.detection_tier}`;
    } finally {
      try {
        fs.unlinkSync(largeFile);
      } catch (_) {
        // ignore
      }
      await page.close();
    }
  });

  await runStep("AI prompt cancel", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).dlp;
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/prompt-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.fill("#promptBox", "My password is hunter2 and the api key is ABC123.");
      await page.click("#sendBtn", { force: true });
      await handleDlpWarning(page, "cancel");
      const logs = await waitForLogs((payload) => (payload?.dlpLogs || []).length === before + 1, DEFAULT_TIMEOUT, "ai prompt cancel");
      const last = logs.dlpLogs[logs.dlpLogs.length - 1];
      if (last.action_taken !== "cancel") throw new Error(`unexpected action_taken: ${last.action_taken}`);
      if (last.event_channel !== "ai_prompt") throw new Error(`unexpected event_channel: ${last.event_channel}`);
      return `action_taken=${last.action_taken}`;
    } finally {
      await page.close();
    }
  });

  await runStep("AI prompt force", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).dlp;
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/prompt-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.fill("#promptBox", "Please include payroll details and password reset steps.");
      await page.click("#sendBtn", { force: true });
      await handleDlpWarning(page, "force");
      const logs = await waitForLogs((payload) => (payload?.dlpLogs || []).length === before + 1, DEFAULT_TIMEOUT, "ai prompt force");
      const last = logs.dlpLogs[logs.dlpLogs.length - 1];
      if (last.action_taken !== "force") throw new Error(`unexpected action_taken: ${last.action_taken}`);
      if (last.event_channel !== "ai_prompt") throw new Error(`unexpected event_channel: ${last.event_channel}`);
      return `action_taken=${last.action_taken}`;
    } finally {
      await page.close();
    }
  });

  await runStep("Admin quiz", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).quiz;
    await fetchJson("/dev/trigger", "POST", {
      quiz_id: "quiz_auto_1",
      question: "What should you do before sharing sensitive company data externally?",
      options: {
        a: "Verify policy and data classification",
        b: "Share first and classify later",
        c: "Only check if asked by a colleague",
      },
    });

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab`, { waitUntil: "domcontentloaded" });
      await waitForContentScript(page);
      await page.waitForSelector("text=Security Training - CyberBase", { timeout: DEFAULT_TIMEOUT });
      await page.click("label.cb-quiz-option");
      await page.click("button:has-text('Submit answer')", { force: true });
      const logs = await waitForLogs((payload) => (payload?.quizSubmissions || []).length === before + 1, DEFAULT_TIMEOUT, "quiz submit");
      const last = logs.quizSubmissions[logs.quizSubmissions.length - 1];
      if (last.quiz_id !== "quiz_auto_1") throw new Error("quiz submission not recorded");
      return "submission logged";
    } finally {
      await page.close();
    }
  });

  await runStep("Blacklist block page", null, async () => {
    const before = getLogCounts((await fetchJson("/dev/logs")).json).blacklist;
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        blacklistDomains: ["127.0.0.1"],
        blacklistFetchedAt: Date.now(),
      });
    });

    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dev/upload-lab?block=1`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("text=Access blocked", { timeout: DEFAULT_TIMEOUT });
      const logs = await waitForLogs((payload) => (payload?.blacklistLogs || []).length === before + 1, DEFAULT_TIMEOUT, "blacklist log");
      const last = logs.blacklistLogs[logs.blacklistLogs.length - 1];
      if (!last.attempted_url) throw new Error("blacklist log missing attempted_url");
      return "blocked and logged";
    } finally {
      await page.close();
    }
  });

  await context.close();

  const report = buildReport();
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(report);
  if (failureCount > 0) process.exit(1);
}

main().catch((error) => {
  recordResult("Unhandled error", "FAIL", error?.message || String(error));
  const report = buildReport();
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  console.log(report);
  process.exit(1);
});
