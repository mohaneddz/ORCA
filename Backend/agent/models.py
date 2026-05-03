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
            models.Index(fields=["received_at"]),
            models.Index(fields=["employee", "-collected_at"]),
            models.Index(fields=["hostname"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"{self.hostname} — {self.employee} — {self.collected_at:%Y-%m-%d %H:%M}"


class NetworkDeviceSnapshot(models.Model):
    """
    SNMP / NetFlow telemetry from a network device (router, switch, AP).
    The user runs an SNMP collector (pysnmp / Telegraf) and POSTs the JSON output.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="network_snapshots"
    )
    collected_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)

    # Device identity
    device_ip = models.GenericIPAddressField(null=True, blank=True)
    device_hostname = models.CharField(max_length=255, blank=True, default="")
    device_type = models.CharField(max_length=100, blank=True, default="")   # router/switch/ap
    vendor = models.CharField(max_length=100, blank=True, default="")
    sys_description = models.TextField(blank=True, default="")               # SNMP sysDescr

    # Interface-level counters (aggregated)
    interface_count = models.IntegerField(null=True, blank=True)
    interfaces_down = models.IntegerField(default=0)                         # ifOperStatus != 1
    high_error_interfaces = models.IntegerField(default=0)                   # ifInErrors > threshold

    # Traffic (bytes, from NetFlow / SNMP counters)
    total_in_bytes = models.BigIntegerField(null=True, blank=True)
    total_out_bytes = models.BigIntegerField(null=True, blank=True)

    # Risk
    risk_score = models.IntegerField(null=True, blank=True)
    risk_level = models.CharField(max_length=20, blank=True, default="")
    risk_signals = models.JSONField(default=list)

    raw = models.JSONField()

    class Meta:
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["employee", "-collected_at"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"NetSnap {self.device_ip} — {self.employee} — {self.collected_at:%Y-%m-%d %H:%M}"


class SystemMetricsSnapshot(models.Model):
    """
    CPU / RAM / process metrics from Node Exporter or Telegraf.
    The user runs the agent locally and POSTs the JSON output.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="system_metrics_snapshots"
    )
    collected_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)

    hostname = models.CharField(max_length=255, blank=True, default="")

    # CPU
    cpu_usage_percent = models.FloatField(null=True, blank=True)
    cpu_cores = models.IntegerField(null=True, blank=True)
    cpu_load_1m = models.FloatField(null=True, blank=True)
    cpu_load_5m = models.FloatField(null=True, blank=True)
    cpu_load_15m = models.FloatField(null=True, blank=True)

    # Memory
    ram_total_mb = models.IntegerField(null=True, blank=True)
    ram_used_mb = models.IntegerField(null=True, blank=True)
    ram_usage_percent = models.FloatField(null=True, blank=True)
    swap_usage_percent = models.FloatField(null=True, blank=True)

    # Processes
    process_count = models.IntegerField(null=True, blank=True)
    zombie_process_count = models.IntegerField(default=0)
    high_cpu_processes = models.JSONField(default=list)   # top N processes by cpu%

    # Risk
    risk_score = models.IntegerField(null=True, blank=True)
    risk_level = models.CharField(max_length=20, blank=True, default="")
    risk_signals = models.JSONField(default=list)

    raw = models.JSONField()

    class Meta:
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["employee", "-collected_at"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"SysMetrics {self.hostname} — {self.employee} — {self.collected_at:%Y-%m-%d %H:%M}"


class DiskHealthSnapshot(models.Model):
    """
    SMART disk health data from smartctl / pySMART.
    One record per physical disk per collection run.
    """
    HEALTH_CHOICES = [
        ("PASSED", "Passed"),
        ("FAILED", "Failed"),
        ("UNKNOWN", "Unknown"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="disk_health_snapshots"
    )
    collected_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)

    hostname = models.CharField(max_length=255, blank=True, default="")

    # Disk identity
    device_path = models.CharField(max_length=100, blank=True, default="")   # e.g. /dev/sda
    model = models.CharField(max_length=255, blank=True, default="")
    serial = models.CharField(max_length=100, blank=True, default="")
    capacity_gb = models.FloatField(null=True, blank=True)
    disk_type = models.CharField(max_length=20, blank=True, default="")      # HDD / SSD / NVMe

    # SMART summary
    smart_health = models.CharField(max_length=10, choices=HEALTH_CHOICES, default="UNKNOWN")
    reallocated_sectors = models.IntegerField(null=True, blank=True)
    pending_sectors = models.IntegerField(null=True, blank=True)
    uncorrectable_errors = models.IntegerField(null=True, blank=True)
    power_on_hours = models.IntegerField(null=True, blank=True)
    temperature_c = models.IntegerField(null=True, blank=True)

    # Risk
    risk_score = models.IntegerField(null=True, blank=True)
    risk_level = models.CharField(max_length=20, blank=True, default="")
    risk_signals = models.JSONField(default=list)

    raw = models.JSONField()

    class Meta:
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["employee", "-collected_at"]),
            models.Index(fields=["smart_health"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"DiskHealth {self.device_path} ({self.model}) — {self.employee} — {self.collected_at:%Y-%m-%d %H:%M}"


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


class PortRemediationRequest(models.Model):
    """
    A flag raised by the admin to request closure of a risky port on an employee device.
    The Tauri agent polls for these and can execute the closure command locally.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("RESOLVED", "Resolved"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="port_remediation_requests"
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="port_remediation_requests"
    )
    hostname = models.CharField(max_length=255)
    port = models.IntegerField()
    port_label = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="PENDING")
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["employee"]),
        ]

    def __str__(self):
        return f"Port {self.port} on {self.hostname} [{self.status}]"
