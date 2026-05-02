use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PatchStatus {
    pub last_updated: Option<String>,
    pub is_current: bool,
    pub days_since_update: Option<i64>,
    pub stale_threshold_days: i64,
    pub supported: bool,
    pub status_text: String,
}
