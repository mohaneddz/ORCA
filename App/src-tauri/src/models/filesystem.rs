use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FilesystemEvent {
    pub path: String,
    pub file_name: String,
    pub extension: Option<String>,
    pub size_bytes: Option<u64>,
    pub event_kind: String,
    pub timestamp_utc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FilesystemMonitoringReport {
    pub enabled: bool,
    pub watched_path: Option<String>,
    pub events: Vec<FilesystemEvent>,
    pub notes: Vec<String>,
}
