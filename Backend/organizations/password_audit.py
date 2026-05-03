from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from django.contrib.auth.hashers import check_password

try:
    from zxcvbn import zxcvbn
except Exception:  # pragma: no cover
    zxcvbn = None


MIN_LENGTH = 12
MAX_ZXCVBN_SAFE_SCORE = 2


@dataclass
class PasswordAuditResult:
    weak: bool
    risk_level: str
    reason: str


def _load_banned_passwords() -> set[str]:
    candidates = [
        Path(__file__).resolve().parent / "banned_passwords.txt",
        Path(__file__).resolve().parents[1] / "common_passwords.txt",
    ]
    for path in candidates:
        if path.exists():
            return {line.strip().lower() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}
    return {
        "password",
        "password123",
        "12345678",
        "qwerty123",
        "admin123",
    }


_BANNED_PASSWORDS = _load_banned_passwords()


def evaluate_authorized_password_candidate(
    stored_hash: str,
    candidate_passwords: Iterable[str],
    user_inputs: list[str] | None = None,
) -> PasswordAuditResult:
    """Evaluate only authorized candidate passwords in controlled testing."""
    candidate = None
    for raw in candidate_passwords:
        if raw and check_password(raw, stored_hash):
            candidate = raw
            break

    if candidate is None:
        return PasswordAuditResult(weak=False, risk_level="unknown", reason="No authorized candidate matched hash")

    checks: list[str] = []
    weak = False

    if len(candidate) < MIN_LENGTH:
        weak = True
        checks.append(f"length<{MIN_LENGTH}")

    if candidate.lower() in _BANNED_PASSWORDS:
        weak = True
        checks.append("in_banned_password_list")

    if zxcvbn is not None:
        result = zxcvbn(candidate, user_inputs=user_inputs or [])
        score = int(result.get("score", 0))
        if score <= MAX_ZXCVBN_SAFE_SCORE:
            weak = True
            checks.append(f"zxcvbn_score={score}")
    else:
        checks.append("zxcvbn_unavailable")

    if weak:
        return PasswordAuditResult(weak=True, risk_level="high", reason=", ".join(checks))
    return PasswordAuditResult(weak=False, risk_level="low", reason="policy_passed")

