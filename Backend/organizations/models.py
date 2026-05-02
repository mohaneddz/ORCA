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
    supabase_uid = models.UUIDField(unique=True, null=True, blank=True, help_text="Supabase Auth user ID (sub claim in JWT)")
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
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


class Device(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="devices"
    )
    employee_name = models.CharField(max_length=255)
    employee_email = models.EmailField()
    device_identifier = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.device_identifier} ({self.employee_name})"
