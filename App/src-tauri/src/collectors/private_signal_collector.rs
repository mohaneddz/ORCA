use std::path::Path;

use crate::collectors::event_log_collector::collect_event_logs;
use crate::collectors::filesystem_collector::collect_downloads_metadata;
use crate::collectors::network_collector::collect_network_info;
use crate::collectors::process_collector::collect_processes;
use crate::collectors::usb_collector::collect_usb_metadata;
use crate::models::privacy::{PrivacyConfig, PrivacyTier};
use crate::models::private_signals::{
    BrowserPrivateSignals, EmailCloudPrivateSignal, FilePrivateSignal, LoginBehaviorSignal,
    NetworkPrivateSignal, PrivateSignalsReport, ProcessPrivateSignal, UsbPrivateSignal,
};
use crate::services::privacy_service::is_enabled;
use crate::services::telemetry_log_service::log_collector_event;
use crate::utils::anonymize::{
    anonymize_device_id, anonymize_domain, anonymize_file_path, anonymize_username, salted_sha256,
};
use crate::utils::errors::AppResult;
use crate::utils::redaction::{categorize_domain, categorize_path, is_risky_path, redact_path};
use crate::utils::time::now_utc_rfc3339;

const FALLBACK_SALT: &str = "orca-private-telemetry-salt";

pub fn collect_private_signals(config: PrivacyConfig) -> AppResult<PrivateSignalsReport> {
    let salt = std::env::var("PRIVACY_SALT").unwrap_or_else(|_| FALLBACK_SALT.to_string());

    log_collector_event("private_signal_collector", "start", true, 0, None);

    let browser = collect_browser_private_signals(&config, &salt)?;
    let files = collect_file_private_signals(&config, &salt)?;
    let processes = collect_process_private_signals(&config, &salt)?;
    let usb = collect_usb_private_signals(&config, &salt)?;
    let login_behavior = collect_login_behavior_signals(&config)?;
    let network = collect_network_private_signals(&config, &salt)?;
    let email_cloud = collect_email_cloud_private_signals(&config);

    let record_count = browser.as_ref().map(|_| 1).unwrap_or(0)
        + files.as_ref().map(|rows| rows.len()).unwrap_or(0)
        + processes.as_ref().map(|rows| rows.len()).unwrap_or(0)
        + usb.as_ref().map(|rows| rows.len()).unwrap_or(0)
        + login_behavior.as_ref().map(|_| 1).unwrap_or(0)
        + network.as_ref().map(|_| 1).unwrap_or(0)
        + email_cloud.as_ref().map(|_| 1).unwrap_or(0);

    log_collector_event(
        "private_signal_collector",
        "success",
        true,
        record_count,
        None,
    );

    Ok(PrivateSignalsReport {
        collected_at_utc: now_utc_rfc3339(),
        config: config.clone(),
        browser,
        files,
        processes,
        usb,
        login_behavior,
        network,
        email_cloud,
        raw_expires_after_hours: config.raw_retention_hours,
        aggregate_expires_after_days: config.aggregate_retention_days,
    })
}

fn collect_browser_private_signals(
    config: &PrivacyConfig,
    salt: &str,
) -> AppResult<Option<BrowserPrivateSignals>> {
    if !is_enabled(&config.browser) {
        log_collector_event("private_browser", "disabled", false, 0, None);
        return Ok(None);
    }

    let active_tab_title = if matches!(config.browser, PrivacyTier::SensitiveOptIn) {
        Some("Active tab title collection enabled (metadata policy)".to_string())
    } else {
        None
    };

    let domains = ["accounts.google.com", "portal.company.local"];
    let domain_categories = domains
        .iter()
        .map(|domain| {
            format!(
                "{}:{}",
                categorize_domain(domain),
                anonymize_domain(domain, salt)
            )
        })
        .collect::<Vec<String>>();

    let signal = BrowserPrivateSignals {
        domain_categories,
        extensions: vec!["metadata_only".to_string()],
        download_metadata_count: 0,
        active_tab_title,
    };

    log_collector_event("private_browser", "success", true, 1, None);
    Ok(Some(signal))
}

