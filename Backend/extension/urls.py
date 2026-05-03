from django.urls import path

from .views import (
    AITargetsView,
    BlacklistDomainsView,
    BlacklistLogView,
    DLPLogView,
    PollView,
    ReputationCheckView,
)

urlpatterns = [
    path("logs/dlp/", DLPLogView.as_view(), name="dlp-log"),
    path("logs/blacklist/", BlacklistLogView.as_view(), name="blacklist-log"),
    path("extension/blacklist/", BlacklistDomainsView.as_view(), name="extension-blacklist"),
    path("extension/ai-targets/", AITargetsView.as_view(), name="extension-ai-targets"),
    path("extension/poll/", PollView.as_view(), name="extension-poll"),
    path("extension/reputation/check/", ReputationCheckView.as_view(), name="extension-reputation-check"),
]
