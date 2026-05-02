use std::collections::HashMap;

use crate::models::ports::{LocalOpenPort, LocalPortsReport, PortRiskLevel};
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

pub fn scan_local_open_ports() -> AppResult<LocalPortsReport> {
    let output = if cfg!(target_os = "windows") {
        run_command("netstat", &["-ano"]).unwrap_or_default()
    } else {
        run_command("sh", &["-c", "netstat -anp 2>/dev/null || netstat -an"]).unwrap_or_default()
    };

    let mut ports_map: HashMap<(String, u16), LocalOpenPort> = HashMap::new();
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let lowered = trimmed.to_lowercase();
        if !(lowered.contains("listen") || lowered.starts_with("udp")) {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let protocol = parts[0].to_string();
        let Some(port) = extract_port(parts[1]) else {
            continue;
        };

        let owning_process = parts.last().map(|s| s.to_string());
        let risk_level = classify_port_risk(port);

        ports_map.insert(
            (protocol.clone(), port),
            LocalOpenPort {
                port,
                protocol,
                owning_process,
                risk_level,
            },
        );
    }

    let mut ports: Vec<LocalOpenPort> = ports_map.into_values().collect();
    ports.sort_by_key(|p| p.port);

    Ok(LocalPortsReport {
        host: "localhost".to_string(),
        ports,
        supported: true,
        notes: vec!["Localhost-only listening port scan.".to_string()],
    })
}

pub fn classify_port_risk(port: u16) -> PortRiskLevel {
    match port {
        21 | 23 | 445 | 3389 | 5900 => PortRiskLevel::High,
        22 | 25 | 110 | 143 => PortRiskLevel::Medium,
        _ => PortRiskLevel::Low,
    }
}

fn extract_port(address: &str) -> Option<u16> {
    let normalized = address
        .trim_matches(|c| c == '[' || c == ']')
        .trim_end_matches(":*")
        .trim_end_matches('*');
    let (_, port) = normalized.rsplit_once(':')?;
    port.parse::<u16>().ok()
}

#[cfg(test)]
mod tests {
    use crate::models::ports::PortRiskLevel;

    use super::classify_port_risk;

    #[test]
    fn classifies_risky_ports() {
        assert_eq!(classify_port_risk(21), PortRiskLevel::High);
        assert_eq!(classify_port_risk(3389), PortRiskLevel::High);
        assert_eq!(classify_port_risk(22), PortRiskLevel::Medium);
        assert_eq!(classify_port_risk(8080), PortRiskLevel::Low);
    }
}
