import csv
import io
from collections import defaultdict
from datetime import timedelta
import json

from django.db.models import Avg, Count
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from agent.models import DeviceSnapshot
from gamification.models import QuizBatchAssignment, QuizSubmission
from organizations.models import Employee
from organizations.views import get_org_from_request
from phishing.models import (
    PhishingCampaign,
    PhishingSimulationTarget,
    TrainingEnrollment,
)
from organizations.models import AuditLog
from gamification.models import Quiz
from agent.models import DeviceSnapshot


def _get_org(request):
    return get_org_from_request(request)


PLAN_LIMITS = {
    "free": {
        "members": 3,
        "projects": 3,
        "devices": 5,
        "api_requests_per_month": 1_000,
        "storage_gb": 1,
        "support_tickets_per_month": 0,
        "data_retention_days": 30,
    },
    "pro": {
        "members": 10,
        "projects": 20,
        "devices": 25,
        "api_requests_per_month": 50_000,
        "storage_gb": 50,
        "support_tickets_per_month": 10,
        "data_retention_days": 90,
    },
    "business": {
        "members": 50,
        "projects": 999_999,  # "Unlimited"
        "devices": 100,
        "api_requests_per_month": 500_000,
        "storage_gb": 500,
        "support_tickets_per_month": 999_999,  # "Priority/unlimited"
        "data_retention_days": 365,
    },
}


@method_decorator(csrf_exempt, name="dispatch")
class BillingUsageView(View):
    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        plan = (request.GET.get("plan") or "free").strip().lower()
        if plan not in PLAN_LIMITS:
            plan = "free"

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        cycle_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

        members = Employee.objects.filter(organization=org, is_active=True).count()
        projects = (
            PhishingCampaign.objects.filter(organization=org).count()
            + Quiz.objects.filter(organization=org).count()
        )

        latest_snap_ids = []
        emp_ids = Employee.objects.filter(organization=org, is_active=True).values_list("id", flat=True)
        for eid in emp_ids:
            sid = (
                DeviceSnapshot.objects.filter(employee_id=eid)
                .order_by("-collected_at")
                .values_list("id", flat=True)
                .first()
            )
            if sid:
                latest_snap_ids.append(sid)
        devices = len(latest_snap_ids)

        api_requests = AuditLog.objects.filter(organization=org, created_at__gte=month_start).count()

        snapshots = DeviceSnapshot.objects.filter(employee__organization=org).values(
            "risk_signals", "hostname", "os_name", "os_version", "cpu_model"
        )
        est_bytes = 0
        for s in snapshots:
            est_bytes += len(json.dumps(s, default=str))
        storage_gb = round(est_bytes / (1024 ** 3), 6)

        support_tickets = 0

        limits = PLAN_LIMITS[plan]
        usage = {
            "members": members,
            "projects": projects,
            "devices": devices,
            "api_requests_per_month": api_requests,
            "storage_gb": storage_gb,
            "support_tickets_per_month": support_tickets,
            "data_retention_days": limits["data_retention_days"],
        }

        return JsonResponse(
            {
                "organization": org.name,
                "plan": plan,
                "cycle_start": month_start.isoformat(),
                "cycle_end": cycle_end.isoformat(),
                "limits": limits,
                "usage": usage,
            }
        )


