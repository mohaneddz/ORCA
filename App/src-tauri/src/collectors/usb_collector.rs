use crate::models::usb::{UsbDeviceMetadata, UsbInsertionEvent, UsbReport};
use crate::utils::errors::AppResult;
use crate::utils::time::now_utc_rfc3339;

pub fn collect_usb_events(enabled: bool) -> AppResult<UsbReport> {
    collect_usb_metadata(enabled)
}

pub fn collect_usb_metadata(enabled: bool) -> AppResult<UsbReport> {
    if !enabled {
        return Ok(UsbReport {
            enabled: false,
            devices: Vec::new(),
            events: Vec::new(),
            notes: vec!["USB event collection is disabled by config.".to_string()],
        });
    }

    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-PnpDevice -Class USB | Select-Object -First 50 FriendlyName,InstanceId",
            ])
            .output();

        if let Ok(output) = output {
            let text = String::from_utf8_lossy(&output.stdout);
            let mut devices = Vec::new();
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty()
                    || trimmed.starts_with("FriendlyName")
                    || trimmed.starts_with("---")
                {
                    continue;
                }
                devices.push(UsbDeviceMetadata {
                    device_name: Some(trimmed.to_string()),
                    vendor: None,
                    serial: None,
                    connected_at_utc: None,
                    vendor_id: None,
                    product_id: None,
                    mount_path: None,
                });
            }
            return Ok(UsbReport {
                enabled: true,
                events: devices
                    .iter()
                    .map(|d| UsbInsertionEvent {
                        timestamp_utc: now_utc_rfc3339(),
                        device_name: d.device_name.clone(),
                        vendor_id: d.vendor_id.clone(),
                        product_id: d.product_id.clone(),
                        mount_path: d.mount_path.clone(),
                    })
                    .collect(),
                devices,
                notes: vec!["USB metadata only; no file contents collected.".to_string()],
            });
        }
    }

    Ok(UsbReport {
        enabled: true,
        devices: Vec::new(),
        events: Vec::new(),
        notes: vec!["USB metadata collector placeholder. Integrate platform APIs for insertion/removal watchers.".to_string()],
    })
}

#[cfg(test)]
mod tests {
    use super::collect_usb_metadata;

    #[test]
    fn respects_disabled_usb_collection() {
        let report = collect_usb_metadata(false).expect("usb report should collect");
        assert!(!report.enabled);
        assert!(report.devices.is_empty());
    }
}
