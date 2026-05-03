import json
from datetime import datetime, timezone

from django.db.models import Count
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.models import Employee
from organizations.views import get_org_from_request, get_org_or_employee_from_request

from .models import ApprovedSoftware, DeviceSnapshot, DiskHealthSnapshot, NetworkDeviceSnapshot, PortRemediationRequest, SystemMetricsSnapshot
from .risk import _RISKY_PORTS, compute_disk_risk, compute_network_risk, compute_risk, compute_system_risk


@method_decorator(csrf_exempt, name="dispatch")
class SnapshotIngestView(View):
    def post(self, request):
        org, token_employee, err = get_org_or_employee_from_request(request)
        if err:
            return err

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        # ── Resolve employee ──────────────────────────────────────────────
        employee_id = request.GET.get("employee_id") or payload.get("employee_id")
        if token_employee is not None:
            employee = token_employee
            if employee_id and str(employee.id) != str(employee_id):
                return JsonResponse({"error": "employee_id does not match authenticated employee."}, status=403)
        else:
            if not employee_id:
                return JsonResponse({"error": "employee_id is required."}, status=400)
            try:
                employee = Employee.objects.get(id=employee_id, organization=org)
            except Employee.DoesNotExist:
                return JsonResponse({"error": "Employee not found."}, status=404)

        # ── Parse collected_at ────────────────────────────────────────────
        collected_at_raw = payload.get("collectedAtUtc")
        if not collected_at_raw:
            return JsonResponse({"error": "collectedAtUtc is required."}, status=400)
        try:
            # Handle both 'Z' suffix and '+00:00' offset
            collected_at_raw = collected_at_raw.replace("Z", "+00:00")
            collected_at = datetime.fromisoformat(collected_at_raw)
            if collected_at.tzinfo is None:
                collected_at = collected_at.replace(tzinfo=timezone.utc)
        except ValueError:
            return JsonResponse({"error": "Invalid collectedAtUtc format."}, status=400)

        # ── Extract indexed fields (supports both old and new agent format) ─
        # New format: hardware.*, patchStatus.*, antivirus.*, diskEncryption.*, localPorts.*
        # Old format: device.*, security.*, network.listeningPorts
        # Rule: prefer new-format keys; fall back to old-format keys if absent.

        hardware = payload.get("hardware") or {}
        # Old format kept hardware nested under "device"
        _device = payload.get("device") or {}
        if not hardware and _device:
            hardware = {
                "hostname": _device.get("hostname", ""),
                "osName": _device.get("osName", ""),
                "osVersion": _device.get("osVersion", ""),
                "osBuild": _device.get("kernelVersion", ""),
                "cpuModel": "",
                "ramTotalMb": (_device.get("hardware") or {}).get("totalMemoryMb"),
                "diskTotalGb": None,
                "diskFreeGb": None,
                "machineUuid": "",
                "primaryMacAddress": "",
            }

        # patchStatus (new) vs security.osUpdatesCurrent (old)
        patch = payload.get("patchStatus") or {}
        if not patch:
            _sec = payload.get("security") or {}
            os_current = _sec.get("osUpdatesCurrent")
            if os_current is not None:
                patch = {"isCurrent": os_current, "lastUpdated": None, "daysSinceUpdate": None}

        # antivirus (new flat block) vs security.antivirus[] (old array)
        av = payload.get("antivirus") or {}
        if not av:
            _sec = payload.get("security") or {}
            _av_list = _sec.get("antivirus") or []
            if _av_list:
                first = _av_list[0]
                av = {
                    "avDetected": True,
                    "productName": first.get("name"),
                    "enabledStatus": first.get("enabled"),
                    "signatureUpToDate": first.get("upToDate"),
                }

        # diskEncryption (new) vs security.diskEncryptionEnabled (old)
        disk_enc = payload.get("diskEncryption") or {}
        if not disk_enc:
            _sec = payload.get("security") or {}
            enc_val = _sec.get("diskEncryptionEnabled")
            if enc_val is not None:
                disk_enc = {"encrypted": enc_val, "provider": ""}

        usb_block = payload.get("usb") or {}
        lan = payload.get("lan") or {}

        # localPorts (new) vs network.listeningPorts (old)
        ports_block = payload.get("localPorts") or {}
        if not ports_block:
            _net = payload.get("network") or {}
            _old_ports = _net.get("listeningPorts") or []
            if _old_ports:
                ports_block = {
                    "ports": [
                        {"port": p.get("port"), "protocol": p.get("protocol"), "owningProcess": p.get("process"), "riskLevel": "unknown"}
                        for p in _old_ports if p.get("port")
                    ]
                }

        wifi = payload.get("wifi") or {}

        wifi_profiles = wifi.get("profiles") or []
        open_wifi = sum(1 for p in wifi_profiles if p.get("isOpenNetwork") is True)

        patch_last_raw = patch.get("lastUpdated")
        patch_last_updated = None
        if patch_last_raw:
            try:
                from datetime import date
                patch_last_updated = date.fromisoformat(patch_last_raw[:10])
            except ValueError:
                pass

        # ── Backend risk computation (ignore any risk block from agent) ───
        risk = compute_risk(payload)

        # ── Strip agent-supplied risk from stored raw payload ─────────────
        raw = {k: v for k, v in payload.items() if k not in ("risk", "employee_id")}

        # ── Persist ───────────────────────────────────────────────────────
        snapshot = DeviceSnapshot.objects.create(
            employee=employee,
            collected_at=collected_at,
            # Hardware
            hostname=hardware.get("hostname", ""),
            os_name=hardware.get("osName", ""),
            os_version=hardware.get("osVersion", ""),
            os_build=hardware.get("osBuild", ""),
            cpu_model=(hardware.get("cpuModel") or "").strip(),
            ram_total_mb=hardware.get("ramTotalMb"),
            disk_total_gb=hardware.get("diskTotalGb"),
            disk_free_gb=hardware.get("diskFreeGb"),
            machine_uuid=hardware.get("machineUuid", ""),
            primary_mac=hardware.get("primaryMacAddress", ""),
            # Patch
            patch_is_current=patch.get("isCurrent"),
            patch_last_updated=patch_last_updated,
            patch_days_since_update=patch.get("daysSinceUpdate"),
            # Antivirus
            antivirus_detected=av.get("avDetected"),
            antivirus_name=av.get("productName") or "",
            antivirus_enabled=av.get("enabledStatus"),
            antivirus_up_to_date=av.get("signatureUpToDate"),
            # Disk encryption
            disk_encrypted=disk_enc.get("encrypted"),
            # Network / peripherals
            usb_enabled=usb_block.get("enabled"),
            lan_device_count=len(lan.get("devices") or []),
            local_port_count=len(ports_block.get("ports") or []),
            wifi_open_network_count=open_wifi,
            # Risk
            risk_score=risk["score"],
            risk_level=risk["level"],
            risk_signals=risk["signals"],
            raw=raw,
        )

        return JsonResponse(
            {
                "id": str(snapshot.id),
                "received_at": snapshot.received_at.isoformat(),
                "risk": risk,
            },
            status=201,
        )


