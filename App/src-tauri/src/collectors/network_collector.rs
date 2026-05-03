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
    let active_connections = collect_active_connections();
    let (default_gateway, dns_servers) = collect_gateway_and_dns();

    Ok(NetworkInfo {
        interfaces,
        listening_ports,
        active_connections,
        default_gateway,
        dns_servers,
        notes: vec![],
    })
}

// ── Listening ports ───────────────────────────────────────────────────────────

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

// ── Active connections ────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn collect_active_connections() -> Vec<ActiveConnection> {
    let Ok(output) = Command::new("netstat").args(["-ano"]).output() else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let mut connections = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let lower = trimmed.to_lowercase();
        // Skip headers and listening/time_wait lines; capture ESTABLISHED and CLOSE_WAIT
        if lower.contains("listening") || lower.starts_with("proto") || lower.starts_with("active") {
            continue;
        }
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }
        let proto = parts[0].to_uppercase();
        if proto != "TCP" && proto != "UDP" {
            continue;
        }
        let state = if parts.len() >= 4 && proto == "TCP" {
            Some(parts[3].to_string())
        } else {
            None
        };
        connections.push(ActiveConnection {
            local_address: Some(parts[1].to_string()),
            remote_address: Some(parts[2].to_string()),
            protocol: Some(proto),
            state,
        });
    }
    connections.truncate(100);
    connections
}

#[cfg(not(target_os = "windows"))]
fn collect_active_connections() -> Vec<ActiveConnection> {
    Vec::new()
}

// ── Default gateway & DNS ─────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn collect_gateway_and_dns() -> (Option<String>, Vec<String>) {
    let Ok(output) = Command::new("ipconfig").arg("/all").output() else {
        return (None, Vec::new());
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let mut gateway: Option<String> = None;
    let mut dns_servers: Vec<String> = Vec::new();

    for line in text.lines() {
        let lower = line.to_lowercase();
        if lower.contains("default gateway") {
            if gateway.is_none() {
                if let Some(ip) = extract_ip_value(line) {
                    gateway = Some(ip);
                }
            }
        } else if lower.contains("dns servers") {
            if let Some(ip) = extract_ip_value(line) {
                if !dns_servers.contains(&ip) {
                    dns_servers.push(ip);
                }
            }
        } else if dns_servers.len() > 0 && line.starts_with("   ") && !lower.contains(":") {
            // Continuation lines for DNS servers (subsequent entries have no label)
            let candidate = line.trim().to_string();
            if candidate.contains('.') && candidate.chars().next().map_or(false, |c| c.is_ascii_digit()) {
                if !dns_servers.contains(&candidate) {
                    dns_servers.push(candidate);
                }
            }
        }
    }
    (gateway, dns_servers)
}

#[cfg(not(target_os = "windows"))]
fn collect_gateway_and_dns() -> (Option<String>, Vec<String>) {
    (None, Vec::new())
}

fn extract_ip_value(line: &str) -> Option<String> {
    let after_colon = line.split(':').last()?;
    let candidate = after_colon.trim().to_string();
    // Remove zone ID suffix (e.g., %12)
    let clean = candidate.split('%').next()?.trim().to_string();
    if clean.is_empty() {
        return None;
    }
    // Must look like an IP (contains digits and dots or colons for IPv6)
    if clean.chars().any(|c| c.is_ascii_digit()) && (clean.contains('.') || clean.contains(':')) {
        Some(clean)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::{collect_network_info, parse_netstat_text};

    #[test]
    fn collects_network_info_shape() {
        let network = collect_network_info().expect("network info should collect");
        // notes is now empty for real implementations; just check it returns
        let _ = network;
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
