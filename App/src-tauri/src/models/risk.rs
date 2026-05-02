use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RiskScore {
    pub score: u8,
    pub level: String,
    pub signals: Vec<String>,
}
