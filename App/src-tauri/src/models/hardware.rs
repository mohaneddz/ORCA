use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInventory {
    pub hostname: Option<String>,
    pub os_name: Option<String>,
    pub os_version: Option<String>,
    pub os_build: Option<String>,
    pub cpu_model: Option<String>,
    pub ram_total_mb: Option<u64>,
    pub disk_total_gb: Option<u64>,
    pub disk_free_gb: Option<u64>,
    pub machine_uuid: Option<String>,
    pub primary_mac_address: Option<String>,
    pub supported: bool,
    pub status: String,
}
