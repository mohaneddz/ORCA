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
    parse_netstat_text(&String::from_utf8_lossy(&output.stdout))
}

fn parse_netstat_text(text: &str) -> Vec<ListeningPort> {
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
        if parts.len() < 2 {
            continue;
        }

        let protocol = parts[0].to_string();
        let port = parts
            .iter()
            .skip(1)
            .filter_map(|segment| extract_port(segment))
            .find(|port| *port > 0)
            .unwrap_or(0);

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

#[cfg(test)]
mod tests {
    use super::{collect_network_info, parse_netstat_text};

    #[test]
    fn collects_network_info_shape() {
        let network = collect_network_info().expect("network info should collect");
        assert!(!network.notes.is_empty());
    }

    #[test]
    fn parses_listening_ports_from_windows_output() {
        let sample = r#"
TCP    0.0.0.0:135         0.0.0.0:0              LISTENING       980
TCP    127.0.0.1:7777      0.0.0.0:0              LISTENING       1234
UDP    0.0.0.0:5353        *:*                                    2222
"#;
        let ports = parse_netstat_text(sample);
        assert!(ports.iter().any(|p| p.protocol == "TCP" && p.port == 135));
        assert!(ports.iter().any(|p| p.protocol == "TCP" && p.port == 7777));
        assert!(ports.iter().any(|p| p.protocol == "UDP" && p.port == 5353));
    }

    #[test]
    fn parses_listening_ports_from_linux_output() {
        let sample = r#"
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp6       0      0 :::3000                 :::*                    LISTEN
udp        0      0 0.0.0.0:68              0.0.0.0:*
"#;
        let ports = parse_netstat_text(sample);
        assert!(ports.iter().any(|p| p.protocol == "tcp" && p.port == 22));
        assert!(ports.iter().any(|p| p.protocol == "tcp6" && p.port == 3000));
        assert!(ports.iter().any(|p| p.protocol == "udp" && p.port == 68));
    }
}
