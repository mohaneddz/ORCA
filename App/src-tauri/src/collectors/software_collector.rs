use std::process::Command;

use crate::models::software::{InstalledSoftware, SoftwareInventory};
use crate::utils::errors::AppResult;

pub fn collect_software_inventory() -> AppResult<SoftwareInventory> {
    #[cfg(target_os = "windows")]
    {
        return collect_software_windows();
    }

    #[cfg(target_os = "linux")]
    {
        Ok(SoftwareInventory {
            software: Vec::new(),
            notes: vec![
                "Linux software inventory placeholder. Integrate dpkg/rpm parsing as needed."
                    .to_string(),
            ],
        })
    }

    #[cfg(target_os = "macos")]
    {
        Ok(SoftwareInventory {
            software: Vec::new(),
            notes: vec!["macOS software inventory placeholder. Integrate system_profiler parsing as needed.".to_string()],
        })
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        Ok(SoftwareInventory {
            software: Vec::new(),
            notes: vec!["Unsupported platform for software inventory.".to_string()],
        })
    }
}

#[cfg(target_os = "windows")]
fn collect_software_windows() -> AppResult<SoftwareInventory> {
    let script = "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object -First 100 DisplayName,DisplayVersion,Publisher";
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output();

    let Ok(output) = output else {
        return Ok(SoftwareInventory {
            software: Vec::new(),
            notes: vec!["Unable to query Windows uninstall registry entries.".to_string()],
        });
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut software = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("DisplayName") || trimmed.starts_with("---") {
            continue;
        }

        software.push(InstalledSoftware {
            name: trimmed.to_string(),
            version: None,
            vendor: None,
            install_location: None,
            source: Some("registry".to_string()),
        });
    }

    Ok(SoftwareInventory {
        software,
        notes: vec![
            "Windows software parsing is simplified and should be refined for production."
                .to_string(),
        ],
    })
}
