pub fn os_name() -> &'static str {
    std::env::consts::OS
}

pub fn architecture() -> &'static str {
    std::env::consts::ARCH
}

pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

pub fn is_linux() -> bool {
    cfg!(target_os = "linux")
}

pub fn is_macos() -> bool {
    cfg!(target_os = "macos")
}

pub fn platform_label() -> &'static str {
    if is_windows() {
        "windows"
    } else if is_linux() {
        "linux"
    } else if is_macos() {
        "macos"
    } else {
        "unknown"
    }
}
