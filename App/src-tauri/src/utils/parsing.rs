use chrono::{DateTime, Utc};

pub fn parse_first_ipv4(text: &str) -> Option<String> {
    for token in text.split_whitespace() {
        let candidate = token.trim_matches(|c: char| !c.is_ascii_digit() && c != '.');
        if is_ipv4(candidate) {
            return Some(candidate.to_string());
        }
    }
    None
}

pub fn is_ipv4(value: &str) -> bool {
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() != 4 {
        return false;
    }
    parts.iter().all(|part| part.parse::<u8>().is_ok())
}

pub fn days_since(timestamp: DateTime<Utc>) -> i64 {
    let now = Utc::now();
    (now - timestamp).num_days()
}

pub fn parse_port_from_address(value: &str) -> Option<u16> {
    let normalized = value
        .trim_matches(|c| c == '[' || c == ']')
        .trim_end_matches(":*");
    let (_, port_str) = normalized.rsplit_once(':')?;
    port_str.parse::<u16>().ok()
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, Utc};

    use super::{days_since, is_ipv4, parse_first_ipv4, parse_port_from_address};

    #[test]
    fn parses_ipv4() {
        assert_eq!(
            parse_first_ipv4("inet 192.168.1.20 mask"),
            Some("192.168.1.20".to_string())
        );
        assert!(is_ipv4("10.0.0.1"));
        assert!(!is_ipv4("10.0.0"));
    }

    #[test]
    fn parses_port() {
        assert_eq!(parse_port_from_address("0.0.0.0:3389"), Some(3389));
        assert_eq!(parse_port_from_address("[::1]:8080"), Some(8080));
    }

    #[test]
    fn calculates_days_since() {
        let ts = Utc::now() - Duration::days(35);
        assert!(days_since(ts) >= 34);
    }
}
