use crate::collectors::browser_collector::collect_browser_metadata;
use crate::collectors::device_collector::collect_device_info;
use crate::collectors::event_log_collector::collect_event_logs;
use crate::collectors::filesystem_collector::collect_downloads_metadata;
use crate::collectors::network_collector::collect_network_info;
use crate::collectors::process_collector::collect_processes;
use crate::collectors::security_collector::collect_security_posture;
use crate::collectors::software_collector::collect_software_inventory;
use crate::collectors::usb_collector::collect_usb_metadata;
use crate::collectors::user_collector::collect_user_posture;
use crate::config::app_config::AppConfig;
use crate::models::posture::PostureReport;
use crate::services::risk_service::calculate_risk_score_internal;
use crate::utils::errors::AppResult;
use crate::utils::time::now_utc_rfc3339;

pub fn collect_full_posture(config: AppConfig) -> AppResult<PostureReport> {
    let device = collect_device_info()?;
    let user = collect_user_posture()?;

    let security = if config.collect_security_posture {
        Some(collect_security_posture()?)
    } else {
        None
    };

    let processes = if config.collect_processes {
        collect_processes(config.include_process_command_line)?
    } else {
        Vec::new()
    };

    let network = if config.collect_network {
        Some(collect_network_info()?)
    } else {
        None
    };

    let software = if config.collect_software {
        Some(collect_software_inventory()?)
    } else {
        None
    };

    let filesystem = if config.monitor_downloads_folder {
        Some(collect_downloads_metadata(true)?)
    } else {
        None
    };

    let event_logs = if config.collect_event_logs {
        Some(collect_event_logs(true)?)
    } else {
        None
    };

    let browser = if config.collect_browser_metadata {
        Some(collect_browser_metadata(true)?)
    } else {
        None
    };

    let usb = if config.collect_usb_events {
        Some(collect_usb_metadata(true)?)
    } else {
        None
    };

    let mut report = PostureReport {
        collected_at_utc: now_utc_rfc3339(),
        device,
        user,
        security,
        processes,
        network,
        software,
        filesystem,
        event_logs,
        browser,
        usb,
        risk: None,
    };

    report.risk = Some(calculate_risk_score_internal(&report));

    Ok(report)
}

#[cfg(test)]
mod tests {
    use crate::config::app_config::AppConfig;

    use super::collect_full_posture;

    #[test]
    fn full_posture_respects_disabled_modules() {
        let report =
            collect_full_posture(AppConfig::default()).expect("full posture should collect");
        assert!(report.browser.is_none());
        assert!(report.filesystem.is_none());
        assert!(report.event_logs.is_none());
        assert!(report.usb.is_none());
    }
}
