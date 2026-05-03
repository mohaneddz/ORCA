import os

import requests
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from organizations.views import get_org_from_request

VCENTER_BASE = os.environ.get("VCENTER_URL", "").rstrip("/")
VCENTER_USER = os.environ.get("VCENTER_USER", "")
VCENTER_PASS = os.environ.get("VCENTER_PASS", "")


def _vcenter(path, method="GET", **kwargs):
    url = f"{VCENTER_BASE}/rest/{path}"
    resp = requests.request(
        method,
        url,
        auth=(VCENTER_USER, VCENTER_PASS),
        verify=False,
        timeout=10,
        **kwargs,
    )
    resp.raise_for_status()
    return resp.json()


def _require_vcenter(view_func):
    def wrapper(self, request, *args, **kwargs):
        if not VCENTER_BASE:
            return JsonResponse(
                {"error": "vCenter is not configured. Set VCENTER_URL, VCENTER_USER, VCENTER_PASS."},
                status=503,
            )
        return view_func(self, request, *args, **kwargs)
    return wrapper


def _proxy_get(path):
    @method_decorator(csrf_exempt, name="dispatch")
    class _View(View):
        @_require_vcenter
        def get(self, request, **kwargs):
            org, err = get_org_from_request(request)
            if err:
                return err
            try:
                data = _vcenter(path.format(**kwargs))
                return JsonResponse(data, safe=False)
            except Exception as exc:
                return JsonResponse({"error": str(exc)}, status=502)
    return _View


@method_decorator(csrf_exempt, name="dispatch")
class VMListView(View):
    @_require_vcenter
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter("vcenter/vm"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class VMDetailView(View):
    @_require_vcenter
    def get(self, request, vm_id):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter(f"vcenter/vm/{vm_id}"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class VMPowerView(View):
    @_require_vcenter
    def post(self, request, vm_id, action):
        org, err = get_org_from_request(request)
        if err:
            return err
        allowed = {"start", "stop", "reset", "suspend"}
        if action not in allowed:
            return JsonResponse({"error": f"Action must be one of {allowed}"}, status=400)
        try:
            return JsonResponse(_vcenter(f"vcenter/vm/{vm_id}/power/{action}", method="POST"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class VMPerformanceView(View):
    @_require_vcenter
    def get(self, request, vm_id):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter(f"vcenter/vm/{vm_id}/metrics"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class HostListView(View):
    @_require_vcenter
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter("vcenter/host"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class HostPerformanceView(View):
    @_require_vcenter
    def get(self, request, host_id):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter(f"vcenter/host/{host_id}/metrics"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class ClusterListView(View):
    @_require_vcenter
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter("vcenter/cluster"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class DatastoreListView(View):
    @_require_vcenter
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter("vcenter/datastore"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class DatastorePerformanceView(View):
    @_require_vcenter
    def get(self, request, datastore_id):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter(f"vcenter/datastore/{datastore_id}/metrics"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class ResourcePoolListView(View):
    @_require_vcenter
    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err
        try:
            return JsonResponse(_vcenter("vcenter/resource-pool"), safe=False)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=502)
