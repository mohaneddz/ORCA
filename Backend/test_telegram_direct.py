"""
Direct Telegram alert test - no HTTP server needed.
Run from Backend/ directory:
  python test_telegram_direct.py
"""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from organizations.models import Organization
from core.telegram import send_telegram_alert

CHAT_ID = "6120765114"
ORG_EMAIL = "admin@innov.local"

# ── Step 1: save chat_id on the org ─────────────────────────────────────────
org = Organization.objects.get(email=ORG_EMAIL)
org.telegram_chat_id = CHAT_ID
org.save(update_fields=["telegram_chat_id"])
print(f"[OK] chat_id {CHAT_ID} saved on org '{org.name}'")

# ── Step 2: send a direct test message ──────────────────────────────────────
ok = send_telegram_alert(
    CHAT_ID,
    (
        "✅ <b>Telegram Integration Test</b>\n\n"
        "The Innov security platform has successfully connected to this chat.\n\n"
        "You will receive anomaly alerts here whenever a device risk score "
        "drops critically or a high-risk snapshot is detected."
    ),
)
if ok:
    print("[OK] Test message sent to Telegram!")
else:
    print("[FAIL] Could not send message — check TELEGRAM_BOT_TOKEN in .env")

# ── Step 3: simulate a high-risk snapshot alert ──────────────────────────────
from agent.models import DeviceSnapshot
from organizations.models import Employee
from agent.risk import compute_risk
from django.utils import timezone

employee = Employee.objects.filter(organization=org).first()
if not employee:
    print("[SKIP] No employees found.")
    sys.exit(0)

# Build a worst-case payload
payload = {
    "patchStatus": {"isCurrent": False, "daysSinceUpdate": 120},
    "antivirus": {"avDetected": False, "productName": "", "enabledStatus": False, "signatureUpToDate": False},
    "diskEncryption": {"encrypted": False, "provider": ""},
    "usb": {"enabled": True},
    "localPorts": {"ports": [
        {"port": 4444, "protocol": "TCP", "owningProcess": "nc.exe", "riskLevel": "critical"},
        {"port": 3389, "protocol": "TCP", "owningProcess": "svchost", "riskLevel": "high"},
    ]},
    "wifi": {"profiles": [{"ssid": "OpenCafe", "isOpenNetwork": True}]},
}
risk = compute_risk(payload)

snapshot = DeviceSnapshot.objects.create(
    employee=employee,
    collected_at=timezone.now(),
    hostname="TEST-DEVICE",
    os_name="Windows 10",
    antivirus_detected=False,
    antivirus_enabled=False,
    disk_encrypted=False,
    patch_is_current=False,
    risk_score=risk["score"],
    risk_level=risk["level"],
    risk_signals=risk["signals"],
    raw=payload,
)
print(f"[OK] Snapshot created: score={snapshot.risk_score}, level={snapshot.risk_level}")

from agent.views import _maybe_send_anomaly_alert
_maybe_send_anomaly_alert(org, employee, snapshot, risk)
print("[OK] _maybe_send_anomaly_alert() called — check your Telegram!")
