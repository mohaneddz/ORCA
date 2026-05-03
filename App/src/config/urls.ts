const rawBackendBase = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const normalizedBackendBase = rawBackendBase.replace(/\/+$/, "");

export const APP_URLS = {
  docs: {
    tauri: "https://tauri.app/start/",
    reactRouter: "https://reactrouter.com/home",
    tailwind: "https://tailwindcss.com/docs/installation/using-vite",
  },
  api: {
    // Force full URL in dev to bypass potential proxy issues in Tauri
    backendBase: normalizedBackendBase,
  },
} as const;


