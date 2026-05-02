use sysinfo::{ProcessesToUpdate, System};

use crate::models::process::ProcessInfo;
use crate::utils::errors::AppResult;

pub fn collect_processes(include_command_line: bool) -> AppResult<Vec<ProcessInfo>> {
    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let mut processes = Vec::with_capacity(system.processes().len());

    for (pid, proc_info) in system.processes() {
        let name = proc_info.name().to_string_lossy().to_string();
        let executable_path = proc_info
            .exe()
            .map(|path| path.to_string_lossy().to_string());
        let parent_pid = proc_info.parent().map(|parent| parent.as_u32() as i32);

        let command_line = if include_command_line {
            let collected = proc_info
                .cmd()
                .iter()
                .map(|item| item.to_string_lossy().to_string())
                .collect::<Vec<String>>()
                .join(" ");
            if collected.is_empty() {
                None
            } else {
                Some(collected)
            }
        } else {
            None
        };

        processes.push(ProcessInfo {
            pid: pid.as_u32() as i32,
            parent_pid,
            name,
            executable_path,
            cpu_usage_percent: proc_info.cpu_usage(),
            memory_bytes: proc_info.memory(),
            command_line,
        });
    }

    Ok(processes)
}
