use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EventLogRecord {
    pub source: String,
    pub event_id: Option<u32>,
    pub level: Option<String>,
    pub category: Option<String>,
    pub message_summary: Option<String>,
    pub timestamp_utc: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EventLogReport {
    pub enabled: bool,
    pub records: Vec<EventLogRecord>,
    pub notes: Vec<String>,
}
