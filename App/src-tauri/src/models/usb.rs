use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsbDeviceMetadata {
    pub device_name: Option<String>,
    pub vendor: Option<String>,
    pub serial: Option<String>,
    pub connected_at_utc: Option<String>,
    pub vendor_id: Option<String>,
    pub product_id: Option<String>,
    pub mount_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsbInsertionEvent {
    pub timestamp_utc: String,
    pub device_name: Option<String>,
    pub vendor_id: Option<String>,
    pub product_id: Option<String>,
    pub mount_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsbReport {
    pub enabled: bool,
    pub devices: Vec<UsbDeviceMetadata>,
    pub events: Vec<UsbInsertionEvent>,
    pub notes: Vec<String>,
}
