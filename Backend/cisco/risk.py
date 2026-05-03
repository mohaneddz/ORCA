"""
Cisco Device Risk & AI Scoring Engine
Computes risk scores, detects anomalies, and generates AI-powered recommendations
using SNMP snapshot data.
"""

import hashlib
import json
import os
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Risk signal definitions
# ---------------------------------------------------------------------------

CPU_WARN_THRESHOLD = 80.0    # %
CPU_CRIT_THRESHOLD = 95.0    # %
MEM_WARN_THRESHOLD = 85.0    # %
MEM_CRIT_THRESHOLD = 95.0    # %
TEMP_WARN_CELSIUS = 60.0
TEMP_CRIT_CELSIUS = 75.0
UPTIME_REBOOT_WINDOW = 3600  # seconds — flag if rebooted within 1h
ERROR_RATE_THRESHOLD = 0.01  # 1% of packets


def compute_cisco_risk(snapshot_data: dict) -> dict:
    """
    Given a normalised snapshot dict, return:
    { risk_score: int, risk_level: str, risk_signals: list[str] }
    """
    signals = []
    score = 100  # start perfect, deduct

    cpu_1m = snapshot_data.get("cpu_usage_1m")
    cpu_5m = snapshot_data.get("cpu_usage_5m")
    mem_used = snapshot_data.get("memory_used_bytes") or 0
    mem_free = snapshot_data.get("memory_free_bytes") or 0
    temp = snapshot_data.get("temperature_celsius")
    uptime = snapshot_data.get("sys_uptime_seconds")
    ifaces_down = snapshot_data.get("interfaces_down", 0)
    iface_count = snapshot_data.get("interface_count") or 1
    in_errors = snapshot_data.get("total_in_errors", 0)
    out_errors = snapshot_data.get("total_out_errors", 0)
    in_discards = snapshot_data.get("total_in_discards", 0)
    total_octets = (snapshot_data.get("total_in_octets") or 0) + (snapshot_data.get("total_out_octets") or 0)
    acl_violations = snapshot_data.get("acl_violation_count", 0)
    failed_logins = snapshot_data.get("failed_login_count", 0)
    bgp_peers = snapshot_data.get("bgp_peer_count")
    bgp_established = snapshot_data.get("bgp_peers_established")
    anomaly_flags = snapshot_data.get("anomaly_flags", [])

    # CPU
    if cpu_1m is not None:
        if cpu_1m >= CPU_CRIT_THRESHOLD:
            signals.append(f"CRITICAL: CPU at {cpu_1m:.1f}% (1-min avg) — device may be overloaded")
            score -= 25
        elif cpu_1m >= CPU_WARN_THRESHOLD:
            signals.append(f"HIGH CPU: {cpu_1m:.1f}% (1-min avg) — investigate running processes")
            score -= 12

    if cpu_5m is not None and cpu_5m >= CPU_WARN_THRESHOLD:
        if not any("CPU" in s for s in signals):
            signals.append(f"Sustained high CPU: {cpu_5m:.1f}% (5-min avg)")
            score -= 10

    # Memory
    mem_total = mem_used + mem_free
    if mem_total > 0:
        mem_pct = (mem_used / mem_total) * 100
        if mem_pct >= MEM_CRIT_THRESHOLD:
            signals.append(f"CRITICAL: Memory at {mem_pct:.1f}% — risk of process termination")
            score -= 20
        elif mem_pct >= MEM_WARN_THRESHOLD:
            signals.append(f"High memory usage: {mem_pct:.1f}%")
            score -= 10

    # Temperature
    if temp is not None:
        if temp >= TEMP_CRIT_CELSIUS:
            signals.append(f"CRITICAL temperature: {temp}°C — hardware failure risk")
            score -= 25
        elif temp >= TEMP_WARN_CELSIUS:
            signals.append(f"High temperature: {temp}°C — check cooling")
            score -= 12

    # Recent reboot
    if uptime is not None and uptime < UPTIME_REBOOT_WINDOW:
        signals.append(f"Device rebooted recently ({uptime // 60}m ago) — verify stability")
        score -= 8

    # Interfaces down
    if ifaces_down > 0:
        pct_down = (ifaces_down / iface_count) * 100
        if pct_down > 25:
            signals.append(f"CRITICAL: {ifaces_down}/{iface_count} interfaces down ({pct_down:.0f}%)")
            score -= 20
        else:
            signals.append(f"{ifaces_down} interface(s) down — check cabling/config")
            score -= 8

    # Error rates
    total_errors = in_errors + out_errors
    if total_octets > 0 and total_errors > 0:
        error_rate = total_errors / max(total_octets, 1)
        if error_rate > ERROR_RATE_THRESHOLD:
            signals.append(f"High error rate: {total_errors:,} errors detected — possible duplex mismatch")
            score -= 10

    if in_discards > 1000:
        signals.append(f"Input discards: {in_discards:,} — possible congestion or buffer overflow")
        score -= 8

    # BGP
    if bgp_peers is not None and bgp_established is not None:
        if bgp_peers > 0 and bgp_established < bgp_peers:
            dropped = bgp_peers - bgp_established
            signals.append(f"BGP: {dropped} peer(s) not established — routing impact possible")
            score -= 15

    # Security
    if acl_violations > 100:
        signals.append(f"ACL violations: {acl_violations:,} — possible reconnaissance or attack")
        score -= 12
    elif acl_violations > 0:
        signals.append(f"ACL violations detected: {acl_violations}")
        score -= 4

    if failed_logins >= 5:
        signals.append(f"Authentication failures: {failed_logins} — possible brute-force attempt")
        score -= 15
    elif failed_logins > 0:
        signals.append(f"Failed login attempt(s): {failed_logins}")
        score -= 5

    # AI anomaly flags
    for flag in anomaly_flags:
        signals.append(f"AI Anomaly: {flag}")
        score -= 5

    score = max(0, score)

    if score >= 85:
        level = "low"
    elif score >= 65:
        level = "medium"
    elif score >= 40:
        level = "high"
    else:
        level = "critical"

    return {"risk_score": score, "risk_level": level, "risk_signals": signals}


