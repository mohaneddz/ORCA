# src-tauri Rust Identification

This document maps all Rust files in `App/src-tauri/src`, explains their logic, and identifies what data is collected from the user system.

## 1) High-level architecture

- Entry/runtime: `main.rs`, `lib.rs`
- Configuration: `config/*`
- Data contracts: `models/*`
- Data collection modules: `collectors/*`
- Orchestration and scoring: `services/*`
- Shared helpers: `utils/*`

The collection design is metadata-oriented for cyber posture. High-privacy modules are present but disabled by default via config.

## 2) File-by-file inventory

## Entry and command surface

- `App/src-tauri/src/main.rs`
  - Purpose: binary entrypoint.
  - Logic: calls `innov_lib::run()`.
  - Data collected: none.

- `App/src-tauri/src/lib.rs`
  - Purpose: app runtime wiring, tray/window behavior, Tauri command registration.
  - Main logic:
    - Manages runtime UI settings (`RuntimeSettings`) in app data file `app-settings.json`.
    - Tray icon/menu show/hide/quit actions.
    - Global shortcut toggle.
    - Registers posture commands:
      - `collect_device_info`
      - `collect_processes`
      - `collect_network_info`
      - `collect_security_posture`
      - `collect_full_posture`
      - `calculate_risk_score`
      - `get_app_config_defaults`
  - Data collected from system:
    - Reads/writes app-local settings file only.
    - Delegates posture/system reads to collector modules.

## Configuration

- `App/src-tauri/src/config/mod.rs`
  - Purpose: module export.
  - Data collected: none.

- `App/src-tauri/src/config/app_config.rs`
  - Purpose: `AppConfig` flags controlling collectors.
  - Default values:
    - `collect_browser_metadata: false`
    - `monitor_downloads_folder: false`
    - `collect_event_logs: false`
    - `collect_usb_events: false`
    - `collect_processes: true`
    - `collect_network: true`
    - `collect_software: true`
    - `collect_security_posture: true`
    - `include_process_command_line: true`
  - Data collected: none (configuration only).

- `App/src-tauri/src/config/permissions.rs`
  - Purpose: static permission metadata per collector with privacy level.
  - Marks high-privacy modules as disabled by default.
  - Data collected: none (policy metadata only).

## Models (data schemas)

- `App/src-tauri/src/models/mod.rs`: module export only.
- `device.rs`: `DeviceInfo`, `HardwareInfo`.
- `user.rs`: `UserPosture`, `LocalUser`.
- `security.rs`: firewall/antivirus/update posture types.
- `process.rs`: `ProcessInfo` (pid/name/path/cpu/memory/cmdline).
- `network.rs`: interface/ports/connection metadata structs.
- `software.rs`: installed software metadata structs.
- `filesystem.rs`: file metadata event/report structs.
- `event_log.rs`: event record/report structs.
- `browser.rs`: browser installation/download metadata structs.
- `usb.rs`: USB metadata/report structs.
- `risk.rs`: risk score struct.
- `posture.rs`: aggregated `PostureReport`.

These files define structure only; they do not collect data.

## Collectors (actual system reads)

- `App/src-tauri/src/collectors/mod.rs`
  - Purpose: module export.

- `device_collector.rs`
  - Logic: uses `sysinfo` and `hostname`.
  - Collects:
    - Hostname
    - OS name/version
    - Kernel version
    - Architecture
    - Uptime
    - Boot time
    - CPU core count
    - Total memory
  - Default state: active (through safe collectors).

- `user_collector.rs`
  - Logic: uses `whoami` + platform command checks for admin estimate.
  - Collects:
    - Username
    - Real/current user display name
    - Admin estimate
      - Windows: parses `whoami /groups`
      - Linux/macOS: checks `id -u == 0`
    - Local users/admin list placeholder (current user only in this implementation)
  - Default state: active (through full posture collection).

- `security_collector.rs`
  - Logic: posture model with placeholders; Windows Defender signal attempt.
  - Collects:
    - Firewall status (currently `Unknown` default)
    - Antivirus metadata (`name`, `enabled?`, `up_to_date?`)
      - Windows: PowerShell `Get-MpComputerStatus` parse attempt
    - Disk encryption/update/remote exposure placeholders
  - Default state: active.

- `process_collector.rs`
  - Logic: uses `sysinfo` process snapshot.
  - Collects per process:
    - PID
    - Parent PID
    - Name
    - Executable path (if available)
    - CPU usage
    - Memory bytes
    - Command line (if enabled by config)
  - Default state: active.

