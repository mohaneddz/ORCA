from django.core.management.base import BaseCommand

from organizations.models import Employee, Organization


class Command(BaseCommand):
    help = "Create one organization account and seven employees for real usage."

    def handle(self, *args, **options):
        org_email = "admin@innov.local"
        org_password = "InnovOrg#2026!"
        org_name = "Innov Organization"

        org, created = Organization.objects.get_or_create(
            email=org_email,
            defaults={"name": org_name},
        )
        if created:
            org.set_password(org_password)
            org.save(update_fields=["password"])
        else:
            org.name = org_name
            org.set_password(org_password)
            org.save(update_fields=["name", "password"])

        users = [
            ("Amina Boudiaf", "amina@innov.local", "Security", "Analyst", "mid", "InnovStaff#2026!1"),
            ("Yacine Khelifi", "yacine@innov.local", "IT", "Engineer", "mid", "InnovStaff#2026!2"),
            ("Lina Rahmoun", "lina@innov.local", "Compliance", "Reviewer", "junior", "InnovStaff#2026!3"),
            ("Karim Belaid", "karim@innov.local", "Operations", "Operator", "senior", "InnovStaff#2026!4"),
            ("Sofia Merabet", "sofia@innov.local", "Finance", "Controller", "mid", "InnovStaff#2026!5"),
            ("Nour Hamdi", "nour@innov.local", "HR", "Specialist", "mid", "InnovStaff#2026!6"),
            ("Riad Ziani", "riad@innov.local", "Network", "Administrator", "senior", "InnovStaff#2026!7"),
        ]

        for name, email, department, role, seniority, password in users:
            employee, _ = Employee.objects.get_or_create(
                email=email,
                defaults={
                    "organization": org,
                    "name": name,
                    "department": department,
                    "role": role,
                    "seniority": seniority,
                    "is_active": True,
                },
            )
            employee.organization = org
            employee.name = name
            employee.department = department
            employee.role = role
            employee.seniority = seniority
            employee.is_active = True
            employee.set_password(password)
            employee.save()

        self.stdout.write(self.style.SUCCESS("Provisioned 1 organization and 7 employees."))
        self.stdout.write(f"ORG: {org_email} / {org_password}")
        for _, email, _, _, _, password in users:
            self.stdout.write(f"EMP: {email} / {password}")
