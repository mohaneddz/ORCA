use std::process::Command;

use crate::utils::errors::{AppError, AppResult};

pub fn run_command(program: &str, args: &[&str]) -> AppResult<String> {
    let output = Command::new(program).args(args).output()?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(AppError::CommandFailed(format!(
            "{} {:?} exited with code {:?}: {}",
            program,
            args,
            output.status.code(),
            stderr
        )));
    }

    let mut stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.len() > 2_000_000 {
        stdout.truncate(2_000_000);
    }
    Ok(stdout)
}
