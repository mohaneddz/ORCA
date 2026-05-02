from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from organizations.models import Device

from .models import AdminEvent, BlacklistLog, DLPLog

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

        if action_taken not in ("BLOCKED", "BYPASSED"):
            return JsonResponse(
                {"error": "action_taken must be BLOCKED or BYPASSED."}, status=400
            )

        try:
            device = Device.objects.get(id=employee_id)
        except (Device.DoesNotExist, Exception):
            return JsonResponse({"error": "Device not found."}, status=404)

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
            device = Device.objects.get(id=employee_id)
        except (Device.DoesNotExist, Exception):
            return JsonResponse({"error": "Device not found."}, status=404)

        BlacklistLog.objects.create(employee=device, attempted_url=attempted_url)
        return JsonResponse({}, status=200)


class PollView(View):
    def get(self, request):
        emp_id = request.GET.get("emp_id")

        if not emp_id:
            return JsonResponse({"error": "emp_id is required."}, status=400)

        try:
            device = Device.objects.get(id=emp_id)
        except (Device.DoesNotExist, Exception):
            return JsonResponse({"error": "Device not found."}, status=404)

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
