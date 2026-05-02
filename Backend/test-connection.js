import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: "../.env" });
dotenv.config({ path: "./.env", override: true });

const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:3000";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or publishable key in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const unique = Date.now();
const email = `connection.test.${unique}@gmail.com`;
const password = `Test-${unique}-Password!`;

async function waitForBackend(retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const health = await fetch(`${backendUrl}/health`);
      if (health.ok) return;
    } catch {
      // ignore until next retry
    }
    await delay(300);
  }

  throw new Error("Backend health check failed.");
}

async function run() {
  const server = spawn("node", ["server.js"], {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: false,
  });

  try {
    await waitForBackend();

    console.log("1) Creating account via backend /accounts/create...");
    const createResponse = await fetch(`${backendUrl}/accounts/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        role: "staff",
        fullName: "Connection Test",
        organizationName: "InnovByte Organization",
        phone: "+0000000000",
      }),
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok || !createPayload.ok) {
      const message = String(createPayload.message || "unknown error");
      if (message.toLowerCase().includes("rate limit")) {
        console.log(`Create-account rate limited by Supabase Auth: ${message}`);
        console.log("Running fallback connectivity checks...");
        const dbHealth = await fetch(`${backendUrl}/health/supabase`);
        const dbHealthPayload = await dbHealth.json();
        if (!dbHealth.ok || !dbHealthPayload.ok) {
          throw new Error(`fallback database health failed: ${dbHealthPayload.message || "unknown error"}`);
        }
        console.log("Fallback Supabase DB connectivity check passed.");
        return;
      }
      throw new Error(`create failed: ${message}`);
    }

    console.log("2) Signing in with created credentials...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !signInData.session) {
      throw new Error(`signInWithPassword failed: ${signInError?.message || "no session returned"}`);
    }

    console.log("3) Reading own profile...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,role")
      .eq("id", signInData.user.id)
      .maybeSingle();
    if (profileError) {
      throw new Error(`profiles select failed: ${profileError.message}`);
    }
    console.log("Profile:", profile);

    console.log("4) Deleting account via backend /accounts/delete...");
    const deleteResponse = await fetch(`${backendUrl}/accounts/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signInData.session.access_token}`,
      },
      body: JSON.stringify({}),
    });
    const deletePayload = await deleteResponse.json();
    if (!deleteResponse.ok || !deletePayload.ok) {
      throw new Error(`delete failed: ${deletePayload.message || "unknown error"}`);
    }

    await supabase.auth.signOut();
    console.log("5) Verifying deleted account cannot sign in...");
    const { error: reSignInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!reSignInError) {
      throw new Error("Expected sign-in to fail after deletion, but it succeeded.");
    }

    console.log("Connection and auth flow test passed.");
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
