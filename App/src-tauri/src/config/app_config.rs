use serde::{Deserialize, Serialize};

use crate::models::privacy::PrivacyConfig;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub collect_browser_metadata: bool,
    pub monitor_downloads_folder: bool,
    pub collect_event_logs: bool,
    pub collect_usb_events: bool,
    pub collect_processes: bool,
    pub collect_network: bool,
    pub collect_software: bool,
    pub collect_security_posture: bool,
    pub include_process_command_line: bool,
    pub enable_usb_watcher: bool,
    pub enable_peer_os_fingerprinting: bool,
    pub enable_startup_persistence: bool,
    pub privacy: PrivacyConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            collect_browser_metadata: false,
            monitor_downloads_folder: false,
            collect_event_logs: false,
            collect_usb_events: false,
            collect_processes: true,
            collect_network: true,
            collect_software: true,
            collect_security_posture: true,
            include_process_command_line: true,
            enable_usb_watcher: false,
            enable_peer_os_fingerprinting: false,
            enable_startup_persistence: false,
            privacy: PrivacyConfig::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AppConfig;

    #[test]
    fn risky_collectors_are_disabled_by_default() {
        let cfg = AppConfig::default();
        assert!(!cfg.collect_browser_metadata);
        assert!(!cfg.monitor_downloads_folder);
        assert!(!cfg.collect_event_logs);
        assert!(!cfg.collect_usb_events);
    }

    #[test]
    fn safe_collectors_are_enabled_by_default() {
        let cfg = AppConfig::default();
        assert!(cfg.collect_processes);
        assert!(cfg.collect_network);
        assert!(cfg.collect_software);
        assert!(cfg.collect_security_posture);
        assert!(!cfg.enable_usb_watcher);
        assert!(!cfg.enable_peer_os_fingerprinting);
        assert!(!cfg.enable_startup_persistence);
    }
}
