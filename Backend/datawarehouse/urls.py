from django.urls import path

from .views import EmployeeReportView, ExportView, OrgSummaryView, TrendView

urlpatterns = [
    path("dw/summary/", OrgSummaryView.as_view(), name="dw-summary"),
    path("dw/employees/", EmployeeReportView.as_view(), name="dw-employees"),
    path("dw/trend/", TrendView.as_view(), name="dw-trend"),
    path("dw/export/<str:resource>/", ExportView.as_view(), name="dw-export"),
]