# ---------------------------------------------------------------------------
# Org-level Summary
# GET /api/dw/summary/
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class OrgSummaryView(View):
    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        employees = Employee.objects.filter(organization=org)
        active_employees = employees.filter(is_active=True)
        emp_ids = list(active_employees.values_list("id", flat=True))

        # ── Phishing ──────────────────────────────────────────────────────
        campaigns = PhishingCampaign.objects.filter(organization=org)
        all_targets = PhishingSimulationTarget.objects.filter(campaign__organization=org)
        sent_targets = all_targets.exclude(sent_at=None)
        clicked = all_targets.filter(clicked_at__isnull=False)
        training = TrainingEnrollment.objects.filter(employee__organization=org)
        training_done = training.filter(completed_at__isnull=False)

        sent_count = sent_targets.count()
        clicked_count = clicked.count()

        # ── Quiz ──────────────────────────────────────────────────────────
        quiz_assigned = QuizBatchAssignment.objects.filter(employee__organization=org)
        quiz_subs = QuizSubmission.objects.filter(
            employee__organization=org,
            quiz__organization=org,
        )
        correct_subs = quiz_subs.filter(is_correct=True)

        assigned_count = quiz_assigned.count()
        submitted_count = quiz_subs.count()
        correct_count = correct_subs.count()

        # ── Device — latest snapshot per employee ─────────────────────────
        latest_snap_ids = []
        for eid in emp_ids:
            snap = (
                DeviceSnapshot.objects.filter(employee_id=eid)
                .order_by("-collected_at")
                .values_list("id", flat=True)
                .first()
            )
            if snap:
                latest_snap_ids.append(snap)

        latest_snaps = DeviceSnapshot.objects.filter(id__in=latest_snap_ids)
        avg_risk = latest_snaps.aggregate(avg=Avg("risk_score"))["avg"]

        risk_dist = defaultdict(int)
        signal_count = defaultdict(int)
        for snap in latest_snaps:
            risk_dist[snap.risk_level or "unknown"] += 1
            for sig in snap.risk_signals or []:
                signal_count[sig] += 1

        top_signals = sorted(signal_count.items(), key=lambda x: -x[1])[:5]

        # ── Leaderboard top 3 ─────────────────────────────────────────────
        quiz_correct_map = {
            str(row["employee_id"]): row["cnt"]
            for row in correct_subs.values("employee_id").annotate(cnt=Count("id"))
        }
        click_map = {
            str(row["employee_id"]): row["cnt"]
            for row in clicked.values("employee_id").annotate(cnt=Count("id"))
        }
        lb_rows = []
        for emp in active_employees:
            eid = str(emp.id)
            score = quiz_correct_map.get(eid, 0) - click_map.get(eid, 0) * 5
            lb_rows.append({"name": emp.name, "department": emp.department, "score": score})
        lb_rows.sort(key=lambda x: -x["score"])

        return JsonResponse(
            {
                "organization": org.name,
                "employees": {
                    "total": employees.count(),
                    "active": active_employees.count(),
                },
                "phishing": {
                    "campaigns_total": campaigns.count(),
                    "campaigns_draft": campaigns.filter(status="DRAFT").count(),
                    "campaigns_active": campaigns.filter(status="ACTIVE").count(),
                    "campaigns_completed": campaigns.filter(status="COMPLETED").count(),
                    "simulations_sent": sent_count,
                    "total_clicks": clicked_count,
                    "click_rate": round(clicked_count / sent_count * 100, 1) if sent_count else 0.0,
                    "training_enrolled": training.count(),
                    "training_completed": training_done.count(),
                    "training_completion_rate": round(
                        training_done.count() / training.count() * 100, 1
                    ) if training.count() else 0.0,
                },
                "quiz": {
                    "quizzes_total": org.quizzes.filter(organization=org).count(),
                    "batches_total": org.quiz_batches.count(),
                    "total_assigned": assigned_count,
                    "total_submitted": submitted_count,
                    "correct_total": correct_count,
                    "completion_rate": round(
                        submitted_count / assigned_count * 100, 1
                    ) if assigned_count else 0.0,
                    "correct_rate": round(
                        correct_count / submitted_count * 100, 1
                    ) if submitted_count else 0.0,
                },
                "device": {
                    "snapshots_total": DeviceSnapshot.objects.filter(
                        employee__organization=org
                    ).count(),
                    "devices_reporting": len(latest_snap_ids),
                    "avg_risk_score": round(avg_risk, 1) if avg_risk is not None else None,
                    "risk_level_distribution": dict(risk_dist),
                    "top_signals": [
                        {"signal": s, "affected_devices": c} for s, c in top_signals
                    ],
                },
                "leaderboard_top3": lb_rows[:3],
            }
        )


# ---------------------------------------------------------------------------
# Per-Employee Full Report
# GET /api/dw/employees/
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class EmployeeReportView(View):
    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        employees = list(Employee.objects.filter(organization=org, is_active=True))

        # Phishing per employee
        phishing_sent = defaultdict(int)
        phishing_clicks = defaultdict(int)
        for t in PhishingSimulationTarget.objects.filter(
            campaign__organization=org
        ).values("employee_id", "sent_at", "clicked_at"):
            eid = str(t["employee_id"])
            if t["sent_at"]:
                phishing_sent[eid] += 1
            if t["clicked_at"]:
                phishing_clicks[eid] += 1

        training_completed_map = {
            str(row["employee_id"]): row["cnt"]
            for row in TrainingEnrollment.objects.filter(
                employee__organization=org, completed_at__isnull=False
            ).values("employee_id").annotate(cnt=Count("id"))
        }

        # Quiz per employee
        quiz_assigned_map = {
            str(row["employee_id"]): row["cnt"]
            for row in QuizBatchAssignment.objects.filter(
                employee__organization=org
            ).values("employee_id").annotate(cnt=Count("id"))
        }
        quiz_submitted_map = defaultdict(int)
        quiz_correct_map = defaultdict(int)
        for sub in QuizSubmission.objects.filter(
            employee__organization=org, quiz__organization=org
        ).values("employee_id", "is_correct"):
            eid = str(sub["employee_id"])
            quiz_submitted_map[eid] += 1
            if sub["is_correct"]:
                quiz_correct_map[eid] += 1

        # Latest device snapshot per employee (one pass, ordered)
        latest_snaps = {}
        for snap in DeviceSnapshot.objects.filter(
            employee__organization=org
        ).order_by("-collected_at").values(
            "id", "employee_id", "hostname", "os_name", "risk_score",
            "risk_level", "risk_signals", "collected_at",
        ):
            eid = str(snap["employee_id"])
            if eid not in latest_snaps:
                latest_snaps[eid] = snap

        # Leaderboard ranking
        lb_scores = {}
        for emp in employees:
            eid = str(emp.id)
            lb_scores[eid] = quiz_correct_map.get(eid, 0) - phishing_clicks.get(eid, 0) * 5
        sorted_eids = sorted(lb_scores, key=lambda x: -lb_scores[x])
        lb_ranks = {eid: rank + 1 for rank, eid in enumerate(sorted_eids)}

        rows = []
        for emp in employees:
            eid = str(emp.id)
            sent = phishing_sent.get(eid, 0)
            clicks = phishing_clicks.get(eid, 0)
            submitted = quiz_submitted_map.get(eid, 0)
            correct = quiz_correct_map.get(eid, 0)
            snap = latest_snaps.get(eid)

            rows.append(
                {
                    "employee_id": eid,
                    "name": emp.name,
                    "email": emp.email,
                    "department": emp.department,
                    "role": emp.role,
                    "seniority": emp.seniority,
                    "phishing": {
                        "simulations_sent": sent,
                        "clicks": clicks,
                        "click_rate": round(clicks / sent * 100, 1) if sent else 0.0,
                        "training_completed": training_completed_map.get(eid, 0),
                    },
                    "quiz": {
                        "assigned": quiz_assigned_map.get(eid, 0),
                        "submitted": submitted,
                        "correct": correct,
                        "correct_rate": round(correct / submitted * 100, 1) if submitted else 0.0,
                    },
                    "device": {
                        "latest_risk_score": snap["risk_score"] if snap else None,
                        "latest_risk_level": snap["risk_level"] if snap else None,
                        "hostname": snap["hostname"] if snap else None,
                        "os_name": snap["os_name"] if snap else None,
                        "last_seen": snap["collected_at"].isoformat() if snap else None,
                        "top_signals": (snap["risk_signals"] or [])[:3] if snap else [],
                    },
                    "leaderboard_score": lb_scores.get(eid, 0),
                    "leaderboard_rank": lb_ranks.get(eid),
                }
            )

        rows.sort(key=lambda x: (x["leaderboard_rank"] or 9999))
        return JsonResponse({"total": len(rows), "employees": rows})