# ---------------------------------------------------------------------------
# AI Anomaly Detection (statistical baseline comparison)
# ---------------------------------------------------------------------------

def detect_anomalies(current: dict, history: list[dict]) -> list[str]:
    """
    Compare current snapshot metrics against historical baseline.
    Returns list of anomaly description strings.
    Uses simple z-score / threshold deviation.
    """
    if len(history) < 3:
        return []

    anomalies = []

    def _zscore_flag(field: str, current_val, label: str, threshold: float = 2.5) -> str | None:
        vals = [h.get(field) for h in history if h.get(field) is not None]
        if len(vals) < 3 or current_val is None:
            return None
        mean = statistics.mean(vals)
        try:
            stdev = statistics.stdev(vals)
        except statistics.StatisticsError:
            return None
        if stdev == 0:
            return None
        z = abs(current_val - mean) / stdev
        if z > threshold:
            direction = "spike" if current_val > mean else "drop"
            return f"{label} {direction}: {current_val:.1f} (baseline avg {mean:.1f}, σ={stdev:.1f})"
        return None

    for flag in [
        _zscore_flag("cpu_usage_1m", current.get("cpu_usage_1m"), "CPU"),
        _zscore_flag("cpu_usage_5m", current.get("cpu_usage_5m"), "CPU 5m"),
        _zscore_flag("interfaces_down", current.get("interfaces_down"), "Interfaces down", threshold=2.0),
        _zscore_flag("total_in_errors", current.get("total_in_errors"), "Input errors", threshold=2.0),
        _zscore_flag("acl_violation_count", current.get("acl_violation_count"), "ACL violations", threshold=2.0),
        _zscore_flag("failed_login_count", current.get("failed_login_count"), "Auth failures", threshold=2.0),
        _zscore_flag("bgp_peers_established", current.get("bgp_peers_established"), "BGP peers", threshold=2.0),
    ]:
        if flag:
            anomalies.append(flag)

    return anomalies


# ---------------------------------------------------------------------------
# Config diff
# ---------------------------------------------------------------------------

