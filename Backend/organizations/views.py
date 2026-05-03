import json
import threading
from pathlib import Path

from django.contrib.auth import authenticate
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
import requests
from django.utils import timezone

from .auth import get_employee_from_request
from .models import AuthToken, Employee, EmployeeAuthToken, Organization, AuditLog
from .password_audit import evaluate_authorized_password_candidate
from agent.models import DeviceSnapshot


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


def get_org_or_employee_from_request(request):
    header = request.headers.get("Authorization", "")
    if header.startswith("Token "):
        key = header[6:]
        try:
            token = AuthToken.objects.select_related("organization").get(key=key)
            return token.organization, None, None
        except AuthToken.DoesNotExist:
            return None, None, JsonResponse({"error": "Invalid organization token."}, status=401)

    if header.startswith("EmployeeToken "):
        key = header[len("EmployeeToken "):]
        try:
            token = EmployeeAuthToken.objects.select_related("employee", "employee__organization").get(key=key)
            return token.employee.organization, token.employee, None
        except EmployeeAuthToken.DoesNotExist:
            return None, None, JsonResponse({"error": "Invalid employee token."}, status=401)

    return None, None, JsonResponse({"error": "Authorization header missing or malformed."}, status=401)


def _run_employee_password_audit(employee_id: str, candidate_passwords: list[str]):
    try:
        employee = Employee.objects.select_related("organization").get(id=employee_id)
    except Employee.DoesNotExist:
        return

    result = evaluate_authorized_password_candidate(
        stored_hash=employee.password,
        candidate_passwords=candidate_passwords,
        user_inputs=[employee.name or "", employee.email or "", employee.organization.name or ""],
    )

    employee.must_change_password = result.weak
    employee.password_risk_level = result.risk_level
    employee.password_risk_reason = result.reason
    employee.password_last_audited_at = timezone.now()
    employee.save(
        update_fields=[
            "must_change_password",
            "password_risk_level",
            "password_risk_reason",
            "password_last_audited_at",
        ]
    )

    if result.weak:
        AuditLog.objects.create(
            organization=employee.organization,
            action="Weak Password Flagged",
            target=f"Employee:{employee.email}",
            result=result.reason,
        )


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(View):
    def options(self, request, *args, **kwargs):
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

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

        response = JsonResponse(
            {"token": token.key, "organization": {"id": str(org.id), "name": org.name, "email": org.email}},
            status=201,
        )
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(View):
    def options(self, request, *args, **kwargs):
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    def post(self, request):
        print(f"DEBUG: Raw request body: {request.body}")
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            print("DEBUG: JSON Decode Error")
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not all([email, password]):
            return JsonResponse({"error": "email and password are required."}, status=400)

        print(f"DEBUG: Login attempt for email: {email}")
        org = authenticate(request, username=email, password=password)
        print(f"DEBUG: Authenticate result: {org}")
        if org is None:
            response = JsonResponse({"error": "Invalid credentials."}, status=401)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        token = AuthToken.objects.create(organization=org)

        response = JsonResponse(
            {"token": token.key, "organization": {"id": str(org.id), "name": org.name, "email": org.email}},
            status=200,
        )
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response


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
        
        AuditLog.objects.create(
            organization=org,
            action="Password Changed",
            target="Account Security",
            result="Success"
        )
        
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
            "phone": org.phone,
            "avatarUrl": org.avatar_url,
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

        extension = Path(uploaded_file.name or "avatar.jpg").suffix.lower() or ".jpg"
        allowed_image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
        content_type = (uploaded_file.content_type or "").lower()
        has_image_mime = content_type.startswith("image/")
        has_allowed_extension = extension in allowed_image_extensions
        # Some clients send application/octet-stream for Blob/FormData uploads.
        if not has_image_mime and not has_allowed_extension:
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
        object_path = f"staff/{org.id}/avatar{extension}"
        upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"

        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "x-upsert": "true",
            "Content-Type": uploaded_file.content_type or "application/octet-stream",
        }

        try:
            uploaded_file.seek(0)
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


