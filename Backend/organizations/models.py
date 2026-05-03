import secrets
import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class OrganizationManager(BaseUserManager):
    def create_user(self, email, name, password=None):
        if not email:
            raise ValueError("Email is required")
        org = self.model(email=self.normalize_email(email), name=name)
        org.set_password(password)
        org.save(using=self._db)
        return org

    def create_superuser(self, email, name, password=None):
        org = self.create_user(email=email, name=name, password=password)
        org.is_staff = True
        org.is_superuser = True
        org.save(using=self._db)
        return org


class Organization(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default="")
    avatar_url = models.URLField(max_length=1024, blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    objects = OrganizationManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.name


class Employee(models.Model):
    SENIORITY_CHOICES = [
        ("junior", "Junior"),
        ("mid", "Mid"),
        ("senior", "Senior"),
        ("lead", "Lead"),
        ("manager", "Manager"),
        ("executive", "Executive"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="employees"
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    department = models.CharField(max_length=255, blank=True, default="")
    role = models.CharField(max_length=255, blank=True, default="")
    seniority = models.CharField(max_length=20, choices=SENIORITY_CHOICES, default="mid")
    is_active = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False)
    password_risk_level = models.CharField(max_length=20, blank=True, default="")
    password_risk_reason = models.TextField(blank=True, default="")
    password_last_audited_at = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password as django_check_password
        return django_check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.name} <{self.email}>"


class AuthToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="tokens"
    )
    key = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Token for {self.organization}"


class EmployeeAuthToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="tokens"
    )
    key = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Token for {self.employee}"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="audit_logs"
    )
    action = models.CharField(max_length=255)
    target = models.CharField(max_length=255)
    result = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.action} - {self.target} ({self.result})"
