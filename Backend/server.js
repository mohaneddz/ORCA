import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: "../.env" });
dotenv.config({ path: "./.env", override: true });

const port = Number(process.env.PORT || 3000);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey || !databaseUrl) {
  throw new Error("Missing required env: SUPABASE_URL, SUPABASE_KEY (publishable), DATABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const db = new Pool({ connectionString: databaseUrl });

const app = express();
app.use(cors());
app.use(express.json());

async function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice("bearer ".length).trim();
}

async function getRequester(req) {
  const token = await getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const roleQuery = await db.query(
    "select role from public.profiles where id = $1::uuid limit 1",
    [data.user.id],
  );

  const role = roleQuery.rows[0]?.role === "admin" ? "admin" : "staff";
  return { userId: data.user.id, role };
}

async function createAuthUser({ email, password, role, fullName, organizationName, phone }) {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        role,
        full_name: fullName,
        organization_name: organizationName,
        phone,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.error) {
    const message = payload.msg || payload.error_description || payload.error || "Sign up failed";
    throw new Error(message);
  }

  const userId = payload?.user?.id;
  if (!userId) {
    throw new Error("Sign up did not return a user id.");
  }

  return userId;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "innov-backend",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/supabase", async (_req, res) => {
  try {
    const result = await db.query("select now() as database_time");
    return res.json({
      ok: true,
      databaseTime: result.rows[0]?.database_time,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to query Supabase database.",
    });
  }
});

app.post("/accounts/create", async (req, res) => {
  try {
    const requester = await getRequester(req);

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const requestedRole = String(req.body?.role || "staff").toLowerCase() === "admin" ? "admin" : "staff";
    const fullName = String(req.body?.fullName || "").trim();
    const organizationName = String(req.body?.organizationName || "InnovByte Organization").trim();
    const phone = String(req.body?.phone || "").trim();

    if (!email) return res.status(400).json({ ok: false, message: "Email is required." });
    if (password.length < 8) return res.status(400).json({ ok: false, message: "Password must be at least 8 characters." });

    const adminCountResult = await db.query("select count(*)::int as count from public.profiles where role = 'admin'");
    const hasAdmin = Number(adminCountResult.rows[0]?.count || 0) > 0;
    const canCreateAdmin = requester?.role === "admin" || !hasAdmin;

    const role = requestedRole === "admin" && canCreateAdmin ? "admin" : "staff";
    if (requestedRole === "admin" && !canCreateAdmin) {
      return res.status(403).json({ ok: false, message: "Only admins can create admin accounts." });
    }

    const userId = await createAuthUser({ email, password, role, fullName, organizationName, phone });

    await db.query(
      `
      update auth.users
      set
        email_confirmed_at = now(),
        confirmed_at = now(),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb
      where id = $1::uuid
      `,
      [
        userId,
        JSON.stringify({
          role,
          full_name: fullName || email.split("@")[0],
          organization_name: organizationName || "InnovByte Organization",
          phone,
        }),
      ],
    );

    await db.query(
      `
      insert into public.profiles (id, email, full_name, organization_name, phone, role)
      values ($1::uuid, $2, $3, $4, $5, $6)
      on conflict (id) do update
      set
        email = excluded.email,
        full_name = excluded.full_name,
        organization_name = excluded.organization_name,
        phone = excluded.phone,
        role = excluded.role,
        updated_at = now()
      `,
      [userId, email, fullName || email.split("@")[0], organizationName || "InnovByte Organization", phone, role],
    );

    return res.json({ ok: true, userId, role });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to create account.",
    });
  }
});

app.post("/accounts/delete", async (req, res) => {
  try {
    const requester = await getRequester(req);
    if (!requester) {
      return res.status(401).json({ ok: false, message: "Unauthorized." });
    }

    const targetUserId = String(req.body?.targetUserId || "").trim();
    const userIdToDelete = targetUserId || requester.userId;

    if (userIdToDelete !== requester.userId && requester.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Only admins can delete other users." });
    }

    await db.query("delete from auth.identities where user_id = $1::uuid", [userIdToDelete]);
    await db.query("delete from auth.users where id = $1::uuid", [userIdToDelete]);

    return res.json({ ok: true, deletedUserId: userIdToDelete });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Failed to delete account.",
    });
  }
});

app.listen(port, () => {
  console.log(`innov-backend listening on http://localhost:${port}`);
});
