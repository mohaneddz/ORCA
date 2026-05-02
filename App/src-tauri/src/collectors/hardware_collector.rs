use crate::models::hardware::HardwareInventory;
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;
use sysinfo::{Disks, System};

pub fn collect_hardware_inventory() -> AppResult<HardwareInventory> {
    let mut system = System::new_all();
    system.refresh_all();

    let disks = Disks::new_with_refreshed_list();
    let mut total_bytes = 0_u64;
    let mut free_bytes = 0_u64;
    for disk in disks.list() {
        total_bytes = total_bytes.saturating_add(disk.total_space());
        free_bytes = free_bytes.saturating_add(disk.available_space());
    }

    let cpu_model = system.cpus().first().map(|cpu| cpu.brand().to_string());
    let machine_uuid = machine_uuid();
    let primary_mac_address = primary_mac_address();

    Ok(HardwareInventory {
        hostname: hostname::get()
            .ok()
            .map(|s| s.to_string_lossy().to_string()),
        os_name: System::name(),
        os_version: System::os_version(),
        os_build: System::kernel_version(),
        cpu_model,
        ram_total_mb: Some(system.total_memory() / 1024 / 1024),
        disk_total_gb: Some(total_bytes / 1024 / 1024 / 1024),
        disk_free_gb: Some(free_bytes / 1024 / 1024 / 1024),
        machine_uuid,
        primary_mac_address,
        supported: true,
        status: "ok".to_string(),
    })
}

fn machine_uuid() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let output = run_command(
            "powershell",
            &[
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_ComputerSystemProduct).UUID",
            ],
        )
        .ok()?;
        return output
            .lines()
            .find(|line| !line.trim().is_empty())
            .map(|s| s.trim().to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let output = run_command("ioreg", &["-rd1", "-c", "IOPlatformExpertDevice"]).ok()?;
        for line in output.lines() {
            if line.contains("IOPlatformUUID") {
                return line.split('"').nth(3).map(|s| s.to_string());
            }
        }
        return None;
    }

    #[cfg(target_os = "linux")]
    {
        return std::fs::read_to_string("/etc/machine-id")
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
    }

    #[allow(unreachable_code)]
    None
}

fn primary_mac_address() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let output = run_command("getmac", &["/fo", "csv", "/nh"]).ok()?;
        for line in output.lines() {
            let parts: Vec<&str> = line.trim_matches('"').split("\",\"").collect();
            if let Some(mac) = parts.first() {
                if mac.contains('-') || mac.contains(':') {
                    return Some(mac.to_string());
                }
            }
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let output = run_command("sh", &["-c", "ip link 2>/dev/null || ifconfig"]).ok()?;
        for line in output.lines() {
            let lowered = line.to_lowercase();
            if lowered.contains("link/ether") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if let Some(idx) = parts.iter().position(|p| *p == "link/ether") {
                    if let Some(mac) = parts.get(idx + 1) {
                        return Some((*mac).to_string());
                    }
                }
            }
            if lowered.contains("ether") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if let Some(idx) = parts.iter().position(|p| *p == "ether") {
                    if let Some(mac) = parts.get(idx + 1) {
                        return Some((*mac).to_string());
                    }
                }
            }
        }
    }

    None
}
