use serde::{Deserialize, Serialize};

use crate::models::privacy::PrivacyConfig;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BrowserPrivateSignals {
    pub domain_categories: Vec<String>,
    pub extensions: Vec<String>,
    pub download_metadata_count: usize,
    pub active_tab_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FilePrivateSignal {
    pub path_hash: String,
    pub extension: Option<String>,
    pub size_bytes: Option<u64>,
    pub file_hash: String,
    pub created_at_utc: Option<String>,
    pub modified_at_utc: Option<String>,
    pub suspicious_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessPrivateSignal {
    pub process_hash: String,
    pub command_line_redacted: Option<String>,
    pub path_category: String,
    pub executable_hash: String,
    pub risky_location: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsbPrivateSignal {
    pub device_hash: String,
    pub vendor: Option<String>,
    pub copied_file_metadata_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LoginBehaviorSignal {
    pub failed_login_count: u32,
    pub lock_events: u32,
    pub unlock_events: u32,
    pub admin_change_events: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkPrivateSignal {
    pub remote_hashes: Vec<String>,
    pub dns_query_count: u32,
    pub suspicious_remote_score: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EmailCloudPrivateSignal {
    pub phishing_report_count: u32,
    pub risky_oauth_apps: u32,
    pub mfa_disabled_accounts: u32,
    pub external_sharing_events: u32,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PrivateSignalsReport {
    pub collected_at_utc: String,
    pub config: PrivacyConfig,
    pub browser: Option<BrowserPrivateSignals>,
    pub files: Option<Vec<FilePrivateSignal>>,
    pub processes: Option<Vec<ProcessPrivateSignal>>,
    pub usb: Option<Vec<UsbPrivateSignal>>,
    pub login_behavior: Option<LoginBehaviorSignal>,
    pub network: Option<NetworkPrivateSignal>,
    pub email_cloud: Option<EmailCloudPrivateSignal>,
    pub raw_expires_after_hours: u32,
    pub aggregate_expires_after_days: u32,
}
