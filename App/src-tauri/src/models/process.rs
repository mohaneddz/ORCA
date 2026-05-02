use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: i32,
    pub parent_pid: Option<i32>,
    pub name: String,
    pub executable_path: Option<String>,
    pub cpu_usage_percent: f32,
    pub memory_bytes: u64,
    pub command_line: Option<String>,
}