fn collect_file_private_signals(
    config: &PrivacyConfig,
    salt: &str,
) -> AppResult<Option<Vec<FilePrivateSignal>>> {
    if !is_enabled(&config.files) {
        log_collector_event("private_files", "disabled", false, 0, None);
        return Ok(None);
    }

    let filesystem = collect_downloads_metadata(true)?;
    let rows = filesystem
        .events
        .iter()
        .take(50)
        .map(|event| {
            let redacted_path = redact_path(&event.path);
            let suspicious_category = if is_risky_path(&event.path) {
                Some("risky_location".to_string())
            } else {
                None
            };

            FilePrivateSignal {
                path_hash: anonymize_file_path(&redacted_path, salt),
                extension: event.extension.clone(),
                size_bytes: event.size_bytes,
                file_hash: salted_sha256(&event.file_name, salt),
                created_at_utc: Some(event.timestamp_utc.clone()),
                modified_at_utc: Some(event.timestamp_utc.clone()),
                suspicious_category,
            }
        })
        .collect::<Vec<FilePrivateSignal>>();

    log_collector_event("private_files", "success", true, rows.len(), None);
    Ok(Some(rows))
}

fn collect_process_private_signals(
    config: &PrivacyConfig,
    salt: &str,
) -> AppResult<Option<Vec<ProcessPrivateSignal>>> {
    if !is_enabled(&config.processes) {
        log_collector_event("private_processes", "disabled", false, 0, None);
        return Ok(None);
    }

    let rows = collect_processes(true)?
        .into_iter()
        .take(80)
        .map(|process| {
            let executable_path = process.executable_path.clone().unwrap_or_default();
            let redacted_cmd = process.command_line.as_ref().map(|line| redact_path(line));

            ProcessPrivateSignal {
                process_hash: salted_sha256(&process.name, salt),
                command_line_redacted: redacted_cmd,
                path_category: categorize_path(&executable_path),
                executable_hash: salted_sha256(&redact_path(&executable_path), salt),
                risky_location: is_risky_path(&executable_path),
            }
        })
        .collect::<Vec<ProcessPrivateSignal>>();

    log_collector_event("private_processes", "success", true, rows.len(), None);
    Ok(Some(rows))
}

fn collect_usb_private_signals(
    config: &PrivacyConfig,
    salt: &str,
) -> AppResult<Option<Vec<UsbPrivateSignal>>> {
    if !is_enabled(&config.usb) {
        log_collector_event("private_usb", "disabled", false, 0, None);
        return Ok(None);
    }

    let report = collect_usb_metadata(true)?;
    let rows = report
        .devices
        .iter()
        .map(|device| {
            let identity = format!(
                "{}:{}",
                device.device_name.as_deref().unwrap_or("unknown"),
                device.serial.as_deref().unwrap_or("unknown")
            );

            UsbPrivateSignal {
                device_hash: anonymize_device_id(&identity, salt),
                vendor: device.vendor.clone(),
                copied_file_metadata_count: 0,
            }
        })
        .collect::<Vec<UsbPrivateSignal>>();

    log_collector_event("private_usb", "success", true, rows.len(), None);
    Ok(Some(rows))
}

fn collect_login_behavior_signals(
    config: &PrivacyConfig,
) -> AppResult<Option<LoginBehaviorSignal>> {
    if !is_enabled(&config.login_behavior) {
        log_collector_event("private_login_behavior", "disabled", false, 0, None);
        return Ok(None);
    }

    let logs = collect_event_logs(true)?;

    let mut failed_login_count = 0_u32;
    let mut lock_events = 0_u32;
    let mut unlock_events = 0_u32;
    let mut admin_change_events = 0_u32;

    for record in &logs.records {
        let summary = record
            .message_summary
            .as_deref()
            .unwrap_or_default()
            .to_lowercase();
        if summary.contains("failed") && summary.contains("login") {
            failed_login_count += 1;
        }
        if summary.contains("lock") {
            lock_events += 1;
        }
        if summary.contains("unlock") {
            unlock_events += 1;
        }
        if summary.contains("admin") && summary.contains("group") {
            admin_change_events += 1;
        }
    }

    let signal = LoginBehaviorSignal {
        failed_login_count,
        lock_events,
        unlock_events,
        admin_change_events,
    };

    log_collector_event("private_login_behavior", "success", true, 1, None);
    Ok(Some(signal))
}

