from django.urls import path

from .views import (
    AuditLogListView,
    ChangePasswordView,
    EmployeeDetailView,
    EmployeeListCreateView,
    EmployeeLoginView,
    EmployeeLogoutView,
    EmployeeMeView,
    LoginView,
    LogoutView,
    MeView,
    ProfileAvatarUploadView,
    ProfileUpdateView,
    RegisterView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/me", MeView.as_view(), name="auth-me"),
    path("auth/change-password", ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/profile/avatar", ProfileAvatarUploadView.as_view(), name="auth-profile-avatar"),
    path("auth/profile", ProfileUpdateView.as_view(), name="auth-profile-update"),
    path("auth/audit-logs", AuditLogListView.as_view(), name="auth-audit-logs"),
    # Employee auth
    path("auth/employee/login", EmployeeLoginView.as_view(), name="employee-login"),
    path("auth/employee/logout", EmployeeLogoutView.as_view(), name="employee-logout"),
    path("auth/employee/me", EmployeeMeView.as_view(), name="employee-me"),
    # Employee management (org-scoped)
    path("employees/", EmployeeListCreateView.as_view(), name="employee-list-create"),
    path("employees/<uuid:employee_id>/", EmployeeDetailView.as_view(), name="employee-detail"),
]
