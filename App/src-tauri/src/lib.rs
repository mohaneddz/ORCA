pub mod collectors;
pub mod config;
pub mod models;
pub mod network_scan;
pub mod services;
pub mod utils;

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::{env, fs};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime, State, WindowEvent};
#[cfg(target_os = "macos")]
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{Shortcut, ShortcutState};

use crate::config::app_config::AppConfig;
use crate::models::antivirus::AntivirusStatus;
use crate::models::encryption::DiskEncryptionStatus;
use crate::models::hardware::HardwareInventory;
use crate::models::lan::{LanScanReport, PeerOsFingerprint};
use crate::models::network::NetworkInfo;
use crate::models::patch::PatchStatus;
use crate::models::ports::LocalPortsReport;
use crate::models::posture::PostureReport;
use crate::models::privacy::PrivacyConfig;
use crate::models::private_signals::PrivateSignalsReport;
use crate::models::process::ProcessInfo;
use crate::models::risk::RiskScore;
use crate::models::security::SecurityPosture;
use crate::models::software::SoftwareInventory;
use crate::models::startup::StartupPersistenceStatus;
use crate::models::usb::UsbReport;
use crate::models::wifi::WifiHistoryReport;
use crate::services::posture_service;
use crate::services::privacy_service;
use crate::services::risk_service;
use crate::services::telemetry_log_service::TelemetryLogEntry;
use crate::services::wave3_posture_service::{self, Wave3PostureReport};

const MAIN_WINDOW_LABEL: &str = "main";
const SETTINGS_FILE_NAME: &str = "app-settings.json";
const TRAY_ID: &str = "orca-tray";
const TRAY_TOGGLE_ID: &str = "tray_toggle";
const TRAY_QUIT_ID: &str = "tray_quit";
const GLOBAL_TOGGLE_SHORTCUT: &str = "Ctrl+Shift+L";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeSettings {
    launch_at_startup: bool,
    start_minimized: bool,
    hide_to_tray: bool,
    language: String,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            launch_at_startup: false,
            start_minimized: false,
            hide_to_tray: true,
            language: "en".to_string(),
        }
    }
}

#[derive(Default)]
struct AppState {
    hide_to_tray: Arc<Mutex<bool>>,
    explicit_quit: Arc<Mutex<bool>>,
}

#[derive(Default)]
struct PrivacyState {
    config: Arc<Mutex<PrivacyConfig>>,
}

fn settings_file_path<R: Runtime>(app: &AppHandle<R>) -> Option<std::path::PathBuf> {
    let Ok(mut path) = app.path().app_data_dir() else {
        return None;
    };
    path.push(SETTINGS_FILE_NAME);
    Some(path)
}

fn load_runtime_settings<R: Runtime>(app: &AppHandle<R>) -> RuntimeSettings {
    let Some(path) = settings_file_path(app) else {
        return RuntimeSettings::default();
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return RuntimeSettings::default();
    };
    serde_json::from_str::<RuntimeSettings>(&raw).unwrap_or_default()
}

fn save_runtime_settings<R: Runtime>(app: &AppHandle<R>, settings: &RuntimeSettings) {
    let Some(path) = settings_file_path(app) else {
        return;
    };

    if let Some(parent) = path.parent() {
        if fs::create_dir_all(parent).is_err() {
            return;
        }
    }

    if let Ok(raw) = serde_json::to_string(settings) {
        let _ = fs::write(path, raw);
    }
}

fn set_hide_to_tray_state(state: &State<'_, AppState>, enabled: bool) {
    if let Ok(mut hide_to_tray) = state.hide_to_tray.lock() {
        *hide_to_tray = enabled;
    }
}

fn should_hide_to_tray(state: &State<'_, AppState>) -> bool {
    state.hide_to_tray.lock().map(|flag| *flag).unwrap_or(false)
}

fn set_explicit_quit(state: &State<'_, AppState>, enabled: bool) {
    if let Ok(mut explicit_quit) = state.explicit_quit.lock() {
        *explicit_quit = enabled;
    }
}

fn is_explicit_quit(state: &State<'_, AppState>) -> bool {
    state
        .explicit_quit
        .lock()
        .map(|flag| *flag)
        .unwrap_or(false)
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };
    window.show()?;
    window.unminimize()?;
    window.set_focus()?;
    Ok(())
}

fn hide_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };
    window.hide()?;
    Ok(())
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };
    if window.is_visible()? {
        window.hide()?;
    } else {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
    }
    Ok(())
}

