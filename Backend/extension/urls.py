from django.urls import path

from .views import BlacklistDomainsView, BlacklistLogView, DLPLogView, PollView

urlpatterns = [
    path("logs/dlp/", DLPLogView.as_view(), name="dlp-log"),
    path("logs/blacklist/", BlacklistLogView.as_view(), name="blacklist-log"),
    path("extension/blacklist/", BlacklistDomainsView.as_view(), name="extension-blacklist"),
    path("extension/poll/", PollView.as_view(), name="extension-poll"),
]