# ---------------------------------------------------------------------------
# Monthly Trend
# GET /api/dw/trend/?months=6
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class TrendView(View):
    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        try:
            months = int(request.GET.get("months", 6))
            months = max(1, min(months, 24))
        except ValueError:
            months = 6

        since = timezone.now() - timedelta(days=months * 30)

        # Phishing by month
        phishing_by_month = defaultdict(lambda: {"sent": 0, "clicked": 0})
        for t in PhishingSimulationTarget.objects.filter(
            campaign__organization=org, sent_at__gte=since
        ).values("sent_at", "clicked_at"):
            key = t["sent_at"].strftime("%Y-%m")
            phishing_by_month[key]["sent"] += 1
            if t["clicked_at"]:
                phishing_by_month[key]["clicked"] += 1

        # Quiz by month
        quiz_by_month = defaultdict(lambda: {"submitted": 0, "correct": 0})
        for sub in QuizSubmission.objects.filter(
            employee__organization=org,
            quiz__organization=org,
            submitted_at__gte=since,
        ).values("submitted_at", "is_correct"):
            key = sub["submitted_at"].strftime("%Y-%m")
            quiz_by_month[key]["submitted"] += 1
            if sub["is_correct"]:
                quiz_by_month[key]["correct"] += 1

        # Device by month
        device_by_month = defaultdict(list)
        for snap in DeviceSnapshot.objects.filter(
            employee__organization=org, collected_at__gte=since
        ).values("collected_at", "risk_score"):
            key = snap["collected_at"].strftime("%Y-%m")
            if snap["risk_score"] is not None:
                device_by_month[key].append(snap["risk_score"])

        all_months = sorted(
            set(
                list(phishing_by_month.keys())
                + list(quiz_by_month.keys())
                + list(device_by_month.keys())
            )
        )

        trend = []
        for m in all_months:
            ph = phishing_by_month[m]
            qz = quiz_by_month[m]
            scores = device_by_month[m]
            trend.append(
                {
                    "month": m,
                    "phishing": {
                        "simulations_sent": ph["sent"],
                        "clicks": ph["clicked"],
                        "click_rate": round(ph["clicked"] / ph["sent"] * 100, 1)
                        if ph["sent"]
                        else 0.0,
                    },
                    "quiz": {
                        "submissions": qz["submitted"],
                        "correct": qz["correct"],
                        "correct_rate": round(qz["correct"] / qz["submitted"] * 100, 1)
                        if qz["submitted"]
                        else 0.0,
                    },
                    "device": {
                        "snapshots_received": len(scores),
                        "avg_risk_score": round(sum(scores) / len(scores), 1)
                        if scores
                        else None,
                    },
                }
            )

        return JsonResponse(
            {"months_requested": months, "data_points": len(trend), "trend": trend}
        )


