import os

import jwt
from django.http import JsonResponse

from .models import Organization

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


def get_organization_from_request(request):
    """
    Decode the Supabase JWT from the Authorization header and return the
    matching Organization. Returns (organization, None) on success or
    (None, JsonResponse) on failure — callers should return the error response.

    Usage in a view:
        org, err = get_organization_from_request(request)
        if err:
            return err
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, JsonResponse({"error": "Authorization header missing or malformed."}, status=401)

    token = auth_header[7:]
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        return None, JsonResponse({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return None, JsonResponse({"error": "Invalid token."}, status=401)

    supabase_uid = payload.get("sub")
    try:
        org = Organization.objects.get(supabase_uid=supabase_uid)
    except Organization.DoesNotExist:
        return None, JsonResponse({"error": "Organization not found for this user."}, status=404)

    return org, None
