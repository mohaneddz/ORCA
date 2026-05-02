from django.urls import path

from .views import (
    ApprovedSoftwareView,
    DeviceDriftView,
    DiskHealthView,
    NetworkSnapshotView,
    PortAuditView,
    RiskTrendView,
    SnapshotIngestView,
    SoftwareAuditView,
    SystemMetricsView,
)

urlpatterns = [
    # Endpoint agent (full device snapshot)
    path("agent/snapshot/", SnapshotIngestView.as_view()),
    path("agent/risk-trend/<str:employee_id>/", RiskTrendView.as_view()),
    path("agent/drift/<str:employee_id>/", DeviceDriftView.as_view()),
    path("agent/port-audit/", PortAuditView.as_view()),
    path("agent/software-audit/", SoftwareAuditView.as_view()),
    path("agent/approved-software/", ApprovedSoftwareView.as_view()),
    path("agent/approved-software/<str:entry_id>/", ApprovedSoftwareView.as_view()),
    # Network devices (SNMP / NetFlow)
    path("agent/network-snapshot/", NetworkSnapshotView.as_view()),
    # Server / workstation system metrics (Node Exporter / Telegraf)
    path("agent/system-metrics/", SystemMetricsView.as_view()),
    # Disk SMART health (smartctl / pySMART)
    path("agent/disk-health/", DiskHealthView.as_view()),
]
