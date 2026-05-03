"""
Telegram Bot notification utility.

Uses the Telegram Bot API to send alert messages to a chat.
The BOT_TOKEN is read from Django settings (TELEGRAM_BOT_TOKEN).
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot{token}/sendMessage"


def send_telegram_alert(chat_id: str, message: str) -> bool:
    """
    Send a plain-text message to the given Telegram chat_id.

    Returns True on success, False on any error (errors are logged, not raised,
    so a Telegram failure never breaks the main request).
    """
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN is not configured; skipping Telegram alert.")
        return False

    if not chat_id:
        logger.warning("No telegram_chat_id set for this organisation; skipping alert.")
        return False

    url = TELEGRAM_API_BASE.format(token=token)
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if not response.ok:
            logger.error(
                "Telegram API error %s: %s", response.status_code, response.text
            )
            return False
        return True
    except requests.RequestException as exc:
        logger.error("Failed to send Telegram alert: %s", exc)
        return False