def compute_config_checksum(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def diff_configs(old_content: str, new_content: str) -> tuple[bool, str]:
    """
    Returns (changed: bool, diff_summary: str).
    Simple line-level diff summary.
    """
    old_lines = set(old_content.splitlines())
    new_lines = set(new_content.splitlines())
    added = new_lines - old_lines
    removed = old_lines - new_lines

    if not added and not removed:
        return False, ""

    parts = []
    if added:
        parts.append(f"+{len(added)} line(s) added")
    if removed:
        parts.append(f"-{len(removed)} line(s) removed")

    # Key security-relevant changes
    security_keywords = ["access-list", "ip route", "crypto", "aaa", "username",
                         "enable secret", "service password", "logging", "snmp-server",
                         "no shutdown", "shutdown", "ip address", "vlan"]
    notable = []
    for line in added | removed:
        for kw in security_keywords:
            if kw.lower() in line.lower():
                notable.append(f"  {'[+]' if line in added else '[-]'} {line.strip()[:80]}")
                break

    summary = ", ".join(parts)
    if notable:
        summary += "\nKey changes:\n" + "\n".join(notable[:10])

    return True, summary


# ---------------------------------------------------------------------------
# AI recommendation generator (calls NVIDIA NIM if key available)
# ---------------------------------------------------------------------------

def generate_ai_recommendation(device_name: str, signals: list[str], snapshot_data: dict) -> str:
    """
    Generate an AI-powered recommendation for a Cisco device.
    Uses NVIDIA NIM API if key is set, otherwise falls back to rule-based.
    """
    nvidia_key = os.environ.get("NVIDIA_API_KEY")

    if nvidia_key and signals:
        try:
            import urllib.request
            import urllib.error

            signal_text = "\n".join(f"- {s}" for s in signals[:8])
            cpu = snapshot_data.get("cpu_usage_1m", "N/A")
            uptime_h = (snapshot_data.get("sys_uptime_seconds") or 0) // 3600

            prompt = f"""You are a Cisco network engineer AI assistant. Analyze this device status and provide a concise, actionable recommendation (3-4 sentences max).

Device: {device_name}
Uptime: {uptime_h}h
CPU 1m: {cpu}%
Risk signals detected:
{signal_text}

Provide specific Cisco IOS commands or steps to resolve the most critical issues. Be direct and technical."""

            payload = json.dumps({
                "model": "meta/llama-4-maverick-17b-128e-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
                "temperature": 0.3,
            }).encode()

            req = urllib.request.Request(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {nvidia_key}",
                },
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read())
                return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass  # fall through to rule-based

    # Rule-based fallback
    if not signals:
        return "Device is operating within normal parameters. Continue routine monitoring."

    top = signals[0].lower()
    if "cpu" in top:
        return ("Investigate processes with 'show processes cpu sorted'. "
                "Consider applying QoS policies or redistributing load. "
                "Check for routing loops with 'show ip route' and 'debug ip routing'.")
    if "memory" in top:
        return ("Run 'show memory summary' to identify memory consumers. "
                "Consider upgrading RAM or removing unused features. "
                "Check for memory leaks with 'show processes memory sorted'.")
    if "temperature" in top:
        return ("Check physical cooling immediately. Run 'show environment temperature'. "
                "Ensure adequate airflow around the chassis. "
                "Contact Cisco TAC if temperature does not drop within 15 minutes.")
    if "bgp" in top:
        return ("Run 'show bgp summary' to identify dropped peers. "
                "Check connectivity with 'ping <peer_ip>' and verify BGP timers. "
                "Review prefix limits and authentication with 'show bgp neighbors <ip>'.")
    if "auth" in top or "login" in top:
        return ("Enable login rate-limiting: 'login block-for 60 attempts 3 within 30'. "
                "Review AAA logs and consider enabling TACACS+ for centralized auth. "
                "Check 'show aaa sessions' for active suspicious sessions.")
    if "acl" in top:
        return ("Review ACL hit counters with 'show ip access-lists'. "
                "Identify source IPs generating violations and consider blocking at perimeter. "
                "Enable logging on critical ACL entries for forensic data.")
    return ("Review device logs with 'show logging'. "
            "Verify configuration integrity with 'show running-config'. "
            "Escalate to network team if issues persist after basic diagnostics.")


# ---------------------------------------------------------------------------
# Known Cisco CVE database (subset — production would call Cisco PSIRT API)
# ---------------------------------------------------------------------------

KNOWN_CVES = [
    {
        "cve_id": "CVE-2023-20198",
        "cvss_score": 10.0,
        "severity": "critical",
        "title": "Cisco IOS XE Web UI Privilege Escalation",
        "description": "A vulnerability in the web UI of Cisco IOS XE allows unauthenticated remote attackers to create an account with privilege level 15.",
        "affected_versions": ["16.", "17."],
        "fix_available": True,
        "fix_version": "17.9.4a",
    },
    {
        "cve_id": "CVE-2023-20109",
        "cvss_score": 6.6,
        "severity": "medium",
        "title": "Cisco IOS and IOS XE GETVPN Remote Code Execution",
        "description": "A vulnerability in the Group Encrypted Transport VPN feature of Cisco IOS and IOS XE Software.",
        "affected_versions": ["15.", "16.", "17."],
        "fix_available": True,
        "fix_version": "15.9(3)M8",
    },
    {
        "cve_id": "CVE-2024-20272",
        "cvss_score": 5.3,
        "severity": "medium",
        "title": "Cisco IOS XE SNMP Information Disclosure",
        "description": "A vulnerability in SNMP processing could allow unauthenticated remote attacker to access sensitive device information.",
        "affected_versions": ["17."],
        "fix_available": True,
        "fix_version": "17.12.1",
    },
    {
        "cve_id": "CVE-2023-44487",
        "cvss_score": 7.5,
        "severity": "high",
        "title": "HTTP/2 Rapid Reset DDoS (affects Cisco management plane)",
        "description": "Rapid Reset Attack via HTTP/2 can exhaust server resources on management interfaces.",
        "affected_versions": ["16.", "17."],
        "fix_available": False,
        "fix_version": "",
    },
]


def check_vulnerabilities(ios_version: str) -> list[dict]:
    """Check IOS version against known CVEs."""
    if not ios_version:
        return []

    matches = []
    for cve in KNOWN_CVES:
        for affected in cve["affected_versions"]:
            if ios_version.startswith(affected) or affected in ios_version:
                matches.append(cve)
                break
    return matches