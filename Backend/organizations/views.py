import json
from pathlib import Path

from django.contrib.auth import authenticate
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
import requests

from .auth import get_employee_from_request
from .models import AuthToken, Employee, EmployeeAuthToken, Organization


# ---------------------------------------------------------------------------
# Auth helper shared across apps
# ---------------------------------------------------------------------------

def get_org_from_request(request):
    """
    Resolve the Organisation from `Authorization: Token <key>`.
    Returns (org, None) on success or (None, JsonResponse) on failure.
    """
    header = request.headers.get("Authorization", "")
    if not header.startswith("Token "):
        return None, JsonResponse({"error": "Authorization header missing or malformed."}, status=401)
    key = header[6:]
    try:
        token = AuthToken.objects.select_related("organization").get(key=key)
        return token.organization, None
    except AuthToken.DoesNotExist:
        return None, JsonResponse({"error": "Invalid token."}, status=401)


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        email = body.get("email", "").strip().lower()
        name = body.get("name", "").strip()
        password = body.get("password", "")

        if not all([email, name, password]):
            return JsonResponse({"error": "email, name, and password are required."}, status=400)

        if len(password) < 8:
            return JsonResponse({"error": "Password must be at least 8 characters."}, status=400)

        if Organization.objects.filter(email=email).exists():
            return JsonResponse({"error": "An organization with this email already exists."}, status=409)

        org = Organization.objects.create_user(email=email, name=name, password=password)
        token = AuthToken.objects.create(organization=org)

        return JsonResponse(
            {"token": token.key, "organization": {"id": str(org.id), "name": org.name, "email": org.email}},
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not all([email, password]):
            return JsonResponse({"error": "email and password are required."}, status=400)

        org = authenticate(request, email=email, password=password)
        if org is None:
            return JsonResponse({"error": "Invalid credentials."}, status=401)

        token = AuthToken.objects.create(organization=org)

        return JsonResponse(
            {"token": token.key, "organization": {"id": str(org.id), "name": org.name, "email": org.email}},
            status=200,
        )


@method_decorator(csrf_exempt, name="dispatch")
class ChangePasswordView(View):
    """POST /api/auth/change-password — update the organisation account password."""

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        new_password = body.get("new_password", "")
        if not new_password:
            return JsonResponse({"error": "new_password is required."}, status=400)

        if len(new_password) < 8:
            return JsonResponse({"error": "Password must be at least 8 characters."}, status=400)

        org.set_password(new_password)
        org.save()
        return JsonResponse({}, status=200)


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(View):
    def post(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Token "):
            return JsonResponse({"error": "Authorization header missing or malformed."}, status=401)

        key = auth_header[6:]
        deleted, _ = AuthToken.objects.filter(key=key).delete()
        if not deleted:
            return JsonResponse({"error": "Invalid or already revoked token."}, status=401)

        return JsonResponse({}, status=200)


class MeView(View):
    """GET /api/auth/me  — return the current organisation profile."""

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        return JsonResponse({
            "id": str(org.id),
            "email": org.email,
            "name": org.name,
            "is_staff": org.is_staff,
            "is_superuser": org.is_superuser,
            "created_at": org.created_at.isoformat(),
        })


@method_decorator(csrf_exempt, name="dispatch")
class ProfileAvatarUploadView(View):
    """POST /api/auth/profile/avatar — upload org avatar to Supabase Storage via backend key."""

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return JsonResponse({"error": "file is required (multipart/form-data)."}, status=400)

        if not (uploaded_file.content_type or "").startswith("image/"):
            return JsonResponse({"error": "Only image files are allowed."}, status=400)

        max_bytes = 5 * 1024 * 1024
        if uploaded_file.size > max_bytes:
            return JsonResponse({"error": "Profile picture must be under 5MB."}, status=400)

        supabase_url = (settings.SUPABASE_URL or "").rstrip("/")
        supabase_key = (
            settings.SUPABASE_KEY
            or getattr(settings, "SUPABASE_SECRET_KEY", None)
            or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
        )
        if not supabase_url or not supabase_key:
            return JsonResponse(
                {
                    "error": (
                        "Backend Supabase credentials are missing. "
                        "Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in Backend/.env."
                    )
                },
                status=500,
            )

        bucket = getattr(settings, "SUPABASE_AVATARS_BUCKET", None) or "staff-pfps"
        extension = Path(uploaded_file.name or "avatar.jpg").suffix.lower() or ".jpg"
        object_path = f"staff/{org.id}/avatar{extension}"
        upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"

        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "x-upsert": "true",
            "Content-Type": uploaded_file.content_type or "application/octet-stream",
        }

        try:
            response = requests.post(
                upload_url,
                headers=headers,
                data=uploaded_file.read(),
                timeout=30,
            )
        except requests.RequestException as exc:
            return JsonResponse({"error": f"Storage upload request failed: {exc}"}, status=502)

        if response.status_code >= 400:
            try:
                error_payload = response.json()
            except ValueError:
                error_payload = {"raw": response.text}
            return JsonResponse(
                {
                    "error": "Supabase storage rejected upload.",
                    "status": response.status_code,
                    "details": error_payload,
                },
                status=400,
            )

        avatar_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{object_path}"
        return JsonResponse(
            {
                "bucket": bucket,
                "path": object_path,
                "avatarUrl": avatar_url,
            },
            status=200,
        )


# ---------------------------------------------------------------------------
# Employee management
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class EmployeeListCreateView(View):
    """GET /api/employees/   POST /api/employees/"""

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        employees = Employee.objects.filter(organization=org).values(
            "id", "name", "email", "department", "role", "seniority", "is_active", "registered_at"
        )
        return JsonResponse({"employees": list(employees)})

    def post(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not all([name, email, password]):
            return JsonResponse({"error": "name, email, and password are required."}, status=400)

        if len(password) < 8:
            return JsonResponse({"error": "Password must be at least 8 characters."}, status=400)

        if Employee.objects.filter(email=email).exists():
            return JsonResponse({"error": "An employee with this email already exists."}, status=409)

        employee = Employee(
            organization=org,
            name=name,
            email=email,
            department=(body.get("department") or "").strip(),
            role=(body.get("role") or "").strip(),
            seniority=body.get("seniority") or "mid",
        )
        employee.set_password(password)
        employee.save()

        return JsonResponse({
            "id": str(employee.id),
            "name": employee.name,
            "email": employee.email,
        }, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class EmployeeDetailView(View):
    """PATCH /api/employees/<id>/   DELETE /api/employees/<id>/"""

    def _get_employee(self, request, employee_id):
        org, err = get_org_from_request(request)
        if err:
            return None, None, err
        try:
            emp = Employee.objects.get(id=employee_id, organization=org)
            return org, emp, None
        except Employee.DoesNotExist:
            return None, None, JsonResponse({"error": "Employee not found."}, status=404)

    def patch(self, request, employee_id):
        _, emp, err = self._get_employee(request, employee_id)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        updatable = ["name", "department", "role", "seniority", "is_active"]
        for field in updatable:
            if field in body:
                setattr(emp, field, body[field])

        if "password" in body:
            if len(body["password"]) < 8:
                return JsonResponse({"error": "Password must be at least 8 characters."}, status=400)
            emp.set_password(body["password"])

        emp.save()
        return JsonResponse({"id": str(emp.id), "email": emp.email, "name": emp.name})

    def delete(self, request, employee_id):
        _, emp, err = self._get_employee(request, employee_id)
        if err:
            return err
        emp.delete()
        return JsonResponse({}, status=204)


@method_decorator(csrf_exempt, name="dispatch")
class EmployeeLoginView(View):
    """POST /api/auth/employee/login — authenticate an employee with email + password."""

    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not all([email, password]):
            return JsonResponse({"error": "email and password are required."}, status=400)

        try:
            employee = Employee.objects.select_related("organization").get(
                email=email, is_active=True
            )
        except Employee.DoesNotExist:
            return JsonResponse({"error": "Invalid credentials."}, status=401)

        if not employee.check_password(password):
            return JsonResponse({"error": "Invalid credentials."}, status=401)

        token = EmployeeAuthToken.objects.create(employee=employee)

        return JsonResponse({
            "token": token.key,
            "employee": {
                "id": str(employee.id),
                "name": employee.name,
                "email": employee.email,
                "department": employee.department,
                "role": employee.role,
                "seniority": employee.seniority,
                "organization": {
                    "id": str(employee.organization.id),
                    "name": employee.organization.name,
                },
            },
        }, status=200)


@method_decorator(csrf_exempt, name="dispatch")
class EmployeeLogoutView(View):
    """POST /api/auth/employee/logout — revoke the current employee token."""

    def post(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith("EmployeeToken "):
            return JsonResponse({"error": "Authorization header missing or malformed."}, status=401)

        key = header[len("EmployeeToken "):]
        deleted, _ = EmployeeAuthToken.objects.filter(key=key).delete()
        if not deleted:
            return JsonResponse({"error": "Invalid or already revoked token."}, status=401)

        return JsonResponse({}, status=200)


class EmployeeMeView(View):
    """GET /api/auth/employee/me — return the current employee profile."""

    def get(self, request):
        employee, err = get_employee_from_request(request)
        if err:
            return err

        return JsonResponse({
            "id": str(employee.id),
            "name": employee.name,
            "email": employee.email,
            "department": employee.department,
            "role": employee.role,
            "seniority": employee.seniority,
            "is_active": employee.is_active,
            "registered_at": employee.registered_at.isoformat(),
            "organization": {
                "id": str(employee.organization_id),
                "name": employee.organization.name,
            },
        })

