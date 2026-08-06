"""
Desktop notification service.
Tries multiple methods to send native Linux desktop notifications:
1. notify-send (direct D-Bus via mounted socket)
2. plyer (Python cross-platform notification library)
3. Logs to notification_history for in-app display
"""

import logging
import subprocess
import uuid
from app.config import settings, now_iso

logger = logging.getLogger(__name__)

NOTIFICATION_HISTORY_FILE = "notification_history"


def notify_send(title: str, message: str, urgency: str = "normal") -> bool:
    try:
        subprocess.run(
            [
                "notify-send",
                "-a", settings.APP_NAME,
                "-u", urgency,
                "-t", "8000",
                title,
                message,
            ],
            timeout=5,
            capture_output=True,
        )
        return True
    except FileNotFoundError:
        logger.debug("notify-send binary not found")
        return False
    except Exception as e:
        logger.debug(f"notify-send failed: {e}")
        return False


def notify_plyer(title: str, message: str, urgency: str = "normal") -> bool:
    try:
        from plyer import notification as plyer_notif
        plyer_notif.notify(
            title=title,
            message=message,
            app_name=settings.APP_NAME,
            timeout=8,
        )
        return True
    except Exception as e:
        logger.debug(f"plyer notification failed: {e}")
        return False


def send_notification(title: str, message: str, urgency: str = "normal") -> bool:
    if notify_send(title, message, urgency):
        logger.info(f"Sent via notify-send: {title}")
        return True
    logger.info(f"notify-send unavailable, trying plyer: {title}")
    if notify_plyer(title, message, urgency):
        logger.info(f"Sent via plyer: {title}")
        return True
    logger.warning(f"All notification methods failed for: {title}")
    return False


def log_notification(deadline_id: str, title: str, check_type: str) -> None:
    from app.services.storage import storage
    entry = {
        "id": uuid.uuid4().hex[:12],
        "title": title,
        "type": check_type,
        "timestamp": now_iso(),
        "read": False,
    }
    storage.create(NOTIFICATION_HISTORY_FILE, entry)


def get_catch_up_notifications() -> list[dict]:
    from app.services.storage import storage
    return storage.get_all(NOTIFICATION_HISTORY_FILE)


def mark_notification_read(notification_id: str) -> None:
    from app.services.storage import storage
    storage.update(NOTIFICATION_HISTORY_FILE, notification_id, {"read": True})
