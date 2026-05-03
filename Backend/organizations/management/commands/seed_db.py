import uuid
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from organizations.models import Organization, Employee
from agent.models import DeviceSnapshot, NetworkDeviceSnapshot, SystemMetricsSnapshot, DiskHealthSnapshot
from phishing.models import PhishingTemplate, PhishingCampaign, PhishingSimulationTarget, TrainingModule, TrainingEnrollment
from cisco.models import CiscoDevice, CiscoSnapshot, CiscoSecurityAlert, CiscoVulnerabilityCheck
from gamification.models import Quiz, QuizBatch, QuizBatchAssignment, QuizSubmission

class Command(BaseCommand):
    help = "Seeds the database with massive, realistic dummy data for testing."

    def handle(self, *args, **options):
        self.stdout.write("Starting massive database seed...")

        # 1. Resolve Organization
        org_email = "hacene@gmail.com"
        org, created = Organization.objects.get_or_create(
            email=org_email,
            defaults={
                "name": "ORCA Global Defense",
                "password": make_password("123456789"),
                "is_staff": True,
                "is_superuser": True,
            }
        )
        self.stdout.write(f"Organization: {org.name} ({org_email})")

        # 2. Employees (30)
        depts = ["Engineering", "Sales", "HR", "Legal", "Executive", "Product", "Support"]
        roles = ["Developer", "Specialist", "Manager", "Analyst", "Lead", "Director", "Designer"]
        
        employees = []
        for i in range(30):
            emp_email = f"staff_{i}@cyberbase.local"
            emp, created = Employee.objects.get_or_create(
                email=emp_email,
                defaults={
                    "organization": org,
                    "name": f"Employee {random.randint(100, 999)}",
                    "password": make_password("password123"),
                    "department": random.choice(depts),
                    "role": random.choice(roles),
                    "seniority": random.choice(["junior", "mid", "senior", "lead", "manager"]),
                }
            )
            employees.append(emp)
        self.stdout.write(f"Seeded 30 employees.")

        # 3. Phishing Templates & Training
        phishing_data = [
            ("IT_RESET", "Urgent: Windows Password Update", "1"),
            ("HR_UPDATE", "Updated Salary Structure 2024", "2"),
            ("INVOICE", "Overdue Payment for Cloud Services", "3"),
            ("IT_RESET", "Security Alert: New Device Login", "2"),
            ("HR_UPDATE", "Mandatory Holiday Policy Review", "1"),
        ]
        
        templates = []
        for attack, sub, diff in phishing_data:
            t, _ = PhishingTemplate.objects.get_or_create(
                subject=sub,
                defaults={
                    "attack_type": attack,
                    "body": f"Hi {{{{employee_name}}}}, click here {{{{tracking_url}}}} to proceed.",
                    "sender_name": "System Admin",
                    "sender_domain": "corp-auth.com",
                    "difficulty": int(diff),
                }
            )
            templates.append(t)
            
            TrainingModule.objects.get_or_create(
                attack_type=attack,
                language="EN",
                defaults={
                    "title": f"Protecting against {attack} attacks",
                    "content": "Look for spelling errors, strange domains, and urgent language.",
                    "duration_minutes": 5
                }
            )

        # 4. Campaigns (3 types)
        # Completed
        c1, _ = PhishingCampaign.objects.get_or_create(
            name="Q1 Phishing Drill", organization=org,
            defaults={"template": templates[0], "status": "COMPLETED", "launched_at": timezone.now() - timedelta(days=90)}
        )
        # Active
        c2, _ = PhishingCampaign.objects.get_or_create(
            name="Spring Security Check", organization=org,
            defaults={"template": templates[1], "status": "ACTIVE", "launched_at": timezone.now() - timedelta(days=5)}
        )
        # Draft
        c3, _ = PhishingCampaign.objects.get_or_create(
            name="Spear Phishing Test", organization=org,
            defaults={"template": templates[2], "status": "DRAFT"}
        )

        # Targets for campaigns
        for emp in employees:
            # c1 targets (some clicked)
            t1, _ = PhishingSimulationTarget.objects.get_or_create(campaign=c1, employee=emp)
            if random.random() < 0.2:
                t1.clicked_at = c1.launched_at + timedelta(hours=2)
                t1.save()
                # Enroll in training
                tm = TrainingModule.objects.get(attack_type=c1.template.attack_type)
                TrainingEnrollment.objects.get_or_create(employee=emp, module=tm, defaults={"completed_at": timezone.now()})
            
            # c2 targets
            t2, _ = PhishingSimulationTarget.objects.get_or_create(campaign=c2, employee=emp)
            if random.random() < 0.1:
                t2.clicked_at = c2.launched_at + timedelta(hours=1)
                t2.save()

        self.stdout.write("Seeded 3 Phishing Campaigns & Training data.")

        # 5. Device Data (Trends - 3 snapshots per employee)
        for emp in employees:
            for d_idx in range(3):
                ts = timezone.now() - timedelta(days=d_idx * 15)
                score = random.randint(30, 95)
                level = "low" if score > 80 else "medium" if score > 50 else "high"
                
                # Base snapshot
                DeviceSnapshot.objects.create(
                    employee=emp, collected_at=ts,
                    hostname=f"DEV-{emp.id.hex[:4]}", os_name="macOS Sonoma", os_version="14.4",
                    risk_score=score, risk_level=level, raw={}
                )
                
                # Metrics
                SystemMetricsSnapshot.objects.create(
                    employee=emp, collected_at=ts, hostname=f"DEV-{emp.id.hex[:4]}",
                    cpu_usage_percent=random.uniform(5, 80), ram_usage_percent=random.uniform(20, 90),
                    process_count=random.randint(50, 200), raw={}
                )

            # Network Snapshots
            NetworkDeviceSnapshot.objects.create(
                employee=emp, collected_at=timezone.now(),
                device_ip=f"10.0.0.{random.randint(2, 254)}",
                device_hostname=f"Local-AP-{emp.name.split()[0]}",
                device_type="Access Point", vendor="Cisco", raw={}
            )
            
            # Disk Health
            DiskHealthSnapshot.objects.create(
                employee=emp, collected_at=timezone.now(),
                hostname=f"DEV-{emp.id.hex[:4]}", device_path="/dev/disk0",
                smart_health=random.choice(["PASSED", "PASSED", "PASSED", "WARNING"]),
                capacity_gb=512, raw={}
            )

        self.stdout.write("Seeded 120+ Device/Network/System snapshots.")

        # 6. Gamification
        q1, _ = Quiz.objects.get_or_create(
            question="What is the safest way to handle a link in a suspicious email?",
            defaults={
                "organization": org,
                "options": {"a": "Click it to see where it goes", "b": "Hover to check the URL", "c": "Forward to a friend"},
                "correct_answer": "b"
            }
        )
        batch, _ = QuizBatch.objects.get_or_create(name="Monthly Security Quiz", organization=org, defaults={"quiz": q1})
        
        for emp in employees[:20]:
            QuizBatchAssignment.objects.get_or_create(batch=batch, employee=emp)
            if random.random() < 0.8:
                QuizSubmission.objects.get_or_create(
                    employee=emp, quiz=q1, 
                    defaults={"answer_selected": "b", "is_correct": True, "submitted_at": timezone.now()}
                )

        self.stdout.write("Seeded Quiz and Leaderboard data.")

        # 7. Cisco Networking (3 devices)
        cisco_configs = [
            ("Router-Edge-A1", "172.16.10.1", "router", "ASR 1001-X"),
            ("Switch-Core-B2", "172.16.10.2", "switch", "Catalyst 9300"),
            ("Firewall-Main", "172.16.10.3", "firewall", "Firepower 2110"),
        ]
        
        for name, ip, dtype, model in cisco_configs:
            dev, _ = CiscoDevice.objects.get_or_create(
                ip_address=ip, organization=org,
                defaults={"name": name, "device_type": dtype, "model": model, "status": "up"}
            )
            
            # 5 snapshots for trend
            for s_idx in range(5):
                CiscoSnapshot.objects.create(
                    device=dev, collected_at=timezone.now() - timedelta(hours=s_idx*4),
                    cpu_usage_1m=random.uniform(10, 60), memory_used_bytes=1024**3 * random.uniform(1, 4),
                    interfaces_up=12, interfaces_down=1, risk_score=random.randint(70, 98), risk_level="low"
                )
            
            CiscoSecurityAlert.objects.create(
                device=dev, alert_type="config_change", severity="info",
                title="Configuration Backup Succeeded", description="Scheduled backup completed successfully."
            )

        self.stdout.write("Seeded 3 Cisco networking devices with historical snapshots.")
        self.stdout.write(self.style.SUCCESS("Database is now MASSIVE. All pages should be populated!"))
