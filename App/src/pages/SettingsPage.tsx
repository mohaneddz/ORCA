import { useState } from "react";
import { PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";

type SettingsTabKey = "security" | "network" | "mail" | "automation" | "integrations";

const tabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: "security", label: "Security Policy" },
  { key: "network", label: "Network Rules" },
  { key: "mail", label: "Mail Controls" },
  { key: "automation", label: "Automation" },
  { key: "integrations", label: "Integrations" },
];

const tabToggles: Record<SettingsTabKey, string[]> = {
  security: [
    "Enforce MFA for all organization accounts",
    "Force password rotation every 60 days",
    "Disable legacy auth protocols",
    "Require endpoint encryption before account access",
    "Auto-lock account after suspicious geolocation switch",
    "Allow break-glass admin accounts",
  ],
  network: [
    "Quarantine unassigned devices automatically",
    "Block peer-to-peer discovery on production VLAN",
    "Allow guest network internet only",
    "Detect MAC randomization anomalies",
    "Auto-open incident on rogue DHCP detection",
    "Permit remote admin only through bastion segment",
  ],
  mail: [
    "Insert external sender warning banners",
    "Quarantine risky attachments by file signature",
    "Block executable attachments organization-wide",
    "Enable URL rewrite and click tracking for high-risk groups",
    "Auto-flag invoices with mismatched sender domain",
    "Allow user release requests from quarantine",
  ],
  automation: [
    "Auto-trigger password reset after successful guess simulation",
    "Auto-send training assignment after phishing click",
    "Auto-create Jira ticket for high-severity incidents",
    "Run nightly passive guesser cycle",
    "Auto-disable devices missing 2 patch windows",
    "Escalate unresolved critical alerts after 30 minutes",
  ],
  integrations: [
    "Google Workspace sync",
    "Endpoint agent telemetry sync",
    "SIEM event forwarding",
    "Slack incident notifications",
    "SMS escalation channel",
    "Ticketing platform bi-directional sync",
  ],
};

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 last:border-b-0">
      <p className="m-0 text-sm text-slate-200">{label}</p>
      <button
        type="button"
        className={[
          "h-6 w-11 rounded-full border transition-colors",
          enabled
            ? "border-cyan-300/40 bg-cyan-400/40"
            : "border-white/20 bg-white/10",
        ].join(" ")}
        aria-pressed={enabled}
      >
        <span
          className={[
            "mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform",
            enabled ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function SettingSwitch({
  label,
  helper,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  helper: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/4 px-4 py-3">
      <div>
        <p className="m-0 text-sm font-semibold text-white">{label}</p>
        <p className="m-0 mt-1 text-xs text-[var(--color-dim)]">{helper}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-cyan-400"
        disabled={disabled}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("security");
  const {
    settings,
    startupError,
    setHideToTray,
    setLaunchAtStartup,
    setStartMinimized,
    setLanguage,
    t,
  } = useAppSettings();

  return (
    <div className="page-section">
      <PageHeader
        badge={t("sidebar.item.settings")}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <section className="card p-4">
        <div className="mb-3">
          <p className="m-0 text-sm font-semibold text-white">{t("settings.desktop.title")}</p>
          <p className="m-0 mt-1 text-xs text-[var(--color-dim)]">{t("settings.desktop.description")}</p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-white/10 bg-white/4 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-semibold text-white">{t("settings.language")}</p>
                <p className="m-0 mt-1 text-xs text-[var(--color-dim)]">{t("settings.language.helper")}</p>
              </div>
              <select
                value={settings.language}
                onChange={(event) => void setLanguage(event.target.value === "fr" ? "fr" : "en")}
                className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
              >
                <option value="en">{t("settings.english")}</option>
                <option value="fr">{t("settings.french")}</option>
              </select>
            </div>
          </div>

          <SettingSwitch
            label={t("settings.launchAtStartup")}
            helper={t("settings.launchAtStartup.helper")}
            checked={settings.launchAtStartup}
            onChange={(enabled) => {
              void setLaunchAtStartup(enabled);
            }}
          />

          <SettingSwitch
            label={t("settings.startMinimized")}
            helper={t("settings.startMinimized.helper")}
            checked={settings.startMinimized}
            disabled={!settings.launchAtStartup}
            onChange={(enabled) => {
              void setStartMinimized(enabled);
            }}
          />

          <SettingSwitch
            label={t("settings.hideToTray")}
            helper={t("settings.hideToTray.helper")}
            checked={settings.hideToTray}
            onChange={(enabled) => {
              void setHideToTray(enabled);
            }}
          />

          <div className="rounded-md border border-white/10 bg-white/4 px-4 py-3">
            <p className="m-0 text-sm font-semibold text-white">{t("settings.globalShortcut")}</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-dim)]">{t("settings.globalShortcut.helper")}</p>
            <code className="mt-3 inline-block rounded-md bg-slate-900/70 px-2 py-1 text-xs text-cyan-100">
              Ctrl + Shift + L
            </code>
          </div>

          {startupError ? <p className="m-0 text-xs text-red-300">{startupError}</p> : null}
        </div>
      </section>

      <section className="card p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                activeTab === tab.key
                  ? "bg-cyan-500/18 text-cyan-100"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="m-0 text-sm font-semibold text-white">
            {tabs.find((tab) => tab.key === activeTab)?.label}
          </p>
          <p className="m-0 mt-1 text-xs text-[var(--color-dim)]">
            Configuration toggles for the selected settings area.
          </p>
        </div>
        <div>
          {tabToggles[activeTab].map((toggleLabel, index) => (
            <ToggleRow key={toggleLabel} label={toggleLabel} enabled={index % 2 === 0} />
          ))}
        </div>
      </section>
    </div>
  );
}
