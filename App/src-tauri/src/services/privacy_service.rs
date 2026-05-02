use crate::models::privacy::{PrivacyConfig, PrivacyTier};

pub fn sanitize_privacy_config(mut config: PrivacyConfig) -> PrivacyConfig {
    if config.raw_retention_hours == 0 {
        config.raw_retention_hours = 24;
    }
    if config.aggregate_retention_days == 0 {
        config.aggregate_retention_days = 30;
    }

    config
}

pub fn is_enabled(tier: &PrivacyTier) -> bool {
    !matches!(tier, PrivacyTier::Disabled)
}

#[cfg(test)]
mod tests {
    use crate::models::privacy::{PrivacyConfig, PrivacyTier};

    use super::{is_enabled, sanitize_privacy_config};

    #[test]
    fn sanitizes_retention_defaults() {
        let cfg = sanitize_privacy_config(PrivacyConfig {
            raw_retention_hours: 0,
            aggregate_retention_days: 0,
            ..PrivacyConfig::default()
        });

        assert_eq!(cfg.raw_retention_hours, 24);
        assert_eq!(cfg.aggregate_retention_days, 30);
    }

    #[test]
    fn disabled_tier_is_off() {
        assert!(!is_enabled(&PrivacyTier::Disabled));
        assert!(is_enabled(&PrivacyTier::Safe));
        assert!(is_enabled(&PrivacyTier::SensitiveOptIn));
    }
}
