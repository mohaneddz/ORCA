use sha2::{Digest, Sha256};

fn to_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        output.push_str(&format!("{:02x}", b));
    }
    output
}

pub fn salted_sha256(value: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(b":");
    hasher.update(value.as_bytes());
    to_hex(&hasher.finalize())
}

pub fn anonymize_username(username: &str, salt: &str) -> String {
    salted_sha256(username, salt)
}

pub fn anonymize_device_id(device_id: &str, salt: &str) -> String {
    salted_sha256(device_id, salt)
}

pub fn anonymize_domain(domain: &str, salt: &str) -> String {
    salted_sha256(&domain.to_lowercase(), salt)
}

pub fn anonymize_file_path(path: &str, salt: &str) -> String {
    salted_sha256(path, salt)
}

#[cfg(test)]
mod tests {
    use super::{anonymize_domain, anonymize_file_path, anonymize_username, salted_sha256};

    #[test]
    fn salted_hash_is_stable() {
        let a = salted_sha256("alice", "pepper");
        let b = salted_sha256("alice", "pepper");
        assert_eq!(a, b);
        assert_eq!(a.len(), 64);
    }

    #[test]
    fn salted_hash_changes_with_salt() {
        let a = salted_sha256("alice", "pepper-a");
        let b = salted_sha256("alice", "pepper-b");
        assert_ne!(a, b);
    }

    #[test]
    fn domain_and_path_anonymization_hide_raw_values() {
        let domain_hash = anonymize_domain("Example.COM", "salt");
        let path_hash = anonymize_file_path("C:/Users/alice/Downloads/tool.exe", "salt");
        let user_hash = anonymize_username("alice", "salt");

        assert_ne!(domain_hash, "Example.COM");
        assert_ne!(path_hash, "C:/Users/alice/Downloads/tool.exe");
        assert_ne!(user_hash, "alice");
    }
}
