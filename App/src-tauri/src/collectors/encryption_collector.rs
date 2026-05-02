use crate::models::encryption::DiskEncryptionStatus;
use crate::utils::command::run_command;
use crate::utils::errors::AppResult;

pub fn collect_disk_encryption_status() -> AppResult<DiskEncryptionStatus> {
    #[cfg(target_os = "windows")]
    {
        return collect_windows();
    }

    #[cfg(target_os = "macos")]
    {
        return collect_macos();
    }

    #[cfg(target_os = "linux")]
    {
        return collect_linux();
    }

    #[allow(unreachable_code)]
    Ok(DiskEncryptionStatus {
        encrypted: false,
        provider: "unknown".to_string(),
        status_text: "unsupported platform".to_string(),
        supported: false,
    })
}

#[cfg(target_os = "windows")]
fn collect_windows() -> AppResult<DiskEncryptionStatus> {
    let output = run_command("manage-bde", &["-status"]).unwrap_or_default();
    Ok(parse_bitlocker_status(&output))
}

#[cfg(target_os = "macos")]
fn collect_macos() -> AppResult<DiskEncryptionStatus> {
    let output = run_command("fdesetup", &["status"]).unwrap_or_default();
    let lowered = output.to_lowercase();
    Ok(DiskEncryptionStatus {
        encrypted: lowered.contains("filevault is on"),
        provider: "FileVault".to_string(),
        status_text: output,
        supported: true,
    })
}

#[cfg(target_os = "linux")]
fn collect_linux() -> AppResult<DiskEncryptionStatus> {
    let output = run_command("sh", &["-c", "lsblk -f"])?;
    Ok(parse_luks_status(&output))
}

pub fn parse_bitlocker_status(output: &str) -> DiskEncryptionStatus {
    let lowered = output.to_lowercase();
    let encrypted = lowered.contains("percentage encrypted: 100")
        || lowered.contains("protection status: protection on");
    DiskEncryptionStatus {
        encrypted,
        provider: "BitLocker".to_string(),
        status_text: output.to_string(),
        supported: true,
    }
}

pub fn parse_luks_status(output: &str) -> DiskEncryptionStatus {
    let lowered = output.to_lowercase();
    let encrypted = lowered.contains("crypto_luks") || lowered.contains("luks");
    DiskEncryptionStatus {
        encrypted,
        provider: if encrypted {
            "LUKS".to_string()
        } else {
            "unknown".to_string()
        },
        status_text: output.to_string(),
        supported: true,
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_bitlocker_status, parse_luks_status};

    #[test]
    fn parses_bitlocker_sample() {
        let sample = "Protection Status: Protection On\nPercentage Encrypted: 100.0%";
        let status = parse_bitlocker_status(sample);
        assert!(status.encrypted);
    }

    #[test]
    fn parses_luks_sample() {
        let sample = "sda1 crypto_LUKS";
        let status = parse_luks_status(sample);
        assert!(status.encrypted);
        assert_eq!(status.provider, "LUKS");
    }
}
