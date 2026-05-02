import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppSettingsProvider, useAppSettings } from "@/contexts/AppSettingsContext";

const invokeMock = vi.fn(async (..._args: unknown[]) => undefined);
const isTauriMock = vi.fn(() => true);
const isAutostartEnabledMock = vi.fn(async () => false);

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, payload?: unknown) => invokeMock(command, payload),
  isTauri: () => isTauriMock(),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: vi.fn(async () => undefined),
  disable: vi.fn(async () => undefined),
  isEnabled: () => isAutostartEnabledMock(),
}));

function Harness() {
  const { settings, setLanguage, setHideToTray } = useAppSettings();
  return (
    <>
      <div data-testid="lang">{settings.language}</div>
      <div data-testid="hide">{String(settings.hideToTray)}</div>
      <button onClick={() => void setLanguage("fr")}>set-fr</button>
      <button onClick={() => void setHideToTray(false)}>hide-false</button>
    </>
  );
}

describe("AppSettingsProvider", () => {
  it("syncs initial settings and updates via tauri invoke", async () => {
    const user = userEvent.setup();

    render(
      <AppSettingsProvider>
        <Harness />
      </AppSettingsProvider>,
    );

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "sync_runtime_settings",
        expect.objectContaining({
          settings: expect.objectContaining({ language: "en", hideToTray: true }),
        }),
      );
      expect(invokeMock).toHaveBeenCalledWith("set_hide_to_tray", { enabled: true });
    });

    await user.click(screen.getByRole("button", { name: "set-fr" }));
    await user.click(screen.getByRole("button", { name: "hide-false" }));

    await waitFor(() => {
      expect(screen.getByTestId("lang").textContent).toBe("fr");
      expect(screen.getByTestId("hide").textContent).toBe("false");
      expect(
        invokeMock.mock.calls.some((call) => {
          const [command, payload] = call as [string, { settings?: { hideToTray?: boolean; language?: string } } | undefined];
          if (command !== "sync_runtime_settings") {
            return false;
          }
          const settings = payload?.settings;
          return settings?.hideToTray === false && settings?.language === "fr";
        }),
      ).toBe(true);
    });
  });
});