@method_decorator(csrf_exempt, name="dispatch")
class ProfileUpdateView(View):
    """PATCH /api/auth/profile — update the current organization's profile details."""

    def patch(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        # Map organizationName from frontend to name in backend
        name = body.get("name") or body.get("organizationName")
        if name:
            org.name = name.strip()
        
        if "email" in body:
            new_email = body["email"].strip().lower()
            if new_email and new_email != org.email:
                if Organization.objects.filter(email=new_email).exists():
                    return JsonResponse({"error": "Email already in use."}, status=409)
                org.email = new_email
        
        if "phone" in body:
            org.phone = body["phone"].strip()
        
        if "avatarUrl" in body:
            org.avatar_url = body["avatarUrl"].strip()

        org.save()
        
        AuditLog.objects.create(
            organization=org,
            action="Profile Updated",
            target="Account Profile",
            result="Success"
        )
        
        return JsonResponse({
            "id": str(org.id),
            "name": org.name,
            "email": org.email,
            "phone": org.phone,
        }, status=200)

    def delete(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err
        org.delete()
        return JsonResponse({}, status=204)


class AuditLogListView(View):
    """GET /api/auth/audit-logs — return the current organization's audit history."""

    def get(self, request):
        org, err = get_org_from_request(request)
        if err:
            return err

        logs = AuditLog.objects.filter(organization=org).values(
            "id", "action", "target", "result", "created_at"
        )
        return JsonResponse({"logs": list(logs)})


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

    def options(self, request, *args, **kwargs):
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

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
            response = JsonResponse({"error": "Invalid credentials."}, status=401)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        if not employee.check_password(password):
            response = JsonResponse({"error": "Invalid credentials."}, status=401)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        # Background check for current authenticated staff password; no blocking on login.
        worker = threading.Thread(
            target=_run_employee_password_audit,
            args=(str(employee.id), [password]),
            daemon=True,
        )
        worker.start()

        token = EmployeeAuthToken.objects.create(employee=employee)

        response = JsonResponse({
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
                "must_change_password": employee.must_change_password,
                "password_risk_level": employee.password_risk_level,
                "password_risk_reason": employee.password_risk_reason,
            },
        }, status=200)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response


@method_decorator(csrf_exempt, name="dispatch")
class EmployeePasswordAuditView(View):
    """
    POST /api/auth/employee/password-audit
    Controlled-lab endpoint: evaluates only authorized plaintext candidates against current user's stored hash.
    """

    def post(self, request):
        employee, err = get_employee_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        candidates = body.get("authorized_candidates") or []
        if not isinstance(candidates, list) or not candidates:
            return JsonResponse({"error": "authorized_candidates must be a non-empty list."}, status=400)

        result = evaluate_authorized_password_candidate(
            stored_hash=employee.password,
            candidate_passwords=[str(x) for x in candidates if isinstance(x, str)],
            user_inputs=[employee.name or "", employee.email or "", employee.organization.name or ""],
        )

        employee.must_change_password = result.weak
        employee.password_risk_level = result.risk_level
        employee.password_risk_reason = result.reason
        employee.password_last_audited_at = timezone.now()
        employee.save(
            update_fields=[
                "must_change_password",
                "password_risk_level",
                "password_risk_reason",
                "password_last_audited_at",
            ]
        )

        if result.weak:
            AuditLog.objects.create(
                organization=employee.organization,
                action="Weak Password Flagged",
                target=f"Employee:{employee.email}",
                result=result.reason,
            )

        return JsonResponse(
            {
                "must_change_password": employee.must_change_password,
                "password_risk_level": employee.password_risk_level,
                "password_risk_reason": employee.password_risk_reason,
                "password_last_audited_at": employee.password_last_audited_at.isoformat()
                if employee.password_last_audited_at
                else None,
            },
            status=200,
        )


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
            "must_change_password": employee.must_change_password,
            "password_risk_level": employee.password_risk_level,
            "password_risk_reason": employee.password_risk_reason,
            "registered_at": employee.registered_at.isoformat(),
            "organization": {
                "id": str(employee.organization_id),
                "name": employee.organization.name,
            },
        })


@method_decorator(csrf_exempt, name="dispatch")
class SessionDeviceIngestView(View):
    """POST /api/auth/session-device — create a device snapshot on login/registration."""

    def post(self, request):
        org, employee, err = get_org_or_employee_from_request(request)
        if err:
            return err

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        if employee is None:
            employee_id = (body.get("employee_id") or "").strip()
            if not employee_id:
                return JsonResponse({"error": "employee_id is required for organization sessions."}, status=400)
            try:
                employee = Employee.objects.get(id=employee_id, organization=org, is_active=True)
            except Employee.DoesNotExist:
                return JsonResponse({"error": "Employee not found for this organization."}, status=404)

        device = body.get("device") or {}
        hardware = device.get("hardware") or {}

        snapshot = DeviceSnapshot.objects.create(
            employee=employee,
            collected_at=timezone.now(),
            hostname=(device.get("hostname") or "")[:255],
            os_name=(device.get("osName") or "")[:100],
            os_version=(device.get("osVersion") or "")[:100],
            os_build=(device.get("kernelVersion") or "")[:50],
            cpu_model=(device.get("architecture") or "")[:255],
            ram_total_mb=hardware.get("totalMemoryMb"),
            machine_uuid=(device.get("machineUuid") or "")[:100],
            primary_mac=(device.get("primaryMac") or "")[:50],
            raw={"device": device, "source": "auth_session_ingest"},
        )

        return JsonResponse(
            {
                "snapshot_id": str(snapshot.id),
                "employee_id": str(employee.id),
                "hostname": snapshot.hostname,
            },
            status=201,
        )

