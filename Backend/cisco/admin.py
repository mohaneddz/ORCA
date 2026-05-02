from django.contrib import admin
from .models import CiscoDevice, CiscoSnapshot, CiscoConfigBackup, CiscoSecurityAlert, CiscoVulnerabilityCheck


@admin.register(CiscoDevice)
class CiscoDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "ip_address", "device_type", "model", "ios_version", "status", "last_polled")
    list_filter = ("device_type", "status", "organization")
    search_fields = ("name", "ip_address", "model", "serial_number")


@admin.register(CiscoSnapshot)
class CiscoSnapshotAdmin(admin.ModelAdmin):
    list_display = ("device", "collected_at", "cpu_usage_1m", "risk_score", "risk_level")
    list_filter = ("risk_level", "device")
    readonly_fields = ("received_at",)


@admin.register(CiscoConfigBackup)
class CiscoConfigBackupAdmin(admin.ModelAdmin):
    list_display = ("device", "config_type", "size_bytes", "changed_from_previous", "collected_at")
    list_filter = ("config_type", "changed_from_previous")


@admin.register(CiscoSecurityAlert)
class CiscoSecurityAlertAdmin(admin.ModelAdmin):
    list_display = ("device", "alert_type", "severity", "title", "ai_generated", "is_resolved", "created_at")
    list_filter = ("severity", "alert_type", "is_resolved", "ai_generated")
    search_fields = ("title", "description")


@admin.register(CiscoVulnerabilityCheck)
class CiscoVulnerabilityCheckAdmin(admin.ModelAdmin):
    list_display = ("device", "cve_id", "cvss_score", "severity", "fix_available", "checked_at")
    list_filter = ("severity", "fix_available")