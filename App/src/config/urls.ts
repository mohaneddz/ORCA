const rawBackendBase = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const normalizedBackendBase = rawBackendBase.replace(/\/+$/, "");

export const APP_URLS = {
  docs: {
    tauri: "https://tauri.app/start/",
    reactRouter: "https://reactrouter.com/home",
    tailwind: "https://tailwindcss.com/docs/installation/using-vite",
  },
  api: {
    // In dev, use Vite proxy (/api) to avoid browser CORS against backend.
    backendBase: import.meta.env.DEV ? "" : normalizedBackendBase,
  },
} as const;