@method_decorator(csrf_exempt, name="dispatch")
class DailyInsightsView(View):
    """GET /api/dw/daily-insights/ — compare today vs yesterday KPI deltas."""

    @staticmethod
    def _pct_delta(today_value, yesterday_value):
        if yesterday_value == 0:
            return 0.0 if today_value == 0 else 100.0
        return round(((today_value - yesterday_value) / abs(yesterday_value)) * 100, 1)

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)

        active_employee_ids = list(
            Employee.objects.filter(organization=org, is_active=True).values_list("id", flat=True)
        )

        # Risk score delta using snapshots received in each day window.
        today_risk = DeviceSnapshot.objects.filter(
            employee__organization=org, received_at__gte=today_start
        ).aggregate(v=Avg("risk_score"))["v"]
        yesterday_risk = DeviceSnapshot.objects.filter(
            employee__organization=org, received_at__gte=yesterday_start, received_at__lt=today_start
        ).aggregate(v=Avg("risk_score"))["v"]
        today_risk = float(today_risk or 0.0)
        yesterday_risk = float(yesterday_risk or 0.0)

        # Incident-like count = high/critical snapshots received during each day.
        today_incidents = DeviceSnapshot.objects.filter(
            employee__organization=org,
            received_at__gte=today_start,
            risk_level__in=["high", "critical"],
        ).count()
        yesterday_incidents = DeviceSnapshot.objects.filter(
            employee__organization=org,
            received_at__gte=yesterday_start,
            received_at__lt=today_start,
            risk_level__in=["high", "critical"],
        ).count()

        # Managed devices reporting today vs yesterday (unique employees with snapshots in day).
        today_devices = (
            DeviceSnapshot.objects.filter(employee_id__in=active_employee_ids, received_at__gte=today_start)
            .values("employee_id")
            .distinct()
            .count()
        )
        yesterday_devices = (
            DeviceSnapshot.objects.filter(
                employee_id__in=active_employee_ids,
                received_at__gte=yesterday_start,
                received_at__lt=today_start,
            )
            .values("employee_id")
            .distinct()
            .count()
        )

        # Policy coverage proxy = quiz correct rate today vs yesterday by submission date.
        today_submitted = QuizSubmission.objects.filter(
            employee__organization=org,
            quiz__organization=org,
            submitted_at__gte=today_start,
        )
        yesterday_submitted = QuizSubmission.objects.filter(
            employee__organization=org,
            quiz__organization=org,
            submitted_at__gte=yesterday_start,
            submitted_at__lt=today_start,
        )
        today_total = today_submitted.count()
        yesterday_total = yesterday_submitted.count()
        today_correct_rate = round(
            (today_submitted.filter(is_correct=True).count() / today_total) * 100, 1
        ) if today_total else 0.0
        yesterday_correct_rate = round(
            (yesterday_submitted.filter(is_correct=True).count() / yesterday_total) * 100, 1
        ) if yesterday_total else 0.0

        return JsonResponse(
            {
                "today_start": today_start.isoformat(),
                "yesterday_start": yesterday_start.isoformat(),
                "kpis": {
                    "risk_score": {
                        "today": round(today_risk, 1),
                        "yesterday": round(yesterday_risk, 1),
                        "delta_pct": self._pct_delta(today_risk, yesterday_risk),
                    },
                    "open_incidents": {
                        "today": today_incidents,
                        "yesterday": yesterday_incidents,
                        "delta_pct": self._pct_delta(today_incidents, yesterday_incidents),
                    },
                    "managed_devices": {
                        "today": today_devices,
                        "yesterday": yesterday_devices,
                        "delta_pct": self._pct_delta(today_devices, yesterday_devices),
                    },
                    "policy_coverage": {
                        "today": today_correct_rate,
                        "yesterday": yesterday_correct_rate,
                        "delta_pct": self._pct_delta(today_correct_rate, yesterday_correct_rate),
                    },
                },
            }
        )


