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
        "relative h-full flex flex-col overflow-hidden transition-[padding] duration-300",
        "border-r",
        expanded ? "px-4 py-5" : "px-2 py-5",
      ].join(" ")}
      style={{
        background: "linear-gradient(180deg, #0a0f1e 0%, #080c18 100%)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo / Brand */}
      <NavLink
        to={ROUTES.home}
        title={t("sidebar.item.home")}
        className={[
          "flex items-center shrink-0 font-bold tracking-tight text-white transition-opacity hover:opacity-80",
          expanded ? "gap-2.5 mb-6" : "justify-center mb-5",
        ].join(" ")}
      >
        {/* Icon mark */}
        <span
          className="flex items-center justify-center rounded-lg shrink-0 text-white font-black text-xs"
          style={{
            width: 30,
            height: 30,
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            boxShadow: "0 4px 12px rgba(124,58,237,0.45)",
          }}
        >
          IB
        </span>
        {expanded && (
          <span
            className="text-base font-extrabold"
            style={{
              background: "linear-gradient(90deg, #fff 30%, #c084fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            InnovByte
          </span>
        )}
      </NavLink>

      {/* Nav */}
      <nav className={["flex-1 overflow-y-auto no-scrollbar", expanded ? "space-y-6" : "space-y-4"].join(" ")}>
        {SIDEBAR_SECTIONS.map((section, sectionIndex) => (
          <div key={section.key}>
            {sectionIndex > 0 && (
              <div className="mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
            )}
            {expanded && (
              <p
                className="m-0 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "#475569" }}
              >
                {t(`sidebar.section.${section.key}`)}
              </p>
            )}
            <div className={expanded ? "space-y-0.5" : "space-y-2"}>
              {section.items.map((item) => {
                const Icon = sidebarIcons[item.key] ?? UserCog;
                return (
                  <NavLink
                    key={item.key}
                    to={item.href}
                    title={t(`sidebar.item.${item.key}`)}
                    className={({ isActive }) =>
                      [
                        "nav-item",
                        expanded ? "gap-3 px-3 py-2 text-sm" : "justify-center px-2 py-2.5",
                        isActive ? "active" : "",
                      ].join(" ")
                    }
                  >
                    <Icon size={15} className="shrink-0" />
                    {expanded && <span className="font-medium">{t(`sidebar.item.${item.key}`)}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div
        className={["shrink-0 pt-4 mt-2", expanded ? "" : ""].join(" ")}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          type="button"
          onClick={onSignOut}
          title={t("action.signout")}
          className={[
            "flex w-full items-center justify-center rounded-md text-xs font-medium transition-colors",
            "hover:bg-red-500/10",
            expanded ? "gap-2 px-3 py-2" : "px-2 py-2",
          ].join(" ")}
          style={{ color: "#fb7185" }}
        >
          <LogOut size={13} />
          {expanded && <span>{t("action.signout")}</span>}
        </button>
      </div>
    </aside>
  );
}
