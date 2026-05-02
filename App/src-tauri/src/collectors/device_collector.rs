use sysinfo::System;

use crate::models::device::{DeviceInfo, HardwareInfo};
use crate::utils::errors::AppResult;

pub fn collect_device_info() -> AppResult<DeviceInfo> {
    let mut system = System::new_all();
    system.refresh_all();

    let hostname = hostname::get()
        .ok()
        .map(|h| h.to_string_lossy().to_string())
        .filter(|value| !value.is_empty());

    let hardware = HardwareInfo {
        architecture: std::env::consts::ARCH.to_string(),
        cpu_cores: system.cpus().len(),
        total_memory_mb: system.total_memory() / 1024 / 1024,
    };

    Ok(DeviceInfo {
        hostname,
        os_name: System::name(),
        os_version: System::os_version(),
        kernel_version: System::kernel_version(),
        architecture: std::env::consts::ARCH.to_string(),
        uptime_seconds: Some(System::uptime()),
        boot_time_epoch: Some(System::boot_time()),
        hardware,
    })
}

#[cfg(test)]
mod tests {
    use super::collect_device_info;

    #[test]
    fn collect_device_info_returns_valid_structure() {
        let info = collect_device_info().expect("device collection should succeed");
        assert!(!info.architecture.is_empty());
        assert!(info.hardware.cpu_cores > 0);
        assert_eq!(info.architecture, info.hardware.architecture);
        assert!(info.uptime_seconds.unwrap_or(0) > 0);
    }
}
