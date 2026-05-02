use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

use crate::utils::time::now_utc_rfc3339;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryLogEntry {
    pub module: String,
    pub timestamp_utc: String,
    pub status: String,
    pub enabled: bool,
    pub record_count: usize,
    pub error: Option<String>,
}

static TELEMETRY_LOGS: OnceLock<Mutex<Vec<TelemetryLogEntry>>> = OnceLock::new();

fn log_store() -> &'static Mutex<Vec<TelemetryLogEntry>> {
    TELEMETRY_LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

pub fn log_collector_event(
    module: &str,
    status: &str,
    enabled: bool,
    record_count: usize,
    error: Option<String>,
) {
    let entry = TelemetryLogEntry {
        module: module.to_string(),
        timestamp_utc: now_utc_rfc3339(),
        status: status.to_string(),
        enabled,
        record_count,
        error,
    };

    if let Ok(mut logs) = log_store().lock() {
        logs.push(entry);
        if logs.len() > 2_000 {
            let drop_count = logs.len() - 2_000;
            logs.drain(0..drop_count);
        }
    }
}

pub fn get_telemetry_logs() -> Vec<TelemetryLogEntry> {
    log_store()
        .lock()
        .map(|rows| rows.clone())
        .unwrap_or_default()
}

pub fn clear_telemetry_logs_for_tests() {
    if let Ok(mut rows) = log_store().lock() {
        rows.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::{clear_telemetry_logs_for_tests, get_telemetry_logs, log_collector_event};

    #[test]
    fn logs_structured_event_without_private_payload() {
        clear_telemetry_logs_for_tests();

        log_collector_event("private_signal_collector", "start", false, 0, None);

        let logs = get_telemetry_logs();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].module, "private_signal_collector");
        assert!(logs[0].error.is_none());
    }
}
