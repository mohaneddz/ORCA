from django.urls import path

from .views import (
    AnomalyDetectionView,
    EmployeeReportView,
    ExportView,
    MLFeatureExportView,
    OrgSummaryView,
    RiskPredictionView,
    TrendView,
)

urlpatterns = [
    path("dw/summary/", OrgSummaryView.as_view(), name="dw-summary"),
    path("dw/employees/", EmployeeReportView.as_view(), name="dw-employees"),
    path("dw/trend/", TrendView.as_view(), name="dw-trend"),
    path("dw/export/<str:resource>/", ExportView.as_view(), name="dw-export"),
    # ML endpoints
    path("dw/ml/features/", MLFeatureExportView.as_view(), name="dw-ml-features"),
    path("dw/ml/anomalies/", AnomalyDetectionView.as_view(), name="dw-ml-anomalies"),
    path("dw/ml/predict/<str:employee_id>/", RiskPredictionView.as_view(), name="dw-ml-predict"),
]
