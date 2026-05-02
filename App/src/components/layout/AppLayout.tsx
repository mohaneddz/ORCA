import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import Titlebar from "@/components/layout/Titlebar";
import Sidebar from "@/components/layout/Sidebar";
import MainContent from "@/components/layout/MainContent";

export default function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarWidth = sidebarExpanded ? 280 : 72;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSidebarExpanded((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden text-[var(--color-mist)]">
      <Titlebar />
      <div className="relative flex h-[calc(100vh-2.5rem)] overflow-hidden">
        <div
          className={[
            "relative h-full shrink-0 overflow-hidden border-r border-white/10 transition-[width] duration-300",
            sidebarExpanded ? "w-[280px]" : "w-[72px]",
          ].join(" ")}
        >
          <Sidebar expanded={sidebarExpanded} />
        </div>

        <button
          type="button"
          onClick={() => setSidebarExpanded((prev) => !prev)}
          className="absolute top-4 z-40 -translate-x-1/2 rounded-full border border-white/15 bg-slate-900/95 p-2 text-slate-200 shadow-lg transition-colors hover:bg-slate-800"
          title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          style={{ left: sidebarWidth }}
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
