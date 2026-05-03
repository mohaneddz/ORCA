use crate::models::event_log::{EventLogRecord, EventLogReport};
use crate::utils::errors::AppResult;

// Security event IDs of interest
const WATCHED_EVENT_IDS: &[u32] = &[
    4624,  // Successful logon (check for logon type 10 = RDP)
    4625,  // Failed logon
    4720,  // User account created
    4728,  // User added to security-enabled global group
    1102,  // Audit log cleared
];

pub fn collect_event_logs(enabled: bool) -> AppResult<EventLogReport> {
    if !enabled {
        return Ok(EventLogReport {
            enabled: false,
            records: Vec::new(),
            notes: vec!["Event log collection is disabled by config.".to_string()],
        });
    }

    #[cfg(target_os = "windows")]
    {
        let records = collect_windows_event_logs();
        return Ok(EventLogReport {
            enabled: true,
            records,
            notes: vec![],
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(EventLogReport {
            enabled: true,
            records: Vec::new(),
            notes: vec!["Event log collector is only implemented on Windows.".to_string()],
        })
    }
}

#[cfg(target_os = "windows")]
fn collect_windows_event_logs() -> Vec<EventLogRecord> {
    use std::process::Command;

    let Ok(output) = Command::new("wevtutil")
        .args(["qe", "Security", "/rd:true", "/c:200", "/f:text"])
        .output()
    else {
        return Vec::new();
    };

    let text = String::from_utf8_lossy(&output.stdout);
    parse_wevtutil_text_output(&text)
}

fn parse_wevtutil_text_output(text: &str) -> Vec<EventLogRecord> {
    let mut records = Vec::new();
    let mut current_event_id: Option<u32> = None;
    let mut current_timestamp: Option<String> = None;
    let mut current_level: Option<String> = None;
    let mut current_description: Option<String> = None;
    let mut current_source: String = "Security".to_string();
    let mut in_description = false;

    for line in text.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("Event[") {
            // Save previous record if it had a watched event ID
            if let Some(eid) = current_event_id {
                if WATCHED_EVENT_IDS.contains(&eid) {
                    let category = event_id_to_category(eid);
                    records.push(EventLogRecord {
                        source: current_source.clone(),
                        event_id: Some(eid),
                        level: current_level.take(),
                        category: Some(category),
                        message_summary: current_description.take(),
                        timestamp_utc: current_timestamp.take(),
                    });
                }
            }
            current_event_id = None;
            current_timestamp = None;
            current_level = None;
            current_description = None;
            in_description = false;
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("Event ID:") {
            current_event_id = rest.trim().parse::<u32>().ok();
            in_description = false;
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("Date:") {
            current_timestamp = Some(rest.trim().to_string());
            in_description = false;
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("Level:") {
            current_level = Some(rest.trim().to_string());
            in_description = false;
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("Source:") {
            current_source = rest.trim().to_string();
            in_description = false;
            continue;
        }

        if trimmed.starts_with("Description:") {
            in_description = true;
            continue;
        }

        if in_description && !trimmed.is_empty() && current_description.is_none() {
            // First non-empty line of the description
            current_description = Some(trimmed.chars().take(200).collect());
            in_description = false;
        }
    }

    // Handle last record
    if let Some(eid) = current_event_id {
        if WATCHED_EVENT_IDS.contains(&eid) {
            records.push(EventLogRecord {
                source: current_source,
                event_id: Some(eid),
                level: current_level,
                category: Some(event_id_to_category(eid)),
                message_summary: current_description,
                timestamp_utc: current_timestamp,
            });
        }
    }

    records.truncate(50);
    records
}

fn event_id_to_category(event_id: u32) -> String {
    match event_id {
        4624 => "Successful Logon".to_string(),
        4625 => "Failed Logon".to_string(),
        4720 => "User Account Created".to_string(),
        4728 => "User Added to Privileged Group".to_string(),
        1102 => "Audit Log Cleared".to_string(),
        _ => "Security".to_string(),
    }
}
