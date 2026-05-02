import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import Titlebar from "@/components/layout/Titlebar";

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("ORCA Organization");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirect = searchParams.get("redirect") || ROUTES.home;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result =
        mode === "signin"
          ? await login({ email, password })
          : await signup({
              email,
              password,
              role,
              name,
              organizationName,
              phone,
            });

      setIsSubmitting(false);
      if (!result.ok) {
        setError(result.message || "Sign in failed.");
        return;
      }

      navigate(redirect, { replace: true });
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-[var(--color-neutral-200)]">
      <Titlebar />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="card w-full max-w-xl p-6">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-cyan-200">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </p>
        <h1 className="m-0 mt-2 text-3xl font-bold text-white">ORCA Console Access</h1>
        <p className="m-0 mt-2 text-sm text-[var(--color-neutral-500)]">
          Authenticate against backend auth endpoints for your organization account.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-md bg-slate-900/50 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={[
              "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              mode === "signin" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              mode === "signup" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            Create Account
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          {mode === "signup" && (
            <>
              <label className="grid gap-1 text-sm text-slate-200">
                Full name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                  placeholder="Your full name"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Organization name
                <input
                  type="text"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                  placeholder="+213..."
                />
              </label>
            </>
          )}

          <label className="grid gap-1 text-sm text-slate-200">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
              placeholder="you@organization.com"
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          {mode === "signup" && (
            <label className="grid gap-1 text-sm text-slate-200">
              Account type
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          )}

          {error && <p className="m-0 text-sm text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded-md border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/25"
          >
            {isSubmitting ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}


