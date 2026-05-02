import { useState, useEffect } from "react";
import { PageHeader } from "@/components/cards/BaseCards";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import {
  getApiOverrides,
  saveApiOverrides,
  clearApiOverrides,
  ENV_DEFAULTS,
  type ApiKeysConfig,
} from "@/lib/apiKeysStore";

type SettingsTabKey = "general" | "api" | "security" | "network" | "mail" | "automation" | "integrations";

const tabs: Array<{ key: SettingsTabKey; labelKey: string }> = [
  { key: "general", labelKey: "settings.tab.general" },
  { key: "api", labelKey: "settings.tab.api" },
  { key: "security", labelKey: "settings.tab.security" },
  { key: "network", labelKey: "settings.tab.network" },
  { key: "mail", labelKey: "settings.tab.mail" },
  { key: "automation", labelKey: "settings.tab.automation" },
  { key: "integrations", labelKey: "settings.tab.integrations" },
];

const tabToggles: Record<Exclude<SettingsTabKey, "general" | "api">, string[]> = {
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
          enabled ? "border-cyan-300/40 bg-cyan-400/40" : "border-white/20 bg-white/10",
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
        <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">{helper}</p>
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

// ──────────────────────────────────────────────────────────────────
// API Keys panel
// ──────────────────────────────────────────────────────────────────
type ApiKeyField = {
  key: keyof ApiKeysConfig;
  label: string;
  type?: "text" | "password" | "number";
  helper?: string;
};

const API_KEY_FIELDS: ApiKeyField[] = [
  { key: "pineconeApiKey", label: "Pinecone API Key", type: "password", helperKey: "settings.api.helper.pineconeKey" },
  { key: "pineconeIndexName", label: "Pinecone Index Name", helperKey: "settings.api.helper.pineconeIndex" },
  { key: "pineconeNamespace", label: "Pinecone Namespace", helperKey: "settings.api.helper.pineconeNamespace" },
  { key: "pineconeTopK", label: "Pinecone Top-K", type: "number", helperKey: "settings.api.helper.pineconeTopK" },
  { key: "groqApiKey", label: "Groq API Key", type: "password", helperKey: "settings.api.helper.groqKey" },
  { key: "groqBaseUrl", label: "Groq Base URL", helperKey: "settings.api.helper.groqBaseUrl" },
  { key: "groqChatModel", label: "Groq Chat Model", helperKey: "settings.api.helper.groqModel" },
];

function ApiKeysPanel() {
  const { t } = useAppSettings();
  const [form, setForm] = useState<Partial<Record<keyof ApiKeysConfig, string>>>({}); 
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isVisible, setIsVisible] = useState<Record<keyof ApiKeysConfig, boolean>>(
    {} as Record<keyof ApiKeysConfig, boolean>
  );

  useEffect(() => {
    void getApiOverrides().then((overrides) => {
      const stringified: Partial<Record<keyof ApiKeysConfig, string>> = {};
      for (const k of Object.keys(overrides) as (keyof ApiKeysConfig)[]) {
        stringified[k] = String(overrides[k] ?? "");
      }
      setForm(stringified);
    });
  }, []);

  const handleChange = (key: keyof ApiKeysConfig, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  };

  const handleSave = async () => {
    setStatus("saving");
    try {
      // Build typed overrides — skip blank strings (those revert to default)
      const overrides: Partial<ApiKeysConfig> = {};
      for (const field of API_KEY_FIELDS) {
        const val = form[field.key]?.trim();
        if (val && val !== "") {
          if (field.type === "number") {
            overrides[field.key] = Number(val) as never;
          } else {
            (overrides as any)[field.key] = val;
          }
        }
      }
      await saveApiOverrides(overrides);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  };

  const handleReset = async () => {
    await clearApiOverrides();
    setForm({});
    setStatus("idle");
  };

  const toggleVisible = (key: keyof ApiKeysConfig) => {
    setIsVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="card p-4">
      <div className="mb-4">
        <p className="m-0 text-sm font-semibold text-white">{t("settings.api.title")}</p>
        <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">
          {t("settings.api.description")}
        </p>
      </div>

      <div className="grid gap-3">
        {API_KEY_FIELDS.map((field) => {
          const envDefault = String(ENV_DEFAULTS[field.key]);
          const inputType =
            field.type === "password" && !isVisible[field.key]
              ? "password"
              : field.type === "number"
              ? "number"
              : "text";

          return (
            <div
              key={field.key}
              className="rounded-md border border-white/10 bg-white/4 px-4 py-3"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <label
                  htmlFor={`api-key-${field.key}`}
                  className="text-sm font-semibold text-white"
                >
                  {field.label}
                </label>
                {field.helperKey && (
                  <span className="text-xs text-[var(--color-neutral-500)]">
                    {t(field.helperKey)}
                  </span>
                )}
              </div>
              <div className="relative flex items-center gap-2">
                <input
                  id={`api-key-${field.key}`}
                  type={inputType}
                  value={form[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={envDefault || t("settings.api.placeholder")}
                  className="w-full rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-cyan-300/40 focus:ring font-mono"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() => toggleVisible(field.key)}
                    className="shrink-0 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                    aria-label={isVisible[field.key] ? t("settings.api.hide") : t("settings.api.show")}
                  >
                    {isVisible[field.key] ? t("settings.api.hide") : t("settings.api.show")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={status === "saving"}
          className="rounded-md bg-cyan-500/20 border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          {status === "saving" ? t("settings.api.saving") : t("settings.api.save")}
        </button>

        <button
          type="button"
          onClick={() => void handleReset()}
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
        >
          {t("settings.api.reset")}
        </button>

        {status === "saved" && (
          <span className="text-xs text-emerald-400">✓ {t("settings.api.saved")}</span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-400">{t("settings.api.error")}</span>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("general");
  const {
    settings,
    startupError,
    setHideToTray,
    setLaunchAtStartup,
    setStartMinimized,
    setLanguage,
    setTheme,
    t,
  } = useAppSettings();

  return (
    <div className="page-section">
      <PageHeader badge={t("sidebar.item.settings")} title={t("settings.title")} description={t("settings.description")} />

      <section className="card p-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                activeTab === tab.key ? "bg-cyan-500/18 text-cyan-100" : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "general" && (
        <section className="card p-4">
          <div className="mb-3">
            <p className="m-0 text-sm font-semibold text-white">{t("settings.desktop.title")}</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">{t("settings.desktop.description")}</p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-md border border-white/10 bg-white/4 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-semibold text-white">{t("settings.theme")}</p>
                  <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">{t("settings.theme.helper")}</p>
                </div>
                <select
                  value={settings.theme}
                  onChange={(event) => void setTheme(event.target.value === "light" ? "light" : "dark")}
                  className="rounded-md border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
                >
                  <option value="dark">{t("settings.theme.dark")}</option>
                  <option value="light">{t("settings.theme.light")}</option>
                </select>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-white/4 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-semibold text-white">{t("settings.language")}</p>
                  <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">{t("settings.language.helper")}</p>
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
              <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">{t("settings.globalShortcut.helper")}</p>
              <code className="mt-3 inline-block rounded-md bg-slate-900/70 px-2 py-1 text-xs text-cyan-100">Ctrl + Shift + L</code>
            </div>

            {startupError ? <p className="m-0 text-xs text-red-300">{startupError}</p> : null}
          </div>
        </section>
      )}

      {activeTab === "api" && <ApiKeysPanel />}

      {activeTab !== "general" && activeTab !== "api" && (
        <section className="card overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="m-0 text-sm font-semibold text-white">{t(tabs.find((tab) => tab.key === activeTab)?.labelKey || "")}</p>
            <p className="m-0 mt-1 text-xs text-[var(--color-neutral-500)]">{t("settings.toggles.description")}</p>
          </div>
          <div>
            {tabToggles[activeTab as keyof typeof tabToggles]?.map((toggleLabel, index) => (
              <ToggleRow key={toggleLabel} label={toggleLabel} enabled={index % 2 === 0} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
