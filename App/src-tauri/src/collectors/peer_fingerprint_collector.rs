use crate::collectors::lan_collector::scan_local_network_arp;
use crate::models::lan::PeerOsFingerprint;
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

pub fn fingerprint_network_peers(enabled: bool) -> AppResult<Vec<PeerOsFingerprint>> {
    if !enabled {
        return Ok(Vec::new());
    }

    let scan = scan_local_network_arp()?;
    let mut fingerprints = Vec::new();

    for device in scan.devices.iter().take(32) {
        let ttl = ping_ttl(&device.ip).unwrap_or(0);
        let (family, confidence) = guess_os_family_from_ttl(ttl);
        if ttl > 0 {
            fingerprints.push(PeerOsFingerprint {
                ip: device.ip.clone(),
                ttl,
                guessed_os_family: family,
                confidence,
            });
        }
    }

    Ok(fingerprints)
}

fn ping_ttl(ip: &str) -> Option<u8> {
    let output = if cfg!(target_os = "windows") {
        run_command("ping", &["-n", "1", "-w", "500", ip]).ok()?
    } else {
        run_command("ping", &["-c", "1", "-W", "1", ip]).ok()?
    };

    parse_ttl(&output)
}

fn parse_ttl(output: &str) -> Option<u8> {
    let lowered = output.to_lowercase();
    for chunk in lowered.split_whitespace() {
        if let Some(value) = chunk.strip_prefix("ttl=") {
            if let Ok(ttl) = value
                .trim_matches(|c: char| !c.is_ascii_digit())
                .parse::<u8>()
            {
                return Some(ttl);
            }
        }
    }
    None
}

pub fn guess_os_family_from_ttl(ttl: u8) -> (String, f32) {
    match ttl {
        0 => ("unknown".to_string(), 0.0),
        1..=64 => ("linux/unix".to_string(), 0.75),
        65..=128 => ("windows".to_string(), 0.75),
        _ => ("network-device-or-custom".to_string(), 0.55),
    }
}

#[cfg(test)]
mod tests {
    use super::guess_os_family_from_ttl;

    #[test]
    fn guesses_os_family_from_ttl() {
        assert_eq!(guess_os_family_from_ttl(64).0, "linux/unix");
        assert_eq!(guess_os_family_from_ttl(128).0, "windows");
        assert_eq!(guess_os_family_from_ttl(200).0, "network-device-or-custom");
    }
}
