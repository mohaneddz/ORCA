from django.urls import path

from .views import EmployeeDetailView, EmployeeListCreateView, LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/me", MeView.as_view(), name="auth-me"),
    path("employees/", EmployeeListCreateView.as_view(), name="employee-list-create"),
    path("employees/<uuid:employee_id>/", EmployeeDetailView.as_view(), name="employee-detail"),
]
