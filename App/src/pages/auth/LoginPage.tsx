import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import Titlebar from "@/components/layout/Titlebar";
import { useAppSettings } from "@/contexts/AppSettingsContext";

export default function LoginPage() {
  const { t } = useAppSettings();
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
        setError(result.message || t("login.error.signin"));
        return;
      }

      navigate(redirect, { replace: true });
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || t("login.error.unexpected"));
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-[var(--color-neutral-200)]">
      <Titlebar />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="card w-full max-w-xl p-6">
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-cyan-200">
            {mode === "signin" ? t("login.signin") : t("login.signup")}
          </p>
        <h1 className="m-0 mt-2 text-3xl font-bold text-white">{t("login.title")}</h1>
        <p className="m-0 mt-2 text-sm text-[var(--color-neutral-500)]">
          {t("login.description")}
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
            {t("login.signin")}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              mode === "signup" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {t("login.signup")}
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          {mode === "signup" && (
            <>
              <label className="grid gap-1 text-sm text-slate-200">
                {t("login.namePlaceholder")}
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                  placeholder={t("login.namePlaceholder")}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                {t("account.profile.orgName")}
                <input
                  type="text"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                {t("account.profile.phone")}
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
                  placeholder={t("login.phonePlaceholder")}
                />
              </label>
            </>
          )}

          <label className="grid gap-1 text-sm text-slate-200">
            {t("account.profile.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
              placeholder={t("login.emailPlaceholder")}
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            {t("account.password.new")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 placeholder:text-slate-400 focus:ring"
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="current-password"
            />
          </label>

          {mode === "signup" && (
            <label className="grid gap-1 text-sm text-slate-200">
              {t("login.accountType")}
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-white outline-none ring-cyan-300/40 focus:ring"
              >
                <option value="staff">{t("account.role.staff.simple")}</option>
                <option value="admin">{t("account.role.admin.simple")}</option>
              </select>
            </label>
          )}

          {error && <p className="m-0 text-sm text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded-md border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/25"
          >
            {isSubmitting ? t("login.submitting") : mode === "signin" ? t("login.signin") : t("login.signup")}
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}


