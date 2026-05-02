use std::collections::HashMap;

fn oui_table() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("00:1A:2B", "Cisco"),
        ("00:1B:63", "Apple"),
        ("3C:5A:B4", "Google"),
        ("B8:27:EB", "Raspberry Pi"),
        ("F4:F5:D8", "Dell"),
        ("D8:BB:2C", "Samsung"),
        ("00:50:56", "VMware"),
    ])
}

pub fn lookup_oui_vendor(mac: &str) -> Option<String> {
    let cleaned = mac.replace('-', ":").to_uppercase();
    let mut parts = cleaned.split(':');
    let prefix = format!("{}:{}:{}", parts.next()?, parts.next()?, parts.next()?);

    oui_table().get(prefix.as_str()).map(|v| (*v).to_string())
}

#[cfg(test)]
mod tests {
    use super::lookup_oui_vendor;

    #[test]
    fn looks_up_known_vendor() {
        let vendor = lookup_oui_vendor("00:1B:63:AA:BB:CC");
        assert_eq!(vendor, Some("Apple".to_string()));
    }

    #[test]
    fn returns_none_for_unknown_vendor() {
        assert_eq!(lookup_oui_vendor("AA:BB:CC:11:22:33"), None);
    }
}
