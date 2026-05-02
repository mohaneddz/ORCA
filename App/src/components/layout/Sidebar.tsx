import {
  CircleUserRound,
  House,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Network,
  Settings,
  ShieldAlert,
  Server,
  UserCog,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { SIDEBAR_SECTIONS } from "@/data/navigation";
import { ROUTES } from "@/config/routes";
import { useAppSettings } from "@/contexts/AppSettingsContext";

type SidebarProps = {
  expanded: boolean;
};

const sidebarIcons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  summary: LayoutGrid,
  home: House,
  "control-center": LayoutGrid,
  devices: Monitor,
  "virtual-machines": Server,
  network: Network,
  accounts: Users,
  training: ShieldAlert,
  chat: MessageSquare,
  settings: Settings,
  account: CircleUserRound,
};

export default function Sidebar({ expanded }: SidebarProps) {
  const { t, settings } = useAppSettings();

  return (
    <aside
      className={[
        "relative h-full flex flex-col overflow-hidden transition-[padding] duration-300",
        "border-r",
        expanded ? "px-4 py-5" : "px-2 py-5",
      ].join(" ")}
      style={{
        background: "linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 96%, transparent) 0%, var(--color-surface-1) 100%)",
        borderColor: "var(--color-border)",
      }}
    >
      <NavLink
        to={ROUTES.summary}
        title={t("sidebar.item.summary")}
        className={[
          "flex items-center shrink-0 font-bold tracking-tight transition-opacity hover:opacity-80",
          expanded ? "gap-2.5 mb-6" : "justify-center mb-5",
        ].join(" ")}
      >
        <img
          src={settings.theme === "light" ? "/title-light.png" : "/title-dark.png"}
          alt="ORCA"
          className="shrink-0 object-contain"
          style={{
            width: expanded ? 250 : 30,
            height: 80,
          }}
        />
      </NavLink>

      <nav className={["flex-1 overflow-y-auto no-scrollbar", expanded ? "space-y-6" : "space-y-4"].join(" ")}>
        {SIDEBAR_SECTIONS.map((section, sectionIndex) => (
          <div key={section.key}>
            {sectionIndex > 0 && (
              <div className="mb-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }} />
            )}
            {expanded && (
              <p
                className="m-0 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "var(--color-neutral-500)" }}
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

      <div className="shrink-0 pt-4 mt-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        <div
          className={["rounded-xl border text-center text-xs font-semibold tracking-[0.08em]", expanded ? "px-3 py-3" : "px-2 py-2"].join(" ")}
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-muted)", color: "var(--color-neutral-300)" }}
        >
          Admin Dashboard
        </div>
      </div>
    </aside>
  );
}
