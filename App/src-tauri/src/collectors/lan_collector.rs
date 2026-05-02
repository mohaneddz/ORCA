use std::collections::HashSet;

use crate::models::lan::{LanDevice, LanScanReport};
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;
use crate::utils::oui_lookup::lookup_oui_vendor;
use crate::utils::parsing::parse_first_ipv4;

pub fn scan_local_network_arp() -> AppResult<LanScanReport> {
    let local_ip = local_ipv4();
    let subnet_prefix = local_ip.as_deref().and_then(subnet_24);
    let subnet = subnet_prefix.as_ref().map(|s| format!("{s}.0/24"));

    if let Some(prefix) = subnet_prefix.as_deref() {
        let _ = run_command("ping", &ping_sweep_args(prefix));
    }

    let arp_output = run_command("arp", &["-a"]).unwrap_or_default();
    let mut seen = HashSet::new();
    let mut devices = Vec::new();

    for line in arp_output.lines() {
        let ip = parse_first_ipv4(line);
        let Some(ip) = ip else {
            continue;
        };
        if let Some(prefix) = subnet_prefix.as_deref() {
            if !ip.starts_with(&(prefix.to_string() + ".")) {
                continue;
            }
        }

        let mac = extract_mac(line);
        if !seen.insert(ip.clone()) {
            continue;
        }

        let vendor = mac.as_deref().and_then(lookup_oui_vendor);
        let device_type = vendor.as_deref().map(infer_device_type);

        devices.push(LanDevice {
            ip,
            mac,
            vendor,
            device_type,
        });
    }

    Ok(LanScanReport {
        subnet,
        devices,
        supported: true,
        notes: vec!["Safe LAN discovery uses ping and arp metadata only.".to_string()],
    })
}

fn local_ipv4() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let output = run_command("ipconfig", &[]).ok()?;
        for line in output.lines() {
            if line.contains("IPv4") {
                if let Some(ip) = parse_first_ipv4(line) {
                    return Some(ip);
                }
            }
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let output = run_command("sh", &["-c", "hostname -I 2>/dev/null || ifconfig"]).ok()?;
        for token in output.split_whitespace() {
            if crate::utils::parsing::is_ipv4(token) && !token.starts_with("127.") {
                return Some(token.to_string());
            }
        }
    }

    None
}

fn subnet_24(ip: &str) -> Option<String> {
    let mut parts = ip.split('.');
    let a = parts.next()?;
    let b = parts.next()?;
    let c = parts.next()?;
    Some(format!("{a}.{b}.{c}"))
}

fn ping_sweep_args(prefix: &str) -> Vec<&str> {
    #[cfg(target_os = "windows")]
    {
        for host in 1..=16 {
            let target = format!("{prefix}.{host}");
            let _ = run_command("ping", &["-n", "1", "-w", "100", target.as_str()]);
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        for host in 1..=16 {
            let target = format!("{prefix}.{host}");
            let _ = run_command("ping", &["-c", "1", "-W", "1", target.as_str()]);
        }
    }

    vec!["127.0.0.1"]
}

fn extract_mac(line: &str) -> Option<String> {
    for token in line.split_whitespace() {
        let normalized = token.replace('-', ":");
        let parts: Vec<&str> = normalized.split(':').collect();
        if parts.len() == 6
            && parts
                .iter()
                .all(|p| p.len() == 2 && u8::from_str_radix(p, 16).is_ok())
        {
            return Some(normalized.to_uppercase());
        }
    }
    None
}

fn infer_device_type(vendor: &str) -> String {
    let lowered = vendor.to_lowercase();
    if lowered.contains("apple") || lowered.contains("samsung") {
        "mobile_or_laptop".to_string()
    } else if lowered.contains("cisco") || lowered.contains("vmware") {
        "infrastructure".to_string()
    } else {
        "unknown".to_string()
    }
}
