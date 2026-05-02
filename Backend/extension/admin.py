from django.contrib import admin

from .models import AdminEvent, BlacklistLog, DLPLog


@admin.register(DLPLog)
class DLPLogAdmin(admin.ModelAdmin):
    list_display = ("employee", "event_channel", "filename", "website", "action_taken", "logged_at")
    list_filter = ("event_channel", "action_taken")
    search_fields = ("employee__employee_name", "filename", "website")
    readonly_fields = ("id", "logged_at")


@admin.register(BlacklistLog)
class BlacklistLogAdmin(admin.ModelAdmin):
    list_display = ("employee", "attempted_url", "logged_at")
    search_fields = ("employee__employee_name", "attempted_url")
    readonly_fields = ("id", "logged_at")


@admin.register(AdminEvent)
class AdminEventAdmin(admin.ModelAdmin):
    list_display = ("employee", "event_type", "is_delivered", "created_at")
    list_filter = ("event_type", "is_delivered")
    search_fields = ("employee__employee_name",)
    readonly_fields = ("id", "created_at")
