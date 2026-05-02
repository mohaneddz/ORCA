use crate::models::security::{AntivirusInfo, FirewallStatus, SecurityPosture};
use crate::utils::errors::AppResult;

pub fn collect_security_posture() -> AppResult<SecurityPosture> {
    let antivirus = collect_antivirus_info();
    let mut notes = Vec::new();
    notes.push("Disk encryption, update status, and remote exposure are placeholders unless integrated with OS-native APIs.".to_string());

    Ok(SecurityPosture {
        firewall_status: FirewallStatus::Unknown,
        antivirus,
        disk_encryption_enabled: None,
        os_updates_current: None,
        remote_access_exposure: None,
        notes,
    })
}

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
