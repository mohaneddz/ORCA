use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CollectorPermission {
    pub collector: &'static str,
    pub scope: &'static str,
    pub privacy_level: PrivacyLevel,
    pub enabled_by_default: bool,
    pub notes: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyLevel {
    Low,
    Medium,
    High,
}

pub fn collector_permissions() -> Vec<CollectorPermission> {
    vec![
        CollectorPermission {
            collector: "device_collector",
            scope: "Host identity and OS metadata",
            privacy_level: PrivacyLevel::Low,
            enabled_by_default: true,
            notes: "Collects hostname, OS, architecture, uptime.",
        },
        CollectorPermission {
            collector: "user_collector",
            scope: "Current user and local account posture",
            privacy_level: PrivacyLevel::Medium,
            enabled_by_default: true,
            notes: "No passwords or private content.",
        },
        CollectorPermission {
            collector: "security_collector",
            scope: "Firewall and endpoint protection posture",
            privacy_level: PrivacyLevel::Low,
            enabled_by_default: true,
            notes: "Placeholder signals where platform support is limited.",
        },
        CollectorPermission {
            collector: "process_collector",
            scope: "Running process metadata",
            privacy_level: PrivacyLevel::Medium,
            enabled_by_default: true,
            notes: "No keystrokes, no memory scraping.",
        },
        CollectorPermission {
            collector: "network_collector",
            scope: "Interface and connection posture metadata",
            privacy_level: PrivacyLevel::Medium,
            enabled_by_default: true,
            notes: "Metadata only.",
        },
        CollectorPermission {
            collector: "software_collector",
            scope: "Installed software inventory",
            privacy_level: PrivacyLevel::Medium,
            enabled_by_default: true,
            notes: "No file content collection.",
        },
        CollectorPermission {
            collector: "filesystem_collector",
            scope: "Downloads-folder file metadata monitoring",
            privacy_level: PrivacyLevel::High,
            enabled_by_default: false,
            notes: "Disabled by default. No file content inspection.",
        },
        CollectorPermission {
            collector: "event_log_collector",
            scope: "Security event log records",
            privacy_level: PrivacyLevel::High,
            enabled_by_default: false,
            notes: "Disabled by default. Intended for security events only.",
        },
        CollectorPermission {
            collector: "browser_collector",
            scope: "Browser metadata and recent downloads metadata",
            privacy_level: PrivacyLevel::High,
            enabled_by_default: false,
            notes: "Disabled by default. No full browsing history.",
        },
        CollectorPermission {
            collector: "usb_collector",
            scope: "USB insertion/removal metadata",
            privacy_level: PrivacyLevel::High,
            enabled_by_default: false,
            notes: "Disabled by default.",
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::{collector_permissions, PrivacyLevel};

    #[test]
    fn privacy_heavy_modules_are_not_enabled_by_default() {
        let rows = collector_permissions();
        for entry in rows {
            if matches!(entry.privacy_level, PrivacyLevel::High) {
                assert!(!entry.enabled_by_default);
            }
        }
    }
}
