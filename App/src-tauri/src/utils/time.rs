use chrono::Utc;

pub fn now_utc_rfc3339() -> String {
    Utc::now().to_rfc3339()
}
