import uuid

from django.db import models

from organizations.models import Employee, Organization


class PhishingTemplate(models.Model):
    """
    Reusable email template for a phishing simulation.
    Templates can be seeded manually or generated; they are organisation-agnostic
    so the same template can be used across multiple campaigns.
    """

    ATTACK_TYPE_CHOICES = [
        ("IT_RESET", "IT Password Reset"),
        ("INVOICE", "Fake Invoice Approval"),
        ("DELIVERY", "Package Delivery Notification"),
        ("HR_UPDATE", "HR Policy Update"),
    ]

    LANGUAGE_CHOICES = [
        ("EN", "English"),
        ("FR", "French"),
        ("AR_MSA", "Arabic (MSA)"),
        ("AR_DARIJA", "Arabic (Darija)"),
    ]

    DIFFICULTY_CHOICES = [
        (1, "Easy – obvious signals (poor grammar, suspicious link)"),
        (2, "Medium – plausible but detectable"),
        (3, "Hard – spear-phishing, realistic domain spoofing"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attack_type = models.CharField(max_length=20, choices=ATTACK_TYPE_CHOICES)
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default="EN")
    difficulty = models.IntegerField(choices=DIFFICULTY_CHOICES, default=1)
    subject = models.CharField(max_length=512)
    body = models.TextField(
        help_text=(
            "HTML or plain-text body. Use {{employee_name}} as a placeholder "
            "for the recipient's name and {{tracking_url}} for the click-tracking link."
        )
    )
    sender_name = models.CharField(max_length=255)
    sender_domain = models.CharField(
        max_length=255,
        help_text="Spoofed sender domain shown in the From header (e.g. it-support.company.com).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["attack_type", "difficulty"]

    def __str__(self):
        return f"[{self.get_language_display()} / {self.get_attack_type_display()} / L{self.difficulty}] {self.subject[:60]}"


class PhishingCampaign(models.Model):
    """A simulation campaign scoped to one organisation."""

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ACTIVE", "Active"),
        ("COMPLETED", "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="phishing_campaigns"
    )
    template = models.ForeignKey(
        PhishingTemplate, on_delete=models.PROTECT, related_name="campaigns"
    )
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="DRAFT")
    created_at = models.DateTimeField(auto_now_add=True)
    launched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class PhishingSimulationTarget(models.Model):
    """
    One simulation email sent to one employee as part of a campaign.
    The tracking_token is embedded in the landing-page URL so clicks can be
    attributed without exposing employee IDs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        PhishingCampaign, on_delete=models.CASCADE, related_name="targets"
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="simulation_targets"
    )
    tracking_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("campaign", "employee")]
        indexes = [
            models.Index(fields=["sent_at"]),
            models.Index(fields=["clicked_at"]),
        ]

    def __str__(self):
        clicked = "clicked" if self.clicked_at else "pending"
        return f"{self.employee.email} — {self.campaign.name} ({clicked})"


class TrainingModule(models.Model):
    """
    A short (≤ 5 min) awareness module assigned to employees who fail a simulation.
    One module per attack_type × language combination.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attack_type = models.CharField(
        max_length=20, choices=PhishingTemplate.ATTACK_TYPE_CHOICES
    )
    language = models.CharField(
        max_length=10, choices=PhishingTemplate.LANGUAGE_CHOICES, default="EN"
    )
    title = models.CharField(max_length=255)
    content = models.TextField(
        help_text="Plain-text or Markdown content of the micro-training module."
    )
    duration_minutes = models.PositiveSmallIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("attack_type", "language")]

    def __str__(self):
        return f"{self.title} ({self.get_attack_type_display()} / {self.get_language_display()})"


class TrainingEnrollment(models.Model):
    """Records that an employee has been enrolled in a training module."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="training_enrollments"
    )
    module = models.ForeignKey(
        TrainingModule, on_delete=models.CASCADE, related_name="enrollments"
    )
    simulation_target = models.ForeignKey(
        PhishingSimulationTarget,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="training_enrollments",
        help_text="The simulation click that triggered this enrollment, if any.",
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("employee", "module")]
        indexes = [
            models.Index(fields=["completed_at"]),
        ]

    def __str__(self):
        status = "completed" if self.completed_at else "enrolled"
        return f"{self.employee.email} — {self.module.title} ({status})"
