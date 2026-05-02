import json

from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import AuthToken, Organization


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
