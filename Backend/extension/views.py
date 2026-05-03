from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from organizations.auth import get_employee_from_request
from organizations.models import EmployeeAuthToken

from .models import AdminEvent, BlacklistLog, DLPLog
from .reputation import evaluate_url_reputation

import json

EMPLOYEE_AUTH_PREFIX = "EmployeeToken "


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _resolve_employee_if_present(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith(EMPLOYEE_AUTH_PREFIX):
        return None

    key = header[len(EMPLOYEE_AUTH_PREFIX):].strip()
    if not key:
        return None

    try:
        token = EmployeeAuthToken.objects.select_related("employee").get(key=key)
        return token.employee
    except EmployeeAuthToken.DoesNotExist:
        return None


@method_decorator(csrf_exempt, name="dispatch")
class DLPLogView(View):
    def post(self, request):
        employee, err = get_employee_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        filename = body.get("filename")
        website = body.get("website")
        action_taken = body.get("action_taken")

        if not all([filename, website, action_taken]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        if action_taken not in ("allow", "cancel", "force"):
            return JsonResponse(
                {"error": "action_taken must be allow, cancel, or force."}, status=400
            )

        event_channel = body.get("event_channel") or "file_upload"
        if event_channel not in ("file_upload", "ai_prompt"):
            event_channel = "file_upload"

        DLPLog.objects.create(
            employee=employee,
            filename=filename,
            website=website,
            action_taken=action_taken,
            event_channel=event_channel,
            document_topic=body.get("document_topic") or "",
            semantic_score=_to_float(body.get("semantic_score")),
            detection_tier=body.get("detection_tier") or "",
            detection_reason=body.get("detection_reason") or "",
            matched_pattern=body.get("matched_pattern") or "",
            input_size_bytes=_to_int(body.get("input_size_bytes")),
            input_size_chars=_to_int(body.get("input_size_chars")),
            threshold_type=body.get("threshold_type") or "",
            threshold_value=_to_float(body.get("threshold_value")),
            decision_score=_to_float(body.get("decision_score")),
        )
        return JsonResponse({}, status=200)


@method_decorator(csrf_exempt, name="dispatch")
class BlacklistLogView(View):
    def post(self, request):
        employee, err = get_employee_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        attempted_url = body.get("attempted_url")

        if not attempted_url:
            return JsonResponse({"error": "Missing required fields."}, status=400)

        BlacklistLog.objects.create(employee=employee, attempted_url=attempted_url)
        return JsonResponse({}, status=200)


class PollView(View):
    def get(self, request):
        employee, err = get_employee_from_request(request)
        if err:
            return err

        event = (
            AdminEvent.objects.filter(employee=employee, is_delivered=False)
            .order_by("created_at")
            .first()
        )

        if not event:
            return JsonResponse({"hasEvent": False})

        payload = dict(event.payload)
        payload["type"] = event.event_type

        event.is_delivered = True
        event.save(update_fields=["is_delivered"])

        return JsonResponse({"hasEvent": True, "eventPayload": payload})


class BlacklistDomainsView(View):
    def get(self, request):
        _, err = get_employee_from_request(request)
        if err:
            return err

        domains = getattr(
            settings,
            "EXTENSION_BLACKLIST_DOMAINS",
            ["malware-test.local", "credential-harvest-test.local", "eicar.org"],
        )
        safe_domains = [str(domain).strip().lower() for domain in domains if str(domain).strip()]
        return JsonResponse({"domains": safe_domains})


class AITargetsView(View):
    def get(self, request):
        _, err = get_employee_from_request(request)
        if err:
            return err

        domains = getattr(
            settings,
            "EXTENSION_AI_TARGET_DOMAINS",
            [
                "chat.openai.com",
                "chatgpt.com",
                "claude.ai",
                "gemini.google.com",
                "copilot.microsoft.com",
            ],
        )
        keywords = getattr(
            settings,
            "EXTENSION_AI_TARGET_KEYWORDS",
            ["chatgpt", "claude", "gemini", "copilot", "assistant", "ai chat", "prompt"],
        )

        safe_domains = [str(domain).strip().lower() for domain in domains if str(domain).strip()]
        safe_keywords = [str(keyword).strip().lower() for keyword in keywords if str(keyword).strip()]
        return JsonResponse({"domains": safe_domains, "keywords": safe_keywords})


@method_decorator(csrf_exempt, name="dispatch")
class ReputationCheckView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        raw_url = body.get("url")
        if not raw_url:
            return JsonResponse({"error": "url is required."}, status=400)

        try:
            result = evaluate_url_reputation(raw_url)
        except ValueError as error:
            return JsonResponse({"error": str(error)}, status=400)

        employee = _resolve_employee_if_present(request)
        if employee and result.get("decision") == "block":
            BlacklistLog.objects.create(
                employee=employee,
                attempted_url=result.get("normalized_url", str(raw_url)),
            )

        return JsonResponse(
            {
                "decision": result["decision"],
                "verdict": result["verdict"],
                "matched_sources": result["matched_sources"],
                "degraded": result["degraded"],
                "reason": result["reason"],
            },
            status=200,
        )
