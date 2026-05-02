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

    # ── Hardware ──────────────────────────────────────────────────────────
    hostname = models.CharField(max_length=255, blank=True, default="")
    os_name = models.CharField(max_length=100, blank=True, default="")
    os_version = models.CharField(max_length=100, blank=True, default="")
    os_build = models.CharField(max_length=50, blank=True, default="")
    cpu_model = models.CharField(max_length=255, blank=True, default="")
    ram_total_mb = models.IntegerField(null=True, blank=True)
    disk_total_gb = models.FloatField(null=True, blank=True)
    disk_free_gb = models.FloatField(null=True, blank=True)
    machine_uuid = models.CharField(max_length=100, blank=True, default="")
    primary_mac = models.CharField(max_length=50, blank=True, default="")

    # ── Patch status ──────────────────────────────────────────────────────
    patch_is_current = models.BooleanField(null=True, blank=True)
    patch_last_updated = models.DateField(null=True, blank=True)
    patch_days_since_update = models.IntegerField(null=True, blank=True)

    # ── Antivirus ─────────────────────────────────────────────────────────
    antivirus_detected = models.BooleanField(null=True, blank=True)
    antivirus_name = models.CharField(max_length=255, blank=True, default="")
    antivirus_enabled = models.BooleanField(null=True, blank=True)
    antivirus_up_to_date = models.BooleanField(null=True, blank=True)

    # ── Disk encryption ───────────────────────────────────────────────────
    disk_encrypted = models.BooleanField(null=True, blank=True)

    # ── Network / peripherals ─────────────────────────────────────────────
    usb_enabled = models.BooleanField(null=True, blank=True)
    lan_device_count = models.IntegerField(null=True, blank=True)
    local_port_count = models.IntegerField(null=True, blank=True)
    wifi_open_network_count = models.IntegerField(default=0)

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
