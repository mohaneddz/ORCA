use crate::models::wifi::{WifiHistoryReport, WifiProfile};
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

pub fn collect_wifi_history() -> AppResult<WifiHistoryReport> {
    #[cfg(target_os = "windows")]
    {
        return collect_wifi_windows();
    }

    #[cfg(target_os = "macos")]
    {
        return collect_wifi_macos();
    }

    #[cfg(target_os = "linux")]
    {
        return collect_wifi_linux();
    }

    #[allow(unreachable_code)]
    Ok(WifiHistoryReport {
        profiles: Vec::new(),
        supported: false,
        notes: vec!["Unsupported platform for WiFi history.".to_string()],
    })
}

#[cfg(target_os = "windows")]
fn collect_wifi_windows() -> AppResult<WifiHistoryReport> {
    let profiles_output = run_command("netsh", &["wlan", "show", "profiles"])?;
    let mut profiles = Vec::new();

    for line in profiles_output.lines() {
        if !line.contains(":") || !line.to_lowercase().contains("all user profile") {
            continue;
        }
        let ssid = line
            .split(':')
            .nth(1)
            .map(|v| v.trim().to_string())
            .unwrap_or_default();
        if ssid.is_empty() {
            continue;
        }

        let details = run_command(
            "netsh",
            &["wlan", "show", "profile", &format!("name={ssid}")],
        )
        .unwrap_or_default();
        let security = parse_windows_security(&details);
        let is_open_network = security
            .as_deref()
            .map(is_open_wifi_security)
            .unwrap_or(false);

        profiles.push(WifiProfile {
            ssid,
            security_type: security,
            is_open_network,
            last_connected: None,
        });
    }

    Ok(WifiHistoryReport {
        profiles,
        supported: true,
        notes: vec!["WiFi profile metadata only, no passwords collected.".to_string()],
    })
}

#[cfg(target_os = "macos")]
fn collect_wifi_macos() -> AppResult<WifiHistoryReport> {
    let output =
        run_command("networksetup", &["-listpreferredwirelessnetworks", "en0"]).unwrap_or_default();

    let profiles = output
        .lines()
        .skip(1)
        .filter_map(|line| {
            let ssid = line.trim();
            if ssid.is_empty() {
                return None;
            }
            Some(WifiProfile {
                ssid: ssid.to_string(),
                security_type: None,
                is_open_network: false,
                last_connected: None,
            })
        })
        .collect();

    Ok(WifiHistoryReport {
        profiles,
        supported: true,
        notes: vec!["WiFi profile metadata only, no passwords collected.".to_string()],
    })
}

#[cfg(target_os = "linux")]
fn collect_wifi_linux() -> AppResult<WifiHistoryReport> {
    let mut profiles = Vec::new();
    if let Ok(entries) = std::fs::read_dir("/etc/NetworkManager/system-connections") {
        for entry in entries.flatten().take(100) {
            let path = entry.path();
            if let Ok(content) = std::fs::read_to_string(&path) {
                let ssid = extract_value(&content, "ssid=").unwrap_or_else(|| {
                    path.file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| "unknown".to_string())
                });
                let security = extract_value(&content, "key-mgmt=");
                let is_open_network = security
                    .as_deref()
                    .map(is_open_wifi_security)
                    .unwrap_or(true);
                profiles.push(WifiProfile {
                    ssid,
                    security_type: security,
                    is_open_network,
                    last_connected: None,
                });
            }
        }
    }

    Ok(WifiHistoryReport {
        profiles,
        supported: true,
        notes: vec!["WiFi profile metadata only, no passwords collected.".to_string()],
    })
}

#[cfg(target_os = "linux")]
fn extract_value(content: &str, key: &str) -> Option<String> {
    content
        .lines()
        .find_map(|line| line.trim().strip_prefix(key).map(|v| v.trim().to_string()))
}

fn parse_windows_security(details: &str) -> Option<String> {
    for line in details.lines() {
        let trimmed = line.trim();
        if trimmed.to_lowercase().starts_with("authentication") {
            return trimmed.split(':').nth(1).map(|v| v.trim().to_string());
        }
    }
    None
}

pub fn is_open_wifi_security(security: &str) -> bool {
    let lowered = security.to_lowercase();
    lowered.contains("open") || lowered.contains("none")
}

#[cfg(test)]
mod tests {
    use super::is_open_wifi_security;

    #[test]
    fn classifies_open_network() {
        assert!(is_open_wifi_security("Open"));
        assert!(is_open_wifi_security("none"));
        assert!(!is_open_wifi_security("WPA2-Personal"));
    }
}
