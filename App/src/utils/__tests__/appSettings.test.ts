import { describe, expect, it } from "vitest";
import { DEFAULT_APP_SETTINGS } from "@/types/settings";
import { persistAppSettings, readAppSettings } from "@/utils/appSettings";

describe("appSettings", () => {
  it("returns defaults when storage is empty", () => {
    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("persists and reads valid settings", () => {
    const settings = {
      launchAtStartup: true,
      startMinimized: true,
      hideToTray: false,
      language: "fr" as const,
    };

    persistAppSettings(settings);

    expect(readAppSettings()).toEqual(settings);
  });

  it("sanitizes malformed stored payload", () => {
    localStorage.setItem(
      "innovbyte-app-settings-v1",
      JSON.stringify({
        launchAtStartup: "yes",
        startMinimized: 1,
        hideToTray: null,
        language: "ar",
      }),
    );

    expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });
});


