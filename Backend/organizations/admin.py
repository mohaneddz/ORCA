from django.contrib import admin

from .models import Device, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "is_active", "created_at")
    search_fields = ("email", "name")


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("device_identifier", "employee_name", "employee_email", "organization", "is_active", "registered_at")
    list_filter = ("organization", "is_active")
    search_fields = ("device_identifier", "employee_name", "employee_email")