fn is_autostart_launch() -> bool {
    env::args().any(|arg| arg == "--autostart")
}

fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let toggle_item =
        MenuItem::with_id(app, TRAY_TOGGLE_ID, "Show / Hide ORCA", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, TRAY_QUIT_ID, "Quit ORCA", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&toggle_item, &separator, &quit_item])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("ORCA")
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_TOGGLE_ID => {
                let _ = toggle_main_window(app);
            }
            TRAY_QUIT_ID => {
                let state = app.state::<AppState>();
                set_explicit_quit(&state, true);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            {
                if button == MouseButton::Left && button_state == MouseButtonState::Up {
                    let _ = toggle_main_window(tray.app_handle());
                }
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    let _ = builder.build(app)?;
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_hide_to_tray(state: State<'_, AppState>, enabled: bool) {
    set_hide_to_tray_state(&state, enabled);
}

#[tauri::command]
fn hide_to_tray(app: AppHandle) -> Result<(), String> {
    hide_main_window(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn show_main_window_command(app: AppHandle) -> Result<(), String> {
    show_main_window(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn sync_runtime_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: RuntimeSettings,
) -> Result<(), String> {
    set_hide_to_tray_state(&state, settings.hide_to_tray);
    save_runtime_settings(&app, &settings);
    Ok(())
}

#[tauri::command]
fn collect_device_info() -> Result<models::device::DeviceInfo, String> {
    collectors::device_collector::collect_device_info().map_err(|error| error.to_string())
}

#[tauri::command]
fn collect_processes() -> Result<Vec<ProcessInfo>, String> {
    let defaults = AppConfig::default();
    collectors::process_collector::collect_processes(defaults.include_process_command_line)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn collect_network_info() -> Result<NetworkInfo, String> {
    collectors::network_collector::collect_network_info().map_err(|error| error.to_string())
}

#[tauri::command]
fn collect_security_posture() -> Result<SecurityPosture, String> {
    collectors::security_collector::collect_security_posture().map_err(|error| error.to_string())
}

#[tauri::command]
fn collect_full_posture(config: Option<AppConfig>) -> Result<PostureReport, String> {
    posture_service::collect_full_posture(config.unwrap_or_default())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn calculate_risk_score(report: PostureReport) -> RiskScore {
    risk_service::calculate_risk_score_internal(&report)
}

#[tauri::command]
fn get_app_config_defaults() -> AppConfig {
    AppConfig::default()
}

#[tauri::command]
fn get_privacy_config(state: State<'_, PrivacyState>) -> PrivacyConfig {
    state
        .config
        .lock()
        .map(|cfg| cfg.clone())
        .unwrap_or_else(|_| PrivacyConfig::default())
}

#[tauri::command]
fn update_privacy_config(
    state: State<'_, PrivacyState>,
    config: PrivacyConfig,
) -> Result<PrivacyConfig, String> {
    let sanitized = privacy_service::sanitize_privacy_config(config);
    let mut guard = state
        .config
        .lock()
        .map_err(|_| "privacy config state lock poisoned".to_string())?;
    *guard = sanitized.clone();
    Ok(sanitized)
}

#[tauri::command]
fn collect_private_signals(state: State<'_, PrivacyState>) -> Result<PrivateSignalsReport, String> {
    let config = state
        .config
        .lock()
        .map(|cfg| cfg.clone())
        .map_err(|_| "privacy config state lock poisoned".to_string())?;

    collectors::private_signal_collector::collect_private_signals(config)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn anonymize_sample_value(value: String) -> String {
    collectors::private_signal_collector::anonymize_sample_value(value)
}

#[tauri::command]
fn get_telemetry_logs() -> Vec<TelemetryLogEntry> {
    services::telemetry_log_service::get_telemetry_logs()
}

#[tauri::command]
fn collect_hardware_inventory() -> Result<HardwareInventory, String> {
    collectors::hardware_collector::collect_hardware_inventory().map_err(|e| e.to_string())
}

#[tauri::command]
fn collect_patch_status() -> Result<PatchStatus, String> {
    collectors::patch_collector::collect_patch_status().map_err(|e| e.to_string())
}

#[tauri::command]
fn collect_installed_software() -> Result<SoftwareInventory, String> {
    collectors::software_collector::collect_installed_software().map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_local_network_arp() -> Result<LanScanReport, String> {
    collectors::lan_collector::scan_local_network_arp().map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_local_open_ports() -> Result<LocalPortsReport, String> {
    collectors::ports_collector::scan_local_open_ports().map_err(|e| e.to_string())
}

#[tauri::command]
fn detect_antivirus() -> Result<AntivirusStatus, String> {
    collectors::antivirus_collector::detect_antivirus().map_err(|e| e.to_string())
}

#[tauri::command]
fn collect_usb_events(config: Option<AppConfig>) -> Result<UsbReport, String> {
    collectors::usb_collector::collect_usb_events(config.unwrap_or_default().enable_usb_watcher)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn collect_wifi_history() -> Result<WifiHistoryReport, String> {
    collectors::wifi_collector::collect_wifi_history().map_err(|e| e.to_string())
}

#[tauri::command]
fn collect_disk_encryption_status() -> Result<DiskEncryptionStatus, String> {
    collectors::encryption_collector::collect_disk_encryption_status().map_err(|e| e.to_string())
}

#[tauri::command]
fn fingerprint_network_peers(config: Option<AppConfig>) -> Result<Vec<PeerOsFingerprint>, String> {
    collectors::peer_fingerprint_collector::fingerprint_network_peers(
        config.unwrap_or_default().enable_peer_os_fingerprinting,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_startup_persistence_status(
    config: Option<AppConfig>,
) -> Result<StartupPersistenceStatus, String> {
    collectors::startup_collector::get_startup_persistence_status(
        config.unwrap_or_default().enable_startup_persistence,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn enable_startup_persistence(
    config: Option<AppConfig>,
) -> Result<StartupPersistenceStatus, String> {
    collectors::startup_collector::enable_startup_persistence(
        config.unwrap_or_default().enable_startup_persistence,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn disable_startup_persistence(
    config: Option<AppConfig>,
) -> Result<StartupPersistenceStatus, String> {
    collectors::startup_collector::disable_startup_persistence(
        config.unwrap_or_default().enable_startup_persistence,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn collect_wave3_posture(config: Option<AppConfig>) -> Result<Wave3PostureReport, String> {
    wave3_posture_service::collect_wave3_posture(config.unwrap_or_default())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let toggle_shortcut = GLOBAL_TOGGLE_SHORTCUT
        .parse::<Shortcut>()
        .expect("invalid global toggle shortcut");
    let toggle_shortcut_id = toggle_shortcut.id();

    let global_shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts([toggle_shortcut])
        .expect("failed to register global shortcut")
        .with_handler(move |app, shortcut, event| {
            if event.state == ShortcutState::Released {
                return;
            }
            if shortcut.id() == toggle_shortcut_id {
                let _ = toggle_main_window(app);
            }
        })
        .build();

    tauri::Builder::default()
        .manage(AppState::default())
        .manage(PrivacyState {
            config: Arc::new(Mutex::new(PrivacyConfig::default())),
        })
        .plugin({
            #[cfg(target_os = "macos")]
            {
                tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--autostart"]))
            }
            #[cfg(not(target_os = "macos"))]
            {
                tauri_plugin_autostart::Builder::new()
                    .args(["--autostart"])
                    .build()
            }
        })
        .plugin(global_shortcut_plugin)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let settings = load_runtime_settings(app.handle());
            let state = app.state::<AppState>();
            set_hide_to_tray_state(&state, settings.hide_to_tray);

            build_tray(app.handle())?;
            if is_autostart_launch() && settings.start_minimized {
                if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                    let _ = window.minimize();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if !is_explicit_quit(&state) && should_hide_to_tray(&state) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            set_hide_to_tray,
            hide_to_tray,
            show_main_window_command,
            sync_runtime_settings,
            collect_device_info,
            collect_processes,
            collect_network_info,
            collect_security_posture,
            collect_full_posture,
            calculate_risk_score,
            get_app_config_defaults,
            get_privacy_config,
            update_privacy_config,
            collect_private_signals,
            anonymize_sample_value,
            get_telemetry_logs,
            collect_hardware_inventory,
            collect_patch_status,
            collect_installed_software,
            scan_local_network_arp,
            scan_local_open_ports,
            detect_antivirus,
            collect_usb_events,
            collect_wifi_history,
            collect_disk_encryption_status,
            fingerprint_network_peers,
            get_startup_persistence_status,
            enable_startup_persistence,
            disable_startup_persistence,
            collect_wave3_posture,
            network_scan::scan_network,
            network_scan::get_router_mock_data,
            network_scan::get_local_network_info,
            network_scan::scan_common_ports,
            network_scan::discover_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
