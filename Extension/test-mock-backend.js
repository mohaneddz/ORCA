const BASE = process.env.MOCK_BASE_URL || "http://127.0.0.1:8000";
const EMPLOYEE_EMAIL = process.env.MOCK_EMPLOYEE_EMAIL || "employee@acme.test";
const EMPLOYEE_PASSWORD = process.env.MOCK_EMPLOYEE_PASSWORD || "secret123";

function buildHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `EmployeeToken ${token}`;
  return headers;
}

async function assertJson(method, path, body, expectedStatus, token = "") {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (res.status !== expectedStatus) {
    throw new Error(`${method} ${path} -> expected ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(json)}`);
  }
  return json;
}

async function run() {
  console.log("Running mock-backend integration checks...");

  await assertJson("GET", "/dev/health", null, 200);
  await assertJson("POST", "/dev/reset", {}, 200);

  await assertJson("GET", "/api/extension/poll", null, 401);
  await assertJson("GET", "/api/extension/blacklist", null, 401);
  await assertJson("GET", "/api/extension/ai-targets", null, 401);
  await assertJson("POST", "/api/logs/blacklist", { attempted_url: "http://x.test" }, 401);
  await assertJson("POST", "/api/gamification/submit-quiz", { quiz_id: "q1", answer_selected: "a" }, 401);

  const login = await assertJson(
    "POST",
    "/api/auth/employee/login",
    {
      email: EMPLOYEE_EMAIL,
      password: EMPLOYEE_PASSWORD,
    },
    200
  );
  const token = login.token;
  if (!token) throw new Error("Login response missing token.");
  const authEmployeeId = login.employee?.id;
  if (!authEmployeeId) throw new Error("Login response missing employee.");

  const me = await assertJson("GET", "/api/auth/employee/me", null, 200, token);
  if (me.email !== EMPLOYEE_EMAIL) {
    throw new Error(`Expected /me email ${EMPLOYEE_EMAIL}, got ${me.email}`);
  }

  await assertJson(
    "POST",
    "/dev/trigger",
    {
      employee_id: authEmployeeId,
      quiz_id: "quiz_demo_1",
      question: "What should you do before sharing sensitive company data externally?",
      options: {
        a: "Verify policy and data classification",
        b: "Share first and classify later",
        c: "Only check if asked by a colleague",
      },
    },
    200
  );

  const firstPoll = await assertJson("GET", "/api/extension/poll", null, 200, token);
  if (!firstPoll.hasEvent || firstPoll.eventPayload?.type !== "QUIZ") {
    throw new Error(`Expected QUIZ event on first poll. Got: ${JSON.stringify(firstPoll)}`);
  }

  const secondPoll = await assertJson("GET", "/api/extension/poll", null, 200, token);
  if (secondPoll.hasEvent !== false) {
    throw new Error(`Expected no event on second poll. Got: ${JSON.stringify(secondPoll)}`);
  }

  const blacklist = await assertJson("GET", "/api/extension/blacklist", null, 200, token);
  if (!Array.isArray(blacklist.domains) || blacklist.domains.length === 0) {
    throw new Error(`Expected non-empty blacklist domains. Got: ${JSON.stringify(blacklist)}`);
  }

  const aiTargets = await assertJson("GET", "/api/extension/ai-targets", null, 200, token);
  if (!Array.isArray(aiTargets.domains) || !Array.isArray(aiTargets.keywords)) {
    throw new Error(`Expected ai-targets payload with domains and keywords. Got: ${JSON.stringify(aiTargets)}`);
  }

  await assertJson(
    "POST",
    "/api/logs/dlp",
    {
      employee_id: "SPOOFED",
      filename: "confidential_plan.txt",
      website: "example.com",
      action_taken: "cancel",
      document_topic: "Roadmap and payroll strategy for Q4",
      semantic_score: 0.92,
      detection_tier: "tier2_semantic",
      detection_reason: "ip_strategy",
      matched_pattern: null,
      event_channel: "file_upload",
      input_size_bytes: 4321,
      input_size_chars: 580,
      threshold_type: "semantic_similarity",
      threshold_value: 0.85,
      decision_score: 0.92,
    },
    200,
    token
  );

  await assertJson(
    "POST",
    "/api/logs/blacklist",
    {
      employee_id: "SPOOFED",
      attempted_url: "http://malware-test.local/dropper",
    },
    200,
    token
  );

  await assertJson(
    "POST",
    "/api/gamification/submit-quiz",
    {
      employee_id: "SPOOFED",
      quiz_id: "quiz_demo_1",
      answer_selected: "a",
    },
    200,
    token
  );

  await assertJson(
    "POST",
    "/api/logs/dlp",
    {
      filename: "notes.txt",
      website: "example.com",
      action_taken: "BLOCKED",
    },
    400,
    token
  );

  const logs = await assertJson("GET", "/dev/logs", null, 200);
  if (logs.dlpLogs.length !== 1 || logs.blacklistLogs.length !== 1 || logs.quizSubmissions.length !== 1) {
    throw new Error(`Unexpected log counts: ${JSON.stringify({
      dlp: logs.dlpLogs.length,
      blacklist: logs.blacklistLogs.length,
      quiz: logs.quizSubmissions.length,
    })}`);
  }

  const [dlpLog] = logs.dlpLogs;
  const [blacklistLog] = logs.blacklistLogs;
  const [quizLog] = logs.quizSubmissions;
  if (dlpLog.employee_id !== authEmployeeId || blacklistLog.employee_id !== authEmployeeId || quizLog.employee_id !== authEmployeeId) {
    throw new Error("Spoofed employee_id was not ignored by protected endpoints.");
  }

  await assertJson("POST", "/api/auth/employee/logout", null, 200, token);
  await assertJson("GET", "/api/auth/employee/me", null, 401, token);

  console.log("All mock-backend checks passed.");
}

run().catch((error) => {
  console.error("Mock-backend checks failed:", error.message);
  process.exit(1);
});
