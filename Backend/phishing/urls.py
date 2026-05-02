from django.urls import path

from .views import (
    AnalyticsView,
    CampaignAssignView,
    CampaignCompleteView,
    CampaignLaunchView,
    CampaignListCreateView,
    CampaignTargetsView,
    ClickTrackView,
    EmployeeDifficultyView,
    GenerateTemplateView,
    ManagerAlertsView,
    SimulationTargetSentView,
    TemplateListCreateView,
    TrainingCompleteView,
    TrainingEnrollmentListView,
    TrainingListView,
    TrendAnalyticsView,
)

urlpatterns = [
    # Templates
    path("phishing/templates/", TemplateListCreateView.as_view(), name="phishing-templates"),
    path("phishing/templates/generate/", GenerateTemplateView.as_view(), name="phishing-templates-generate"),

    # Campaigns
    path("phishing/campaigns/", CampaignListCreateView.as_view(), name="phishing-campaigns"),
    path("phishing/campaigns/<uuid:campaign_id>/launch/", CampaignLaunchView.as_view(), name="phishing-campaign-launch"),
    path("phishing/campaigns/<uuid:campaign_id>/complete/", CampaignCompleteView.as_view(), name="phishing-campaign-complete"),
    path("phishing/campaigns/<uuid:campaign_id>/assign/", CampaignAssignView.as_view(), name="phishing-campaign-assign"),
    path("phishing/campaigns/<uuid:campaign_id>/targets/", CampaignTargetsView.as_view(), name="phishing-campaign-targets"),

    # Click tracking (public — no auth)
    path("phishing/click/<uuid:token>/", ClickTrackView.as_view(), name="phishing-click-track"),

    # Analytics
    path("phishing/analytics/", AnalyticsView.as_view(), name="phishing-analytics"),
    path("phishing/analytics/trend/", TrendAnalyticsView.as_view(), name="phishing-analytics-trend"),

    # Manager alerts
    path("phishing/alerts/managers/", ManagerAlertsView.as_view(), name="phishing-manager-alerts"),

    # Training
    path("phishing/training/", TrainingListView.as_view(), name="phishing-training"),
    path("phishing/training/enrollments/", TrainingEnrollmentListView.as_view(), name="phishing-enrollments"),
    path("phishing/training/enrollments/<uuid:enrollment_id>/complete/", TrainingCompleteView.as_view(), name="phishing-training-complete"),

    # Simulation targets
    path("phishing/targets/<uuid:target_id>/sent/", SimulationTargetSentView.as_view(), name="phishing-target-sent"),

    # Per-employee difficulty recommendation
    path("phishing/employees/<uuid:employee_id>/difficulty/", EmployeeDifficultyView.as_view(), name="phishing-employee-difficulty"),
]
