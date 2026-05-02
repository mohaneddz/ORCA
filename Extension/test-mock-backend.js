const BASE = process.env.MOCK_BASE_URL || "http://127.0.0.1:8000";

async function assertJson(method, path, body, expectedStatus) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
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

  await assertJson(
    "POST",
    "/dev/trigger",
    {
      emp_id: "EMP001",
      quiz_id: "quiz_demo_1",
      question: "What is phishing?",
      options: {
        a: "A social engineering attack",
        b: "A secure encryption method",
        c: "An endpoint patch cycle",
      },
    },
    200
  );

  const firstPoll = await assertJson("GET", "/api/extension/poll?emp_id=EMP001", null, 200);
  if (!firstPoll.hasEvent || firstPoll.eventPayload?.type !== "QUIZ") {
    throw new Error(`Expected QUIZ event on first poll. Got: ${JSON.stringify(firstPoll)}`);
  }

  const blacklist = await assertJson("GET", "/api/extension/blacklist", null, 200);
  if (!Array.isArray(blacklist.domains) || blacklist.domains.length === 0) {
    throw new Error(`Expected non-empty blacklist domains. Got: ${JSON.stringify(blacklist)}`);
  }

  const secondPoll = await assertJson("GET", "/api/extension/poll?emp_id=EMP001", null, 200);
  if (secondPoll.hasEvent !== false) {
    throw new Error(`Expected no event on second poll. Got: ${JSON.stringify(secondPoll)}`);
  }

  await assertJson(
    "POST",
    "/api/logs/dlp",
    {
      employee_id: "EMP001",
      filename: "confidential_plan.txt",
      website: "example.com",
      action_taken: "cancel",
      document_topic: "Roadmap and payroll strategy for Q4",
      semantic_score: 0.92,
      detection_tier: "tier2_semantic",
      detection_reason: "ip_strategy",
      matched_pattern: null,
    },
    200
  );

  await assertJson(
    "POST",
    "/api/logs/blacklist",
    {
      employee_id: "EMP001",
      attempted_url: "http://malware-test.local/dropper",
    },
    200
  );

  await assertJson(
    "POST",
    "/api/gamification/submit-quiz",
    {
      employee_id: "EMP001",
      quiz_id: "quiz_demo_1",
      answer_selected: "a",
    },
    200
  );

  await assertJson(
    "POST",
    "/api/logs/dlp",
    {
      employee_id: "EMP001",
      filename: "notes.txt",
      website: "example.com",
      action_taken: "BLOCKED",
    },
    400
  );

  const logs = await assertJson("GET", "/dev/logs", null, 200);
  if (logs.dlpLogs.length !== 1 || logs.blacklistLogs.length !== 1 || logs.quizSubmissions.length !== 1) {
    throw new Error(`Unexpected log counts: ${JSON.stringify({
      dlp: logs.dlpLogs.length,
      blacklist: logs.blacklistLogs.length,
      quiz: logs.quizSubmissions.length,
    })}`);
  }

  console.log("All mock-backend checks passed.");
}

run().catch((error) => {
  console.error("Mock-backend checks failed:", error.message);
  process.exit(1);
});
