import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Titlebar from "@/components/layout/Titlebar";
import Sidebar from "@/components/layout/Sidebar";
import MainContent from "@/components/layout/MainContent";

export default function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarWidth = sidebarExpanded ? 280 : 72;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "F11") {
        event.preventDefault();
        if (isTauri()) {
          const appWindow = getCurrentWindow();
          void appWindow
            .isFullscreen()
            .then((fullscreen) => appWindow.setFullscreen(!fullscreen));
          return;
        }
        if (document.fullscreenElement) {
          void document.exitFullscreen();
          return;
        }
        void document.documentElement.requestFullscreen();
        return;
      }

      if (event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSidebarExpanded((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden text-[var(--color-neutral-200)]">
      <Titlebar />
      <div className="relative flex h-[calc(100vh-2.5rem)] overflow-hidden">
        <div
          className={[
            "relative h-full shrink-0 overflow-hidden border-r transition-[width] duration-300",
            sidebarExpanded ? "w-[280px]" : "w-[72px]",
          ].join(" ")}
          style={{ borderColor: "var(--color-border)" }}
        >
          <Sidebar expanded={sidebarExpanded} />
        </div>

        <button
          type="button"
          onClick={() => setSidebarExpanded((prev) => !prev)}
          className="absolute top-4 z-40 -translate-x-1/2 rounded-full p-1.5 transition-colors"
          title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          style={{
            left: sidebarWidth,
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            color: "var(--color-neutral-400)",
            boxShadow: "var(--shadow-floating)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.4)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-primary-soft)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-neutral-400)";
          }}
        >
          <Menu size={16} />
        </button>

        <MainContent>
          <Outlet />
        </MainContent>
      </div>
    </div>
  );
}


