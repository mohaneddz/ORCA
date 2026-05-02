use std::fs;
use std::path::PathBuf;

use crate::models::filesystem::{FilesystemEvent, FilesystemMonitoringReport};
use crate::utils::errors::AppResult;
use crate::utils::time::now_utc_rfc3339;

pub fn collect_downloads_metadata(enabled: bool) -> AppResult<FilesystemMonitoringReport> {
    if !enabled {
        return Ok(FilesystemMonitoringReport {
            enabled: false,
            watched_path: None,
            events: Vec::new(),
            notes: vec!["Filesystem monitoring is disabled by config.".to_string()],
        });
    }

    let Some(downloads) = downloads_dir() else {
        return Ok(FilesystemMonitoringReport {
            enabled: true,
            watched_path: None,
            events: Vec::new(),
            notes: vec!["Downloads path not found on this platform.".to_string()],
        });
    };

    let mut events = Vec::new();
    if let Ok(entries) = fs::read_dir(&downloads) {
        for entry in entries.flatten().take(200) {
            let path = entry.path();
            let metadata = entry.metadata().ok();
            let file_name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string());
            let extension = path
                .extension()
                .map(|ext| ext.to_string_lossy().to_string());
            let size_bytes = metadata.as_ref().map(|m| m.len());

            events.push(FilesystemEvent {
                path: path.to_string_lossy().to_string(),
                file_name,
                extension,
                size_bytes,
                event_kind: "snapshot".to_string(),
                timestamp_utc: now_utc_rfc3339(),
            });
        }
    }

    Ok(FilesystemMonitoringReport {
        enabled: true,
        watched_path: Some(downloads.to_string_lossy().to_string()),
        events,
        notes: vec!["Metadata snapshot only; file contents are never read.".to_string()],
    })
}

fn downloads_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE")
            .ok()
            .map(PathBuf::from)
            .map(|path| path.join("Downloads"))
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .ok()
            .map(PathBuf::from)
            .map(|path| path.join("Downloads"))
    }
}
