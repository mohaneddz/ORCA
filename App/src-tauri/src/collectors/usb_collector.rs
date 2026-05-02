use crate::models::usb::UsbReport;
use crate::utils::errors::AppResult;

pub fn collect_usb_metadata(enabled: bool) -> AppResult<UsbReport> {
    if !enabled {
        return Ok(UsbReport {
            enabled: false,
            devices: Vec::new(),
            notes: vec!["USB event collection is disabled by config.".to_string()],
        });
    }

    Ok(UsbReport {
        enabled: true,
        devices: Vec::new(),
        notes: vec!["USB metadata collector placeholder. Integrate platform APIs for device insertion/removal events.".to_string()],
    })
}
