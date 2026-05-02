use std::process::Command;

use crate::utils::errors::{AppError, AppResult};

pub fn run_command(program: &str, args: &[&str]) -> AppResult<String> {
    let output = Command::new(program).args(args).output()?;
    if !output.status.success() {
        return Err(AppError::CommandFailed(format!(
            "{} {:?} exited with code {:?}",
            program,
            args,
            output.status.code()
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
