use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FirewallStatus {
    Enabled,
    Disabled,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AntivirusInfo {
    pub name: String,
    pub enabled: Option<bool>,
    pub up_to_date: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SecurityPosture {
    pub firewall_status: FirewallStatus,
    pub antivirus: Vec<AntivirusInfo>,
    pub disk_encryption_enabled: Option<bool>,
    pub os_updates_current: Option<bool>,
    pub remote_access_exposure: Option<String>,
    pub notes: Vec<String>,
}
