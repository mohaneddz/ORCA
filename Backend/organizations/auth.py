from django.http import JsonResponse

from .models import EmployeeAuthToken


EMPLOYEE_AUTH_PREFIX = "EmployeeToken "


def get_employee_from_request(request):
    """
    Resolve the Employee from `Authorization: EmployeeToken <key>`.
    Returns (employee, None) on success or (None, JsonResponse) on failure.
    """
    header = request.headers.get("Authorization", "")
    if not header.startswith(EMPLOYEE_AUTH_PREFIX):
        return None, JsonResponse(
            {"error": "Authorization header missing or malformed."},
            status=401,
        )

    key = header[len(EMPLOYEE_AUTH_PREFIX):].strip()
    if not key:
        return None, JsonResponse({"error": "Invalid token."}, status=401)

    try:
        token = EmployeeAuthToken.objects.select_related(
            "employee", "employee__organization"
        ).get(key=key)
        return token.employee, None
    except EmployeeAuthToken.DoesNotExist:
        return None, JsonResponse({"error": "Invalid token."}, status=401)
