use serde::Serialize;
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("unsupported platform: {0}")]
    UnsupportedPlatform(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("command failed: {0}")]
    CommandFailed(String),
    #[error("parse error: {0}")]
    Parse(String),
    #[error("collection error: {0}")]
    Collection(String),
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::Parse(value.to_string())
    }
}
