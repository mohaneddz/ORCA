# ---------------------------------------------------------------------------
# Backend risk scoring engine
# ---------------------------------------------------------------------------
# Takes the parsed snapshot payload and returns:
#   {"score": int 0-100, "level": str, "signals": [str, ...]}
#
# Scoring is additive penalty-based starting from 100.
# Each signal deducts points. Multiple signals stack.
# ---------------------------------------------------------------------------

_SUSPICIOUS_PATHS = (
    "\\downloads\\",
    "\\temp\\",
    "\\appdata\\local\\temp\\",
    "\\appdata\\roaming\\",
    "%temp%",
    "/tmp/",
    "/var/tmp/",
    "/dev/shm/",
)

_RISKY_PORTS = {
    3389: "RDP (3389) exposed",
    445: "SMB (445) exposed",
    22: "SSH (22) exposed",
    5900: "VNC (5900) exposed",
    23: "Telnet (23) exposed",
    21: "FTP (21) exposed",
    1433: "MSSQL (1433) exposed",
    3306: "MySQL (3306) exposed",
    5432: "PostgreSQL (5432) exposed",
    6379: "Redis (6379) exposed",
    27017: "MongoDB (27017) exposed",
}


def compute_risk(payload: dict) -> dict:
    score = 100
    signals = []

    security = payload.get("security") or {}
    user = payload.get("user") or {}
    processes = payload.get("processes") or []
    network = payload.get("network") or {}
    software = payload.get("software") or {}

    # ── Antivirus ─────────────────────────────────────────────────────────
    antivirus_list = security.get("antivirus") or []
    av_enabled = any(
        av.get("enabled") is True for av in antivirus_list
    )
    if not antivirus_list:
        score -= 20
        signals.append("No antivirus software detected")
    elif not av_enabled:
        score -= 15
        signals.append("Antivirus present but not confirmed enabled")
    else:
        av_outdated = any(
            av.get("enabled") is True and av.get("upToDate") is False
            for av in antivirus_list
        )
        if av_outdated:
            score -= 8
            signals.append("Antivirus out of date")

    # ── Firewall ──────────────────────────────────────────────────────────
    firewall = security.get("firewallStatus", "unknown")
    if firewall == "disabled":
        score -= 20
        signals.append("Firewall is disabled")
    elif firewall == "unknown":
        score -= 8
        signals.append("Firewall status unknown")

    # ── Disk encryption ───────────────────────────────────────────────────
    disk_enc = security.get("diskEncryptionEnabled")
    if disk_enc is False:
        score -= 15
        signals.append("Disk encryption is disabled")
    elif disk_enc is None:
        score -= 5
        signals.append("Disk encryption status unknown")

    # ── OS updates ────────────────────────────────────────────────────────
    os_current = security.get("osUpdatesCurrent")
    if os_current is False:
        score -= 15
        signals.append("OS is not up to date")
    elif os_current is None:
        score -= 5
        signals.append("OS update status unknown")

    # ── Local admin privileges ────────────────────────────────────────────
    if user.get("isAdminEstimate") is True:
        score -= 10
        signals.append("Current user has local admin privileges")

    local_admins = user.get("localAdmins") or []
    if len(local_admins) > 2:
        score -= 8
        signals.append(f"{len(local_admins)} local admin accounts detected")

    # ── Suspicious processes ──────────────────────────────────────────────
    suspicious_procs = [
        p for p in processes
        if p.get("executablePath") and any(
            sus in (p["executablePath"] or "").lower()
            for sus in _SUSPICIOUS_PATHS
        )
    ]
    if suspicious_procs:
        deduction = min(15, len(suspicious_procs))
        score -= deduction
        signals.append(
            f"{len(suspicious_procs)} process(es) running from suspicious paths "
            f"(Downloads/Temp/AppData)"
        )

    # ── Risky listening ports ─────────────────────────────────────────────
    listening_ports = network.get("listeningPorts") or []
    open_port_numbers = {p.get("port") for p in listening_ports}
    for port, label in _RISKY_PORTS.items():
        if port in open_port_numbers:
            score -= 12
            signals.append(label)

    # ── Software risk flags ───────────────────────────────────────────────
    sw_list = (software.get("software") or []) if isinstance(software, dict) else []
    flagged_sw = [s for s in sw_list if s.get("riskFlag")]
    if flagged_sw:
        score -= min(15, len(flagged_sw) * 5)
        signals.append(
            f"{len(flagged_sw)} software item(s) flagged as risky: "
            + ", ".join(s["name"] for s in flagged_sw[:3])
        )

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
