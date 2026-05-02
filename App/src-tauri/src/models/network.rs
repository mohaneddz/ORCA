use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterfaceInfo {
    pub name: String,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ListeningPort {
    pub protocol: String,
    pub port: u16,
    pub process: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveConnection {
    pub local_address: Option<String>,
    pub remote_address: Option<String>,
    pub protocol: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    pub interfaces: Vec<NetworkInterfaceInfo>,
    pub listening_ports: Vec<ListeningPort>,
    pub active_connections: Vec<ActiveConnection>,
    pub default_gateway: Option<String>,
    pub dns_servers: Vec<String>,
    pub notes: Vec<String>,
}