# ---------------------------------------------------------------------------
# Bulk Export
# GET /api/dw/export/<resource>/?format=json|csv
# Resources: employees, phishing, devices, quizzes
# ---------------------------------------------------------------------------
class ExportView(View):
    VALID_RESOURCES = {"employees", "phishing", "devices", "quizzes"}

    def get(self, request, resource):
        org, err = _get_org(request)
        if err:
            return err

        if resource not in self.VALID_RESOURCES:
            return JsonResponse(
                {"error": f"Unknown resource. Valid: {sorted(self.VALID_RESOURCES)}"},
                status=400,
            )

        fmt = request.GET.get("format", "json").lower()
        if fmt not in ("json", "csv"):
            return JsonResponse({"error": "format must be 'json' or 'csv'."}, status=400)

        rows, columns = self._fetch(resource, org)

        if fmt == "csv":
            return self._csv_response(resource, rows, columns)
        return JsonResponse({"resource": resource, "count": len(rows), "data": rows})

    def _fetch(self, resource, org):
        return getattr(self, f"_{resource}")(org)

    # ── employees ─────────────────────────────────────────────────────────
    def _employees(self, org):
        cols = [
            "id", "name", "email", "department", "role",
            "seniority", "is_active", "registered_at",
        ]
        rows = [
            {
                "id": str(e.id),
                "name": e.name,
                "email": e.email,
                "department": e.department,
                "role": e.role,
                "seniority": e.seniority,
                "is_active": e.is_active,
                "registered_at": e.registered_at.isoformat(),
            }
            for e in Employee.objects.filter(organization=org).order_by("name")
        ]
        return rows, cols

    # ── phishing ──────────────────────────────────────────────────────────
    def _phishing(self, org):
        cols = [
            "target_id", "campaign_id", "campaign_name", "campaign_status",
            "employee_id", "employee_email", "employee_name", "department",
            "attack_type", "language", "difficulty",
            "sent_at", "clicked_at", "clicked",
        ]
        rows = []
        for t in (
            PhishingSimulationTarget.objects.filter(campaign__organization=org)
            .select_related("employee", "campaign", "campaign__template")
            .order_by("-campaign__launched_at")
        ):
            rows.append(
                {
                    "target_id": str(t.id),
                    "campaign_id": str(t.campaign_id),
                    "campaign_name": t.campaign.name,
                    "campaign_status": t.campaign.status,
                    "employee_id": str(t.employee_id),
                    "employee_email": t.employee.email,
                    "employee_name": t.employee.name,
                    "department": t.employee.department,
                    "attack_type": t.campaign.template.attack_type,
                    "language": t.campaign.template.language,
                    "difficulty": t.campaign.template.difficulty,
                    "sent_at": t.sent_at.isoformat() if t.sent_at else None,
                    "clicked_at": t.clicked_at.isoformat() if t.clicked_at else None,
                    "clicked": bool(t.clicked_at),
                }
            )
        return rows, cols

    # ── devices ───────────────────────────────────────────────────────────
    def _devices(self, org):
        cols = [
            "snapshot_id", "employee_id", "employee_name", "hostname",
            "os_name", "os_version", "os_build", "cpu_model",
            "ram_total_mb", "disk_total_gb", "disk_free_gb",
            "patch_is_current", "patch_days_since_update",
            "antivirus_detected", "antivirus_name", "antivirus_enabled", "antivirus_up_to_date",
            "disk_encrypted", "usb_enabled",
            "lan_device_count", "local_port_count", "wifi_open_network_count",
            "risk_score", "risk_level", "risk_signals_count",
            "collected_at", "received_at",
        ]
        rows = []
        picked_by_identity = {}
        snapshots = (
            DeviceSnapshot.objects.filter(employee__organization=org)
            .select_related("employee")
            .order_by("-collected_at", "-received_at")
        )

        def _has_full_telemetry(s):
            raw = s.raw or {}
            if raw.get("source") == "auth_session_ingest":
                return False
            return any(
                [
                    bool(raw.get("processes")),
                    bool((raw.get("software") or {}).get("software") if isinstance(raw.get("software"), dict) else raw.get("software")),
                    bool((raw.get("localPorts") or {}).get("ports") if isinstance(raw.get("localPorts"), dict) else raw.get("localPorts")),
                    bool((raw.get("network") or {}).get("listeningPorts") if isinstance(raw.get("network"), dict) else raw.get("network")),
                    bool(raw.get("wifi")),
                    bool(raw.get("lan")),
                ]
            )

        for s in snapshots:
            # Keep only the latest snapshot per employee/device to avoid duplicate rows on re-login.
            # Hostname-first key keeps UI row selection stable (table routes by hostname),
            # while still falling back when hostname is missing.
            device_key = (s.hostname or s.machine_uuid or s.primary_mac or "").strip().lower()
            identity = (str(s.employee_id), device_key)
            current = picked_by_identity.get(identity)
            if current is None:
                picked_by_identity[identity] = s
                continue

            # Prefer full telemetry snapshots over auth session snapshots.
            if not _has_full_telemetry(current) and _has_full_telemetry(s):
                picked_by_identity[identity] = s

        for s in picked_by_identity.values():
            rows.append(
                {
                    "snapshot_id": str(s.id),
                    "employee_id": str(s.employee_id),
                    "employee_name": s.employee.name,
                    "hostname": s.hostname,
                    "os_name": s.os_name,
                    "os_version": s.os_version,
                    "os_build": s.os_build,
                    "cpu_model": s.cpu_model,
                    "ram_total_mb": s.ram_total_mb,
                    "disk_total_gb": s.disk_total_gb,
                    "disk_free_gb": s.disk_free_gb,
                    "patch_is_current": s.patch_is_current,
                    "patch_days_since_update": s.patch_days_since_update,
                    "antivirus_detected": s.antivirus_detected,
                    "antivirus_name": s.antivirus_name,
                    "antivirus_enabled": s.antivirus_enabled,
                    "antivirus_up_to_date": s.antivirus_up_to_date,
                    "disk_encrypted": s.disk_encrypted,
                    "usb_enabled": s.usb_enabled,
                    "lan_device_count": s.lan_device_count,
                    "local_port_count": s.local_port_count,
                    "wifi_open_network_count": s.wifi_open_network_count,
                    "risk_score": s.risk_score,
                    "risk_level": s.risk_level,
                    "risk_signals_count": len(s.risk_signals or []),
                    "collected_at": s.collected_at.isoformat(),
                    "received_at": s.received_at.isoformat(),
                }
            )

        rows.sort(key=lambda r: r["collected_at"], reverse=True)
        return rows, cols

    # ── quizzes ───────────────────────────────────────────────────────────
    def _quizzes(self, org):
        cols = [
            "submission_id", "employee_id", "employee_name", "email",
            "quiz_id", "quiz_question",
            "answer_selected", "is_correct", "submitted_at",
        ]
        rows = [
            {
                "submission_id": str(s.id),
                "employee_id": str(s.employee_id),
                "employee_name": s.employee.name,
                "email": s.employee.email,
                "quiz_id": str(s.quiz_id),
                "quiz_question": s.quiz.question,
                "answer_selected": s.answer_selected,
                "is_correct": s.is_correct,
                "submitted_at": s.submitted_at.isoformat(),
            }
            for s in QuizSubmission.objects.filter(
                employee__organization=org, quiz__organization=org
            )
            .select_related("employee", "quiz")
            .order_by("-submitted_at")
        ]
        return rows, cols

    # ── CSV helper ────────────────────────────────────────────────────────
    @staticmethod
    def _csv_response(resource, rows, columns):
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
        buf.seek(0)
        response = HttpResponse(buf.read(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{resource}_export.csv"'
        )
        return response


@method_decorator(csrf_exempt, name="dispatch")
class DeviceSnapshotDetailView(View):
    """GET /api/dw/device/<snapshot_id>/detail/ — full snapshot detail including raw payload."""

    def get(self, request, snapshot_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            snap = DeviceSnapshot.objects.select_related("employee").get(
                id=snapshot_id, employee__organization=org
            )
        except DeviceSnapshot.DoesNotExist:
            return JsonResponse({"error": "Device snapshot not found."}, status=404)

        return JsonResponse(
            {
                "snapshot_id": str(snap.id),
                "employee": {
                    "id": str(snap.employee_id),
                    "name": snap.employee.name,
                    "email": snap.employee.email,
                    "department": snap.employee.department,
                    "role": snap.employee.role,
                },
                "collected_at": snap.collected_at.isoformat(),
                "received_at": snap.received_at.isoformat(),
                "hostname": snap.hostname,
                "os_name": snap.os_name,
                "os_version": snap.os_version,
                "os_build": snap.os_build,
                "cpu_model": snap.cpu_model,
                "ram_total_mb": snap.ram_total_mb,
                "disk_total_gb": snap.disk_total_gb,
                "disk_free_gb": snap.disk_free_gb,
                "machine_uuid": snap.machine_uuid,
                "primary_mac": snap.primary_mac,
                "patch_is_current": snap.patch_is_current,
                "patch_last_updated": snap.patch_last_updated.isoformat() if snap.patch_last_updated else None,
                "patch_days_since_update": snap.patch_days_since_update,
                "antivirus_detected": snap.antivirus_detected,
                "antivirus_name": snap.antivirus_name,
                "antivirus_enabled": snap.antivirus_enabled,
                "antivirus_up_to_date": snap.antivirus_up_to_date,
                "disk_encrypted": snap.disk_encrypted,
                "usb_enabled": snap.usb_enabled,
                "lan_device_count": snap.lan_device_count,
                "local_port_count": snap.local_port_count,
                "wifi_open_network_count": snap.wifi_open_network_count,
                "risk_score": snap.risk_score,
                "risk_level": snap.risk_level,
                "risk_signals": snap.risk_signals or [],
                "raw": snap.raw or {},
            }
        )


# ---------------------------------------------------------------------------
# ML — Flat feature export
# GET /api/dw/ml/features/?format=json|csv
# One row per DeviceSnapshot with numeric features for external ML training.
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class MLFeatureExportView(View):
    _COLUMNS = [
        "snapshot_id", "employee_id", "collected_at",
        # Boolean security features (0/1)
        "antivirus_detected", "antivirus_enabled", "antivirus_up_to_date",
        "disk_encrypted", "patch_is_current", "usb_enabled",
        # Numeric features
        "ram_total_mb", "disk_total_gb", "disk_free_gb", "disk_free_pct",
        "local_port_count", "lan_device_count", "wifi_open_network_count",
        "patch_days_since_update",
        # Target / label
        "risk_score", "risk_level",
    ]

    @staticmethod
    def _bool_int(val):
        if val is True:
            return 1
        if val is False:
            return 0
        return None  # unknown

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        fmt = request.GET.get("format", "json").lower()
        if fmt not in ("json", "csv"):
            return JsonResponse({"error": "format must be 'json' or 'csv'."}, status=400)

        rows = []
        for s in (
            DeviceSnapshot.objects.filter(employee__organization=org)
            .order_by("employee_id", "collected_at")
        ):
            disk_free_pct = None
            if s.disk_total_gb and s.disk_free_gb is not None:
                disk_free_pct = round(s.disk_free_gb / s.disk_total_gb * 100, 2)

            rows.append(
                {
                    "snapshot_id": str(s.id),
                    "employee_id": str(s.employee_id),
                    "collected_at": s.collected_at.isoformat(),
                    "antivirus_detected": self._bool_int(s.antivirus_detected),
                    "antivirus_enabled": self._bool_int(s.antivirus_enabled),
                    "antivirus_up_to_date": self._bool_int(s.antivirus_up_to_date),
                    "disk_encrypted": self._bool_int(s.disk_encrypted),
                    "patch_is_current": self._bool_int(s.patch_is_current),
                    "usb_enabled": self._bool_int(s.usb_enabled),
                    "ram_total_mb": s.ram_total_mb,
                    "disk_total_gb": s.disk_total_gb,
                    "disk_free_gb": s.disk_free_gb,
                    "disk_free_pct": disk_free_pct,
                    "local_port_count": s.local_port_count,
                    "lan_device_count": s.lan_device_count,
                    "wifi_open_network_count": s.wifi_open_network_count,
                    "patch_days_since_update": s.patch_days_since_update,
                    "risk_score": s.risk_score,
                    "risk_level": s.risk_level,
                }
            )

        if fmt == "csv":
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=self._COLUMNS, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
            buf.seek(0)
            response = HttpResponse(buf.read(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="ml_features.csv"'
            return response

        return JsonResponse({"count": len(rows), "columns": self._COLUMNS, "data": rows})


# ---------------------------------------------------------------------------
# ML — Z-score anomaly detection per employee
# GET /api/dw/ml/anomalies/?threshold=2.0
# Flags employees whose latest risk score is ≥ threshold standard deviations
# below their historical mean, OR whose score dropped > 25 points from previous.
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class AnomalyDetectionView(View):
    def get(self, request):
        import math

        org, err = _get_org(request)
        if err:
            return err

        try:
            threshold = float(request.GET.get("threshold", 2.0))
        except ValueError:
            threshold = 2.0

        employees = Employee.objects.filter(organization=org, is_active=True)

        anomalies = []
        checked = 0

        for emp in employees:
            snaps = list(
                DeviceSnapshot.objects.filter(employee=emp)
                .order_by("collected_at")
                .values("id", "collected_at", "risk_score")
            )
            scores = [s["risk_score"] for s in snaps if s["risk_score"] is not None]
            if len(scores) < 3:
                # Not enough history for meaningful anomaly detection
                continue

            checked += 1
            latest_score = scores[-1]
            prev_score = scores[-2]
            history = scores[:-1]  # all but latest

            mean = sum(history) / len(history)
            variance = sum((x - mean) ** 2 for x in history) / len(history)
            std = math.sqrt(variance)

            reasons = []

            # Z-score anomaly: score dropped significantly below historical mean
            if std > 0:
                z = (mean - latest_score) / std  # positive when score is BELOW mean
                if z >= threshold:
                    reasons.append(
                        f"Risk score ({latest_score}) is {z:.1f}σ below historical mean ({mean:.1f})"
                    )

            # Sudden drop from previous snapshot
            delta = prev_score - latest_score
            if delta > 25:
                reasons.append(
                    f"Risk score dropped {delta} points from previous snapshot ({prev_score} → {latest_score})"
                )

            if reasons:
                anomalies.append(
                    {
                        "employee_id": str(emp.id),
                        "employee_name": emp.name,
                        "department": emp.department,
                        "latest_risk_score": latest_score,
                        "historical_mean": round(mean, 1),
                        "historical_std": round(std, 2),
                        "previous_score": prev_score,
                        "snapshot_count": len(scores),
                        "reasons": reasons,
                        "latest_snapshot_at": snaps[-1]["collected_at"].isoformat(),
                    }
                )

        anomalies.sort(key=lambda x: x["latest_risk_score"])
        return JsonResponse(
            {
                "threshold_sigma": threshold,
                "employees_checked": checked,
                "anomalies_found": len(anomalies),
                "anomalies": anomalies,
            }
        )


# ---------------------------------------------------------------------------
# ML — RandomForest risk prediction for a specific employee
# GET /api/dw/ml/predict/<employee_id>/
# Trains a RandomForest on ALL org snapshots (min 20), then predicts the
# risk level for the employee's latest snapshot using that model.
# ---------------------------------------------------------------------------
@method_decorator(csrf_exempt, name="dispatch")
class RiskPredictionView(View):
    _FEATURES = [
        "antivirus_detected", "antivirus_enabled", "antivirus_up_to_date",
        "disk_encrypted", "patch_is_current", "usb_enabled",
        "ram_total_mb", "disk_total_gb", "disk_free_gb",
        "local_port_count", "lan_device_count", "wifi_open_network_count",
        "patch_days_since_update",
    ]
    _LEVEL_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}

    @staticmethod
    def _bool_int(val):
        if val is True:
            return 1.0
        if val is False:
            return 0.0
        return 0.5  # unknown treated as neutral for training

    def _snap_to_row(self, s):
        return [
            self._bool_int(s.antivirus_detected),
            self._bool_int(s.antivirus_enabled),
            self._bool_int(s.antivirus_up_to_date),
            self._bool_int(s.disk_encrypted),
            self._bool_int(s.patch_is_current),
            self._bool_int(s.usb_enabled),
            s.ram_total_mb or 0,
            s.disk_total_gb or 0,
            s.disk_free_gb or 0,
            s.local_port_count or 0,
            s.lan_device_count or 0,
            s.wifi_open_network_count or 0,
            s.patch_days_since_update or 0,
        ]

    def get(self, request, employee_id):
        from sklearn.ensemble import RandomForestClassifier

        org, err = _get_org(request)
        if err:
            return err

        # Resolve employee
        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        # Gather all labelled snapshots for org (exclude those with null risk_level)
        all_snaps = list(
            DeviceSnapshot.objects.filter(
                employee__organization=org,
                risk_level__isnull=False,
            ).order_by("collected_at")
        )

        MIN_SAMPLES = 20
        if len(all_snaps) < MIN_SAMPLES:
            return JsonResponse(
                {
                    "status": "insufficient_data",
                    "message": f"Need at least {MIN_SAMPLES} labelled snapshots to train. "
                               f"Currently have {len(all_snaps)}.",
                    "snapshots_available": len(all_snaps),
                },
                status=200,
            )

        # Latest snapshot for the target employee
        latest = (
            DeviceSnapshot.objects.filter(employee=employee)
            .order_by("-collected_at")
            .first()
        )
        if not latest:
            return JsonResponse({"error": "No snapshots found for this employee."}, status=404)

        # Build training set
        X_train = [self._snap_to_row(s) for s in all_snaps]
        y_train = [s.risk_level for s in all_snaps]

        clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_train)

        # Predict
        X_pred = [self._snap_to_row(latest)]
        predicted_level = clf.predict(X_pred)[0]
        proba = clf.predict_proba(X_pred)[0]
        classes = list(clf.classes_)
        confidence = round(float(proba[classes.index(predicted_level)]) * 100, 1)

        # Feature importances
        importances = [
            {"feature": name, "importance": round(float(imp), 4)}
            for name, imp in zip(self._FEATURES, clf.feature_importances_)
        ]
        importances.sort(key=lambda x: -x["importance"])

        return JsonResponse(
            {
                "employee_id": str(employee.id),
                "employee_name": employee.name,
                "training_samples": len(all_snaps),
                "latest_snapshot_at": latest.collected_at.isoformat(),
                "actual_risk_level": latest.risk_level,
                "predicted_risk_level": predicted_level,
                "confidence_pct": confidence,
                "class_probabilities": {
                    cls: round(float(p) * 100, 1) for cls, p in zip(classes, proba)
                },
                "feature_importances": importances[:8],  # top 8
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class EmployeeScoreView(View):
    """GET /api/dw/employee-score/<employee_id>/ — compact consolidated employee score summary."""

    def get(self, request, employee_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        # Device score snapshot summary (no raw payload).
        latest_two = list(
            DeviceSnapshot.objects.filter(employee=employee)
            .order_by("-collected_at")
            .values("id", "collected_at", "risk_score", "risk_level")[:2]
        )
        latest = latest_two[0] if latest_two else None
        previous = latest_two[1] if len(latest_two) > 1 else None
        risk_delta = None
        if latest and previous and latest["risk_score"] is not None and previous["risk_score"] is not None:
            risk_delta = latest["risk_score"] - previous["risk_score"]

        # Quiz/performance aggregates.
        quiz_subs = QuizSubmission.objects.filter(employee=employee, quiz__organization=org)
        quiz_submitted = quiz_subs.count()
        quiz_correct = quiz_subs.filter(is_correct=True).count()
        quiz_correct_rate = round((quiz_correct / quiz_submitted) * 100, 1) if quiz_submitted else 0.0

        # Phishing behavior aggregates.
        targets = PhishingSimulationTarget.objects.filter(employee=employee, campaign__organization=org)
        phishing_sent = targets.exclude(sent_at=None).count()
        phishing_clicked = targets.filter(clicked_at__isnull=False).count()
        phishing_click_rate = round((phishing_clicked / phishing_sent) * 100, 1) if phishing_sent else 0.0

        # Existing leaderboard formula used elsewhere.
        leaderboard_score = quiz_correct - (phishing_clicked * 5)
        active_employees = list(Employee.objects.filter(organization=org, is_active=True))
        score_rows = []
        for emp in active_employees:
            emp_quiz_correct = QuizSubmission.objects.filter(
                employee=emp, quiz__organization=org, is_correct=True
            ).count()
            emp_phishing_clicked = PhishingSimulationTarget.objects.filter(
                employee=emp, campaign__organization=org, clicked_at__isnull=False
            ).count()
            score_rows.append((str(emp.id), emp_quiz_correct - (emp_phishing_clicked * 5)))
        score_rows.sort(key=lambda x: -x[1])
        rank = next((idx + 1 for idx, row in enumerate(score_rows) if row[0] == str(employee.id)), None)

        # Optional compact ML prediction (no feature payload).
        ml_prediction = None
        try:
            # Reuse same readiness threshold as RiskPredictionView.
            labelled_count = DeviceSnapshot.objects.filter(
                employee__organization=org,
                risk_level__isnull=False,
            ).count()
            if labelled_count >= 20 and latest:
                # Lightweight approximation from latest known risk level when model call is omitted.
                ml_prediction = {
                    "status": "available",
                    "predicted_risk_level": latest.get("risk_level"),
                    "confidence_pct": None,
                    "note": "Use /api/dw/ml/predict/<employee_id>/ for full model probabilities.",
                }
            else:
                ml_prediction = {"status": "insufficient_data"}
        except Exception:
            ml_prediction = {"status": "unavailable"}

        return JsonResponse(
            {
                "employee": {
                    "id": str(employee.id),
                    "name": employee.name,
                    "email": employee.email,
                    "department": employee.department,
                    "role": employee.role,
                    "seniority": employee.seniority,
                },
                "device_score": {
                    "latest_snapshot_id": str(latest["id"]) if latest else None,
                    "latest_collected_at": latest["collected_at"].isoformat() if latest else None,
                    "risk_score": latest["risk_score"] if latest else None,
                    "risk_level": latest["risk_level"] if latest else None,
                    "risk_delta_from_previous": risk_delta,
                },
                "behavior_score": {
                    "quiz_submitted": quiz_submitted,
                    "quiz_correct": quiz_correct,
                    "quiz_correct_rate": quiz_correct_rate,
                    "phishing_sent": phishing_sent,
                    "phishing_clicked": phishing_clicked,
                    "phishing_click_rate": phishing_click_rate,
                },
                "leaderboard": {
                    "score": leaderboard_score,
                    "rank": rank,
                    "participants": len(score_rows),
                },
                "ml_prediction": ml_prediction,
            }
        )

