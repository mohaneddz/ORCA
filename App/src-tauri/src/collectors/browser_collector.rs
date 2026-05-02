use crate::models::browser::{BrowserMetadata, InstalledBrowser};
use crate::utils::errors::AppResult;

pub fn collect_browser_metadata(enabled: bool) -> AppResult<BrowserMetadata> {
    if !enabled {
        return Ok(BrowserMetadata {
            enabled: false,
            browsers: Vec::new(),
            recent_downloads: Vec::new(),
            notes: vec!["Browser metadata collection is disabled by config.".to_string()],
        });
    }

    Ok(BrowserMetadata {
        enabled: true,
        browsers: detect_browsers(),
        recent_downloads: Vec::new(),
        notes: vec![
            "Metadata only. Full browsing history and page content are intentionally not collected.".to_string(),
            "Recent download metadata integration is optional and should remain policy-controlled.".to_string(),
        ],
    })
}

fn detect_browsers() -> Vec<InstalledBrowser> {
    let mut browsers = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if std::path::Path::new("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
            .exists()
        {
            browsers.push(InstalledBrowser {
                name: "Google Chrome".to_string(),
                version: None,
                extensions_count: None,
            });
        }

        if std::path::Path::new("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
            .exists()
        {
            browsers.push(InstalledBrowser {
                name: "Microsoft Edge".to_string(),
                version: None,
                extensions_count: None,
            });
        }

        if std::path::Path::new("C:\\Program Files\\Mozilla Firefox\\firefox.exe").exists() {
            browsers.push(InstalledBrowser {
                name: "Mozilla Firefox".to_string(),
                version: None,
                extensions_count: None,
            });
        }
    }

    #[cfg(target_os = "linux")]
    {
        for name in ["google-chrome", "chromium", "firefox"] {
            if std::process::Command::new("sh")
                .args(["-c", &format!("command -v {}", name)])
                .output()
                .map(|result| result.status.success())
                .unwrap_or(false)
            {
                browsers.push(InstalledBrowser {
                    name: name.to_string(),
                    version: None,
                    extensions_count: None,
                });
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        for (name, path) in [
            ("Safari", "/Applications/Safari.app"),
            ("Google Chrome", "/Applications/Google Chrome.app"),
            ("Mozilla Firefox", "/Applications/Firefox.app"),
        ] {
            if std::path::Path::new(path).exists() {
                browsers.push(InstalledBrowser {
                    name: name.to_string(),
                    version: None,
                    extensions_count: None,
                });
            }
        }
    }

    browsers
}
