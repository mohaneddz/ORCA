import uuid

from django.db import models

from organizations.models import Device


class DLPLog(models.Model):
    ACTION_CHOICES = [
        ("BLOCKED", "Blocked"),
        ("BYPASSED", "Bypassed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="dlp_logs"
    )
    filename = models.CharField(max_length=512)
    website = models.URLField(max_length=2048)
    action_taken = models.CharField(max_length=10, choices=ACTION_CHOICES)
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action_taken}: {self.filename} ({self.employee})"


class BlacklistLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="blacklist_logs"
    )
    attempted_url = models.URLField(max_length=2048)
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee}: {self.attempted_url}"


class AdminEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ("QUIZ", "Quiz"),
        ("FAKE_PHISHING", "Fake Phishing"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="admin_events"
    )
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    payload = models.JSONField(
        help_text="For QUIZ: {question, options}. For FAKE_PHISHING: leave empty ({})."
    )
    is_delivered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} for {self.employee} (delivered={self.is_delivered})"
