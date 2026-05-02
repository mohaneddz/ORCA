from django.urls import path

from .views import (
    EmployeeDetailView,
    EmployeeListCreateView,
    EmployeeLoginView,
    EmployeeLogoutView,
    EmployeeMeView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/me", MeView.as_view(), name="auth-me"),
    # Employee auth
    path("auth/employee/login", EmployeeLoginView.as_view(), name="employee-login"),
    path("auth/employee/logout", EmployeeLogoutView.as_view(), name="employee-logout"),
    path("auth/employee/me", EmployeeMeView.as_view(), name="employee-me"),
    # Employee management (org-scoped)
    path("employees/", EmployeeListCreateView.as_view(), name="employee-list-create"),
    path("employees/<uuid:employee_id>/", EmployeeDetailView.as_view(), name="employee-detail"),
]
