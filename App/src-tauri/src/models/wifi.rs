use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WifiProfile {
    pub ssid: String,
    pub security_type: Option<String>,
    pub is_open_network: bool,
    pub last_connected: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WifiHistoryReport {
    pub profiles: Vec<WifiProfile>,
    pub supported: bool,
    pub notes: Vec<String>,
}
