from django.urls import path

from .views import (
    CiscoAIAnalysisView,
    CiscoAlertResolveView,
    CiscoAlertView,
    CiscoConfigBackupView,
    CiscoDashboardView,
    CiscoDeviceDetailView,
    CiscoDeviceListCreateView,
    CiscoSnapshotIngestView,
    CiscoVulnCheckView,
)

urlpatterns = [
    # Dashboard
    path("cisco/dashboard/", CiscoDashboardView.as_view(), name="cisco-dashboard"),

    # Device management
    path("cisco/devices/", CiscoDeviceListCreateView.as_view(), name="cisco-devices"),
    path("cisco/devices/<str:device_id>/", CiscoDeviceDetailView.as_view(), name="cisco-device-detail"),

    # SNMP snapshot ingest (called by your pysnmp / Telegraf collector)
    path("cisco/snapshot/", CiscoSnapshotIngestView.as_view(), name="cisco-snapshot"),

    # Config backup (called by your SSH/Netmiko collector)
    path("cisco/config/", CiscoConfigBackupView.as_view(), name="cisco-config"),

    # AI analysis & failure prediction
    path("cisco/ai-analysis/", CiscoAIAnalysisView.as_view(), name="cisco-ai-analysis"),

    # Alerts
    path("cisco/alerts/", CiscoAlertView.as_view(), name="cisco-alerts"),
    path("cisco/alerts/<str:alert_id>/resolve/", CiscoAlertResolveView.as_view(), name="cisco-alert-resolve"),

    # Vulnerability scanning
    path("cisco/vuln-check/<str:device_id>/", CiscoVulnCheckView.as_view(), name="cisco-vuln-check"),
]