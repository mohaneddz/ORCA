import uuid

from django.db import models

from organizations.models import Employee, Organization


class DeviceSnapshot(models.Model):
    RISK_LEVEL_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="snapshots"
    )

    # When the agent collected data on the endpoint
    collected_at = models.DateTimeField()
    # When our backend received it
    received_at = models.DateTimeField(auto_now_add=True)

    # Indexed device fields (for fast queries without touching raw JSON)
    hostname = models.CharField(max_length=255, blank=True, default="")
    os_name = models.CharField(max_length=100, blank=True, default="")
    os_version = models.CharField(max_length=100, blank=True, default="")
    architecture = models.CharField(max_length=50, blank=True, default="")
    uptime_seconds = models.BigIntegerField(null=True, blank=True)
    cpu_cores = models.IntegerField(null=True, blank=True)
    total_memory_mb = models.IntegerField(null=True, blank=True)

    # Indexed user fields
    is_admin = models.BooleanField(default=False)
    local_admin_count = models.IntegerField(default=0)

    # Backend-computed risk (NOT from the agent)
    risk_score = models.IntegerField(null=True, blank=True)
    risk_level = models.CharField(
        max_length=20, choices=RISK_LEVEL_CHOICES, blank=True, default=""
    )
    risk_signals = models.JSONField(default=list)

    # Full payload minus the risk block the agent sent (we ignore that)
    raw = models.JSONField()

    class Meta:
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["employee", "-collected_at"]),
            models.Index(fields=["hostname"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"{self.hostname} — {self.employee} — {self.collected_at:%Y-%m-%d %H:%M}"


class ApprovedSoftware(models.Model):
    """
    Organisation-managed allowlist of approved software names.
    Matching is case-insensitive substring on the software name
    reported by the agent.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="approved_software",
    )
    name = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default="")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("organization", "name")]
        ordering = ["name"]
        indexes = [
            models.Index(fields=["organization"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.organization})"
