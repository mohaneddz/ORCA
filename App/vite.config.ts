import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
const backendTarget = (process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const dummyData = process.env.DUMMY_DATA ?? process.env.VITE_DUMMY_DATA ?? "true";

// https://vite.dev/config/
export default defineConfig(async () => ({
  root: path.resolve(__dirname),
  envDir: path.resolve(__dirname),
  plugins: [tailwindcss(), react()],
  define: {
    __DUMMY_DATA__: JSON.stringify(dummyData),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 7777,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 7778,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
