export type AppLanguage = "en" | "fr";

export type AppSettings = {
  launchAtStartup: boolean;
  startMinimized: boolean;
  hideToTray: boolean;
  language: AppLanguage;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchAtStartup: false,
  startMinimized: false,
  hideToTray: true,
  language: "en",
};
