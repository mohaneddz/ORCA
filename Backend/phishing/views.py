import json
from collections import defaultdict

from django.db.models.functions import TruncMonth
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.models import Employee, Organization
from organizations.views import get_org_from_request

from .models import (
    PhishingCampaign,
    PhishingSimulationTarget,
    PhishingTemplate,
    TrainingEnrollment,
    TrainingModule,
)
from .services import generate_template, recommend_difficulty, send_campaign_emails


# ---------------------------------------------------------------------------
# Auth helper (re-export for local convenience)
# ---------------------------------------------------------------------------

def _get_org(request):
    return get_org_from_request(request)


# ---------------------------------------------------------------------------
# Template views
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class TemplateListCreateView(View):
    """GET /phishing/templates/   POST /phishing/templates/"""

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        templates = PhishingTemplate.objects.all().values(
            "id", "attack_type", "language", "difficulty",
            "subject", "sender_name", "sender_domain", "created_at",
        )
        return JsonResponse({"templates": list(templates)})

    def post(self, request):
        org, err = _get_org(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        required = ["attack_type", "language", "difficulty", "subject", "body", "sender_name", "sender_domain"]
        if not all(body.get(f) for f in required):
            return JsonResponse({"error": f"Required fields: {', '.join(required)}"}, status=400)

        valid_types = {c[0] for c in PhishingTemplate.ATTACK_TYPE_CHOICES}
        if body["attack_type"] not in valid_types:
            return JsonResponse({"error": f"attack_type must be one of {valid_types}"}, status=400)

        valid_langs = {c[0] for c in PhishingTemplate.LANGUAGE_CHOICES}
        if body["language"] not in valid_langs:
            return JsonResponse({"error": f"language must be one of {valid_langs}"}, status=400)

        if body["difficulty"] not in (1, 2, 3):
            return JsonResponse({"error": "difficulty must be 1, 2, or 3."}, status=400)

        tmpl = PhishingTemplate.objects.create(
            attack_type=body["attack_type"],
            language=body["language"],
            difficulty=body["difficulty"],
            subject=body["subject"],
            body=body["body"],
            sender_name=body["sender_name"],
            sender_domain=body["sender_domain"],
        )
        return JsonResponse({"id": str(tmpl.id)}, status=201)


# ---------------------------------------------------------------------------
# Campaign views
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CampaignListCreateView(View):
    """GET /phishing/campaigns/   POST /phishing/campaigns/"""

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        campaigns = []
        for c in PhishingCampaign.objects.filter(organization=org).select_related("template"):
            total = c.targets.count()
            clicked = c.targets.filter(clicked_at__isnull=False).count()
            campaigns.append({
                "id": str(c.id),
                "name": c.name,
                "status": c.status,
                "template_id": str(c.template_id),
                "template_subject": c.template.subject,
                "attack_type": c.template.attack_type,
                "language": c.template.language,
                "difficulty": c.template.difficulty,
                "created_at": c.created_at.isoformat(),
                "launched_at": c.launched_at.isoformat() if c.launched_at else None,
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
                "total_targets": total,
                "clicked_count": clicked,
                "click_rate": round(clicked / total * 100, 1) if total else 0.0,
            })
        return JsonResponse({"campaigns": campaigns})

    def post(self, request):
        org, err = _get_org(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        name = (body.get("name") or "").strip()
        template_id = body.get("template_id")
        if not name or not template_id:
            return JsonResponse({"error": "name and template_id are required."}, status=400)

        try:
            template = PhishingTemplate.objects.get(id=template_id)
        except PhishingTemplate.DoesNotExist:
            return JsonResponse({"error": "Template not found."}, status=404)

        campaign = PhishingCampaign.objects.create(
            organization=org,
            template=template,
            name=name,
            status="DRAFT",
        )
        return JsonResponse({"id": str(campaign.id)}, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class CampaignLaunchView(View):
    """POST /phishing/campaigns/<campaign_id>/launch/"""

    def post(self, request, campaign_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            campaign = PhishingCampaign.objects.get(id=campaign_id, organization=org)
        except PhishingCampaign.DoesNotExist:
            return JsonResponse({"error": "Campaign not found."}, status=404)

        if campaign.status != "DRAFT":
            return JsonResponse({"error": "Only DRAFT campaigns can be launched."}, status=409)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        # Accept explicit employee_ids or default to all active employees in the org
        employee_ids = body.get("employee_ids")
        if employee_ids:
            employees = Employee.objects.filter(
                organization=org, id__in=employee_ids, is_active=True
            )
        else:
            employees = Employee.objects.filter(organization=org, is_active=True)

        if not employees.exists():
            return JsonResponse({"error": "No eligible employees found."}, status=400)

        # Create targets (skip duplicates from previous partial launches)
        created = 0
        for emp in employees:
            _, was_created = PhishingSimulationTarget.objects.get_or_create(
                campaign=campaign, employee=emp
            )
            if was_created:
                created += 1

        campaign.status = "ACTIVE"
        campaign.launched_at = timezone.now()
        campaign.save(update_fields=["status", "launched_at"])

        # Dispatch simulation emails to all newly created targets
        email_result = send_campaign_emails(campaign)

        return JsonResponse({
            "targets_created": created,
            "status": "ACTIVE",
            "emails_sent": email_result["sent"],
            "emails_failed": email_result["failed"],
            "email_errors": email_result["errors"],
        })


@method_decorator(csrf_exempt, name="dispatch")
class CampaignCompleteView(View):
    """POST /phishing/campaigns/<campaign_id>/complete/"""

    def post(self, request, campaign_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            campaign = PhishingCampaign.objects.get(id=campaign_id, organization=org)
        except PhishingCampaign.DoesNotExist:
            return JsonResponse({"error": "Campaign not found."}, status=404)

        if campaign.status != "ACTIVE":
            return JsonResponse({"error": "Only ACTIVE campaigns can be completed."}, status=409)

        campaign.status = "COMPLETED"
        campaign.completed_at = timezone.now()
        campaign.save(update_fields=["status", "completed_at"])

        return JsonResponse({"status": "COMPLETED"})


# ---------------------------------------------------------------------------
# Campaign assign — add employees to a DRAFT campaign without sending emails
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class CampaignAssignView(View):
    """
    POST /phishing/campaigns/<campaign_id>/assign/
    Adds employees to a DRAFT campaign and creates PhishingSimulationTarget
    records for each. No emails are sent. Call launch/ afterward to send.
    """

    def post(self, request, campaign_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            campaign = PhishingCampaign.objects.get(id=campaign_id, organization=org)
        except PhishingCampaign.DoesNotExist:
            return JsonResponse({"error": "Campaign not found."}, status=404)

        if campaign.status != "DRAFT":
            return JsonResponse(
                {"error": "Employees can only be assigned to DRAFT campaigns."},
                status=409,
            )

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_ids = body.get("employee_ids")
        if not isinstance(employee_ids, list) or not employee_ids:
            return JsonResponse({"error": "employee_ids must be a non-empty list."}, status=400)

        employees = Employee.objects.filter(
            id__in=employee_ids, organization=org, is_active=True
        )
        if not employees.exists():
            return JsonResponse({"error": "No eligible employees found."}, status=400)

        assigned = 0
        already_assigned = 0
        for emp in employees:
            _, created = PhishingSimulationTarget.objects.get_or_create(
                campaign=campaign, employee=emp
            )
            if created:
                assigned += 1
            else:
                already_assigned += 1

        return JsonResponse(
            {
                "newly_assigned": assigned,
                "already_assigned": already_assigned,
                "total_targets": campaign.targets.count(),
                "campaign_status": campaign.status,
            },
            status=200,
        )

    def delete(self, request, campaign_id):
        """
        DELETE /phishing/campaigns/<campaign_id>/assign/
        Body: {"employee_id": "<uuid>"}
        Removes one employee from a DRAFT campaign's target list.
        """
        org, err = _get_org(request)
        if err:
            return err

        try:
            campaign = PhishingCampaign.objects.get(id=campaign_id, organization=org)
        except PhishingCampaign.DoesNotExist:
            return JsonResponse({"error": "Campaign not found."}, status=404)

        if campaign.status != "DRAFT":
            return JsonResponse(
                {"error": "Targets can only be removed from DRAFT campaigns."},
                status=409,
            )

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = body.get("employee_id")
        if not employee_id:
            return JsonResponse({"error": "employee_id is required."}, status=400)

        deleted, _ = PhishingSimulationTarget.objects.filter(
            campaign=campaign, employee_id=employee_id
        ).delete()

        if deleted == 0:
            return JsonResponse({"error": "Target not found."}, status=404)

        return JsonResponse(
            {"removed": True, "total_targets": campaign.targets.count()}
        )


# ---------------------------------------------------------------------------
# Click-tracking (public — no auth, uses opaque token)
# ---------------------------------------------------------------------------

class ClickTrackView(View):
    """GET /phishing/click/<token>/"""

    AWARENESS_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Security Awareness – You Clicked a Simulated Phishing Link</title>
  <style>
    body {{ font-family: system-ui, sans-serif; background: #0d1224; color: #e4e8ef;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
    .card {{ max-width: 560px; padding: 2.5rem; border-radius: 16px;
             background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); }}
    h1 {{ color: #f59e0b; margin-top: 0; }}
    .signals {{ background: rgba(255,255,255,0.04); border-radius: 10px; padding: 1rem 1.25rem; margin-top: 1.5rem; }}
    .signals li {{ margin: .45rem 0; color: #9ca8be; font-size: 0.9rem; }}
    p.note {{ font-size: 0.85rem; color: #64748b; margin-top: 1.75rem; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>&#x26A0;&#xFE0F; This was a simulated phishing test.</h1>
    <p>Don't worry — no harm was done. This link was part of a <strong>security awareness simulation</strong>
       run by your organisation to help identify and address phishing risk.</p>
    <div class="signals">
      <p style="margin:0 0 .5rem; font-weight:600; color:#e4e8ef;">Signals you could have spotted:</p>
      <ul>
        <li>The sender's email domain did not match the official organisation domain.</li>
        <li>The message created artificial urgency (e.g. "act now", "your account will be locked").</li>
        <li>The link URL did not point to a known, trusted domain.</li>
        <li>The greeting used your name in an unusual or generic way.</li>
      </ul>
    </div>
    <p>A short <strong>5-minute training module</strong> has been assigned to your profile to help you
       recognise this type of attack in the future.</p>
    <p class="note">If you believe you received this email by mistake, please contact your IT security team.</p>
  </div>
</body>
</html>"""

    def get(self, _request, token):
        try:
            target = PhishingSimulationTarget.objects.select_related(
                "campaign__template", "employee"
            ).get(tracking_token=token)
        except PhishingSimulationTarget.DoesNotExist:
            return HttpResponse("Not found.", status=404)

        # Record the click (idempotent — only set once)
        if not target.clicked_at:
            target.clicked_at = timezone.now()
            target.save(update_fields=["clicked_at"])
            _auto_enroll_training(target)

        return HttpResponse(self.AWARENESS_HTML, content_type="text/html")


def _auto_enroll_training(target: PhishingSimulationTarget):
    """Enroll the employee in the matching training module (best-effort)."""
    try:
        module = TrainingModule.objects.get(
            attack_type=target.campaign.template.attack_type,
            language=target.campaign.template.language,
        )
    except TrainingModule.DoesNotExist:
        # Fall back to English if no localised module exists
        try:
            module = TrainingModule.objects.get(
                attack_type=target.campaign.template.attack_type,
                language="EN",
            )
        except TrainingModule.DoesNotExist:
            return

    TrainingEnrollment.objects.get_or_create(
        employee=target.employee,
        module=module,
        defaults={"simulation_target": target},
    )


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class AnalyticsView(View):
    """GET /phishing/analytics/  — organisation-wide summary"""

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        campaigns = PhishingCampaign.objects.filter(organization=org).prefetch_related("targets")
        total_sent = 0
        total_clicked = 0
        campaign_rows = []

        for c in campaigns:
            sent = c.targets.filter(sent_at__isnull=False).count()
            clicked = c.targets.filter(clicked_at__isnull=False).count()
            total_sent += sent
            total_clicked += clicked
            campaign_rows.append({
                "id": str(c.id),
                "name": c.name,
                "status": c.status,
                "attack_type": c.template.attack_type,
                "difficulty": c.template.difficulty,
                "sent": sent,
                "clicked": clicked,
                "click_rate": round(clicked / sent * 100, 1) if sent else 0.0,
                "launched_at": c.launched_at.isoformat() if c.launched_at else None,
            })

        # Department breakdown
        dept_stats = _department_breakdown(org)

        return JsonResponse({
            "total_campaigns": len(campaign_rows),
            "total_sent": total_sent,
            "total_clicked": total_clicked,
            "overall_click_rate": round(total_clicked / total_sent * 100, 1) if total_sent else 0.0,
            "campaigns": campaign_rows,
            "departments": dept_stats,
        })


def _department_breakdown(org: Organization):
    """Return per-department click stats."""
    targets = (
        PhishingSimulationTarget.objects
        .filter(campaign__organization=org)
        .select_related("employee", "campaign__template")
    )

    dept: dict = defaultdict(lambda: {"sent": 0, "clicked": 0})
    role_stats: dict = defaultdict(lambda: {"sent": 0, "clicked": 0})
    seniority_stats: dict = defaultdict(lambda: {"sent": 0, "clicked": 0})

    for t in targets:
        emp = t.employee
        d = emp.department or "Unknown"
        r = emp.role or "Unknown"
        s = emp.seniority or "Unknown"

        dept[d]["sent"] += 1
        role_stats[r]["sent"] += 1
        seniority_stats[s]["sent"] += 1

        if t.clicked_at:
            dept[d]["clicked"] += 1
            role_stats[r]["clicked"] += 1
            seniority_stats[s]["clicked"] += 1

    def _rate(d):
        return {
            k: {
                **v,
                "click_rate": round(v["clicked"] / v["sent"] * 100, 1) if v["sent"] else 0.0,
            }
            for k, v in d.items()
        }

    return {
        "by_department": _rate(dept),
        "by_role": _rate(role_stats),
        "by_seniority": _rate(seniority_stats),
    }


# ---------------------------------------------------------------------------
# Training views
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class TrainingListView(View):
    """GET /phishing/training/  — all modules available"""

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        modules = TrainingModule.objects.all().values(
            "id", "attack_type", "language", "title", "duration_minutes", "created_at"
        )
        return JsonResponse({"modules": list(modules)})


@method_decorator(csrf_exempt, name="dispatch")
class TrainingEnrollmentListView(View):
    """GET /phishing/training/enrollments/  — all enrollments for this org"""

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        enrollments = (
            TrainingEnrollment.objects
            .filter(employee__organization=org)
            .select_related("employee", "module")
        )
        rows = [
            {
                "id": str(e.id),
                "employee_id": str(e.employee_id),
                "employee_email": e.employee.email,
                "employee_name": e.employee.name,
                "department": e.employee.department,
                "module_id": str(e.module_id),
                "module_title": e.module.title,
                "attack_type": e.module.attack_type,
                "enrolled_at": e.enrolled_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            }
            for e in enrollments
        ]
        return JsonResponse({"enrollments": rows})


@method_decorator(csrf_exempt, name="dispatch")
class TrainingCompleteView(View):
    """POST /phishing/training/enrollments/<enrollment_id>/complete/"""

    def post(self, request, enrollment_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            enrollment = TrainingEnrollment.objects.select_related("employee").get(
                id=enrollment_id, employee__organization=org
            )
        except TrainingEnrollment.DoesNotExist:
            return JsonResponse({"error": "Enrollment not found."}, status=404)

        if enrollment.completed_at:
            return JsonResponse({"error": "Already completed."}, status=409)

        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["completed_at"])

        return JsonResponse({"completed_at": enrollment.completed_at.isoformat()})


# ---------------------------------------------------------------------------
# Simulation targets (mark as sent, list)
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class SimulationTargetSentView(View):
    """POST /phishing/targets/<target_id>/sent/  — mark email as sent"""

    def post(self, request, target_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            target = PhishingSimulationTarget.objects.select_related(
                "campaign"
            ).get(id=target_id, campaign__organization=org)
        except PhishingSimulationTarget.DoesNotExist:
            return JsonResponse({"error": "Target not found."}, status=404)

        if not target.sent_at:
            target.sent_at = timezone.now()
            target.save(update_fields=["sent_at"])

        return JsonResponse({
            "id": str(target.id),
            "tracking_token": str(target.tracking_token),
            "sent_at": target.sent_at.isoformat(),
        })


@method_decorator(csrf_exempt, name="dispatch")
class CampaignTargetsView(View):
    """GET /phishing/campaigns/<campaign_id>/targets/"""

    def get(self, request, campaign_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            campaign = PhishingCampaign.objects.get(id=campaign_id, organization=org)
        except PhishingCampaign.DoesNotExist:
            return JsonResponse({"error": "Campaign not found."}, status=404)

        targets = campaign.targets.select_related("employee").all()
        rows = [
            {
                "id": str(t.id),
                "employee_id": str(t.employee_id),
                "employee_email": t.employee.email,
                "employee_name": t.employee.name,
                "department": t.employee.department,
                "role": t.employee.role,
                "seniority": t.employee.seniority,
                "tracking_token": str(t.tracking_token),
                "sent_at": t.sent_at.isoformat() if t.sent_at else None,
                "clicked_at": t.clicked_at.isoformat() if t.clicked_at else None,
            }
            for t in targets
        ]
        return JsonResponse({"targets": rows})


# ---------------------------------------------------------------------------
# AI Template Generation
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class GenerateTemplateView(View):
    """
    POST /phishing/templates/generate/

    Body (JSON):
      attack_type   – IT_RESET | INVOICE | DELIVERY | HR_UPDATE
      language      – EN | FR | AR_MSA | AR_DARIJA
      difficulty    – 1 | 2 | 3   (optional — omit to auto-recommend)
      employee_id   – UUID (optional — only needed for difficulty=3 spear-phishing)
      save          – bool (optional, default false) — persist as PhishingTemplate

    If OPENAI_API_KEY is set the template body is AI-generated; otherwise the
    built-in culturally-localised library is used.
    """

    def post(self, request):
        org, err = _get_org(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        attack_type = body.get("attack_type", "")
        language = body.get("language", "EN")
        difficulty = body.get("difficulty")
        employee_id = body.get("employee_id")
        save = bool(body.get("save", False))

        valid_types = {c[0] for c in PhishingTemplate.ATTACK_TYPE_CHOICES}
        if attack_type not in valid_types:
            return JsonResponse({"error": f"attack_type must be one of {sorted(valid_types)}"}, status=400)

        valid_langs = {c[0] for c in PhishingTemplate.LANGUAGE_CHOICES}
        if language not in valid_langs:
            return JsonResponse({"error": f"language must be one of {sorted(valid_langs)}"}, status=400)

        # Resolve employee for name personalisation & difficulty recommendation
        employee = None
        if employee_id:
            try:
                employee = Employee.objects.get(id=employee_id, organization=org)
            except Employee.DoesNotExist:
                return JsonResponse({"error": "Employee not found."}, status=404)

        # Auto-recommend difficulty if not supplied
        if difficulty is None:
            difficulty = recommend_difficulty(employee) if employee else 1
        elif difficulty not in (1, 2, 3):
            return JsonResponse({"error": "difficulty must be 1, 2, or 3."}, status=400)

        try:
            tmpl_data = generate_template(
                attack_type=attack_type,
                language=language,
                difficulty=difficulty,
                org_name=org.name,
                employee_name=employee.name if employee else None,
            )
        except ValueError as exc:
            return JsonResponse({"error": str(exc)}, status=400)
        except Exception as exc:
            return JsonResponse({"error": f"Generation failed: {exc}"}, status=500)

        response_payload = {
            "attack_type": attack_type,
            "language": language,
            "difficulty": difficulty,
            **tmpl_data,
        }

        if save:
            obj = PhishingTemplate.objects.create(
                attack_type=attack_type,
                language=language,
                difficulty=difficulty,
                subject=tmpl_data["subject"],
                body=tmpl_data["body"],
                sender_name=tmpl_data["sender_name"],
                sender_domain=tmpl_data["sender_domain"],
            )
            response_payload["id"] = str(obj.id)

        return JsonResponse(response_payload, status=201 if save else 200)


# ---------------------------------------------------------------------------
# Employee Difficulty Recommendation
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class EmployeeDifficultyView(View):
    """GET /phishing/employees/<employee_id>/difficulty/"""

    def get(self, request, employee_id):
        org, err = _get_org(request)
        if err:
            return err

        try:
            employee = Employee.objects.get(id=employee_id, organization=org)
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Employee not found."}, status=404)

        difficulty = recommend_difficulty(employee)
        history = list(
            PhishingSimulationTarget.objects
            .filter(employee=employee, sent_at__isnull=False)
            .order_by("-sent_at")
            .values("sent_at", "clicked_at")[:5]
        )
        total = len(history)
        failed = sum(1 for h in history if h["clicked_at"] is not None)

        return JsonResponse({
            "employee_id": str(employee.id),
            "employee_email": employee.email,
            "recommended_difficulty": difficulty,
            "history_window": total,
            "failed_count": failed,
            "click_rate": round(failed / total * 100, 1) if total else None,
        })


# ---------------------------------------------------------------------------
# Click Rate Trend (time-series analytics)
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class TrendAnalyticsView(View):
    """
    GET /phishing/analytics/trend/

    Returns monthly click rate and training completion trend across all
    completed / active campaigns for the organisation.
    """

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        targets = (
            PhishingSimulationTarget.objects
            .filter(campaign__organization=org, sent_at__isnull=False)
            .select_related("campaign")
        )

        # Build a month → {sent, clicked} map
        monthly: dict = defaultdict(lambda: {"sent": 0, "clicked": 0})
        for t in targets:
            key = t.sent_at.strftime("%Y-%m")
            monthly[key]["sent"] += 1
            if t.clicked_at:
                monthly[key]["clicked"] += 1

        # Training completions per month
        completions = (
            TrainingEnrollment.objects
            .filter(
                employee__organization=org,
                completed_at__isnull=False,
            )
            .values_list("completed_at", flat=True)
        )
        completions_by_month: dict = defaultdict(int)
        for dt in completions:
            completions_by_month[dt.strftime("%Y-%m")] += 1

        all_months = sorted(set(list(monthly.keys()) + list(completions_by_month.keys())))
        trend = []
        for month in all_months:
            sent = monthly[month]["sent"]
            clicked = monthly[month]["clicked"]
            trend.append({
                "month": month,
                "sent": sent,
                "clicked": clicked,
                "click_rate": round(clicked / sent * 100, 1) if sent else 0.0,
                "trainings_completed": completions_by_month.get(month, 0),
            })

        return JsonResponse({"trend": trend})


# ---------------------------------------------------------------------------
# Manager Alerts
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class ManagerAlertsView(View):
    """
    GET /phishing/alerts/managers/

    Returns team-level performance grouped by department, intended for
    manager consumption. Individual employee results are never exposed here.
    """

    RISK_THRESHOLDS = {"HIGH": 50, "MEDIUM": 25}  # click rate %

    def get(self, request):
        org, err = _get_org(request)
        if err:
            return err

        # All targets for this org
        targets = (
            PhishingSimulationTarget.objects
            .filter(campaign__organization=org)
            .select_related("employee", "campaign__template")
        )

        # Aggregate by department
        dept_data: dict = defaultdict(lambda: {
            "sent": 0, "clicked": 0,
            "attack_type_clicks": defaultdict(int),
        })

        for t in targets:
            dept = t.employee.department or "Unknown"
            dept_data[dept]["sent"] += 1
            if t.clicked_at:
                dept_data[dept]["clicked"] += 1
                dept_data[dept]["attack_type_clicks"][t.campaign.template.attack_type] += 1

        # Training completion per department
        enrollments = (
            TrainingEnrollment.objects
            .filter(employee__organization=org)
            .select_related("employee")
        )
        dept_enrolled: dict = defaultdict(int)
        dept_completed: dict = defaultdict(int)
        for e in enrollments:
            dept = e.employee.department or "Unknown"
            dept_enrolled[dept] += 1
            if e.completed_at:
                dept_completed[dept] += 1

        alerts = []
        for dept, stats in sorted(dept_data.items()):
            sent = stats["sent"]
            clicked = stats["clicked"]
            click_rate = round(clicked / sent * 100, 1) if sent else 0.0
            enrolled = dept_enrolled.get(dept, 0)
            completed = dept_completed.get(dept, 0)
            training_completion_rate = round(completed / enrolled * 100, 1) if enrolled else 0.0

            if click_rate >= self.RISK_THRESHOLDS["HIGH"]:
                risk = "HIGH"
            elif click_rate >= self.RISK_THRESHOLDS["MEDIUM"]:
                risk = "MEDIUM"
            else:
                risk = "LOW"

            # Most-clicked attack type
            atk_clicks = stats["attack_type_clicks"]
            top_attack = max(atk_clicks, key=atk_clicks.get) if atk_clicks else None

            alerts.append({
                "department": dept,
                "simulations_sent": sent,
                "click_rate": click_rate,
                "risk_level": risk,
                "top_attack_type": top_attack,
                "training_enrolled": enrolled,
                "training_completion_rate": training_completion_rate,
                "recommendation": _manager_recommendation(risk, top_attack, training_completion_rate),
            })

        return JsonResponse({"department_alerts": alerts})


def _manager_recommendation(risk: str, top_attack: str | None, training_rate: float) -> str:
    attack_labels = {
        "IT_RESET": "IT password reset phishing",
        "INVOICE": "invoice approval fraud",
        "DELIVERY": "delivery notification scams",
        "HR_UPDATE": "HR policy impersonation",
    }
    attack_name = attack_labels.get(top_attack or "", "phishing") if top_attack else "phishing"

    if risk == "HIGH":
        base = (
            f"Your team shows a high susceptibility to {attack_name}. "
            "Consider scheduling a live awareness session and ensuring all outstanding "
            "training modules are completed this week."
        )
    elif risk == "MEDIUM":
        base = (
            f"Your team has moderate exposure to {attack_name}. "
            "Encourage pending training completions and review recent simulation results together."
        )
    else:
        base = (
            "Your team is performing well. Continue reinforcing good habits "
            "with periodic refresher simulations."
        )

    if training_rate < 50 and risk != "LOW":
        base += (
            f" Note: only {training_rate}% of enrolled training has been completed — "
            "following up on completion will significantly reduce future risk."
        )

    return base

