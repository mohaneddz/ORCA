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
        let devices = collect_windows_usb_devices();
        let events = devices
            .iter()
            .map(|d| UsbInsertionEvent {
                timestamp_utc: now_utc_rfc3339(),
                device_name: d.device_name.clone(),
                vendor_id: d.vendor_id.clone(),
                product_id: d.product_id.clone(),
                mount_path: d.mount_path.clone(),
            })
            .collect();

        return Ok(UsbReport {
            enabled: true,
            events,
            devices,
            notes: vec!["Live insertion/removal watchers require async WMI subscription; current data reflects snapshot.".to_string()],
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(UsbReport {
            enabled: true,
            devices: Vec::new(),
            events: Vec::new(),
            notes: vec!["USB collector is only implemented on Windows.".to_string()],
        })
    }
}

#[cfg(target_os = "windows")]
fn collect_windows_usb_devices() -> Vec<UsbDeviceMetadata> {
    use std::process::Command;

    // Query PnP devices with DeviceID so we can extract VID/PID
    let script = "Get-PnpDevice -Class USB | Select-Object -First 50 FriendlyName,InstanceId | ConvertTo-Csv -NoTypeInformation";
    let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
    else {
        return Vec::new();
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut devices: Vec<UsbDeviceMetadata> = Vec::new();
    let mut skip_header = true;
    for line in text.lines() {
        if skip_header {
            skip_header = false;
            continue;
        }
        let cols = parse_csv_line(line);
        if cols.len() < 2 {
            continue;
        }
        let friendly_name = cols[0].trim_matches('"').to_string();
        let instance_id = cols[1].trim_matches('"').to_string();
        if friendly_name.is_empty() {
            continue;
        }
        let (vendor_id, product_id) = extract_vid_pid(&instance_id);
        devices.push(UsbDeviceMetadata {
            device_name: Some(friendly_name),
            vendor: None,
            serial: extract_serial(&instance_id),
            connected_at_utc: None,
            vendor_id,
            product_id,
            mount_path: None,
        });
    }

    // Try to enrich with drive letter (mount path) from Get-Volume
    enrich_with_drive_letters(&mut devices);

    devices
}

#[cfg(target_os = "windows")]
fn enrich_with_drive_letters(devices: &mut Vec<UsbDeviceMetadata>) {
    use std::process::Command;
    let script = "Get-Volume | Where-Object {$_.DriveType -eq 'Removable'} | Select-Object DriveLetter,FileSystemLabel | ConvertTo-Csv -NoTypeInformation";
    let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
    else {
        return;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let mut drive_letters: Vec<String> = Vec::new();
    let mut skip_header = true;
    for line in text.lines() {
        if skip_header {
            skip_header = false;
            continue;
        }
        let cols = parse_csv_line(line);
        if let Some(letter) = cols.first() {
            let letter = letter.trim_matches('"');
            if !letter.is_empty() {
                drive_letters.push(format!("{}:\\", letter));
            }
        }
    }
    // Assign drive letters to devices that don't have a mount path yet
    let mut letter_iter = drive_letters.into_iter();
    for device in devices.iter_mut() {
        if device.mount_path.is_none() {
            device.mount_path = letter_iter.next();
        }
    }
}

fn extract_vid_pid(instance_id: &str) -> (Option<String>, Option<String>) {
    let upper = instance_id.to_uppercase();
    let vid = upper.find("VID_").map(|i| upper[i + 4..].split('&').next().unwrap_or("").to_string());
    let pid = upper.find("PID_").map(|i| upper[i + 4..].split('\\').next().unwrap_or("").split('&').next().unwrap_or("").to_string());
    (
        vid.filter(|s| s.len() == 4),
        pid.filter(|s| s.len() == 4),
    )
}

fn extract_serial(instance_id: &str) -> Option<String> {
    // InstanceId format: USB\VID_XXXX&PID_XXXX\SERIAL
    let parts: Vec<&str> = instance_id.split('\\').collect();
    parts.get(2).map(|s| s.to_string()).filter(|s| !s.is_empty())
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut cols = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for ch in line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => {
                cols.push(current.clone());
                current.clear();
            }
            _ => current.push(ch),
        }
    }
    cols.push(current);
    cols
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
