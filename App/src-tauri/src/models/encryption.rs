use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiskEncryptionStatus {
    pub encrypted: bool,
    pub provider: String,
    pub status_text: String,
    pub supported: bool,
}
