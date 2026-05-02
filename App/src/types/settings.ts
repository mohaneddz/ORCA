export type AppLanguage = "en" | "fr";
export type AppTheme = "dark" | "light";

export type AppSettings = {
  launchAtStartup: boolean;
  startMinimized: boolean;
  hideToTray: boolean;
  language: AppLanguage;
  theme: AppTheme;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchAtStartup: false,
  startMinimized: false,
  hideToTray: true,
  language: "en",
  theme: "dark",
};