# ---------------------------------------------------------------------------
# Risk Score Trend
# GET /api/agent/risk-trend/<employee_id>/
# Returns the last 30 snapshots as a time-series for dashboard charts.
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class RiskTrendView(View):
    def get(self, request, employee_id):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        snapshots = (
            DeviceSnapshot.objects
            .filter(employee=employee)
            .order_by("-collected_at")[:30]
        )

        data = [
            {
                "snapshot_id": str(s.id),
                "collected_at": s.collected_at.isoformat(),
                "risk_score": s.risk_score,
                "risk_level": s.risk_level,
                "signals": s.risk_signals,
            }
            for s in reversed(list(snapshots))  # chronological order for charts
        ]

        return JsonResponse(
            {
                "employee_id": str(employee.id),
                "employee_name": employee.name,
                "hostname": snapshots[0].hostname if snapshots else None,
                "data_points": len(data),
                "trend": data,
            }
        )


# ---------------------------------------------------------------------------
# Device Drift Detection
# GET /api/agent/drift/<employee_id>/
# Diffs the last 2 snapshots: new/removed software, ports, processes.
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class DeviceDriftView(View):
    def get(self, request, employee_id):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        snapshots = list(
            DeviceSnapshot.objects
            .filter(employee=employee)
            .order_by("-collected_at")[:2]
        )

        if len(snapshots) < 2:
            return JsonResponse(
                {
                    "employee_id": str(employee.id),
                    "employee_name": employee.name,
                    "message": "Not enough snapshots to compute drift (need at least 2).",
                    "drift": None,
                }
            )

        latest, previous = snapshots[0], snapshots[1]

        def _sw_names(snap):
            sw = snap.raw.get("software") or {}
            items = sw.get("software") if isinstance(sw, dict) else []
            return {(s.get("name") or "").strip() for s in (items or []) if s.get("name")}

        def _ports(snap):
            ports_block = snap.raw.get("localPorts") or {}
            return {p.get("port") for p in (ports_block.get("ports") or []) if p.get("port")}

        def _procs(snap):
            # processes[] — PENDING in agent v2; returns empty set until available
            return {(p.get("name") or "").strip() for p in (snap.raw.get("processes") or []) if p.get("name")}

        sw_new = _sw_names(latest) - _sw_names(previous)
        sw_removed = _sw_names(previous) - _sw_names(latest)
        ports_opened = _ports(latest) - _ports(previous)
        ports_closed = _ports(previous) - _ports(latest)
        procs_new = _procs(latest) - _procs(previous)
        procs_gone = _procs(previous) - _procs(latest)

        risk_changed = latest.risk_score != previous.risk_score

        return JsonResponse(
            {
                "employee_id": str(employee.id),
                "employee_name": employee.name,
                "previous_snapshot": {
                    "id": str(previous.id),
                    "collected_at": previous.collected_at.isoformat(),
                    "risk_score": previous.risk_score,
                    "risk_level": previous.risk_level,
                },
                "latest_snapshot": {
                    "id": str(latest.id),
                    "collected_at": latest.collected_at.isoformat(),
                    "risk_score": latest.risk_score,
                    "risk_level": latest.risk_level,
                },
                "risk_delta": (latest.risk_score or 0) - (previous.risk_score or 0),
                "risk_changed": risk_changed,
                "drift": {
                    "software_installed": sorted(sw_new),
                    "software_removed": sorted(sw_removed),
                    "ports_opened": sorted(ports_opened),
                    "ports_closed": sorted(ports_closed),
                    "processes_new": sorted(procs_new),
                    "processes_gone": sorted(procs_gone),
                },
                "has_changes": any([sw_new, sw_removed, ports_opened, ports_closed, procs_new, procs_gone]),
            }
        )


