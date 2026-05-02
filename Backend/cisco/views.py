"""
Cisco Network Device Management API
Handles device CRUD, SNMP polling, config backup, AI security analysis,
and failure prediction for Cisco routers and switches.
"""

import json
from datetime import datetime, timedelta, timezone

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.views import get_org_from_request

from .models import (
    CiscoConfigBackup,
    CiscoDevice,
    CiscoSecurityAlert,
    CiscoSnapshot,
    CiscoVulnerabilityCheck,
)
from .risk import (
    check_vulnerabilities,
    compute_cisco_risk,
    compute_config_checksum,
    detect_anomalies,
    diff_configs,
    generate_ai_recommendation,
)


# ---------------------------------------------------------------------------
# Device CRUD
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CiscoDeviceListCreateView(View):
    """
    GET  /api/cisco/devices/         — list all devices for org
    POST /api/cisco/devices/         — add a new device
    """

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        devices = CiscoDevice.objects.filter(organization=org, is_active=True)
        data = []
        for d in devices:
            latest = d.snapshots.first()
            unresolved_alerts = d.alerts.filter(is_resolved=False).count()
            data.append({
                "id": str(d.id),
                "name": d.name,
                "ip_address": d.ip_address,
                "device_type": d.device_type,
                "model": d.model,
                "ios_version": d.ios_version,
                "location": d.location,
                "status": d.status,
                "last_polled": d.last_polled.isoformat() if d.last_polled else None,
                "unresolved_alerts": unresolved_alerts,
                "latest_risk_score": latest.risk_score if latest else None,
                "latest_risk_level": latest.risk_level if latest else None,
                "latest_cpu": latest.cpu_usage_1m if latest else None,
                "latest_uptime_hours": (
                    (latest.sys_uptime_seconds or 0) // 3600 if latest else None
                ),
            })

        return JsonResponse({"devices": data, "total": len(data)})

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        name = (body.get("name") or "").strip()
        ip_address = (body.get("ip_address") or "").strip()

        if not name or not ip_address:
            return JsonResponse({"error": "name and ip_address are required."}, status=400)

        if CiscoDevice.objects.filter(organization=org, ip_address=ip_address).exists():
            return JsonResponse({"error": "A device with this IP already exists."}, status=409)

        device = CiscoDevice.objects.create(
            organization=org,
            name=name,
            ip_address=ip_address,
            device_type=body.get("device_type", "router"),
            model=body.get("model", ""),
            serial_number=body.get("serial_number", ""),
            ios_version=body.get("ios_version", ""),
            location=body.get("location", ""),
            snmp_community=body.get("snmp_community", "public"),
            snmp_version=body.get("snmp_version", "2c"),
            snmp_port=int(body.get("snmp_port", 161)),
            ssh_username=body.get("ssh_username", ""),
            ssh_password=body.get("ssh_password", ""),
        )

        # Auto-run vulnerability check if IOS version provided
        if device.ios_version:
            _run_vuln_check(device)

        return JsonResponse({
            "id": str(device.id),
            "name": device.name,
            "ip_address": device.ip_address,
        }, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class CiscoDeviceDetailView(View):
    """
    GET    /api/cisco/devices/<id>/  — device detail + latest snapshot
    PATCH  /api/cisco/devices/<id>/  — update device
    DELETE /api/cisco/devices/<id>/  — soft-delete device
    """

    def _get_device(self, request, device_id):
        org, err = get_org_from_request(request)
        if err:
            return None, err
        try:
            device = CiscoDevice.objects.get(id=device_id, organization=org)
            return device, None
        except CiscoDevice.DoesNotExist:
            return None, JsonResponse({"error": "Device not found."}, status=404)

    def get(self, request, device_id):
        device, err = self._get_device(request, device_id)
        if err:
            return err

        latest = device.snapshots.first()
        history = list(device.snapshots.values(
            "cpu_usage_1m", "cpu_usage_5m", "interfaces_down",
            "total_in_errors", "acl_violation_count", "failed_login_count",
            "bgp_peers_established", "collected_at"
        )[:30])

        alerts = list(device.alerts.filter(is_resolved=False).values(
            "id", "alert_type", "severity", "title", "description",
            "recommendation", "ai_generated", "created_at"
        )[:10])

        vulns = list(device.vulnerability_checks.values(
            "cve_id", "cvss_score", "severity", "title", "fix_available", "fix_version", "checked_at"
        )[:20])

        configs = list(device.config_backups.values(
            "id", "config_type", "checksum", "size_bytes", "collected_at",
            "changed_from_previous", "diff_summary"
        )[:5])

        return JsonResponse({
            "id": str(device.id),
            "name": device.name,
            "ip_address": device.ip_address,
            "device_type": device.device_type,
            "model": device.model,
            "serial_number": device.serial_number,
            "ios_version": device.ios_version,
            "location": device.location,
            "status": device.status,
            "last_polled": device.last_polled.isoformat() if device.last_polled else None,
            "latest_snapshot": _snapshot_to_dict(latest) if latest else None,
            "risk_trend": list(reversed([
                {
                    "collected_at": h["collected_at"].isoformat(),
                    "cpu": h["cpu_usage_1m"],
                    "interfaces_down": h["interfaces_down"],
                    "acl_violations": h["acl_violation_count"],
                }
                for h in history
            ])),
            "active_alerts": alerts,
            "vulnerabilities": vulns,
            "config_backups": configs,
        })

    def patch(self, request, device_id):
        device, err = self._get_device(request, device_id)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        updatable = ["name", "device_type", "model", "serial_number", "ios_version",
                     "location", "snmp_community", "snmp_version", "snmp_port",
                     "ssh_username", "ssh_password"]
        for field in updatable:
            if field in body:
                setattr(device, field, body[field])
        device.save()

        # Re-run vuln check if IOS version changed
        if "ios_version" in body and body["ios_version"]:
            _run_vuln_check(device)

        return JsonResponse({"id": str(device.id), "name": device.name})

    def delete(self, request, device_id):
        device, err = self._get_device(request, device_id)
        if err:
            return err
        device.is_active = False
        device.save(update_fields=["is_active"])
        return JsonResponse({"deleted": True})


# ---------------------------------------------------------------------------
# SNMP Snapshot Ingest (posted by your SNMP collector: pysnmp / Telegraf)
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CiscoSnapshotIngestView(View):
    """
    POST /api/cisco/snapshot/
    Accept SNMP poll results from your collector and compute risk + anomalies.
    """

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        device_id = payload.get("device_id")
        if not device_id:
            return JsonResponse({"error": "device_id is required."}, status=400)

        try:
            device = CiscoDevice.objects.get(id=device_id, organization=org)
        except CiscoDevice.DoesNotExist:
            return JsonResponse({"error": "Device not found."}, status=404)

        collected_at_raw = payload.get("collected_at")
        try:
            if collected_at_raw:
                collected_at = datetime.fromisoformat(collected_at_raw.replace("Z", "+00:00"))
            else:
                collected_at = datetime.now(timezone.utc)
        except ValueError:
            collected_at = datetime.now(timezone.utc)

        # Pull historical snapshots for anomaly detection
        history = list(device.snapshots.values(
            "cpu_usage_1m", "cpu_usage_5m", "interfaces_down",
            "total_in_errors", "acl_violation_count", "failed_login_count",
            "bgp_peers_established"
        )[:20])

        # Detect anomalies
        anomaly_flags = detect_anomalies(payload, history)

        # Merge anomalies into payload for risk scoring
        payload_with_anomalies = dict(payload)
        payload_with_anomalies["anomaly_flags"] = anomaly_flags

        # Compute risk
        risk_result = compute_cisco_risk(payload_with_anomalies)

        # Create snapshot
        snapshot = CiscoSnapshot.objects.create(
            device=device,
            collected_at=collected_at,
            sys_uptime_seconds=payload.get("sys_uptime_seconds"),
            sys_description=payload.get("sys_description", ""),
            sys_name=payload.get("sys_name", ""),
            sys_location=payload.get("sys_location", ""),
            cpu_usage_5s=payload.get("cpu_usage_5s"),
            cpu_usage_1m=payload.get("cpu_usage_1m"),
            cpu_usage_5m=payload.get("cpu_usage_5m"),
            memory_used_bytes=payload.get("memory_used_bytes"),
            memory_free_bytes=payload.get("memory_free_bytes"),
            temperature_celsius=payload.get("temperature_celsius"),
            temperature_status=payload.get("temperature_status", ""),
            interface_count=payload.get("interface_count"),
            interfaces_up=payload.get("interfaces_up", 0),
            interfaces_down=payload.get("interfaces_down", 0),
            total_in_octets=payload.get("total_in_octets"),
            total_out_octets=payload.get("total_out_octets"),
            total_in_errors=payload.get("total_in_errors", 0),
            total_out_errors=payload.get("total_out_errors", 0),
            total_in_discards=payload.get("total_in_discards", 0),
            bgp_peer_count=payload.get("bgp_peer_count"),
            bgp_peers_established=payload.get("bgp_peers_established"),
            ospf_neighbor_count=payload.get("ospf_neighbor_count"),
            route_count=payload.get("route_count"),
            acl_violation_count=payload.get("acl_violation_count", 0),
            failed_login_count=payload.get("failed_login_count", 0),
            arp_entry_count=payload.get("arp_entry_count"),
            interfaces_detail=payload.get("interfaces_detail", []),
            anomaly_flags=anomaly_flags,
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            risk_signals=risk_result["risk_signals"],
            raw=payload,
        )

        # Update device status
        if risk_result["risk_level"] == "critical":
            device.status = "down"
        elif risk_result["risk_level"] == "high":
            device.status = "degraded"
        else:
            device.status = "up"
        device.last_polled = collected_at
        device.save(update_fields=["status", "last_polled"])

        # Auto-generate alerts for critical signals
        _auto_generate_alerts(device, snapshot, risk_result, anomaly_flags)

        return JsonResponse({
            "snapshot_id": str(snapshot.id),
            "risk_score": risk_result["risk_score"],
            "risk_level": risk_result["risk_level"],
            "risk_signals_count": len(risk_result["risk_signals"]),
            "anomalies_detected": len(anomaly_flags),
        }, status=201)


# ---------------------------------------------------------------------------
# Config Backup Ingest (posted by SSH collector)
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CiscoConfigBackupView(View):
    """
    POST /api/cisco/config/
    Accept running/startup config text from SSH collector.
    Diffs against previous backup and flags security changes.
    """

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        device_id = body.get("device_id")
        content = body.get("content", "")
        config_type = body.get("config_type", "running")

        if not device_id or not content:
            return JsonResponse({"error": "device_id and content are required."}, status=400)

        try:
            device = CiscoDevice.objects.get(id=device_id, organization=org)
        except CiscoDevice.DoesNotExist:
            return JsonResponse({"error": "Device not found."}, status=404)

        checksum = compute_config_checksum(content)

        # Check if identical to last backup
        last_backup = device.config_backups.filter(config_type=config_type).first()
        if last_backup and last_backup.checksum == checksum:
            return JsonResponse({"changed": False, "message": "Config unchanged."})

        changed = False
        diff_summary = ""
        if last_backup:
            changed, diff_summary = diff_configs(last_backup.content, content)
            if changed:
                # Create security alert for config change
                CiscoSecurityAlert.objects.create(
                    device=device,
                    alert_type="config_change",
                    severity="medium",
                    title=f"Configuration changed on {device.name}",
                    description=f"Running config diff detected:\n{diff_summary[:500]}",
                    recommendation="Review changes and verify they were authorized. Compare with change management records.",
                    ai_generated=False,
                )

        backup = CiscoConfigBackup.objects.create(
            device=device,
            config_type=config_type,
            content=content,
            checksum=checksum,
            size_bytes=len(content.encode()),
            changed_from_previous=changed,
            diff_summary=diff_summary,
        )

        return JsonResponse({
            "backup_id": str(backup.id),
            "changed": changed,
            "diff_summary": diff_summary[:200] if diff_summary else "",
        }, status=201)

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        device_id = request.GET.get("device_id")
        if not device_id:
            return JsonResponse({"error": "device_id is required."}, status=400)

        try:
            device = CiscoDevice.objects.get(id=device_id, organization=org)
        except CiscoDevice.DoesNotExist:
            return JsonResponse({"error": "Device not found."}, status=404)

        backup_id = request.GET.get("backup_id")
        if backup_id:
            try:
                backup = device.config_backups.get(id=backup_id)
                return JsonResponse({
                    "id": str(backup.id),
                    "config_type": backup.config_type,
                    "content": backup.content,
                    "checksum": backup.checksum,
                    "size_bytes": backup.size_bytes,
                    "collected_at": backup.collected_at.isoformat(),
                    "changed_from_previous": backup.changed_from_previous,
                    "diff_summary": backup.diff_summary,
                })
            except CiscoConfigBackup.DoesNotExist:
                return JsonResponse({"error": "Backup not found."}, status=404)

        backups = list(device.config_backups.values(
            "id", "config_type", "checksum", "size_bytes",
            "collected_at", "changed_from_previous"
        )[:20])
        return JsonResponse({"backups": backups})


# ---------------------------------------------------------------------------
# AI Analysis Endpoint
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CiscoAIAnalysisView(View):
    """
    POST /api/cisco/ai-analysis/
    Trigger AI analysis for a device and return recommendation + failure prediction.
    """

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        device_id = body.get("device_id")
        if not device_id:
            return JsonResponse({"error": "device_id is required."}, status=400)

        try:
            device = CiscoDevice.objects.get(id=device_id, organization=org)
        except CiscoDevice.DoesNotExist:
            return JsonResponse({"error": "Device not found."}, status=404)

        latest = device.snapshots.first()
        if not latest:
            return JsonResponse({"error": "No snapshots available for this device."}, status=404)

        snapshot_data = {
            "cpu_usage_1m": latest.cpu_usage_1m,
            "cpu_usage_5m": latest.cpu_usage_5m,
            "memory_used_bytes": latest.memory_used_bytes,
            "memory_free_bytes": latest.memory_free_bytes,
            "temperature_celsius": latest.temperature_celsius,
            "sys_uptime_seconds": latest.sys_uptime_seconds,
            "interfaces_down": latest.interfaces_down,
            "total_in_errors": latest.total_in_errors,
            "acl_violation_count": latest.acl_violation_count,
            "failed_login_count": latest.failed_login_count,
            "bgp_peer_count": latest.bgp_peer_count,
            "bgp_peers_established": latest.bgp_peers_established,
        }

        recommendation = generate_ai_recommendation(
            device.name,
            latest.risk_signals,
            snapshot_data,
        )

        # Failure prediction: look at CPU/memory trend over last 24h
        snapshots_24h = list(device.snapshots.filter(
            collected_at__gte=datetime.now(timezone.utc) - timedelta(hours=24)
        ).values("cpu_usage_1m", "memory_used_bytes", "memory_free_bytes", "interfaces_down"))

        failure_risk = _predict_failure_risk(snapshots_24h, snapshot_data)

        # Create AI alert if critical
        if failure_risk["level"] in ("high", "critical"):
            CiscoSecurityAlert.objects.get_or_create(
                device=device,
                alert_type="ai_prediction",
                is_resolved=False,
                defaults={
                    "severity": failure_risk["level"],
                    "title": f"AI Failure Prediction: {failure_risk['summary']}",
                    "description": failure_risk["detail"],
                    "recommendation": recommendation,
                    "ai_generated": True,
                    "snapshot": latest,
                }
            )

        return JsonResponse({
            "device_id": str(device.id),
            "device_name": device.name,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "current_risk_score": latest.risk_score,
            "current_risk_level": latest.risk_level,
            "risk_signals": latest.risk_signals,
            "anomaly_flags": latest.anomaly_flags,
            "ai_recommendation": recommendation,
            "failure_prediction": failure_risk,
        })


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CiscoAlertView(View):
    """
    GET  /api/cisco/alerts/           — list all unresolved alerts for org
    POST /api/cisco/alerts/<id>/resolve/ — resolve alert
    """

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        device_id = request.GET.get("device_id")
        include_resolved = request.GET.get("resolved", "false").lower() == "true"

        qs = CiscoSecurityAlert.objects.filter(device__organization=org)
        if device_id:
            qs = qs.filter(device_id=device_id)
        if not include_resolved:
            qs = qs.filter(is_resolved=False)

        alerts = list(qs.select_related("device").values(
            "id", "device__name", "device__ip_address",
            "alert_type", "severity", "title", "description",
            "recommendation", "ai_generated", "is_resolved",
            "created_at", "resolved_at"
        )[:50])

        return JsonResponse({"alerts": alerts, "total": len(alerts)})


@method_decorator(csrf_exempt, name="dispatch")
class CiscoAlertResolveView(View):
    def post(self, request, alert_id):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            alert = CiscoSecurityAlert.objects.get(
                id=alert_id, device__organization=org
            )
        except CiscoSecurityAlert.DoesNotExist:
            return JsonResponse({"error": "Alert not found."}, status=404)

        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        alert.save(update_fields=["is_resolved", "resolved_at"])
        return JsonResponse({"resolved": True})


# ---------------------------------------------------------------------------
# Dashboard Summary
# ---------------------------------------------------------------------------

class CiscoDashboardView(View):
    """GET /api/cisco/dashboard/ — org-wide Cisco health summary."""

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        devices = CiscoDevice.objects.filter(organization=org, is_active=True)
        total = devices.count()
        up = devices.filter(status="up").count()
        down = devices.filter(status="down").count()
        degraded = devices.filter(status="degraded").count()
        unknown = devices.filter(status="unknown").count()

        active_alerts = CiscoSecurityAlert.objects.filter(
            device__organization=org, is_resolved=False
        )
        critical_alerts = active_alerts.filter(severity="critical").count()
        high_alerts = active_alerts.filter(severity="high").count()

        # Risk distribution across all latest snapshots
        risk_dist = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        avg_cpu_list = []
        for d in devices:
            snap = d.snapshots.first()
            if snap:
                if snap.risk_level in risk_dist:
                    risk_dist[snap.risk_level] += 1
                if snap.cpu_usage_1m is not None:
                    avg_cpu_list.append(snap.cpu_usage_1m)

        avg_cpu = round(sum(avg_cpu_list) / len(avg_cpu_list), 1) if avg_cpu_list else None

        # Top vulnerable devices
        top_at_risk = []
        for d in devices:
            snap = d.snapshots.first()
            if snap and snap.risk_score is not None:
                top_at_risk.append({
                    "id": str(d.id),
                    "name": d.name,
                    "ip": d.ip_address,
                    "risk_score": snap.risk_score,
                    "risk_level": snap.risk_level,
                    "top_signal": snap.risk_signals[0] if snap.risk_signals else None,
                })
        top_at_risk.sort(key=lambda x: x["risk_score"])
        top_at_risk = top_at_risk[:5]

        return JsonResponse({
            "summary": {
                "total_devices": total,
                "status": {"up": up, "down": down, "degraded": degraded, "unknown": unknown},
                "availability_pct": round((up / total * 100), 1) if total else 0,
                "active_alerts": active_alerts.count(),
                "critical_alerts": critical_alerts,
                "high_alerts": high_alerts,
                "avg_cpu_percent": avg_cpu,
                "risk_distribution": risk_dist,
            },
            "top_at_risk": top_at_risk,
            "recent_alerts": list(
                active_alerts.select_related("device").values(
                    "id", "device__name", "alert_type", "severity", "title", "created_at"
                )[:8]
            ),
        })


# ---------------------------------------------------------------------------
# Vulnerability Check
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CiscoVulnCheckView(View):
    """POST /api/cisco/vuln-check/<device_id>/ — run CVE scan."""

    def post(self, request, device_id):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            device = CiscoDevice.objects.get(id=device_id, organization=org)
        except CiscoDevice.DoesNotExist:
            return JsonResponse({"error": "Device not found."}, status=404)

        results = _run_vuln_check(device)
        return JsonResponse({
            "device_id": str(device.id),
            "ios_version": device.ios_version,
            "vulnerabilities_found": len(results),
            "vulnerabilities": results,
        })


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _snapshot_to_dict(s: CiscoSnapshot) -> dict:
    mem_total = (s.memory_used_bytes or 0) + (s.memory_free_bytes or 0)
    mem_pct = round((s.memory_used_bytes or 0) / mem_total * 100, 1) if mem_total else None

    return {
        "id": str(s.id),
        "collected_at": s.collected_at.isoformat(),
        "sys_uptime_hours": (s.sys_uptime_seconds or 0) // 3600,
        "cpu_usage_1m": s.cpu_usage_1m,
        "cpu_usage_5m": s.cpu_usage_5m,
        "memory_used_bytes": s.memory_used_bytes,
        "memory_pct": mem_pct,
        "temperature_celsius": s.temperature_celsius,
        "interface_count": s.interface_count,
        "interfaces_up": s.interfaces_up,
        "interfaces_down": s.interfaces_down,
        "total_in_errors": s.total_in_errors,
        "total_out_errors": s.total_out_errors,
        "acl_violation_count": s.acl_violation_count,
        "failed_login_count": s.failed_login_count,
        "bgp_peer_count": s.bgp_peer_count,
        "bgp_peers_established": s.bgp_peers_established,
        "risk_score": s.risk_score,
        "risk_level": s.risk_level,
        "risk_signals": s.risk_signals,
        "anomaly_flags": s.anomaly_flags,
    }


def _auto_generate_alerts(device, snapshot, risk_result, anomaly_flags):
    """Create alerts for critical and high signals automatically."""
    severity_map = {
        "critical": ["CRITICAL", "CRITICAL:"],
        "high": ["HIGH CPU", "HIGH", "BGP", "Authentication failure"],
    }

    for signal in risk_result["risk_signals"]:
        severity = "medium"
        for sev, keywords in severity_map.items():
            if any(kw.lower() in signal.lower() for kw in keywords):
                severity = sev
                break

        if severity in ("critical", "high"):
            alert_type = "high_cpu" if "cpu" in signal.lower() else \
                         "auth_failure" if "auth" in signal.lower() or "login" in signal.lower() else \
                         "interface_down" if "interface" in signal.lower() else \
                         "temperature" if "temperature" in signal.lower() else \
                         "bgp_drop" if "bgp" in signal.lower() else \
                         "acl_violation" if "acl" in signal.lower() else "anomaly"

            CiscoSecurityAlert.objects.get_or_create(
                device=device,
                title=signal[:200],
                is_resolved=False,
                defaults={
                    "alert_type": alert_type,
                    "severity": severity,
                    "description": signal,
                    "recommendation": generate_ai_recommendation(device.name, [signal], {}),
                    "ai_generated": False,
                    "snapshot": snapshot,
                }
            )

    for flag in anomaly_flags:
        CiscoSecurityAlert.objects.get_or_create(
            device=device,
            title=f"Anomaly: {flag[:180]}",
            is_resolved=False,
            defaults={
                "alert_type": "anomaly",
                "severity": "medium",
                "description": f"Statistical anomaly detected: {flag}",
                "recommendation": "Investigate unusual traffic or metric pattern.",
                "ai_generated": True,
                "snapshot": snapshot,
            }
        )


def _predict_failure_risk(snapshots_24h: list, current: dict) -> dict:
    """
    Simple failure prediction based on trend analysis.
    Returns { level, summary, detail, probability_pct }.
    """
    if not snapshots_24h:
        return {"level": "unknown", "summary": "Insufficient data", "detail": "", "probability_pct": None}

    cpu_vals = [s["cpu_usage_1m"] for s in snapshots_24h if s.get("cpu_usage_1m") is not None]
    iface_down_vals = [s["interfaces_down"] for s in snapshots_24h]

    issues = []

    # CPU trend — is it climbing?
    if len(cpu_vals) >= 3:
        cpu_trend = cpu_vals[-1] - cpu_vals[0] if cpu_vals else 0
        if cpu_trend > 20:
            issues.append(f"CPU climbing +{cpu_trend:.0f}% over last 24h")

    # Interface instability
    if max(iface_down_vals, default=0) > 2:
        issues.append("Repeated interface flaps detected")

    # Current state
    current_cpu = current.get("cpu_usage_1m", 0) or 0
    if current_cpu > 90:
        issues.append(f"Current CPU critically high: {current_cpu}%")

    temp = current.get("temperature_celsius")
    if temp and temp > 70:
        issues.append(f"Temperature critical: {temp}°C")

    if not issues:
        return {
            "level": "low",
            "summary": "No failure indicators detected",
            "detail": "Device metrics are stable over the last 24 hours.",
            "probability_pct": 5,
        }

    probability = min(90, 20 * len(issues))
    level = "critical" if probability >= 70 else "high" if probability >= 40 else "medium"

    return {
        "level": level,
        "summary": f"{len(issues)} failure indicator(s) detected",
        "detail": ". ".join(issues),
        "probability_pct": probability,
    }


def _run_vuln_check(device: CiscoDevice) -> list:
    from .risk import check_vulnerabilities
    vulns = check_vulnerabilities(device.ios_version)
    results = []
    for v in vulns:
        obj, _ = CiscoVulnerabilityCheck.objects.update_or_create(
            device=device,
            cve_id=v["cve_id"],
            defaults={
                "cvss_score": v["cvss_score"],
                "severity": v["severity"],
                "title": v["title"],
                "description": v["description"],
                "affected_versions": ", ".join(v["affected_versions"]),
                "fix_available": v["fix_available"],
                "fix_version": v["fix_version"],
            }
        )
        results.append({
            "cve_id": obj.cve_id,
            "cvss_score": obj.cvss_score,
            "severity": obj.severity,
            "title": obj.title,
            "fix_available": obj.fix_available,
            "fix_version": obj.fix_version,
        })

        # Create alert for critical CVEs
        if v["cvss_score"] and v["cvss_score"] >= 8.0:
            CiscoSecurityAlert.objects.get_or_create(
                device=device,
                title=f"Critical CVE: {v['cve_id']} — {v['title'][:150]}",
                is_resolved=False,
                defaults={
                    "alert_type": "security_vuln",
                    "severity": "critical" if v["cvss_score"] >= 9.0 else "high",
                    "description": v["description"],
                    "recommendation": f"Upgrade IOS to {v['fix_version']} or apply Cisco advisory mitigation.",
                    "ai_generated": False,
                    "metadata": {"cve_id": v["cve_id"], "cvss": v["cvss_score"]},
                }
            )
    return results