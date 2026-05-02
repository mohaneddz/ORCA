from django.contrib import admin

from .models import Employee, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "is_active", "created_at")
    search_fields = ("email", "name")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("email", "organization", "is_active", "registered_at")
    list_filter = ("organization", "is_active")
    search_fields = ("email",)