# ---------------------------------------------------------------------------
# Risky Port Audit
# GET /api/agent/port-audit/
# Aggregates all employees' latest snapshots; shows org-wide risky open ports.
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class PortAuditView(View):
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        # For each employee, take only the most recent snapshot
        employee_ids = Employee.objects.filter(organization=org).values_list("id", flat=True)

        # Latest snapshot per employee (subquery via distinct trick)
        latest_ids = []
        for eid in employee_ids:
            snap = DeviceSnapshot.objects.filter(employee_id=eid).order_by("-collected_at").first()
            if snap:
                latest_ids.append(snap.id)

        snapshots = DeviceSnapshot.objects.filter(id__in=latest_ids).select_related("employee")

        # Aggregate risky ports across all devices
        risky_port_map = {}  # port_number -> {label, affected_devices: [...]}
        for snap in snapshots:
            ports_block = snap.raw.get("localPorts") or {}
            open_ports = {p.get("port") for p in (ports_block.get("ports") or []) if p.get("port")}
            for port, label in _RISKY_PORTS.items():
                if port in open_ports:
                    if port not in risky_port_map:
                        risky_port_map[port] = {"port": port, "label": label, "affected_devices": []}
                    risky_port_map[port]["affected_devices"].append(
                        {
                            "employee_id": str(snap.employee_id),
                            "employee_name": snap.employee.name,
                            "hostname": snap.hostname,
                            "snapshot_id": str(snap.id),
                            "collected_at": snap.collected_at.isoformat(),
                        }
                    )

        results = sorted(risky_port_map.values(), key=lambda x: -len(x["affected_devices"]))

        return JsonResponse(
            {
                "organization": org.name,
                "devices_scanned": len(latest_ids),
                "risky_ports_found": len(results),
                "port_audit": results,
            }
        )


