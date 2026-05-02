use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PortRiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalOpenPort {
    pub port: u16,
    pub protocol: String,
    pub owning_process: Option<String>,
    pub risk_level: PortRiskLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalPortsReport {
    pub host: String,
    pub ports: Vec<LocalOpenPort>,
    pub supported: bool,
    pub notes: Vec<String>,
}
