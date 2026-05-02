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


def _normalize_payload(payload: dict) -> dict:
    """
    Normalise both old-format (device/security/network) and new-format
    (hardware/patchStatus/antivirus/diskEncryption/localPorts) payloads
    into the new-format structure so compute_risk works with a single schema.
    Missing keys are left absent (treated as None/unknown by callers).
    """
    out = dict(payload)

    # ── hardware ──────────────────────────────────────────────────────────
    if not out.get("hardware"):
        _dev = payload.get("device") or {}
        if _dev:
            out["hardware"] = {
                "hostname": _dev.get("hostname", ""),
                "osName": _dev.get("osName", ""),
                "osVersion": _dev.get("osVersion", ""),
                "osBuild": _dev.get("kernelVersion", ""),
                "cpuModel": "",
                "ramTotalMb": (_dev.get("hardware") or {}).get("totalMemoryMb"),
                "diskTotalGb": None,
                "diskFreeGb": None,
                "machineUuid": "",
                "primaryMacAddress": "",
            }

    _sec = payload.get("security") or {}

    # ── antivirus ─────────────────────────────────────────────────────────
    if not out.get("antivirus"):
        _av_list = _sec.get("antivirus") or []
        if _av_list:
            first = _av_list[0]
            out["antivirus"] = {
                "avDetected": True,
                "productName": first.get("name"),
                "enabledStatus": first.get("enabled"),
                "signatureUpToDate": first.get("upToDate"),
            }

    # ── patchStatus ───────────────────────────────────────────────────────
    if not out.get("patchStatus"):
        os_current = _sec.get("osUpdatesCurrent")
        if os_current is not None:
            out["patchStatus"] = {"isCurrent": os_current, "lastUpdated": None, "daysSinceUpdate": None}

    # ── diskEncryption ────────────────────────────────────────────────────
    if not out.get("diskEncryption"):
        enc_val = _sec.get("diskEncryptionEnabled")
        if enc_val is not None:
            out["diskEncryption"] = {"encrypted": enc_val, "provider": ""}

    # ── localPorts ────────────────────────────────────────────────────────
    if not out.get("localPorts"):
        _net = payload.get("network") or {}
        _old_ports = _net.get("listeningPorts") or []
        if _old_ports:
            out["localPorts"] = {
                "ports": [
                    {"port": p.get("port"), "protocol": p.get("protocol"), "owningProcess": p.get("process"), "riskLevel": "unknown"}
                    for p in _old_ports if p.get("port")
                ]
            }

    return out


def compute_risk(payload: dict) -> dict:
    payload = _normalize_payload(payload)
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


# ---------------------------------------------------------------------------
# Network Device Risk  (SNMP / NetFlow payload)
# ---------------------------------------------------------------------------
# Expected payload keys (all optional — missing = unknown, no penalty):
#   device.ip, device.hostname, device.type, device.vendor, device.sysDescr
#   interfaces[]:  { name, operStatus, ifInErrors, ifOutErrors }
#   traffic:       { inBytes, outBytes }
# ---------------------------------------------------------------------------

def compute_network_risk(payload: dict) -> dict:
    score = 100
    signals = []

    interfaces = payload.get("interfaces") or []

    # ── Interfaces down ───────────────────────────────────────────────────
    down = [i for i in interfaces if str(i.get("operStatus", "")).lower() not in ("up", "1")]
    if down:
        deduction = min(30, len(down) * 10)
        score -= deduction
        signals.append(f"{len(down)} interface(s) are down")

    # ── High error rate on interfaces ─────────────────────────────────────
    _ERROR_THRESHOLD = 1000
    high_err = [
        i for i in interfaces
        if (i.get("ifInErrors") or 0) + (i.get("ifOutErrors") or 0) > _ERROR_THRESHOLD
    ]
    if high_err:
        deduction = min(25, len(high_err) * 8)
        score -= deduction
        signals.append(f"{len(high_err)} interface(s) with high error counts (>{_ERROR_THRESHOLD})")

    # ── No interfaces reported at all ─────────────────────────────────────
    if not interfaces:
        score -= 10
        signals.append("No interface data reported — SNMP collection may be incomplete")

    score = max(0, score)
    if score >= 80:
        level = "low"
    elif score >= 55:
        level = "medium"
    elif score >= 30:
        level = "high"
    else:
        level = "critical"

    return {"score": score, "level": level, "signals": signals}


# ---------------------------------------------------------------------------
# System Metrics Risk  (Node Exporter / Telegraf payload)
# ---------------------------------------------------------------------------
# Expected payload keys (all optional):
#   cpu:       { usagePercent, cores, load1m, load5m, load15m }
#   memory:    { totalMb, usedMb, usagePercent, swapUsagePercent }
#   processes: { total, zombies, topByCpu: [{name, pid, cpuPercent}] }
# ---------------------------------------------------------------------------

