use serde::{Deserialize, Serialize};

use crate::collectors::antivirus_collector::detect_antivirus;
use crate::collectors::encryption_collector::collect_disk_encryption_status;
use crate::collectors::hardware_collector::collect_hardware_inventory;
use crate::collectors::lan_collector::scan_local_network_arp;
use crate::collectors::patch_collector::collect_patch_status;
use crate::collectors::peer_fingerprint_collector::fingerprint_network_peers;
use crate::collectors::ports_collector::scan_local_open_ports;
use crate::collectors::software_collector::collect_installed_software;
use crate::collectors::startup_collector::get_startup_persistence_status;
use crate::collectors::usb_collector::collect_usb_events;
use crate::collectors::wifi_collector::collect_wifi_history;
use crate::config::app_config::AppConfig;
use crate::models::antivirus::AntivirusStatus;
use crate::models::encryption::DiskEncryptionStatus;
use crate::models::hardware::HardwareInventory;
use crate::models::lan::{LanScanReport, PeerOsFingerprint};
use crate::models::patch::PatchStatus;
use crate::models::ports::LocalPortsReport;
use crate::models::software::SoftwareInventory;
use crate::models::startup::StartupPersistenceStatus;
use crate::models::usb::UsbReport;
use crate::models::wifi::WifiHistoryReport;
use crate::services::telemetry_log_service::log_collector_event;
use crate::utils::errors::AppResult;
use crate::utils::time::now_utc_rfc3339;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Wave3PostureReport {
    pub collected_at_utc: String,
    pub hardware: HardwareInventory,
    pub patch_status: PatchStatus,
    pub software: SoftwareInventory,
    pub lan: LanScanReport,
    pub local_ports: LocalPortsReport,
    pub antivirus: AntivirusStatus,
    pub usb: UsbReport,
    pub wifi: WifiHistoryReport,
    pub disk_encryption: DiskEncryptionStatus,
    pub peer_fingerprint: Option<Vec<PeerOsFingerprint>>,
    pub startup_persistence: Option<StartupPersistenceStatus>,
}

pub fn collect_wave3_posture(config: AppConfig) -> AppResult<Wave3PostureReport> {
    log_collector_event("wave3_posture_service", "started", true, 0, None);

    let hardware = collect_logged("hardware_collector", true, || collect_hardware_inventory())?;
    let patch_status = collect_logged("patch_collector", true, || collect_patch_status())?;
    let software = collect_logged("software_collector", true, || collect_installed_software())?;
    let lan = collect_logged("lan_collector", true, || scan_local_network_arp())?;
    let local_ports = collect_logged("ports_collector", true, || scan_local_open_ports())?;
    let antivirus = collect_logged("antivirus_collector", true, || detect_antivirus())?;
    let usb = collect_logged("usb_collector", config.enable_usb_watcher, || {
        collect_usb_events(config.enable_usb_watcher)
    })?;
    let wifi = collect_logged("wifi_collector", true, || collect_wifi_history())?;
    let disk_encryption = collect_logged("encryption_collector", true, || {
        collect_disk_encryption_status()
    })?;

    let peer_fingerprint = if config.enable_peer_os_fingerprinting {
        Some(fingerprint_network_peers(true)?)
    } else {
        None
    };

    let startup_persistence = if config.enable_startup_persistence {
        Some(get_startup_persistence_status(true)?)
    } else {
        None
    };

    let record_count = lan.devices.len() + local_ports.ports.len() + software.software.len();

    log_collector_event(
        "wave3_posture_service",
        "finished",
        true,
        record_count,
        None,
    );

    Ok(Wave3PostureReport {
        collected_at_utc: now_utc_rfc3339(),
        hardware,
        patch_status,
        software,
        lan,
        local_ports,
        antivirus,
        usb,
        wifi,
        disk_encryption,
        peer_fingerprint,
        startup_persistence,
    })
}

fn collect_logged<T, F>(module: &str, enabled: bool, collect: F) -> AppResult<T>
where
    F: FnOnce() -> AppResult<T>,
{
    log_collector_event(module, "started", enabled, 0, None);
    match collect() {
        Ok(value) => {
            log_collector_event(module, "finished", enabled, 1, None);
            Ok(value)
        }
        Err(error) => {
            log_collector_event(module, "failure", enabled, 0, Some(error.to_string()));
            Err(error)
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::config::app_config::AppConfig;

    use super::collect_wave3_posture;

    #[test]
    fn wave3_service_returns_structured_report() {
        let report =
            collect_wave3_posture(AppConfig::default()).expect("wave3 posture should collect");
        assert!(!report.collected_at_utc.is_empty());
        assert!(!report.hardware.status.is_empty());
    }
}
