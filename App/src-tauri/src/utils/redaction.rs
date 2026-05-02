pub fn redact_path(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    let mut parts: Vec<&str> = normalized.split('/').collect();

    if parts.len() >= 3
        && parts[0].len() == 2
        && parts[0].ends_with(':')
        && parts[1].eq_ignore_ascii_case("users")
    {
        parts[2] = "<user>";
    }

    if parts.len() > 1 {
        for idx in 0..parts.len() - 1 {
            if parts[idx].eq_ignore_ascii_case("home") {
                parts[idx + 1] = "<user>";
            }
        }
    }

    parts.join("/")
}

pub fn categorize_domain(domain: &str) -> String {
    let lowered = domain.to_lowercase();
    if lowered.ends_with(".edu") {
        "education".to_string()
    } else if lowered.ends_with(".gov") {
        "government".to_string()
    } else if lowered.ends_with(".org") {
        "organization".to_string()
    } else if lowered.contains("bank") || lowered.contains("pay") {
        "finance".to_string()
    } else if lowered.ends_with(".local") {
        "internal".to_string()
    } else {
        "general".to_string()
    }
}

pub fn categorize_path(path: &str) -> String {
    let lowered = path.to_lowercase();
    if lowered.contains("downloads") {
        "downloads".to_string()
    } else if lowered.contains("temp") || lowered.contains("tmp") {
        "temp".to_string()
    } else if lowered.contains("program files") || lowered.contains("/usr/") {
        "system_app".to_string()
    } else {
        "other".to_string()
    }
}

pub fn is_risky_path(path: &str) -> bool {
    let lowered = path.to_lowercase();
    lowered.contains("downloads") || lowered.contains("temp") || lowered.contains("appdata")
}

#[cfg(test)]
mod tests {
    use super::{categorize_domain, categorize_path, is_risky_path, redact_path};

    #[test]
    fn redacts_windows_user_path() {
        let result = redact_path("C:/Users/alice/Downloads/file.exe");
        assert_eq!(result, "C:/Users/<user>/Downloads/file.exe");
    }

    #[test]
    fn categorizes_domain() {
        assert_eq!(categorize_domain("portal.gov"), "government");
        assert_eq!(categorize_domain("mail.bank-example.com"), "finance");
    }

    #[test]
    fn categorizes_and_flags_risky_path() {
        assert_eq!(
            categorize_path("C:/Users/alice/Downloads/file.exe"),
            "downloads"
        );
        assert!(is_risky_path("C:/Users/alice/AppData/Local/Temp/tool.exe"));
    }
}
