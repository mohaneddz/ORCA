use std::cmp::min;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use innov_lib::config::app_config::AppConfig;
use innov_lib::models::posture::PostureReport;
use innov_lib::services::posture_service;
use innov_lib::services::wave3_posture_service::{self, Wave3PostureReport};

fn main() {
    let desktop_dir = parse_out_dir().unwrap_or_else(|| PathBuf::from("../logs/desktop"));
    let raw_dir = desktop_dir
        .parent()
        .map(|p| p.join("raw"))
        .unwrap_or_else(|| PathBuf::from("../logs/raw"));

    if let Err(error) = fs::create_dir_all(&desktop_dir) {
        eprintln!(
            "failed to create output directory {}: {}",
            desktop_dir.display(),
            error
        );
        std::process::exit(1);
    }
    if let Err(error) = fs::create_dir_all(&raw_dir) {
        eprintln!(
            "failed to create raw output directory {}: {}",
            raw_dir.display(),
            error
        );
        std::process::exit(1);
    }

    let report = match posture_service::collect_full_posture(AppConfig::default()) {
        Ok(report) => report,
        Err(error) => {
            eprintln!("failed to collect posture: {}", error);
            std::process::exit(1);
        }
    };
    let wave3 = match wave3_posture_service::collect_wave3_posture(AppConfig::default()) {
        Ok(report) => report,
        Err(error) => {
            eprintln!("failed to collect wave3 posture: {}", error);
            std::process::exit(1);
        }
    };

    let file_path = next_report_path(&desktop_dir);
    let stem = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("test-01")
        .to_string();
    let raw_baseline_path = raw_dir.join(format!("{stem}-baseline.json"));
    let raw_wave3_path = raw_dir.join(format!("{stem}-wave3.json"));

    if let Err(error) = fs::write(
        &raw_baseline_path,
        serde_json::to_string_pretty(&report).unwrap_or_else(|_| "{}".to_string()),
    ) {
        eprintln!(
            "failed to write baseline raw json {}: {}",
            raw_baseline_path.display(),
            error
        );
        std::process::exit(1);
    }
    if let Err(error) = fs::write(
        &raw_wave3_path,
        serde_json::to_string_pretty(&wave3).unwrap_or_else(|_| "{}".to_string()),
    ) {
        eprintln!(
            "failed to write wave3 raw json {}: {}",
            raw_wave3_path.display(),
            error
        );
        std::process::exit(1);
    }
    let markdown = render_markdown(&report, &wave3, &raw_baseline_path, &raw_wave3_path);

    if let Err(error) = fs::write(&file_path, markdown) {
        eprintln!("failed to write report {}: {}", file_path.display(), error);
        std::process::exit(1);
    }

    println!("{}", file_path.display());
}

fn parse_out_dir() -> Option<PathBuf> {
    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg == "--out" {
            return args.next().map(PathBuf::from);
        }
    }
    None
}

fn next_report_path(out_dir: &Path) -> PathBuf {
    let mut max_index: u32 = 0;

    if let Ok(entries) = fs::read_dir(out_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if let Some(index) = parse_report_index(name) {
                    if index > max_index {
                        max_index = index;
                    }
                }
            }
        }
    }

    let next = max_index + 1;
    out_dir.join(format!("test-{next:02}.md"))
}

fn parse_report_index(name: &str) -> Option<u32> {
    if !name.starts_with("test-") || !name.ends_with(".md") {
        return None;
    }

    let middle = &name[5..name.len() - 3];
    middle.parse::<u32>().ok()
}

