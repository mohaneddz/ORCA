use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AntivirusStatus {
    pub av_detected: bool,
    pub product_name: Option<String>,
    pub enabled_status: Option<bool>,
    pub signature_up_to_date: Option<bool>,
    pub supported: bool,
    pub status_text: String,
}
