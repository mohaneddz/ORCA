use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalUser {
    pub username: String,
    pub is_admin: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UserPosture {
    pub current_user: String,
    pub username: String,
    pub is_admin_estimate: Option<bool>,
    pub local_users: Vec<LocalUser>,
    pub local_admins: Vec<String>,
}
