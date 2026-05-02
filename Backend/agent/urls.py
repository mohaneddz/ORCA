from django.urls import path

from .views import (
    ApprovedSoftwareView,
    DeviceDriftView,
    PortAuditView,
    RiskTrendView,
    SnapshotIngestView,
    SoftwareAuditView,
)

urlpatterns = [
    path("agent/snapshot/", SnapshotIngestView.as_view()),
    path("agent/risk-trend/<str:employee_id>/", RiskTrendView.as_view()),
    path("agent/drift/<str:employee_id>/", DeviceDriftView.as_view()),
    path("agent/port-audit/", PortAuditView.as_view()),
    path("agent/software-audit/", SoftwareAuditView.as_view()),
    path("agent/approved-software/", ApprovedSoftwareView.as_view()),
    path("agent/approved-software/<str:entry_id>/", ApprovedSoftwareView.as_view()),
]
