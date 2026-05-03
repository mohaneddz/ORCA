import { Link } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAppSettings } from "@/contexts/AppSettingsContext";

export default function NotFoundPage() {
  const { t } = useAppSettings();
  return (
    <div className="page-content h-full items-center justify-center">
      <div className="card page-section max-w-xl p-8 text-center">
        <h1 className="m-0 text-3xl font-semibold text-white">{t("notfound.title")}</h1>
        <p className="m-0 text-sm text-[var(--color-neutral-500)]">{t("notfound.description")}</p>
        <div className="page-actions justify-center">
          <Link
            to={ROUTES.controlCenter}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
          >
            {t("notfound.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}