- `network_collector.rs`
  - Logic: uses `sysinfo::Networks` and `netstat` output parsing.
  - Collects:
    - Interface name
    - RX/TX byte totals
    - Listening ports (protocol + port)
      - Windows: `netstat -ano`
      - Linux/macOS: `netstat -an`
    - Active connections, gateway, DNS are placeholders in current implementation
  - Default state: active.

- `software_collector.rs`
  - Logic:
    - Windows: PowerShell query of uninstall registry keys (simplified parse)
    - Linux/macOS: placeholder report
  - Collects:
    - Software name
    - Optional version/vendor/location/source placeholders
  - Default state: active.

- `filesystem_collector.rs`
  - Logic: metadata snapshot of Downloads directory when enabled.
  - Collects only metadata:
    - Path
    - Filename
    - Extension
    - Size
    - Timestamp
    - Event kind (`snapshot`)
  - Explicitly does not read file content.
  - Default state: disabled.

- `event_log_collector.rs`
  - Logic: placeholder module (Windows-oriented security events).
  - Intended events (not fully implemented): failed logins, new services, admin group changes, Defender alerts, RDP logins, security log clear.
  - Default state: disabled.

- `browser_collector.rs`
  - Logic: detects installed browsers by known paths/commands.
  - Collects:
    - Browser name
    - Version placeholder
    - Extension count placeholder
    - Recent download metadata placeholder
  - Explicitly avoids full browsing history and page content collection.
  - Default state: disabled.

- `usb_collector.rs`
  - Logic: placeholder report.
  - Intended metadata:
    - Device name/vendor/serial/connection time
  - Default state: disabled.

## Services

- `App/src-tauri/src/services/mod.rs`
  - Purpose: module export.

- `posture_service.rs`
  - Purpose: orchestrates `collect_full_posture(config)`.
  - Logic:
    - Always collects safe baseline: device + user.
    - Conditionally collects security/process/network/software.
    - Runs filesystem/event-log/browser/usb only if explicitly enabled.
    - Computes risk score and attaches it to final report.
  - Data collected: union of enabled collectors.

- `risk_service.rs`
  - Purpose: compute risk score from collected posture.
  - Signals considered:
    - Missing/disabled AV
    - Firewall disabled/unknown
    - Unknown update status
    - Too many local admins
    - Risky open ports (e.g., 21, 23, 3389, 5900)
    - Processes executing from suspicious paths (Downloads/Temp/AppData)
    - Missing software inventory
  - Data collected: none new; operates on existing report.

## Utils

- `App/src-tauri/src/utils/mod.rs`: module export.
- `errors.rs`: app error types + serialization.
- `command.rs`: wrapper for shell command execution with error mapping.
- `hashing.rs`: stable hash helper.
- `platform.rs`: OS/arch helper checks.
- `time.rs`: UTC timestamp helper.

`utils` do not independently collect user data unless called by collectors/services.

## 3) What the Rust backend gets from the user system

Collected (current implementation):
- Host/device metadata: hostname, OS info, architecture, uptime, boot time.
- Hardware metadata: CPU core count, total memory.
- Current user metadata: username/display name, admin estimate.
- Process metadata: pid/ppid/name/path/cpu/memory/cmdline.
- Network metadata: interface byte counters, listening port metadata.
- Software metadata: limited inventory (strongest on Windows in current version).
- Security metadata: AV/firewall/update placeholders and Defender signal attempt.
- Optional metadata when enabled: Downloads file metadata snapshot.

Not collected by this Rust code:
- Passwords
- Keystrokes
- Screenshots
- Clipboard contents
- File contents
- Full browser history
- Private messages

Disabled by default:
- Browser metadata collection
- Downloads monitoring
- Event log collection
- USB event collection

## 4) Platform-specific behavior

- Windows-specific:
  - Defender query in security collector (`Get-MpComputerStatus`).
  - Admin estimate via `whoami /groups`.
  - Listening ports via `netstat -ano`.
  - Browser path checks in Program Files.
  - Software inventory via uninstall registry query.

- Linux/macOS:
  - Admin estimate via `id -u`.
  - Listening ports via `netstat -an`.
  - Browser detection via `command -v` (Linux) and app paths (macOS).
  - Software inventory mostly placeholder.

## 5) Notes for audit/compliance

- Risky collectors are present but gated by `AppConfig` and off by default.
- `collect_full_posture` respects config and omits disabled modules (`None`).
- Data model is posture telemetry oriented, not content surveillance.
