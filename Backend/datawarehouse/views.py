import csv
import io
from collections import defaultdict
from datetime import timedelta

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


def _get_org(request):
    return get_org_from_request(request)


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
            "os_name", "os_version", "architecture",
            "is_admin", "local_admin_count",
            "risk_score", "risk_level", "risk_signals_count",
            "collected_at", "received_at",
        ]
        rows = [
            {
                "snapshot_id": str(s.id),
                "employee_id": str(s.employee_id),
                "employee_name": s.employee.name,
                "hostname": s.hostname,
                "os_name": s.os_name,
                "os_version": s.os_version,
                "architecture": s.architecture,
                "is_admin": s.is_admin,
                "local_admin_count": s.local_admin_count,
                "risk_score": s.risk_score,
                "risk_level": s.risk_level,
                "risk_signals_count": len(s.risk_signals or []),
                "collected_at": s.collected_at.isoformat(),
                "received_at": s.received_at.isoformat(),
            }
            for s in DeviceSnapshot.objects.filter(employee__organization=org)
            .select_related("employee")
            .order_by("-collected_at")
        ]
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