def compute_system_risk(payload: dict) -> dict:
    score = 100
    signals = []

    cpu = payload.get("cpu") or {}
    memory = payload.get("memory") or {}
    processes = payload.get("processes") or {}

    # ── CPU usage ─────────────────────────────────────────────────────────
    cpu_pct = cpu.get("usagePercent")
    if cpu_pct is not None:
        if cpu_pct >= 95:
            score -= 20
            signals.append(f"CPU critically overloaded: {cpu_pct:.1f}%")
        elif cpu_pct >= 80:
            score -= 10
            signals.append(f"CPU usage is high: {cpu_pct:.1f}%")

    # ── Load average (1m) vs cores ────────────────────────────────────────
    load1 = cpu.get("load1m")
    cores = cpu.get("cores") or 1
    if load1 is not None:
        load_ratio = load1 / cores
        if load_ratio >= 2.0:
            score -= 15
            signals.append(f"Load average critically high: {load1:.2f} on {cores} cores (ratio {load_ratio:.1f}x)")
        elif load_ratio >= 1.0:
            score -= 7
            signals.append(f"Load average above core count: {load1:.2f} on {cores} cores")

    # ── RAM usage ─────────────────────────────────────────────────────────
    ram_pct = memory.get("usagePercent")
    if ram_pct is not None:
        if ram_pct >= 95:
            score -= 20
            signals.append(f"RAM critically full: {ram_pct:.1f}% used")
        elif ram_pct >= 85:
            score -= 10
            signals.append(f"RAM usage is high: {ram_pct:.1f}% used")

    # ── Swap usage ────────────────────────────────────────────────────────
    swap_pct = memory.get("swapUsagePercent")
    if swap_pct is not None and swap_pct >= 80:
        score -= 10
        signals.append(f"Swap usage is high: {swap_pct:.1f}% — system may be under memory pressure")

    # ── Zombie processes ──────────────────────────────────────────────────
    zombies = processes.get("zombies") or 0
    if zombies >= 5:
        score -= 10
        signals.append(f"{zombies} zombie process(es) detected")
    elif zombies > 0:
        score -= 3
        signals.append(f"{zombies} zombie process(es) detected")

    score = max(0, score)
    if score >= 80:
        level = "low"
    elif score >= 55:
        level = "medium"
    elif score >= 30:
        level = "high"
    else:
        level = "critical"

    return {"score": score, "level": level, "signals": signals}


# ---------------------------------------------------------------------------
# Disk Health Risk  (smartctl / pySMART payload)
# ---------------------------------------------------------------------------
# Expected payload keys (all optional):
#   device:           { path, model, serial, capacityGb, type }
#   smart:
#     health:              PASSED | FAILED | UNKNOWN
#     reallocatedSectors:  int
#     pendingSectors:      int
#     uncorrectableErrors: int
#     powerOnHours:        int
#     temperatureC:        int
# ---------------------------------------------------------------------------

def compute_disk_risk(payload: dict) -> dict:
    score = 100
    signals = []

    smart = payload.get("smart") or {}
    device = payload.get("device") or {}

    # ── Overall SMART health ──────────────────────────────────────────────
    health = str(smart.get("health") or "UNKNOWN").upper()
    if health == "FAILED":
        score -= 40
        signals.append("SMART health check FAILED — disk failure imminent")
    elif health == "UNKNOWN":
        score -= 5
        signals.append("SMART health status unknown")

    # ── Reallocated sectors ───────────────────────────────────────────────
    reallocated = smart.get("reallocatedSectors")
    if reallocated is not None:
        if reallocated >= 50:
            score -= 25
            signals.append(f"Critical: {reallocated} reallocated sectors detected")
        elif reallocated >= 10:
            score -= 15
            signals.append(f"Warning: {reallocated} reallocated sectors detected")
        elif reallocated > 0:
            score -= 5
            signals.append(f"{reallocated} reallocated sector(s) — monitor closely")

    # ── Pending sectors ───────────────────────────────────────────────────
    pending = smart.get("pendingSectors")
    if pending is not None and pending > 0:
        score -= min(20, pending * 2)
        signals.append(f"{pending} pending (unstable) sector(s) — potential data loss risk")

    # ── Uncorrectable errors ──────────────────────────────────────────────
    uncorrectable = smart.get("uncorrectableErrors")
    if uncorrectable is not None and uncorrectable > 0:
        score -= min(20, uncorrectable * 4)
        signals.append(f"{uncorrectable} uncorrectable error(s) — data integrity at risk")

    # ── Temperature ───────────────────────────────────────────────────────
    temp = smart.get("temperatureC")
    if temp is not None:
        if temp >= 60:
            score -= 15
            signals.append(f"Disk temperature critically high: {temp}°C")
        elif temp >= 50:
            score -= 7
            signals.append(f"Disk temperature elevated: {temp}°C")

    # ── Power-on hours (age estimate) ─────────────────────────────────────
    poh = smart.get("powerOnHours")
    disk_type = str(device.get("type") or "").upper()
    if poh is not None:
        # HDD lifespan ~35,000 h, SSD ~40,000 h
        threshold = 35000 if "HDD" in disk_type else 40000
        if poh >= threshold:
            score -= 10
            signals.append(f"Disk has {poh:,} power-on hours — nearing end-of-life")
        elif poh >= threshold * 0.75:
            score -= 5
            signals.append(f"Disk has {poh:,} power-on hours — approaching aging threshold")

    score = max(0, score)
    if score >= 80:
        level = "low"
    elif score >= 55:
        level = "medium"
    elif score >= 30:
        level = "high"
    else:
        level = "critical"

    return {"score": score, "level": level, "signals": signals}
