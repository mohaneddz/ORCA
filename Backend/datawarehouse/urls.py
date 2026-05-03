from django.urls import path

from .views import (
    AnomalyDetectionView,
    BillingUsageView,
    EmployeeReportView,
    ExportView,
    DeviceSnapshotDetailView,
    MLFeatureExportView,
    DailyInsightsView,
    OrgSummaryView,
    RiskPredictionView,
    EmployeeScoreView,
    TrendView,
)

urlpatterns = [
    path("billing/usage/", BillingUsageView.as_view(), name="dw-billing-usage"),
    path("dw/summary/", OrgSummaryView.as_view(), name="dw-summary"),
    path("dw/employees/", EmployeeReportView.as_view(), name="dw-employees"),
    path("dw/trend/", TrendView.as_view(), name="dw-trend"),
    path("dw/daily-insights/", DailyInsightsView.as_view(), name="dw-daily-insights"),
    path("dw/export/<str:resource>/", ExportView.as_view(), name="dw-export"),
    path("dw/device/<str:snapshot_id>/detail/", DeviceSnapshotDetailView.as_view(), name="dw-device-detail"),
    # ML endpoints
    path("dw/ml/features/", MLFeatureExportView.as_view(), name="dw-ml-features"),
    path("dw/ml/anomalies/", AnomalyDetectionView.as_view(), name="dw-ml-anomalies"),
    path("dw/ml/predict/<str:employee_id>/", RiskPredictionView.as_view(), name="dw-ml-predict"),
    path("dw/employee-score/<str:employee_id>/", EmployeeScoreView.as_view(), name="dw-employee-score"),
]
