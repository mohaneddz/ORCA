use serde::{Deserialize, Serialize};

use crate::models::browser::BrowserMetadata;
use crate::models::device::DeviceInfo;
use crate::models::event_log::EventLogReport;
use crate::models::filesystem::FilesystemMonitoringReport;
use crate::models::network::NetworkInfo;
use crate::models::process::ProcessInfo;
use crate::models::risk::RiskScore;
use crate::models::security::SecurityPosture;
use crate::models::software::SoftwareInventory;
use crate::models::usb::UsbReport;
use crate::models::user::UserPosture;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PostureReport {
    pub collected_at_utc: String,
    pub device: DeviceInfo,
    pub user: UserPosture,
    pub security: Option<SecurityPosture>,
    pub processes: Vec<ProcessInfo>,
    pub network: Option<NetworkInfo>,
    pub software: Option<SoftwareInventory>,
    pub filesystem: Option<FilesystemMonitoringReport>,
    pub event_logs: Option<EventLogReport>,
    pub browser: Option<BrowserMetadata>,
    pub usb: Option<UsbReport>,
    pub risk: Option<RiskScore>,
}
