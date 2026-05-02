export const APP_URLS = {
  docs: {
    tauri: "https://tauri.app/start/",
    reactRouter: "https://reactrouter.com/home",
    tailwind: "https://tailwindcss.com/docs/installation/using-vite",
  },
  api: {
    backendBase: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000",
  },
} as const;
