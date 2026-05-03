"""One-shot script to test the Telegram anomaly alert end-to-end."""
import urllib.request
import json

TOKEN = "78c0b52452702e9e439839e45ed7083320c561dda1eed76de6cf4b819981e9c4"
EMPLOYEE_ID = "b764f94e-6208-44a9-9ed5-c9ac3e9420b8"

payload = {
    "employee_id": EMPLOYEE_ID,
    "collectedAtUtc": "2026-05-03T13:00:00Z",
    "hardware": {
        "hostname": "AMINA-PC",
        "osName": "Windows 10",
        "osVersion": "10.0.19041",
        "osBuild": "19041",
        "cpuModel": "Intel Core i5",
        "ramTotalMb": 8192,
        "diskTotalGb": 256,
        "diskFreeGb": 5,
        "machineUuid": "test-uuid-001",
        "primaryMacAddress": "AA:BB:CC:DD:EE:FF",
    },
    "patchStatus": {"isCurrent": False, "daysSinceUpdate": 120},
    "antivirus": {
        "avDetected": False,
        "productName": "",
        "enabledStatus": False,
        "signatureUpToDate": False,
    },
    "diskEncryption": {"encrypted": False, "provider": ""},
    "usb": {"enabled": True},
    "localPorts": {
        "ports": [
            {"port": 4444, "protocol": "TCP", "owningProcess": "nc.exe", "riskLevel": "critical"},
            {"port": 3389, "protocol": "TCP", "owningProcess": "svchost", "riskLevel": "high"},
            {"port": 445,  "protocol": "TCP", "owningProcess": "System",  "riskLevel": "high"},
        ]
    },
    "wifi": {"profiles": [{"ssid": "OpenCafe", "isOpenNetwork": True}]},
}

body = json.dumps(payload).encode()
url = f"http://127.0.0.1:8000/api/agent/snapshot/?employee_id={EMPLOYEE_ID}"

req = urllib.request.Request(
    url,
    data=body,
    headers={
        "Authorization": f"Token {TOKEN}",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f"[OK] Status 201")
        print(f"     risk_level : {data['risk']['level']}")
        print(f"     risk_score : {data['risk']['score']}")
        print(f"     signals    : {data['risk']['signals'][:3]}")
        print("\nTelegram alert should have been sent to chat 6120765114.")
except urllib.error.HTTPError as e:
    print(f"[ERROR] HTTP {e.code}: {e.read().decode()}")
except Exception as exc:
    print(f"[ERROR] {exc}")
