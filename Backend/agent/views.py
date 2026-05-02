import json
from datetime import datetime, timezone

from django.db.models import Count
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.models import Employee
from organizations.views import get_org_from_request

from .models import ApprovedSoftware, DeviceSnapshot
from .risk import _RISKY_PORTS, compute_risk


@method_decorator(csrf_exempt, name="dispatch")
class SnapshotIngestView(View):
    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        # ── Resolve employee ──────────────────────────────────────────────
        employee_id = (
            request.GET.get("employee_id")
            or payload.get("employee_id")
        )
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

        # ── Extract indexed fields ────────────────────────────────────────
        device = payload.get("device") or {}
        hardware = device.get("hardware") or {}
        user = payload.get("user") or {}

        # ── Backend risk computation (ignore any risk block from agent) ───
        risk = compute_risk(payload)

        # ── Strip agent-supplied risk from stored raw payload ─────────────
        raw = {k: v for k, v in payload.items() if k not in ("risk", "employee_id")}

        # ── Persist ───────────────────────────────────────────────────────
        snapshot = DeviceSnapshot.objects.create(
            employee=employee,
            collected_at=collected_at,
            hostname=device.get("hostname", ""),
            os_name=device.get("osName", ""),
            os_version=device.get("osVersion", ""),
            architecture=device.get("architecture", ""),
            uptime_seconds=device.get("uptimeSeconds"),
            cpu_cores=hardware.get("cpuCores"),
            total_memory_mb=hardware.get("totalMemoryMb"),
            is_admin=bool(user.get("isAdminEstimate", False)),
            local_admin_count=len(user.get("localAdmins") or []),
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
            net = snap.raw.get("network") or {}
            return {p.get("port") for p in (net.get("listeningPorts") or []) if p.get("port")}

        def _procs(snap):
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

        snapshots = DeviceSnapshot.objects.filter(id__in=latest_ids)

        # Aggregate risky ports across all devices
        risky_port_map = {}  # port_number -> {label, affected_devices: [...]}
        for snap in snapshots:
            net = snap.raw.get("network") or {}
            open_ports = {p.get("port") for p in (net.get("listeningPorts") or []) if p.get("port")}
            for port, label in _RISKY_PORTS.items():
                if port in open_ports:
                    if port not in risky_port_map:
                        risky_port_map[port] = {"port": port, "label": label, "affected_devices": []}
                    risky_port_map[port]["affected_devices"].append(
                        {
                            "employee_id": str(snap.employee_id),
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
