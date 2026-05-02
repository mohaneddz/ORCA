use crate::models::startup::StartupPersistenceStatus;
use crate::utils::errors::AppResult;

pub fn get_startup_persistence_status(enabled_flag: bool) -> AppResult<StartupPersistenceStatus> {
    Ok(StartupPersistenceStatus {
        enabled: false,
        supported: true,
        method: platform_method(),
        details: if enabled_flag {
            "Startup persistence helpers available; currently not enabled.".to_string()
        } else {
            "Startup persistence disabled by config.".to_string()
        },
    })
}

pub fn enable_startup_persistence(enabled_flag: bool) -> AppResult<StartupPersistenceStatus> {
    if !enabled_flag {
        return Ok(StartupPersistenceStatus {
            enabled: false,
            supported: true,
            method: platform_method(),
            details: "Refused because enable_startup_persistence config flag is false.".to_string(),
        });
    }

    Ok(StartupPersistenceStatus {
        enabled: true,
        supported: true,
        method: platform_method(),
        details: startup_template(),
    })
}

pub fn disable_startup_persistence(_enabled_flag: bool) -> AppResult<StartupPersistenceStatus> {
    Ok(StartupPersistenceStatus {
        enabled: false,
        supported: true,
        method: platform_method(),
        details: "Startup persistence template disabled.".to_string(),
    })
}

fn platform_method() -> String {
    #[cfg(target_os = "windows")]
    {
        return "task_scheduler".to_string();
    }
    #[cfg(target_os = "macos")]
    {
        return "launch_agent".to_string();
    }
    #[cfg(target_os = "linux")]
    {
        return "systemd_user".to_string();
    }

    #[allow(unreachable_code)]
    "unknown".to_string()
}

fn startup_template() -> String {
    #[cfg(target_os = "windows")]
    {
        return "schtasks /Create /SC ONLOGON /TN ORCAAgent /TR \"orca.exe\"".to_string();
    }

    #[cfg(target_os = "macos")]
    {
        return "~/Library/LaunchAgents/com.orca.agent.plist template generated".to_string();
    }

    #[cfg(target_os = "linux")]
    {
        return "~/.config/systemd/user/orca-agent.service template generated".to_string();
    }

    #[allow(unreachable_code)]
    "unsupported".to_string()
}

#[cfg(test)]
mod tests {
    use super::get_startup_persistence_status;

    #[test]
    fn startup_persistence_disabled_by_default() {
        let status = get_startup_persistence_status(false).expect("status should collect");
        assert!(!status.enabled);
    }
}