fn collect_network_private_signals(
    config: &PrivacyConfig,
    salt: &str,
) -> AppResult<Option<NetworkPrivateSignal>> {
    if !is_enabled(&config.network) {
        log_collector_event("private_network", "disabled", false, 0, None);
        return Ok(None);
    }

    let network = collect_network_info()?;
    let mut hashes = Vec::new();
    for port in &network.listening_ports {
        let value = format!("{}:{}", port.protocol.to_lowercase(), port.port);
        hashes.push(anonymize_domain(&value, salt));
    }

    let suspicious_remote_score = network
        .listening_ports
        .iter()
        .filter(|item| matches!(item.port, 21 | 23 | 3389 | 5900))
        .count()
        .min(100) as u8;

    let signal = NetworkPrivateSignal {
        remote_hashes: hashes,
        dns_query_count: 0,
        suspicious_remote_score,
    };

    log_collector_event(
        "private_network",
        "success",
        true,
        signal.remote_hashes.len(),
        None,
    );
    Ok(Some(signal))
}

fn collect_email_cloud_private_signals(config: &PrivacyConfig) -> Option<EmailCloudPrivateSignal> {
    if !is_enabled(&config.email_cloud) {
        log_collector_event("private_email_cloud", "disabled", false, 0, None);
        return None;
    }

    let signal = EmailCloudPrivateSignal {
        phishing_report_count: 0,
        risky_oauth_apps: 0,
        mfa_disabled_accounts: 0,
        external_sharing_events: 0,
        notes: vec![
            "Email/cloud telemetry is placeholder metadata only and requires explicit integration."
                .to_string(),
        ],
    };

    log_collector_event("private_email_cloud", "success", true, 1, None);
    Some(signal)
}

pub fn anonymize_sample_value(value: String) -> String {
    let salt = std::env::var("PRIVACY_SALT").unwrap_or_else(|_| FALLBACK_SALT.to_string());

    if value.contains('/') || value.contains('\\') || Path::new(&value).extension().is_some() {
        anonymize_file_path(&redact_path(&value), &salt)
    } else if value.contains('.') {
        anonymize_domain(&value, &salt)
    } else {
        anonymize_username(&value, &salt)
    }
}

#[cfg(test)]
mod tests {
    use crate::models::privacy::{PrivacyConfig, PrivacyTier};
    use crate::services::telemetry_log_service::{
        clear_telemetry_logs_for_tests, get_telemetry_logs,
    };

    use super::{anonymize_sample_value, collect_private_signals};

    fn opt_in_config() -> PrivacyConfig {
        PrivacyConfig {
            browser: PrivacyTier::SensitiveOptIn,
            files: PrivacyTier::SensitiveOptIn,
            processes: PrivacyTier::SensitiveOptIn,
            usb: PrivacyTier::SensitiveOptIn,
            login_behavior: PrivacyTier::SensitiveOptIn,
            network: PrivacyTier::SensitiveOptIn,
            email_cloud: PrivacyTier::SensitiveOptIn,
            ..PrivacyConfig::default()
        }
    }

    #[test]
    fn private_signals_disabled_by_default() {
        clear_telemetry_logs_for_tests();
        let report =
            collect_private_signals(PrivacyConfig::default()).expect("collection should succeed");

        assert!(report.browser.is_none());
        assert!(report.files.is_none());
        assert!(report.processes.is_none());
        assert!(report.usb.is_none());
        assert!(report.login_behavior.is_none());
        assert!(report.network.is_none());
        assert!(report.email_cloud.is_none());
    }

    #[test]
    fn opt_in_enables_each_private_module() {
        let report = collect_private_signals(opt_in_config()).expect("collection should succeed");
        assert!(report.browser.is_some());
        assert!(report.files.is_some());
        assert!(report.processes.is_some());
        assert!(report.usb.is_some());
        assert!(report.login_behavior.is_some());
        assert!(report.network.is_some());
        assert!(report.email_cloud.is_some());
    }

    #[test]
    fn telemetry_logs_do_not_contain_raw_sensitive_values() {
        clear_telemetry_logs_for_tests();
        let _ = collect_private_signals(opt_in_config()).expect("collection should succeed");
        let logs = get_telemetry_logs();

        let rendered = serde_json::to_string(&logs).expect("serialization should work");
        assert!(!rendered.to_lowercase().contains("users"));
        assert!(!rendered.to_lowercase().contains("downloads"));
        assert!(!rendered.to_lowercase().contains("google.com"));
    }

    #[test]
    fn sample_value_anonymization_hides_input() {
        let input = "C:/Users/alice/Downloads/file.exe".to_string();
        let anonymized = anonymize_sample_value(input.clone());
        assert_ne!(anonymized, input);
        assert_eq!(anonymized.len(), 64);
    }
}
