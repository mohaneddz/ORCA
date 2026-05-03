use crate::models::antivirus::AntivirusStatus;
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

pub fn detect_antivirus() -> AppResult<AntivirusStatus> {
    #[cfg(target_os = "windows")]
    {
        return detect_antivirus_windows();
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        return detect_antivirus_unix();
    }

    #[allow(unreachable_code)]
    Ok(AntivirusStatus {
        av_detected: false,
        product_name: None,
        enabled_status: None,
        signature_up_to_date: None,
        supported: false,
        status_text: "unsupported platform".to_string(),
    })
}

#[cfg(target_os = "windows")]
fn detect_antivirus_windows() -> AppResult<AntivirusStatus> {
    let script = r#"
$av = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue | Select-Object -First 1 displayName
if ($av) { $av.displayName } else { '' }
"#;
    let name = run_command("powershell", &["-NoProfile", "-Command", script]).unwrap_or_default();

    let defender = run_command(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "(Get-MpComputerStatus).AntivirusEnabled",
        ],
    )
    .ok();

    let enabled = defender.as_deref().and_then(parse_bool_from_powershell);
    let signature_outdated = run_command(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "(Get-MpComputerStatus).AntivirusSignatureOutOfDate",
        ],
    )
    .ok()
    .as_deref()
    .and_then(parse_bool_from_powershell);
    let signature_up_to_date = signature_outdated.map(|is_outdated| !is_outdated);

    Ok(AntivirusStatus {
        av_detected: !name.trim().is_empty(),
        product_name: if name.trim().is_empty() {
            None
        } else {
            Some(name.trim().to_string())
        },
        enabled_status: enabled,
        signature_up_to_date,
        supported: true,
        status_text: "securitycenter2/defender detection".to_string(),
    })
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn detect_antivirus_unix() -> AppResult<AntivirusStatus> {
    let output = run_command("sh", &["-c", "ps -A -o comm"])?;
    let av_names = [
        "clamd",
        "freshclam",
        "symantec",
        "sophos",
        "crowdstrike",
        "falcon-sensor",
    ];
    let mut detected: Option<String> = None;

    for line in output.lines() {
        let lowered = line.to_lowercase();
        if let Some(name) = av_names.iter().find(|name| lowered.contains(**name)) {
            detected = Some((*name).to_string());
            break;
        }
    }

    Ok(AntivirusStatus {
        av_detected: detected.is_some(),
        product_name: detected,
        enabled_status: None,
        signature_up_to_date: None,
        supported: true,
        status_text: "known AV process-name heuristic".to_string(),
    })
}

#[cfg(target_os = "windows")]
fn parse_bool_from_powershell(value: &str) -> Option<bool> {
    match value.trim().to_lowercase().as_str() {
        "true" => Some(true),
        "false" => Some(false),
        _ => None,
    }
}
