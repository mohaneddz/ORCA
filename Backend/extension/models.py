import uuid

from django.db import models

from organizations.models import Employee


class DLPLog(models.Model):
    ACTION_CHOICES = [
        ("allow", "Allow"),
        ("cancel", "Cancel"),
        ("force", "Force"),
        ("report_mistake", "Report Mistake"),
    ]
    EVENT_CHANNEL_CHOICES = [
        ("file_upload", "File Upload"),
        ("ai_prompt", "AI Prompt"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="dlp_logs"
    )
    filename = models.CharField(max_length=512)
    website = models.URLField(max_length=2048)
    action_taken = models.CharField(max_length=20, choices=ACTION_CHOICES)
    event_channel = models.CharField(
        max_length=32, choices=EVENT_CHANNEL_CHOICES, default="file_upload"
    )
    document_topic = models.TextField(blank=True, default="")
    semantic_score = models.FloatField(null=True, blank=True)
    detection_tier = models.CharField(max_length=64, blank=True, default="")
    detection_reason = models.TextField(blank=True, default="")
    matched_pattern = models.CharField(max_length=255, blank=True, default="")
    input_size_bytes = models.BigIntegerField(null=True, blank=True)
    input_size_chars = models.IntegerField(null=True, blank=True)
    threshold_type = models.CharField(max_length=64, blank=True, default="")
    threshold_value = models.FloatField(null=True, blank=True)
    decision_score = models.FloatField(null=True, blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action_taken}: {self.filename} ({self.employee})"


class BlacklistLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="blacklist_logs"
    )
    attempted_url = models.URLField(max_length=2048)
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee}: {self.attempted_url}"


class AdminEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ("QUIZ", "Quiz"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="admin_events"
    )
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    payload = models.JSONField(
        help_text="For QUIZ: {question, options}."
    )
    is_delivered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} for {self.employee} (delivered={self.is_delivered})"


class DlpFalsePositive(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("confirmed", "Confirmed False Positive"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="dlp_false_positives"
    )
    filename = models.CharField(max_length=512)
    website = models.URLField(max_length=2048)
    event_channel = models.CharField(max_length=32, default="file_upload")
    document_topic = models.TextField(blank=True, default="")
    detection_tier = models.CharField(max_length=64, blank=True, default="")
    detection_reason = models.TextField(blank=True, default="")
    matched_pattern = models.CharField(max_length=255, blank=True, default="")
    semantic_score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_notes = models.TextField(blank=True, default="")
    reported_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"FP report: {self.filename} by {self.employee} ({self.status})"

