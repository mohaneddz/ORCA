use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub fn stable_hash(input: &str) -> String {
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

#[cfg(test)]
mod tests {
    use super::stable_hash;

    #[test]
    fn hash_is_stable_for_same_input() {
        let a = stable_hash("alpha");
        let b = stable_hash("alpha");
        assert_eq!(a, b);
    }
}
