from django.contrib import admin

from .models import (
    PhishingCampaign,
    PhishingSimulationTarget,
    PhishingTemplate,
    TrainingEnrollment,
    TrainingModule,
)


@admin.register(PhishingTemplate)
class PhishingTemplateAdmin(admin.ModelAdmin):
    list_display = ("subject", "attack_type", "language", "difficulty", "sender_domain", "created_at")
    list_filter = ("attack_type", "language", "difficulty")
    search_fields = ("subject", "sender_name", "sender_domain")


@admin.register(PhishingCampaign)
class PhishingCampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "template", "status", "created_at", "launched_at")
    list_filter = ("status", "organization")
    search_fields = ("name",)


@admin.register(PhishingSimulationTarget)
class PhishingSimulationTargetAdmin(admin.ModelAdmin):
    list_display = ("employee", "campaign", "sent_at", "clicked_at")
    list_filter = ("campaign",)
    search_fields = ("employee__email",)


@admin.register(TrainingModule)
class TrainingModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "attack_type", "language", "duration_minutes", "created_at")
    list_filter = ("attack_type", "language")
    search_fields = ("title",)


@admin.register(TrainingEnrollment)
class TrainingEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("employee", "module", "enrolled_at", "completed_at")
    list_filter = ("module",)
    search_fields = ("employee__email",)
