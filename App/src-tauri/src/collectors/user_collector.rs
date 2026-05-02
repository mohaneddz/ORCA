use crate::models::user::{LocalUser, UserPosture};
use crate::utils::errors::AppResult;

pub fn collect_user_posture() -> AppResult<UserPosture> {
    let username = whoami::username().unwrap_or_else(|_| "unknown".to_string());
    let current_user = whoami::realname().unwrap_or_else(|_| username.clone());
    let is_admin_estimate = detect_admin_estimate();

    let local_users = vec![LocalUser {
        username: username.clone(),
        is_admin: is_admin_estimate,
    }];

    let local_admins = if is_admin_estimate == Some(true) {
        vec![username.clone()]
    } else {
        Vec::new()
    };

    Ok(UserPosture {
        current_user,
        username,
        is_admin_estimate,
        local_users,
        local_admins,
    })
}

#[cfg(target_os = "windows")]
fn detect_admin_estimate() -> Option<bool> {
    use std::process::Command;

    let output = Command::new("whoami").args(["/groups"]).output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    Some(text.contains("S-1-5-32-544") || text.contains("Administrators"))
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn detect_admin_estimate() -> Option<bool> {
    use std::process::Command;

    let output = Command::new("id").arg("-u").output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    Some(text.trim() == "0")
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
fn detect_admin_estimate() -> Option<bool> {
    None
}

#[cfg(test)]
mod tests {
    use super::collect_user_posture;

    #[test]
    fn collects_user_posture_shape() {
        let user = collect_user_posture().expect("user posture should collect");
        assert!(!user.username.is_empty());
        assert!(!user.current_user.is_empty());
        assert!(!user.local_users.is_empty());
        assert_eq!(user.local_users[0].username, user.username);
    }
}
