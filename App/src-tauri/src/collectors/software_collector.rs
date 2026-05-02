use crate::models::software::{InstalledSoftware, SoftwareInventory};
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

const VULNERABLE_HINTS: [&str; 4] = ["java 8", "flash", "telnet", "openssl 1.0"];

pub fn collect_installed_software() -> AppResult<SoftwareInventory> {
    collect_software_inventory()
}

pub fn collect_software_inventory() -> AppResult<SoftwareInventory> {
    #[cfg(target_os = "windows")]
    {
        return collect_software_windows();
    }

    #[cfg(target_os = "linux")]
    {
        return collect_software_linux();
    }

    #[cfg(target_os = "macos")]
    {
        return collect_software_macos();
    }

    #[allow(unreachable_code)]
    Ok(SoftwareInventory {
        software: Vec::new(),
        notes: vec!["Unsupported platform for software inventory.".to_string()],
    })
}

#[cfg(target_os = "windows")]
fn collect_software_windows() -> AppResult<SoftwareInventory> {
    let script = r#"
$apps = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
Select-Object DisplayName,DisplayVersion,Publisher,InstallLocation
$apps | ConvertTo-Json -Compress
"#;
    let output = run_command("powershell", &["-NoProfile", "-Command", script]);

    let Ok(text) = output else {
        return Ok(SoftwareInventory {
            software: Vec::new(),
            notes: vec!["Unable to query Windows uninstall registry entries.".to_string()],
        });
    };

    parse_windows_json(&text)
}

#[cfg(target_os = "windows")]
fn parse_windows_json(text: &str) -> AppResult<SoftwareInventory> {
    let parsed: serde_json::Value = serde_json::from_str(text).unwrap_or(serde_json::Value::Null);
    let mut software = Vec::new();

    let rows = match parsed {
        serde_json::Value::Array(rows) => rows,
        serde_json::Value::Object(_) => vec![parsed],
        _ => Vec::new(),
    };

    for row in rows {
        let name = row
            .get("DisplayName")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }
        let lowered = name.to_lowercase();
        let risk = VULNERABLE_HINTS
            .iter()
            .find(|hint| lowered.contains(**hint))
            .map(|hint| format!("vulnerable_hint:{}", hint));

        software.push(InstalledSoftware {
            name,
            version: row
                .get("DisplayVersion")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            vendor: row
                .get("Publisher")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            install_location: row
                .get("InstallLocation")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .filter(|s| !s.trim().is_empty()),
            source: Some("registry".to_string()),
            risk_flag: risk,
        });
    }

    Ok(SoftwareInventory {
        software,
        notes: vec!["Windows software inventory via uninstall registry keys.".to_string()],
    })
}

#[cfg(target_os = "linux")]
fn collect_software_linux() -> AppResult<SoftwareInventory> {
    let mut software = Vec::new();

    if let Ok(output) = run_command(
        "sh",
        &[
            "-c",
            "dpkg-query -W -f='${Package}\t${Version}\n' 2>/dev/null | head -n 200",
        ],
    ) {
        for line in output.lines() {
            let mut parts = line.split('\t');
            let name = parts.next().unwrap_or("").trim();
            if name.is_empty() {
                continue;
            }
            let version = parts.next().map(|v| v.trim().to_string());
            software.push(InstalledSoftware {
                name: name.to_string(),
                version,
                vendor: None,
                install_location: None,
                source: Some("dpkg".to_string()),
                risk_flag: None,
            });
        }
    } else if let Ok(output) = run_command("sh", &["-c", "rpm -qa | head -n 200"]) {
        for line in output.lines() {
            let name = line.trim();
            if name.is_empty() {
                continue;
            }
            software.push(InstalledSoftware {
                name: name.to_string(),
                version: None,
                vendor: None,
                install_location: None,
                source: Some("rpm".to_string()),
                risk_flag: None,
            });
        }
    }

    Ok(SoftwareInventory {
        software,
        notes: vec!["Linux software inventory via dpkg/rpm.".to_string()],
    })
}

#[cfg(target_os = "macos")]
fn collect_software_macos() -> AppResult<SoftwareInventory> {
    let mut software = Vec::new();
    if let Ok(entries) = std::fs::read_dir("/Applications") {
        for entry in entries.flatten().take(200) {
            let path = entry.path();
            let Some(name) = path.file_name().map(|n| n.to_string_lossy().to_string()) else {
                continue;
            };
            software.push(InstalledSoftware {
                name,
                version: None,
                vendor: None,
                install_location: Some(path.to_string_lossy().to_string()),
                source: Some("applications_dir".to_string()),
                risk_flag: None,
            });
        }
    }

    Ok(SoftwareInventory {
        software,
        notes: vec!["macOS software inventory via /Applications.".to_string()],
    })
}

#[cfg(test)]
mod tests {
    use super::collect_software_inventory;

    #[test]
    fn collects_software_inventory_shape() {
        let inventory = collect_software_inventory().expect("software inventory should collect");
        assert!(!inventory.notes.is_empty());
    }
}
