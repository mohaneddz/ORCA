use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum PrivacyTier {
    Safe,
    SensitiveOptIn,
    Disabled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyConfig {
    pub browser: PrivacyTier,
    pub files: PrivacyTier,
    pub processes: PrivacyTier,
    pub usb: PrivacyTier,
    pub login_behavior: PrivacyTier,
    pub network: PrivacyTier,
    pub email_cloud: PrivacyTier,
    pub raw_retention_hours: u32,
    pub aggregate_retention_days: u32,
}

impl Default for PrivacyConfig {
    fn default() -> Self {
        Self {
            browser: PrivacyTier::Disabled,
            files: PrivacyTier::Disabled,
            processes: PrivacyTier::Disabled,
            usb: PrivacyTier::Disabled,
            login_behavior: PrivacyTier::Disabled,
            network: PrivacyTier::Disabled,
            email_cloud: PrivacyTier::Disabled,
            raw_retention_hours: 24,
            aggregate_retention_days: 30,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{PrivacyConfig, PrivacyTier};

    #[test]
    fn sensitive_modules_disabled_by_default() {
        let cfg = PrivacyConfig::default();
        assert_eq!(cfg.browser, PrivacyTier::Disabled);
        assert_eq!(cfg.files, PrivacyTier::Disabled);
        assert_eq!(cfg.processes, PrivacyTier::Disabled);
        assert_eq!(cfg.usb, PrivacyTier::Disabled);
        assert_eq!(cfg.login_behavior, PrivacyTier::Disabled);
        assert_eq!(cfg.network, PrivacyTier::Disabled);
        assert_eq!(cfg.email_cloud, PrivacyTier::Disabled);
    }
}
