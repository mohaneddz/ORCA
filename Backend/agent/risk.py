# ---------------------------------------------------------------------------
# Backend risk scoring engine  — v2 (new JSON format)
# ---------------------------------------------------------------------------
# Payload structure (from Tauri agent v2):
#   hardware.*        — hostname, OS, CPU, RAM, disk, machineUuid, primaryMac
#   patchStatus.*     — isCurrent, lastUpdated, daysSinceUpdate
#   antivirus.*       — avDetected, productName, enabledStatus, signatureUpToDate
#   diskEncryption.*  — encrypted, provider
#   usb.*             — enabled, devices, events
#   wifi.*            — profiles[].isOpenNetwork
#   lan.*             — devices[] (peer discovery)
#   localPorts.*      — ports[].port / protocol / riskLevel
#   software.*        — software[].name / version / riskFlag
#   processes[]       — PENDING (added in future agent version)
#   firewall          — PENDING (added in future agent version)
# ---------------------------------------------------------------------------

_RISKY_PORTS = {
    3389: "RDP (3389) exposed",
    445:  "SMB (445) exposed",
    22:   "SSH (22) exposed",
    5900: "VNC (5900) exposed",
    23:   "Telnet (23) exposed",
    21:   "FTP (21) exposed",
    135:  "Microsoft RPC (135) exposed",
    1433: "MSSQL (1433) exposed",
    3306: "MySQL (3306) exposed",
    5432: "PostgreSQL (5432) exposed",
    6379: "Redis (6379) exposed",
    27017: "MongoDB (27017) exposed",
}

# EOL / known-risky software — case-insensitive substring match on name
_EOL_SOFTWARE = [
    "adobe flash",
    "java se 6",
    "java se 7",
    "java se 8",
    "winrar 5.",
    "internet explorer",
    "windows xp",
    "windows 7",
    "silverlight",
    "adobe acrobat reader dc 20",  # pre-2022 versions
]


def compute_risk(payload: dict) -> dict:
    score = 100
    signals = []

    av = payload.get("antivirus") or {}
    patch = payload.get("patchStatus") or {}
    disk_enc = payload.get("diskEncryption") or {}
    usb = payload.get("usb") or {}
    ports_block = payload.get("localPorts") or {}
    software = payload.get("software") or {}
    wifi = payload.get("wifi") or {}
    hardware = payload.get("hardware") or {}

    # ── Antivirus ─────────────────────────────────────────────────────────
    av_detected = av.get("avDetected")
    av_enabled = av.get("enabledStatus")
    av_up_to_date = av.get("signatureUpToDate")
    av_name = av.get("productName") or "unknown"

    if av_detected is False:
        score -= 20
        signals.append("No antivirus software detected")
    elif av_detected is True:
        if av_enabled is False:
            score -= 15
            signals.append(f"Antivirus ({av_name}) detected but not enabled")
        elif av_enabled is None:
            score -= 8
            signals.append(f"Antivirus ({av_name}) detected but status unconfirmed")
        if av_up_to_date is False:
            score -= 8
            signals.append(f"Antivirus ({av_name}) signatures are out of date")
    else:
        # avDetected is None — cannot determine
        score -= 10
        signals.append("Antivirus detection status unknown")

    # ── Disk encryption ───────────────────────────────────────────────────
    encrypted = disk_enc.get("encrypted")
    provider = disk_enc.get("provider") or ""
    provider_label = f" ({provider})" if provider else ""
    if encrypted is False:
        score -= 15
        signals.append(f"Disk encryption{provider_label} is disabled")
    elif encrypted is None:
        score -= 5
        signals.append("Disk encryption status unknown")

    # ── OS / patch status ─────────────────────────────────────────────────
    patch_current = patch.get("isCurrent")
    days_since = patch.get("daysSinceUpdate")
    if patch_current is False:
        score -= 15
        detail = f" ({days_since} days since last update)" if days_since else ""
        signals.append(f"OS is not up to date{detail}")
    elif patch_current is None:
        score -= 5
        signals.append("OS update status unknown")

    # ── USB enabled ───────────────────────────────────────────────────────
    if usb.get("enabled") is True:
        score -= 5
        signals.append("USB ports are enabled (potential data exfiltration vector)")

    # ── Open (unencrypted) WiFi in saved profiles ─────────────────────────
    wifi_profiles = wifi.get("profiles") or []
    open_nets = [p for p in wifi_profiles if p.get("isOpenNetwork") is True]
    if open_nets:
        deduction = min(16, len(open_nets) * 8)
        score -= deduction
        ssids = ", ".join(p["ssid"] for p in open_nets[:2] if p.get("ssid"))
        signals.append(
            f"{len(open_nets)} open (unencrypted) WiFi network(s) in saved profiles"
            + (f": {ssids}" if ssids else "")
        )

    # ── Low disk space ────────────────────────────────────────────────────
    disk_total = hardware.get("diskTotalGb") or 0
    disk_free = hardware.get("diskFreeGb")
    if disk_total and disk_free is not None:
        free_pct = disk_free / disk_total * 100
        if free_pct < 10:
            score -= 5
            signals.append(
                f"Low disk space: {disk_free:.0f} GB free ({free_pct:.0f}% remaining)"
            )

    # ── Risky listening ports ─────────────────────────────────────────────
    ports_list = ports_block.get("ports") or []
    open_port_numbers = {p.get("port") for p in ports_list if p.get("port")}
    for port, label in _RISKY_PORTS.items():
        if port in open_port_numbers:
            score -= 12
            signals.append(label)

    # ── EOL / known-risky software ────────────────────────────────────────
    sw_list = (software.get("software") or []) if isinstance(software, dict) else []
    eol_found = []
    for item in sw_list:
        name_lower = (item.get("name") or "").lower()
        if any(eol in name_lower for eol in _EOL_SOFTWARE):
            eol_found.append(item.get("name"))
    if eol_found:
        score -= min(20, len(eol_found) * 7)
        signals.append(
            f"EOL/risky software detected: "
            + ", ".join(eol_found[:3])
        )

    # ── Agent-flagged software ────────────────────────────────────────────
    flagged_sw = [s for s in sw_list if s.get("riskFlag")]
    if flagged_sw:
        score -= min(15, len(flagged_sw) * 5)
        signals.append(
            f"{len(flagged_sw)} software item(s) flagged as risky: "
            + ", ".join(s["name"] for s in flagged_sw[:3])
        )

    # ── Firewall — PENDING ────────────────────────────────────────────────
    # Will be re-enabled once the agent sends firewall data.

    # ── Processes — PENDING ───────────────────────────────────────────────
    # Will be re-enabled once the agent sends processes[].

    # ── Floor at 0 ────────────────────────────────────────────────────────
    score = max(0, score)

    # ── Level ─────────────────────────────────────────────────────────────
    if score >= 80:
        level = "low"
    elif score >= 55:
        level = "medium"
    elif score >= 30:
        level = "high"
    else:
        level = "critical"

    return {"score": score, "level": level, "signals": signals}
