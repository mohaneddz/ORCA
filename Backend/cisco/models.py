import uuid
from django.db import models
from organizations.models import Organization


class CiscoDevice(models.Model):
    DEVICE_TYPE_CHOICES = [
        ("router", "Router"),
        ("switch", "Switch"),
        ("firewall", "Firewall"),
        ("ap", "Access Point"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("up", "Up"),
        ("down", "Down"),
        ("degraded", "Degraded"),
        ("unknown", "Unknown"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="cisco_devices"
    )
    name = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES, default="router")
    model = models.CharField(max_length=255, blank=True, default="")
    serial_number = models.CharField(max_length=100, blank=True, default="")
    ios_version = models.CharField(max_length=100, blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    snmp_community = models.CharField(max_length=100, default="public")
    snmp_version = models.CharField(max_length=10, default="2c")
    snmp_port = models.IntegerField(default=161)
    ssh_username = models.CharField(max_length=100, blank=True, default="")
    ssh_password = models.CharField(max_length=255, blank=True, default="")  # store encrypted in prod
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="unknown")
    is_active = models.BooleanField(default=True)
    added_at = models.DateTimeField(auto_now_add=True)
    last_polled = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("organization", "ip_address")]

    def __str__(self):
        return f"{self.name} ({self.ip_address})"


class CiscoSnapshot(models.Model):
    """SNMP poll result — one record per device per poll cycle."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(
        CiscoDevice, on_delete=models.CASCADE, related_name="snapshots"
    )
    collected_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)

    # System
    sys_uptime_seconds = models.BigIntegerField(null=True, blank=True)
    sys_description = models.TextField(blank=True, default="")
    sys_name = models.CharField(max_length=255, blank=True, default="")
    sys_location = models.CharField(max_length=255, blank=True, default="")

    # CPU & Memory
    cpu_usage_5s = models.FloatField(null=True, blank=True)   # Cisco OID: ciscoProcessMIB
    cpu_usage_1m = models.FloatField(null=True, blank=True)
    cpu_usage_5m = models.FloatField(null=True, blank=True)
    memory_used_bytes = models.BigIntegerField(null=True, blank=True)
    memory_free_bytes = models.BigIntegerField(null=True, blank=True)

    # Temperature
    temperature_celsius = models.FloatField(null=True, blank=True)
    temperature_status = models.CharField(max_length=50, blank=True, default="")

    # Interfaces summary
    interface_count = models.IntegerField(null=True, blank=True)
    interfaces_up = models.IntegerField(default=0)
    interfaces_down = models.IntegerField(default=0)
    total_in_octets = models.BigIntegerField(null=True, blank=True)
    total_out_octets = models.BigIntegerField(null=True, blank=True)
    total_in_errors = models.BigIntegerField(default=0)
    total_out_errors = models.BigIntegerField(default=0)
    total_in_discards = models.BigIntegerField(default=0)

    # BGP / Routing
    bgp_peer_count = models.IntegerField(null=True, blank=True)
    bgp_peers_established = models.IntegerField(null=True, blank=True)
    ospf_neighbor_count = models.IntegerField(null=True, blank=True)
    route_count = models.IntegerField(null=True, blank=True)

    # Security
    acl_violation_count = models.BigIntegerField(default=0)
    failed_login_count = models.IntegerField(default=0)
    arp_entry_count = models.IntegerField(null=True, blank=True)

    # Risk scoring (backend-computed)
    risk_score = models.IntegerField(null=True, blank=True)
    risk_level = models.CharField(max_length=20, blank=True, default="")
    risk_signals = models.JSONField(default=list)
    anomaly_flags = models.JSONField(default=list)

    # Raw SNMP data
    interfaces_detail = models.JSONField(default=list)
    raw = models.JSONField(default=dict)

    class Meta:
        ordering = ["-collected_at"]
        indexes = [
            models.Index(fields=["device", "-collected_at"]),
            models.Index(fields=["risk_level"]),
        ]

    def __str__(self):
        return f"Snapshot {self.device.name} @ {self.collected_at:%Y-%m-%d %H:%M}"


class CiscoConfigBackup(models.Model):
    """Running/startup config stored after each successful SSH pull."""

    CONFIG_TYPE_CHOICES = [
        ("running", "Running Config"),
        ("startup", "Startup Config"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(
        CiscoDevice, on_delete=models.CASCADE, related_name="config_backups"
    )
    config_type = models.CharField(max_length=10, choices=CONFIG_TYPE_CHOICES, default="running")
    content = models.TextField()
    checksum = models.CharField(max_length=64)  # SHA-256
    size_bytes = models.IntegerField()
    collected_at = models.DateTimeField(auto_now_add=True)
    changed_from_previous = models.BooleanField(default=False)
    diff_summary = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-collected_at"]

    def __str__(self):
        return f"Config {self.device.name} {self.config_type} @ {self.collected_at:%Y-%m-%d}"


class CiscoSecurityAlert(models.Model):
    """AI or rule-based security alert for a Cisco device."""

    SEVERITY_CHOICES = [
        ("info", "Info"),
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    ALERT_TYPE_CHOICES = [
        ("anomaly", "Traffic Anomaly"),
        ("auth_failure", "Authentication Failure"),
        ("config_change", "Configuration Change"),
        ("interface_down", "Interface Down"),
        ("high_cpu", "High CPU"),
        ("high_memory", "High Memory"),
        ("bgp_drop", "BGP Session Drop"),
        ("acl_violation", "ACL Violation"),
        ("temperature", "Temperature Warning"),
        ("ai_prediction", "AI Failure Prediction"),
        ("security_vuln", "Security Vulnerability"),
        ("port_scan", "Port Scan Detected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(
        CiscoDevice, on_delete=models.CASCADE, related_name="alerts"
    )
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    recommendation = models.TextField(blank=True, default="")
    ai_generated = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    snapshot = models.ForeignKey(
        CiscoSnapshot, null=True, blank=True, on_delete=models.SET_NULL, related_name="alerts"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} — {self.device.name}"


class CiscoVulnerabilityCheck(models.Model):
    """CVE / Cisco PSIRT vulnerability check result per device."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(
        CiscoDevice, on_delete=models.CASCADE, related_name="vulnerability_checks"
    )
    cve_id = models.CharField(max_length=50)
    cvss_score = models.FloatField(null=True, blank=True)
    severity = models.CharField(max_length=20, blank=True)
    title = models.CharField(max_length=512)
    description = models.TextField(blank=True)
    affected_versions = models.TextField(blank=True)
    fix_available = models.BooleanField(default=False)
    fix_version = models.CharField(max_length=100, blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cvss_score"]
        unique_together = [("device", "cve_id")]

    def __str__(self):
        return f"{self.cve_id} — {self.device.name}"