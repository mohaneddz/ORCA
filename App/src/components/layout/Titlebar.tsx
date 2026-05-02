import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Moon, Square, Sun, X } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { SIDEBAR_SECTIONS } from "@/data/navigation";
import { logger } from "@/lib/logger";

export default function Titlebar() {
  const inTauri = isTauri();
  const appWindow = inTauri ? getCurrentWindow() : null;
  const { settings, setTheme, setLanguage, t } = useAppSettings();
  const location = useLocation();

  const currentPageLabel = useMemo(() => {
    const entry = SIDEBAR_SECTIONS.flatMap((section) => section.items).find((item) => item.href === location.pathname);
    return entry?.label ?? "Workspace";
  }, [location.pathname]);

  return (
    <header
      className="h-12 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(90deg, color-mix(in srgb, var(--color-surface-1) 92%, transparent), color-mix(in srgb, var(--color-surface-2) 92%, transparent))",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div data-tauri-drag-region className="mx-auto flex h-full items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: "var(--color-border)", color: "var(--color-primary-soft)" }}>
            {t("app.name")}
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-semibold text-[var(--color-neutral-100)]">{currentPageLabel}</p>
            <p className="m-0 text-[11px] text-[var(--color-neutral-500)]">How Secure Your Company Really Is</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-neutral-300)] md:inline-flex" style={{ borderColor: "var(--color-border)" }}>
            Ctrl+Shift+S Sidebar
          </span>
          <button
            type="button"
            className="h-7 w-9 rounded-md text-[var(--color-neutral-300)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-neutral-100)]"
            onClick={() => {
              const nextTheme = settings.theme === "dark" ? "light" : "dark";
              logger.info("titlebar.theme.toggle", { from: settings.theme, to: nextTheme });
              void setTheme(nextTheme);
            }}
            title={settings.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {settings.theme === "dark" ? <Sun size={14} className="mx-auto" /> : <Moon size={14} className="mx-auto" />}
          </button>
          <button
            type="button"
            className="h-7 w-9 flex items-center justify-center rounded-md text-[var(--color-neutral-300)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-neutral-100)]"
            onClick={() => {
              const nextLang = settings.language === "en" ? "fr" : "en";
              logger.info("titlebar.language.toggle", { from: settings.language, to: nextLang });
              void setLanguage(nextLang);
            }}
            title={settings.language === "en" ? "Switch to French" : "Switch to English"}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider">{settings.language}</span>
          </button>
          {inTauri && appWindow && (
          <div className="ml-1 flex items-center gap-1 border-l pl-2" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              className="h-7 w-9 rounded-md text-[var(--color-neutral-300)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-neutral-100)]"
              onClick={() => {
                logger.info("titlebar.window.minimize", { hideToTray: settings.hideToTray });
                if (settings.hideToTray) {
                  void invoke("hide_to_tray").catch(() => {
                    logger.warn("titlebar.hide_to_tray.failed_on_minimize");
                    void appWindow.minimize();
                  });
                  return;
                }
                void appWindow.minimize();
              }}
              title="Minimize"
            >
              <Minus size={14} className="mx-auto" />
            </button>
            <button
              type="button"
              className="h-7 w-9 rounded-md text-[var(--color-neutral-300)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-neutral-100)]"
              onClick={() => {
                logger.info("titlebar.window.toggle_maximize");
                void appWindow.toggleMaximize();
              }}
              title="Maximize"
            >
              <Square size={10} className="mx-auto" />
            </button>
            <button
              type="button"
              className="h-7 w-9 rounded-md text-[var(--color-neutral-300)] transition-colors hover:bg-red-500/80 hover:text-white"
              onClick={() => {
                logger.info("titlebar.window.close", { hideToTray: settings.hideToTray });
                if (settings.hideToTray) {
                  void invoke("hide_to_tray").catch(() => {
                    logger.warn("titlebar.hide_to_tray.failed_on_close");
                    void appWindow.close();
                  });
                  return;
                }
                void appWindow.close();
              }}
              title="Close"
            >
              <X size={14} className="mx-auto" />
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
