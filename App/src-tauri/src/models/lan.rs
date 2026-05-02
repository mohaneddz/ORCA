use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LanDevice {
    pub ip: String,
    pub mac: Option<String>,
    pub vendor: Option<String>,
    pub device_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PeerOsFingerprint {
    pub ip: String,
    pub ttl: u8,
    pub guessed_os_family: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LanScanReport {
    pub subnet: Option<String>,
    pub devices: Vec<LanDevice>,
    pub supported: bool,
    pub notes: Vec<String>,
}
