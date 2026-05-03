use crate::models::security::{AntivirusInfo, FirewallStatus, SecurityPosture};
use crate::utils::errors::AppResult;

pub fn collect_security_posture() -> AppResult<SecurityPosture> {
    let antivirus = collect_antivirus_info();

    Ok(SecurityPosture {
        firewall_status: check_firewall_status(),
        antivirus,
        disk_encryption_enabled: check_disk_encryption(),
        os_updates_current: check_os_updates(),
        remote_access_exposure: check_remote_access(),
        notes: vec![],
    })
}

// ── Firewall ─────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn check_firewall_status() -> FirewallStatus {
    use std::process::Command;
    let script = "Get-NetFirewallProfile | Select-Object -ExpandProperty Enabled";
    let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
    else {
        return FirewallStatus::Unknown;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let disabled = text.lines().any(|l| l.trim().eq_ignore_ascii_case("False"));
    let any_enabled = text.lines().any(|l| l.trim().eq_ignore_ascii_case("True"));
    if disabled {
        FirewallStatus::Disabled
    } else if any_enabled {
        FirewallStatus::Enabled
    } else {
        FirewallStatus::Unknown
    }
}

#[cfg(not(target_os = "windows"))]
fn check_firewall_status() -> FirewallStatus {
    FirewallStatus::Unknown
}

// ── Disk encryption ───────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn check_disk_encryption() -> Option<bool> {
    use std::process::Command;
    let output = Command::new("cipher").args(["/status", "C:"]).output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout).to_lowercase();
    if text.contains("protection status") {
        // BitLocker protection status lines
        if text.contains("protection on") {
            Some(true)
        } else if text.contains("protection off") {
            Some(false)
        } else {
            None
        }
    } else if text.contains("protected") {
        Some(true)
    } else if text.contains("not encrypted") || text.contains("unprotected") {
        Some(false)
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
fn check_disk_encryption() -> Option<bool> {
    None
}

// ── OS updates ────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn check_os_updates() -> Option<bool> {
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    let script =
        "(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1 -ExpandProperty InstalledOn).ToString('yyyy-MM-dd')";
    let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
    else {
        return None;
    };
    let date_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if date_str.len() < 10 {
        return None;
    }
    let parts: Vec<&str> = date_str[..10].split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let year: i64 = parts[0].parse().ok()?;
    let month: i64 = parts[1].parse().ok()?;
    let day: i64 = parts[2].parse().ok()?;
    let now_days = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_secs() as i64
        / 86400;
    // Rough days-since-epoch for the patch date
    let base_year_days = (year - 1970) * 365 + (year - 1970) / 4;
    let month_days: i64 = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
        .get(month as usize - 1)
        .copied()
        .unwrap_or(0);
    let patch_days = base_year_days + month_days + day;
    Some((now_days - patch_days) < 90)
}

#[cfg(not(target_os = "windows"))]
fn check_os_updates() -> Option<bool> {
    None
}

// ── Remote access ─────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn check_remote_access() -> Option<String> {
    use std::process::Command;
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\System\CurrentControlSet\Control\Terminal Server",
            "/v",
            "fDenyTSConnections",
        ])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout).to_lowercase();
    // fDenyTSConnections = 0x0 means RDP is enabled (not denied)
    if text.contains("0x0") {
        Some("RDP enabled (port 3389 open)".to_string())
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
fn check_remote_access() -> Option<String> {
    None
}

// ── Antivirus ─────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn collect_antivirus_info() -> Vec<AntivirusInfo> {
    use std::process::Command;

    let script = "Get-MpComputerStatus | Select-Object -Property AMServiceEnabled,AntivirusEnabled,AntivirusSignatureLastUpdated";
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output();

    if let Ok(output) = output {
        let text = String::from_utf8_lossy(&output.stdout).to_lowercase();
        let enabled = if text.contains("antivirusenabled : true") {
            Some(true)
        } else if text.contains("antivirusenabled : false") {
            Some(false)
        } else {
            None
        };

        return vec![AntivirusInfo {
            name: "Microsoft Defender".to_string(),
            enabled,
            up_to_date: None,
        }];
    }

    vec![AntivirusInfo {
        name: "Microsoft Defender".to_string(),
        enabled: None,
        up_to_date: None,
    }]
}

#[cfg(not(target_os = "windows"))]
fn collect_antivirus_info() -> Vec<AntivirusInfo> {
    vec![AntivirusInfo {
        name: "Unknown".to_string(),
        enabled: None,
        up_to_date: None,
    }]
}

#[cfg(test)]
mod tests {
    use super::collect_security_posture;
    use crate::models::security::FirewallStatus;

    #[test]
    fn collects_security_posture_shape() {
        let security = collect_security_posture().expect("security posture should collect");
        assert!(!security.antivirus.is_empty());
        assert!(matches!(
            security.firewall_status,
            FirewallStatus::Enabled | FirewallStatus::Disabled | FirewallStatus::Unknown
        ));
    }
}
