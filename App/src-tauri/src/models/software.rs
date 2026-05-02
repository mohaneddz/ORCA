use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InstalledSoftware {
    pub name: String,
    pub version: Option<String>,
    pub vendor: Option<String>,
    pub install_location: Option<String>,
    pub source: Option<String>,
    #[serde(default)]
    pub risk_flag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SoftwareInventory {
    pub software: Vec<InstalledSoftware>,
    pub notes: Vec<String>,
}