fn render_markdown(
    report: &PostureReport,
    wave3: &Wave3PostureReport,
    raw_baseline_path: &Path,
    raw_wave3_path: &Path,
) -> String {
    let mut out = String::new();

    out.push_str("# Device Data Snapshot\n\n");
    out.push_str(&format!(
        "Collected at (UTC): `{}`\n\n",
        report.collected_at_utc
    ));

    out.push_str("## Device\n");
    out.push_str(&format!(
        "- Hostname: {}\n",
        report.device.hostname.as_deref().unwrap_or("unknown")
    ));
    out.push_str(&format!(
        "- OS: {} {}\n",
        report.device.os_name.as_deref().unwrap_or("unknown"),
        report.device.os_version.as_deref().unwrap_or("")
    ));
    out.push_str(&format!(
        "- Kernel: {}\n",
        report.device.kernel_version.as_deref().unwrap_or("unknown")
    ));
    out.push_str(&format!("- Architecture: {}\n", report.device.architecture));
    out.push_str(&format!(
        "- CPU cores: {}\n",
        report.device.hardware.cpu_cores
    ));
    out.push_str(&format!(
        "- Total memory (MB): {}\n",
        report.device.hardware.total_memory_mb
    ));
    out.push_str(&format!(
        "- Uptime (seconds): {}\n\n",
        report.device.uptime_seconds.unwrap_or(0)
    ));

    out.push_str("## User\n");
    out.push_str(&format!("- Current user: {}\n", report.user.current_user));
    out.push_str(&format!("- Username: {}\n", report.user.username));
    out.push_str(&format!(
        "- Admin estimate: {:?}\n",
        report.user.is_admin_estimate
    ));
    out.push_str(&format!(
        "- Local users observed: {}\n",
        report.user.local_users.len()
    ));
    out.push_str(&format!(
        "- Local admins observed: {}\n\n",
        report.user.local_admins.len()
    ));

    if let Some(security) = &report.security {
        out.push_str("## Security\n");
        out.push_str(&format!(
            "- Firewall status: {:?}\n",
            security.firewall_status
        ));
        out.push_str(&format!(
            "- Antivirus records: {}\n",
            security.antivirus.len()
        ));
        for av in &security.antivirus {
            out.push_str(&format!(
                "  - {}: enabled={:?}, up_to_date={:?}\n",
                av.name, av.enabled, av.up_to_date
            ));
        }
        out.push('\n');
    }

    if let Some(network) = &report.network {
        out.push_str("## Network\n");
        out.push_str(&format!("- Interfaces: {}\n", network.interfaces.len()));
        out.push_str(&format!(
            "- Listening ports: {}\n",
            network.listening_ports.len()
        ));
        let top_ports = min(15, network.listening_ports.len());
        if top_ports > 0 {
            out.push_str("- Sample listening ports:\n");
            for port in network.listening_ports.iter().take(top_ports) {
                out.push_str(&format!("  - {}:{}\n", port.protocol, port.port));
            }
        }
        out.push('\n');
    }

    if let Some(software) = &report.software {
        out.push_str("## Software\n");
        out.push_str(&format!(
            "- Installed entries collected: {}\n",
            software.software.len()
        ));
        let top_software = min(20, software.software.len());
        if top_software > 0 {
            out.push_str("- Sample software:\n");
            for item in software.software.iter().take(top_software) {
                out.push_str(&format!("  - {}\n", item.name));
            }
        }
        out.push('\n');
    }

    out.push_str("## Processes\n");
    out.push_str(&format!("- Process count: {}\n", report.processes.len()));
    let top_processes = min(25, report.processes.len());
    if top_processes > 0 {
        out.push_str("- Sample processes:\n");
        for process in report.processes.iter().take(top_processes) {
            out.push_str(&format!(
                "  - pid={} name={} memory_bytes={} path={}\n",
                process.pid,
                process.name,
                process.memory_bytes,
                process.executable_path.as_deref().unwrap_or("unknown")
            ));
        }
    }
    out.push('\n');

    if let Some(risk) = &report.risk {
        out.push_str("## Risk\n");
        out.push_str(&format!("- Score: {}\n", risk.score));
        out.push_str(&format!("- Level: {}\n", risk.level));
        if !risk.signals.is_empty() {
            out.push_str("- Signals:\n");
            for signal in &risk.signals {
                out.push_str(&format!("  - {}\n", signal));
            }
        }
        out.push('\n');
    }

    out.push_str("## Raw JSON\n");
    out.push_str(&format!("- Baseline posture JSON: `{}`\n", raw_baseline_path.display()));
    out.push_str(&format!("- Wave 3 posture JSON: `{}`\n\n", raw_wave3_path.display()));

    out.push_str("\n## Wave 3 Summary\n");
    out.push_str(&format!(
        "- Wave3 collected at (UTC): `{}`\n",
        wave3.collected_at_utc
    ));
    out.push_str(&format!(
        "- Hardware CPU: {}\n",
        wave3.hardware.cpu_model.as_deref().unwrap_or("unknown")
    ));
    out.push_str(&format!(
        "- Disk total/free (GB): {:?} / {:?}\n",
        wave3.hardware.disk_total_gb, wave3.hardware.disk_free_gb
    ));
    out.push_str(&format!(
        "- Patch status: current={} days_since_update={:?}\n",
        wave3.patch_status.is_current, wave3.patch_status.days_since_update
    ));
    // Keep Wave 3 summary non-redundant with baseline sections.
    out.push_str(&format!(
        "- Antivirus detected: {} ({})\n",
        wave3.antivirus.av_detected,
        wave3
            .antivirus
            .product_name
            .as_deref()
            .unwrap_or("unknown")
    ));
    out.push_str(&format!(
        "- USB watcher enabled/report events: {} / {}\n",
        wave3.usb.enabled,
        wave3.usb.events.len()
    ));
    out.push_str(&format!(
        "- Disk encryption: encrypted={} provider={}\n",
        wave3.disk_encryption.encrypted, wave3.disk_encryption.provider
    ));
    out.push_str(&format!(
        "- Peer fingerprint module active: {}\n",
        wave3.peer_fingerprint.is_some()
    ));
    out.push_str(&format!(
        "- Startup persistence module active: {}\n",
        wave3.startup_persistence.is_some()
    ));

    let baseline_av_names: Vec<String> = report
        .security
        .as_ref()
        .map(|s| s.antivirus.iter().map(|a| a.name.to_ascii_lowercase()).collect())
        .unwrap_or_default();
    let wave3_av = wave3
        .antivirus
        .product_name
        .as_deref()
        .unwrap_or("unknown")
        .to_ascii_lowercase();
    if wave3_av != "unknown"
        && !baseline_av_names.is_empty()
        && !baseline_av_names.iter().any(|name| name.contains(&wave3_av))
    {
        out.push_str("- Data mismatch note: baseline security AV records and Wave 3 AV product differ.\n");
    }

    out
}
