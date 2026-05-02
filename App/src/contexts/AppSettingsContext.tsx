import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";
import { translate } from "@/i18n/translations";
import { type AppLanguage, type AppSettings } from "@/types/settings";
import { persistAppSettings, readAppSettings } from "@/utils/appSettings";

type AppSettingsContextValue = {
  settings: AppSettings;
  startupError: string | null;
  setHideToTray: (enabled: boolean) => Promise<void>;
  setLaunchAtStartup: (enabled: boolean) => Promise<void>;
  setStartMinimized: (enabled: boolean) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: string) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

async function syncRuntimeSettings(settings: AppSettings): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await invoke("sync_runtime_settings", { settings });
  await invoke("set_hide_to_tray", { enabled: settings.hideToTray });
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    void syncRuntimeSettings(settings).catch(() => {
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
        // Keep local fallback settings.
      });
  }, []);

  const patchSettings = async (updates: Partial<AppSettings>) => {
    let nextSettings: AppSettings | null = null;
    setSettings((current) => {
      const next = { ...current, ...updates };
      nextSettings = next;
      persistAppSettings(next);
      return next;
    });
    if (nextSettings) {
      await syncRuntimeSettings(nextSettings);
    }
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
          setStartupError("Could not update startup registration.");
        }
      },
      setStartMinimized: async (enabled) => {
        await patchSettings({ startMinimized: enabled });
      },
      setLanguage: async (language) => {
        await patchSettings({ language });
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
