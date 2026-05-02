import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/types/settings";

const SETTINGS_STORAGE_KEY = "innovbyte-app-settings-v1";

export function readAppSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      launchAtStartup: typeof parsed.launchAtStartup === "boolean" ? parsed.launchAtStartup : DEFAULT_APP_SETTINGS.launchAtStartup,
      startMinimized: typeof parsed.startMinimized === "boolean" ? parsed.startMinimized : DEFAULT_APP_SETTINGS.startMinimized,
      hideToTray: typeof parsed.hideToTray === "boolean" ? parsed.hideToTray : DEFAULT_APP_SETTINGS.hideToTray,
      language: parsed.language === "fr" ? "fr" : "en",
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function persistAppSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}


