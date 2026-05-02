use crate::models::event_log::EventLogReport;
use crate::utils::errors::AppResult;

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
        return Ok(EventLogReport {
            enabled: true,
            records: Vec::new(),
            notes: vec![
                "Windows event log collector placeholder for failed logins, service creation, admin group changes, Defender alerts, RDP logins, and security log clear events.".to_string(),
            ],
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(EventLogReport {
            enabled: true,
            records: Vec::new(),
            notes: vec!["Event log collector is currently implemented only as a Windows-oriented placeholder.".to_string()],
        })
    }
}
