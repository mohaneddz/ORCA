use crate::models::network::ListeningPort;
use crate::models::posture::PostureReport;
use crate::models::risk::RiskScore;
use crate::models::security::FirewallStatus;

pub fn calculate_risk_score_internal(report: &PostureReport) -> RiskScore {
    let mut score: i32 = 0;
    let mut signals = Vec::new();

    match report.security.as_ref() {
        Some(security) => {
            if security.antivirus.is_empty()
                || security.antivirus.iter().all(|av| av.enabled != Some(true))
            {
                score += 25;
                signals.push("No enabled antivirus signal found".to_string());
            }

            match security.firewall_status {
                FirewallStatus::Disabled => {
                    score += 25;
                    signals.push("Firewall appears disabled".to_string());
                }
                FirewallStatus::Unknown => {
                    score += 10;
                    signals.push("Firewall status unknown".to_string());
                }
                FirewallStatus::Enabled => {}
            }

            if security.os_updates_current.is_none() {
                score += 10;
                signals.push("OS update status unknown".to_string());
            }
        }
        None => {
            score += 30;
            signals.push("Security posture was not collected".to_string());
        }
    }

    if report.user.local_admins.len() > 3 {
        score += 15;
        signals.push("High number of local admin users".to_string());
    }

    if let Some(network) = report.network.as_ref() {
        let risky_ports = network
            .listening_ports
            .iter()
            .filter(|port| is_risky_port(port))
            .count();

        if risky_ports > 0 {
            score += 10;
            signals.push(format!("{} potentially risky listening ports", risky_ports));
        }
    }

    let suspicious_processes = report
        .processes
        .iter()
        .filter(|proc_| {
            proc_
                .executable_path
                .as_deref()
                .map(is_suspicious_path)
                .unwrap_or(false)
        })
        .count();

    if suspicious_processes > 0 {
        score += 10;
        signals.push(format!(
            "{} process(es) running from Downloads/Temp/AppData",
            suspicious_processes
        ));
    }

    if report.software.is_none() {
        score += 5;
        signals.push("Software inventory unavailable".to_string());
    }

    let bounded = score.clamp(0, 100) as u8;

    RiskScore {
        score: bounded,
        level: risk_level(bounded).to_string(),
        signals,
    }
}

fn is_suspicious_path(path: &str) -> bool {
    let lowered = path.to_lowercase();
    lowered.contains("\\downloads")
        || lowered.contains("/downloads")
        || lowered.contains("\\temp")
        || lowered.contains("/tmp")
        || lowered.contains("\\appdata")
        || lowered.contains("/appdata")
}

fn is_risky_port(port: &ListeningPort) -> bool {
    matches!(port.port, 21 | 23 | 3389 | 5900)
}

fn risk_level(score: u8) -> &'static str {
    match score {
        0..=24 => "low",
        25..=59 => "medium",
        _ => "high",
    }
}

#[cfg(test)]
mod tests {
    use crate::models::device::{DeviceInfo, HardwareInfo};
    use crate::models::network::{NetworkInfo, NetworkInterfaceInfo};
    use crate::models::posture::PostureReport;
    use crate::models::process::ProcessInfo;
    use crate::models::security::{AntivirusInfo, FirewallStatus, SecurityPosture};
    use crate::models::software::SoftwareInventory;
    use crate::models::user::UserPosture;

    use super::calculate_risk_score_internal;

    fn base_report() -> PostureReport {
        PostureReport {
            collected_at_utc: "2026-01-01T00:00:00Z".to_string(),
            device: DeviceInfo {
                hostname: Some("host".to_string()),
                os_name: Some("os".to_string()),
                os_version: Some("1".to_string()),
                kernel_version: Some("k".to_string()),
                architecture: "x86_64".to_string(),
                uptime_seconds: Some(10),
                boot_time_epoch: Some(1),
                hardware: HardwareInfo {
                    architecture: "x86_64".to_string(),
                    cpu_cores: 8,
                    total_memory_mb: 8192,
                },
            },
            user: UserPosture {
                current_user: "User".to_string(),
                username: "user".to_string(),
                is_admin_estimate: Some(false),
                local_users: Vec::new(),
                local_admins: Vec::new(),
            },
            security: Some(SecurityPosture {
                firewall_status: FirewallStatus::Enabled,
                antivirus: vec![AntivirusInfo {
                    name: "Defender".to_string(),
                    enabled: Some(true),
                    up_to_date: Some(true),
                }],
                disk_encryption_enabled: Some(true),
                os_updates_current: Some(true),
                remote_access_exposure: None,
                notes: Vec::new(),
            }),
            processes: Vec::new(),
            network: Some(NetworkInfo {
                interfaces: vec![NetworkInterfaceInfo {
                    name: "eth0".to_string(),
                    received_bytes: 0,
                    transmitted_bytes: 0,
                }],
                listening_ports: Vec::new(),
                active_connections: Vec::new(),
                default_gateway: None,
                dns_servers: Vec::new(),
                notes: Vec::new(),
            }),
            software: Some(SoftwareInventory {
                software: Vec::new(),
                notes: Vec::new(),
            }),
            filesystem: None,
            event_logs: None,
            browser: None,
            usb: None,
            risk: None,
        }
    }

    #[test]
    fn low_risk_baseline_scores_low() {
        let report = base_report();
        let risk = calculate_risk_score_internal(&report);
        assert!(risk.score <= 24, "expected low score, got {}", risk.score);
    }

    #[test]
    fn missing_security_increases_risk() {
        let mut report = base_report();
        report.security = None;
        let risk = calculate_risk_score_internal(&report);
        assert!(risk.score >= 30);
    }

    #[test]
    fn suspicious_process_paths_increase_risk() {
        let mut report = base_report();
        report.processes.push(ProcessInfo {
            pid: 1,
            parent_pid: None,
            name: "bad.exe".to_string(),
            executable_path: Some("C:\\Users\\x\\Downloads\\bad.exe".to_string()),
            cpu_usage_percent: 0.0,
            memory_bytes: 10,
            command_line: None,
        });

        let risk = calculate_risk_score_internal(&report);
        assert!(risk
            .signals
            .iter()
            .any(|s| s.contains("Downloads/Temp/AppData")));
    }
}
