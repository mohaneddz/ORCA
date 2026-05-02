import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";
import { translate } from "@/i18n/translations";
import { type AppLanguage, type AppSettings, type AppTheme } from "@/types/settings";
import { persistAppSettings, readAppSettings } from "@/utils/appSettings";
import { logger } from "@/lib/logger";

type AppSettingsContextValue = {
  settings: AppSettings;
  startupError: string | null;
  setHideToTray: (enabled: boolean) => Promise<void>;
  setLaunchAtStartup: (enabled: boolean) => Promise<void>;
  setStartMinimized: (enabled: boolean) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  t: (key: string) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function applyTheme(theme: AppTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

async function syncRuntimeSettings(settings: AppSettings): Promise<void> {
  if (!isTauri()) {
    return;
  }

  logger.debug("settings.runtime_sync.start", { hideToTray: settings.hideToTray });
  await invoke("sync_runtime_settings", { settings });
  await invoke("set_hide_to_tray", { enabled: settings.hideToTray });
  logger.info("settings.runtime_sync.success");
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());
  const settingsRef = useRef<AppSettings>(settings);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    void syncRuntimeSettings(settings).catch(() => {
      logger.warn("settings.runtime_sync.initial_failed");
      // Ignore sync errors in dev web mode.
    });
    // Runs once on mount with initial settings snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    void isAutostartEnabled()
      .then((enabled) => {
        logger.info("settings.autostart.probe.success", { enabled });
        setSettings((current) => {
          const next = {
            ...current,
            launchAtStartup: enabled,
            startMinimized: enabled ? current.startMinimized : false,
          };
          persistAppSettings(next);
          void syncRuntimeSettings(next);
          return next;
        });
      })
      .catch(() => {
        logger.warn("settings.autostart.probe.failed");
        // Keep local fallback settings.
      });
  }, []);

  const patchSettings = async (updates: Partial<AppSettings>) => {
    const nextSettings = { ...settingsRef.current, ...updates };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    persistAppSettings(nextSettings);
    logger.info("settings.updated", updates);
    await syncRuntimeSettings(nextSettings);
  };

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      startupError,
      setHideToTray: async (enabled) => {
        await patchSettings({ hideToTray: enabled });
      },
      setLaunchAtStartup: async (enabled) => {
        setStartupError(null);
        try {
          if (isTauri()) {
            if (enabled) {
              await enableAutostart();
            } else {
              await disableAutostart();
            }
          }
          await patchSettings({
            launchAtStartup: enabled,
            startMinimized: enabled ? settings.startMinimized : false,
          });
        } catch {
          logger.error("settings.autostart.update_failed", { enabled });
          setStartupError("Could not update startup registration.");
        }
      },
      setStartMinimized: async (enabled) => {
        await patchSettings({ startMinimized: enabled });
      },
      setLanguage: async (language) => {
        await patchSettings({ language });
      },
      setTheme: async (theme) => {
        await patchSettings({ theme });
      },
      t: (key) => translate(settings.language, key),
    }),
    [settings, startupError],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used inside AppSettingsProvider");
  }
  return context;
}
