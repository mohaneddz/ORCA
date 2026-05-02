import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";

export default function Titlebar() {
  const inTauri = isTauri();
  const appWindow = inTauri ? getCurrentWindow() : null;
  const { settings, t } = useAppSettings();

  return (
    <header
      className="h-10 backdrop-blur-xl"
      style={{
        background: "rgba(7, 11, 20, 0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div data-tauri-drag-region className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">{t("app.name")}</div>
        {inTauri && appWindow && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-7 w-9 rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => {
                if (settings.hideToTray) {
                  void invoke("hide_to_tray").catch(() => {
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
              className="h-7 w-9 rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => void appWindow.toggleMaximize()}
              title="Maximize"
            >
              <Square size={10} className="mx-auto" />
            </button>
            <button
              type="button"
              className="h-7 w-9 rounded-md text-slate-300 transition-colors hover:bg-red-500/80 hover:text-white"
              onClick={() => {
                if (settings.hideToTray) {
                  void invoke("hide_to_tray").catch(() => {
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
    </header>
  );
}


