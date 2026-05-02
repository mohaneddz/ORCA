use std::process::Command;

use sysinfo::Networks;

use crate::models::network::{ActiveConnection, ListeningPort, NetworkInfo, NetworkInterfaceInfo};
use crate::utils::errors::AppResult;

pub fn collect_network_info() -> AppResult<NetworkInfo> {
    let mut networks = Networks::new_with_refreshed_list();
    networks.refresh(true);

    let mut interfaces = Vec::new();
    for (name, data) in &networks {
        interfaces.push(NetworkInterfaceInfo {
            name: name.clone(),
            received_bytes: data.total_received(),
            transmitted_bytes: data.total_transmitted(),
        });
    }

    let listening_ports = collect_listening_ports();

    Ok(NetworkInfo {
        interfaces,
        listening_ports,
        active_connections: Vec::<ActiveConnection>::new(),
        default_gateway: None,
        dns_servers: Vec::new(),
        notes: vec![
            "Active connections, DNS servers, and default gateway are placeholders unless implemented with platform APIs.".to_string(),
        ],
    })
}

#[cfg(target_os = "windows")]
fn collect_listening_ports() -> Vec<ListeningPort> {
    let output = Command::new("netstat").args(["-ano"]).output();
    parse_netstat_output(output.ok())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn collect_listening_ports() -> Vec<ListeningPort> {
    let output = Command::new("sh").args(["-c", "netstat -an"]).output();
    parse_netstat_output(output.ok())
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
fn collect_listening_ports() -> Vec<ListeningPort> {
    Vec::new()
}

fn parse_netstat_output(output: Option<std::process::Output>) -> Vec<ListeningPort> {
    let Some(output) = output else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&output.stdout);

    let mut ports = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let lowered = trimmed.to_lowercase();
        if !(lowered.contains("listen") || lowered.contains("udp")) {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let protocol = parts[0].to_string();
        let addr = parts
            .iter()
            .find(|segment| segment.contains(':') || segment.contains('.'))
            .copied();

        let port = addr.and_then(extract_port).unwrap_or(0);

        if port == 0 {
            continue;
        }

        ports.push(ListeningPort {
            protocol,
            port,
            process: None,
        });
    }

    ports.sort_by_key(|row| row.port);
    ports.dedup_by(|a, b| a.protocol == b.protocol && a.port == b.port);
    ports
}

fn extract_port(address: &str) -> Option<u16> {
    let normalized = address
        .trim_matches(|c| c == '[' || c == ']')
        .trim_end_matches("*")
        .trim_end_matches(":*");

    let (_, port_text) = normalized.rsplit_once(':')?;
    port_text.parse::<u16>().ok()
}
