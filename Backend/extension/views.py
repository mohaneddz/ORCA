from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from organizations.models import Employee

from .models import AdminEvent, BlacklistLog, DLPLog, PhishingLog

import json


@method_decorator(csrf_exempt, name="dispatch")
class DLPLogView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = body.get("employee_id")
        filename = body.get("filename")
        website = body.get("website")
        action_taken = body.get("action_taken")

        if not all([employee_id, filename, website, action_taken]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        if action_taken not in ("allow", "cancel", "force"):
            return JsonResponse(
                {"error": "action_taken must be allow, cancel, or force."}, status=400
            )

        try:
            device = Employee.objects.get(id=employee_id)
        except (Employee.DoesNotExist, Exception):
            return JsonResponse({"error": "Employee not found."}, status=404)

        DLPLog.objects.create(
            employee=device,
            filename=filename,
            website=website,
            action_taken=action_taken,
        )
        return JsonResponse({}, status=200)


@method_decorator(csrf_exempt, name="dispatch")
class BlacklistLogView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = body.get("employee_id")
        attempted_url = body.get("attempted_url")

        if not all([employee_id, attempted_url]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        try:
            device = Employee.objects.get(id=employee_id)
        except (Employee.DoesNotExist, Exception):
            return JsonResponse({"error": "Employee not found."}, status=404)

        BlacklistLog.objects.create(employee=device, attempted_url=attempted_url)
        return JsonResponse({}, status=200)


class PollView(View):
    def get(self, request):
        emp_id = request.GET.get("emp_id")

        if not emp_id:
            return JsonResponse({"error": "emp_id is required."}, status=400)

        try:
            device = Employee.objects.get(id=emp_id)
        except (Employee.DoesNotExist, Exception):
            return JsonResponse({"error": "Employee not found."}, status=404)

        event = (
            AdminEvent.objects.filter(employee=device, is_delivered=False)
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
        domains = getattr(
            settings,
            "EXTENSION_BLACKLIST_DOMAINS",
            ["malware-test.local", "credential-harvest-test.local", "eicar.org"],
        )
        safe_domains = [str(domain).strip().lower() for domain in domains if str(domain).strip()]
        return JsonResponse({"domains": safe_domains})


@method_decorator(csrf_exempt, name="dispatch")
class PhishingLogView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        employee_id = body.get("employee_id")
        clicked = body.get("clicked")
        website = body.get("website")

        if not all([employee_id, clicked is not None, website]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        try:
            device = Employee.objects.get(id=employee_id)
        except (Employee.DoesNotExist, Exception):
            return JsonResponse({"error": "Employee not found."}, status=404)

        PhishingLog.objects.create(
            employee=device,
            clicked=clicked,
            website=website,
        )
        return JsonResponse({}, status=200)