# ---------------------------------------------------------------------------
# Port Remediation Requests
# GET  /api/agent/port-remediation/        — list all requests for the org
# POST /api/agent/port-remediation/        — flag a port on a device for closure
# PATCH /api/agent/port-remediation/<id>/  — mark as resolved
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class PortRemediationView(View):
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        requests_qs = PortRemediationRequest.objects.filter(
            organization=org
        ).select_related("employee").order_by("-requested_at")

        return JsonResponse({
            "remediations": [
                {
                    "id": str(r.id),
                    "employee_id": str(r.employee_id),
                    "employee_name": r.employee.name,
                    "hostname": r.hostname,
                    "port": r.port,
                    "port_label": r.port_label,
                    "status": r.status,
                    "requested_at": r.requested_at.isoformat(),
                    "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                }
                for r in requests_qs
            ]
        })

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = body.get("employee_id", "")
        port = body.get("port")
        hostname = (body.get("hostname") or "").strip()
        port_label = (body.get("port_label") or "").strip()

        if not employee_id or port is None or not hostname:
            return JsonResponse({"error": "employee_id, port, and hostname are required."}, status=400)

        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        # Avoid duplicate PENDING requests for the same port on the same device
        existing = PortRemediationRequest.objects.filter(
            organization=org,
            employee=employee,
            port=port,
            status="PENDING",
        ).first()
        if existing:
            return JsonResponse({
                "id": str(existing.id),
                "detail": "Already flagged for closure.",
            }, status=200)

        rem = PortRemediationRequest.objects.create(
            organization=org,
            employee=employee,
            hostname=hostname,
            port=port,
            port_label=port_label,
        )
        return JsonResponse({"id": str(rem.id), "status": "PENDING"}, status=201)

    def patch(self, request, request_id):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            rem = PortRemediationRequest.objects.get(id=request_id, organization=org)
        except PortRemediationRequest.DoesNotExist:
            return JsonResponse({"error": "Not found."}, status=404)

        rem.status = "RESOLVED"
        rem.resolved_at = timezone.now()
        rem.save(update_fields=["status", "resolved_at"])
        return JsonResponse({"id": str(rem.id), "status": "RESOLVED"})


# ---------------------------------------------------------------------------
# Software Audit / Shadow IT
# GET  /api/agent/software-audit/           — org-wide unapproved software
# POST /api/agent/approved-software/        — add approved software entry
# DELETE /api/agent/approved-software/<id>/ — remove entry
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class SoftwareAuditView(View):
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        approved_names = set(
            ApprovedSoftware.objects.filter(organization=org)
            .values_list("name", flat=True)
        )
        approved_lower = {n.lower() for n in approved_names}

        employee_ids = Employee.objects.filter(organization=org).values_list("id", flat=True)

        # Latest snapshot per employee
        latest_ids = []
        for eid in employee_ids:
            snap = DeviceSnapshot.objects.filter(employee_id=eid).order_by("-collected_at").first()
            if snap:
                latest_ids.append(snap.id)

        snapshots = DeviceSnapshot.objects.filter(id__in=latest_ids).select_related("employee")

        # software_name -> {count, devices: [...]}
        unapproved_map = {}
        for snap in snapshots:
            sw_block = snap.raw.get("software") or {}
            sw_list = sw_block.get("software") if isinstance(sw_block, dict) else []
            for item in (sw_list or []):
                name = (item.get("name") or "").strip()
                if not name:
                    continue
                # Unapproved = no approved entry is a substring of this name (case-insensitive)
                is_approved = any(approved in name.lower() for approved in approved_lower)
                if not is_approved:
                    if name not in unapproved_map:
                        unapproved_map[name] = {"software_name": name, "install_count": 0, "devices": []}
                    unapproved_map[name]["install_count"] += 1
                    unapproved_map[name]["devices"].append(
                        {
                            "employee_id": str(snap.employee_id),
                            "employee_name": snap.employee.name,
                            "hostname": snap.hostname,
                        }
                    )

        results = sorted(unapproved_map.values(), key=lambda x: -x["install_count"])

        return JsonResponse(
            {
                "organization": org.name,
                "approved_software_count": len(approved_names),
                "unapproved_software_count": len(results),
                "unapproved_software": results,
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class ApprovedSoftwareView(View):
    """Manage the org allowlist (add / list / delete)."""

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        entries = ApprovedSoftware.objects.filter(organization=org)
        return JsonResponse(
            {
                "approved_software": [
                    {
                        "id": str(e.id),
                        "name": e.name,
                        "notes": e.notes,
                        "added_at": e.added_at.isoformat(),
                    }
                    for e in entries
                ]
            }
        )

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        name = (body.get("name") or "").strip()
        if not name:
            return JsonResponse({"error": "name is required."}, status=400)

        entry, created = ApprovedSoftware.objects.get_or_create(
            organization=org,
            name=name,
            defaults={"notes": body.get("notes", "")},
        )
        return JsonResponse(
            {
                "id": str(entry.id),
                "name": entry.name,
                "notes": entry.notes,
                "created": created,
            },
            status=201 if created else 200,
        )

    def delete(self, request, entry_id=None):
        org, err = get_org_from_request(request)
        if err:
            return err

        if not entry_id:
            return JsonResponse({"error": "entry_id is required."}, status=400)

        try:
            entry = ApprovedSoftware.objects.get(id=entry_id, organization=org)
        except ApprovedSoftware.DoesNotExist:
            return JsonResponse({"error": "Entry not found."}, status=404)

        entry.delete()
        return JsonResponse({"deleted": True, "id": str(entry_id)})


# ---------------------------------------------------------------------------
# Network Device Snapshot Ingest
# POST /api/agent/network-snapshot/
#
# Expected JSON body:
# {
#   "collectedAtUtc": "2026-05-02T11:00:00+00:00",
#   "employee_id": "<uuid>",          // or ?employee_id= query param
#   "device": {
#     "ip": "192.168.1.1",
#     "hostname": "core-switch-01",
#     "type": "switch",               // router | switch | ap
#     "vendor": "Cisco",
#     "sysDescr": "Cisco IOS 15.2"
#   },
#   "interfaces": [
#     { "name": "Gi0/1", "operStatus": "up", "ifInErrors": 0, "ifOutErrors": 0 }
#   ],
#   "traffic": { "inBytes": 123456789, "outBytes": 98765432 }
# }
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class NetworkSnapshotView(View):
    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = request.GET.get("employee_id") or payload.get("employee_id")
        if not employee_id:
            return JsonResponse({"error": "employee_id is required."}, status=400)
        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        collected_at_raw = payload.get("collectedAtUtc")
        if not collected_at_raw:
            return JsonResponse({"error": "collectedAtUtc is required."}, status=400)
        try:
            collected_at_raw = collected_at_raw.replace("Z", "+00:00")
            collected_at = datetime.fromisoformat(collected_at_raw)
            if collected_at.tzinfo is None:
                collected_at = collected_at.replace(tzinfo=timezone.utc)
        except ValueError:
            return JsonResponse({"error": "Invalid collectedAtUtc format."}, status=400)

        device = payload.get("device") or {}
        interfaces = payload.get("interfaces") or []
        traffic = payload.get("traffic") or {}

        risk = compute_network_risk(payload)

        snapshot = NetworkDeviceSnapshot.objects.create(
            employee=employee,
            collected_at=collected_at,
            device_ip=device.get("ip") or None,
            device_hostname=device.get("hostname", ""),
            device_type=device.get("type", ""),
            vendor=device.get("vendor", ""),
            sys_description=device.get("sysDescr", ""),
            interface_count=len(interfaces),
            interfaces_down=sum(
                1 for i in interfaces
                if str(i.get("operStatus", "")).lower() not in ("up", "1")
            ),
            high_error_interfaces=sum(
                1 for i in interfaces
                if (i.get("ifInErrors") or 0) + (i.get("ifOutErrors") or 0) > 1000
            ),
            total_in_bytes=traffic.get("inBytes"),
            total_out_bytes=traffic.get("outBytes"),
            risk_score=risk["score"],
            risk_level=risk["level"],
            risk_signals=risk["signals"],
            raw={k: v for k, v in payload.items() if k != "employee_id"},
        )

        return JsonResponse(
            {"id": str(snapshot.id), "received_at": snapshot.received_at.isoformat(), "risk": risk},
            status=201,
        )


# ---------------------------------------------------------------------------
# System Metrics Snapshot Ingest
# POST /api/agent/system-metrics/
#
# Expected JSON body:
# {
#   "collectedAtUtc": "2026-05-02T11:00:00+00:00",
#   "employee_id": "<uuid>",
#   "hostname": "DESKTOP-ABC",
#   "cpu": {
#     "usagePercent": 45.2,
#     "cores": 8,
#     "load1m": 2.1,
#     "load5m": 1.8,
#     "load15m": 1.5
#   },
#   "memory": {
#     "totalMb": 16384,
#     "usedMb": 12000,
#     "usagePercent": 73.2,
#     "swapUsagePercent": 10.0
#   },
#   "processes": {
#     "total": 312,
#     "zombies": 0,
#     "topByCpu": [
#       { "name": "chrome.exe", "pid": 1234, "cpuPercent": 18.5 }
#     ]
#   }
# }
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class SystemMetricsView(View):
    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = request.GET.get("employee_id") or payload.get("employee_id")
        if not employee_id:
            return JsonResponse({"error": "employee_id is required."}, status=400)
        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        collected_at_raw = payload.get("collectedAtUtc")
        if not collected_at_raw:
            return JsonResponse({"error": "collectedAtUtc is required."}, status=400)
        try:
            collected_at_raw = collected_at_raw.replace("Z", "+00:00")
            collected_at = datetime.fromisoformat(collected_at_raw)
            if collected_at.tzinfo is None:
                collected_at = collected_at.replace(tzinfo=timezone.utc)
        except ValueError:
            return JsonResponse({"error": "Invalid collectedAtUtc format."}, status=400)

        cpu = payload.get("cpu") or {}
        memory = payload.get("memory") or {}
        processes = payload.get("processes") or {}

        risk = compute_system_risk(payload)

        snapshot = SystemMetricsSnapshot.objects.create(
            employee=employee,
            collected_at=collected_at,
            hostname=payload.get("hostname", ""),
            cpu_usage_percent=cpu.get("usagePercent"),
            cpu_cores=cpu.get("cores"),
            cpu_load_1m=cpu.get("load1m"),
            cpu_load_5m=cpu.get("load5m"),
            cpu_load_15m=cpu.get("load15m"),
            ram_total_mb=memory.get("totalMb"),
            ram_used_mb=memory.get("usedMb"),
            ram_usage_percent=memory.get("usagePercent"),
            swap_usage_percent=memory.get("swapUsagePercent"),
            process_count=processes.get("total"),
            zombie_process_count=processes.get("zombies") or 0,
            high_cpu_processes=processes.get("topByCpu") or [],
            risk_score=risk["score"],
            risk_level=risk["level"],
            risk_signals=risk["signals"],
            raw={k: v for k, v in payload.items() if k != "employee_id"},
        )

        return JsonResponse(
            {"id": str(snapshot.id), "received_at": snapshot.received_at.isoformat(), "risk": risk},
            status=201,
        )


# ---------------------------------------------------------------------------
# Disk Health Snapshot Ingest
# POST /api/agent/disk-health/
#
# Expected JSON body (one disk per request):
# {
#   "collectedAtUtc": "2026-05-02T11:00:00+00:00",
#   "employee_id": "<uuid>",
#   "hostname": "DESKTOP-ABC",
#   "device": {
#     "path": "/dev/sda",            // or "PhysicalDrive0" on Windows
#     "model": "Samsung SSD 870 EVO",
#     "serial": "S4PBNX0T123456",
#     "capacityGb": 500,
#     "type": "SSD"                  // HDD | SSD | NVMe
#   },
#   "smart": {
#     "health": "PASSED",            // PASSED | FAILED | UNKNOWN
#     "reallocatedSectors": 0,
#     "pendingSectors": 0,
#     "uncorrectableErrors": 0,
#     "powerOnHours": 4821,
#     "temperatureC": 38
#   }
# }
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class DiskHealthView(View):
    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = request.GET.get("employee_id") or payload.get("employee_id")
        if not employee_id:
            return JsonResponse({"error": "employee_id is required."}, status=400)
        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        collected_at_raw = payload.get("collectedAtUtc")
        if not collected_at_raw:
            return JsonResponse({"error": "collectedAtUtc is required."}, status=400)
        try:
            collected_at_raw = collected_at_raw.replace("Z", "+00:00")
            collected_at = datetime.fromisoformat(collected_at_raw)
            if collected_at.tzinfo is None:
                collected_at = collected_at.replace(tzinfo=timezone.utc)
        except ValueError:
            return JsonResponse({"error": "Invalid collectedAtUtc format."}, status=400)

        device = payload.get("device") or {}
        smart = payload.get("smart") or {}

        risk = compute_disk_risk(payload)

        snapshot = DiskHealthSnapshot.objects.create(
            employee=employee,
            collected_at=collected_at,
            hostname=payload.get("hostname", ""),
            device_path=device.get("path", ""),
            model=device.get("model", ""),
            serial=device.get("serial", ""),
            capacity_gb=device.get("capacityGb"),
            disk_type=device.get("type", ""),
            smart_health=str(smart.get("health") or "UNKNOWN").upper()[:10],
            reallocated_sectors=smart.get("reallocatedSectors"),
            pending_sectors=smart.get("pendingSectors"),
            uncorrectable_errors=smart.get("uncorrectableErrors"),
            power_on_hours=smart.get("powerOnHours"),
            temperature_c=smart.get("temperatureC"),
            risk_score=risk["score"],
            risk_level=risk["level"],
            risk_signals=risk["signals"],
            raw={k: v for k, v in payload.items() if k != "employee_id"},
        )

        return JsonResponse(
            {"id": str(snapshot.id), "received_at": snapshot.received_at.isoformat(), "risk": risk},
            status=201,
        )
