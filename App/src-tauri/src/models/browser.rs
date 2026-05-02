use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InstalledBrowser {
    pub name: String,
    pub version: Option<String>,
    pub extensions_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DownloadMetadata {
    pub file_name: String,
    pub timestamp_utc: Option<String>,
    pub source_domain: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BrowserMetadata {
    pub enabled: bool,
    pub browsers: Vec<InstalledBrowser>,
    pub recent_downloads: Vec<DownloadMetadata>,
    pub notes: Vec<String>,
}
