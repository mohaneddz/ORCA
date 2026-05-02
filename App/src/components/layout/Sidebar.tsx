import {
  CircleUserRound,
  House,
  LayoutGrid,
  LogOut,
  Network,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SIDEBAR_SECTIONS } from "@/data/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";
import { useAppSettings } from "@/contexts/AppSettingsContext";

type SidebarProps = {
  expanded: boolean;
};

const sidebarIcons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  home: House,
  "control-center": LayoutGrid,
  "registered-devices": ShieldCheck,
  network: Network,
  accounts: Users,
  "employee-playground": ShieldAlert,
  settings: Settings,
  account: CircleUserRound,
};

export default function Sidebar({ expanded }: SidebarProps) {
  const { logout } = useAuth();
  const { t } = useAppSettings();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <aside
      className={[
        "relative h-full bg-slate-950/60 py-5 transition-[padding] duration-300",
        expanded ? "px-4" : "px-2",
      ].join(" ")}
    >
      <NavLink
        to={ROUTES.home}
        className={[
          "block text-center font-bold tracking-tight text-white transition-colors hover:text-cyan-200",
          expanded ? "text-3xl" : "text-lg",
        ].join(" ")}
        title={t("sidebar.item.home")}
      >
        {expanded ? "InnovByte" : "IB"}
      </NavLink>
      {expanded && (
        <p className="mx-0 mt-1 mb-4 text-center text-xs uppercase tracking-[0.1em] text-[var(--color-dim)]">
          {t("app.console")}
        </p>
      )}

      <nav className={["overflow-y-auto pb-16", expanded ? "mt-6 space-y-6" : "mt-4 space-y-5"].join(" ")}>
        {SIDEBAR_SECTIONS.map((section, sectionIndex) => (
          <div key={section.key}>
            {sectionIndex > 0 && <div className="mb-4 border-t border-white/10" />}
            {expanded && (
              <p className="m-0 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-dim)]">
                {t(`sidebar.section.${section.key}`)}
              </p>
            )}
            <div className={expanded ? "space-y-2" : "space-y-3"}>
              {section.items.map((item) => {
                const Icon = sidebarIcons[item.key] ?? UserCog;
                return (
                <NavLink
                  key={item.key}
                  to={item.href}
                  title={t(`sidebar.item.${item.key}`)}
                  className={({ isActive }) =>
                    [
                      "flex items-center rounded-md transition-colors",
                      expanded ? "gap-3 px-2.5 py-2.5 text-sm" : "justify-center px-2 py-2.5",
                      isActive
                        ? "bg-cyan-500/14 text-cyan-100"
                        : "text-slate-300 hover:bg-white/8 hover:text-white",
                    ].join(" ")
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  {expanded && <span>{t(`sidebar.item.${item.key}`)}</span>}
                </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={["absolute bottom-4 border-t border-white/10 pt-4", expanded ? "inset-x-4" : "inset-x-2"].join(" ")}>
        <button
          type="button"
          onClick={onSignOut}
          title={t("action.signout")}
          className={[
            "flex w-full items-center justify-center rounded-md text-sm font-medium text-red-200 transition-colors hover:bg-red-500/12",
            expanded ? "gap-2 px-3 py-2" : "px-2 py-2.5",
          ].join(" ")}
        >
          <LogOut size={14} />
          {expanded && <span>{t("action.signout")}</span>}
        </button>
      </div>
    </aside>
  );
}
