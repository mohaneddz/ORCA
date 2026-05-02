use chrono::{DateTime, Duration, Utc};

use crate::models::patch::PatchStatus;
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

const STALE_DAYS: i64 = 30;

pub fn collect_patch_status() -> AppResult<PatchStatus> {
    #[cfg(target_os = "windows")]
    {
        return collect_windows_patch_status();
    }

    #[cfg(target_os = "macos")]
    {
        return collect_macos_patch_status();
    }

    #[cfg(target_os = "linux")]
    {
        return collect_linux_patch_status();
    }

    #[allow(unreachable_code)]
    Ok(PatchStatus {
        last_updated: None,
        is_current: false,
        days_since_update: None,
        stale_threshold_days: STALE_DAYS,
        supported: false,
        status_text: "unsupported platform".to_string(),
    })
}

#[cfg(target_os = "windows")]
fn collect_windows_patch_status() -> AppResult<PatchStatus> {
    let output = run_command(
        "powershell",
        &[
            "-NoProfile",
            "-Command",
            "(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1 -ExpandProperty InstalledOn).ToString('o')",
        ],
    );

    let last = output.ok().and_then(|raw| {
        raw.lines()
            .find(|v| !v.trim().is_empty())
            .map(|v| v.trim().to_string())
    });
    Ok(build_patch_status(last, true, "windows update history"))
}

#[cfg(target_os = "macos")]
fn collect_macos_patch_status() -> AppResult<PatchStatus> {
    let output = run_command("softwareupdate", &["--list"])?;
    let current = output.to_lowercase().contains("no new software available");
    Ok(PatchStatus {
        last_updated: None,
        is_current: current,
        days_since_update: None,
        stale_threshold_days: STALE_DAYS,
        supported: true,
        status_text: "softwareupdate listing used".to_string(),
    })
}

#[cfg(target_os = "linux")]
fn collect_linux_patch_status() -> AppResult<PatchStatus> {
    let path = std::path::Path::new("/var/lib/apt/periodic/update-success-stamp");
    if let Ok(metadata) = std::fs::metadata(path) {
        if let Ok(modified) = metadata.modified() {
            let dt: DateTime<Utc> = modified.into();
            return Ok(build_patch_status(
                Some(dt.to_rfc3339()),
                true,
                "apt metadata",
            ));
        }
    }

    Ok(PatchStatus {
        last_updated: None,
        is_current: false,
        days_since_update: None,
        stale_threshold_days: STALE_DAYS,
        supported: true,
        status_text: "package manager metadata unavailable".to_string(),
    })
}

fn build_patch_status(
    last_updated: Option<String>,
    supported: bool,
    status_text: &str,
) -> PatchStatus {
    let days = last_updated
        .as_ref()
        .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
        .map(|dt| (Utc::now() - dt.with_timezone(&Utc)).num_days());

    let is_current = days.map(|d| d <= STALE_DAYS).unwrap_or(false);

    PatchStatus {
        last_updated,
        is_current,
        days_since_update: days,
        stale_threshold_days: STALE_DAYS,
        supported,
        status_text: status_text.to_string(),
    }
}

pub fn is_patch_stale(last_update: DateTime<Utc>, threshold_days: i64) -> bool {
    Utc::now().signed_duration_since(last_update) > Duration::days(threshold_days)
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, Utc};

    use super::is_patch_stale;

    #[test]
    fn patch_stale_calculation() {
        let old = Utc::now() - Duration::days(45);
        let fresh = Utc::now() - Duration::days(5);

        assert!(is_patch_stale(old, 30));
        assert!(!is_patch_stale(fresh, 30));
    }
}
