"""
Desktop notification service.

Notification delivery is platform-aware:
1. Linux (Debian/Ubuntu): notify-send, then plyer
2. Windows: plyer, then the Windows toast API through PowerShell
3. Other platforms: plyer

The scheduler always records a notification in notification_history as a
browser/in-app fallback, even when the native notification provider fails.
"""

import logging
import base64
import platform
import subprocess
import uuid
from app.config import settings, now_iso

logger = logging.getLogger(__name__)

NOTIFICATION_HISTORY_FILE = "notification_history"


def notify_send(title: str, message: str, urgency: str = "normal") -> bool:
    try:
        result = subprocess.run(
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
        if result.returncode == 0:
            return True
        logger.debug("notify-send exited with code %s: %s", result.returncode, result.stderr.decode(errors="replace"))
        return False
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


def notify_windows_toast(title: str, message: str) -> bool:
    """Use the built-in Windows toast API without requiring a PowerShell module."""
    powershell = "powershell.exe"
    script = """
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$title = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__TITLE__'))
$message = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__MESSAGE__'))
$template = [Windows.UI.Notifications.ToastTemplateType, Windows.UI.Notifications, ContentType=WindowsRuntime]::ToastText02
$xml = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]::GetTemplateContent($template)
$texts = $xml.GetElementsByTagName('text')
$texts.Item(0).AppendChild($xml.CreateTextNode($title)) | Out-Null
$texts.Item(1).AppendChild($xml.CreateTextNode($message)) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType=WindowsRuntime]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]::CreateToastNotifier('Celestial Desk').Show($toast)
""".replace("__TITLE__", base64.b64encode(title.encode("utf-8")).decode("ascii")).replace(
        "__MESSAGE__", base64.b64encode(message.encode("utf-8")).decode("ascii")
    )
    encoded_script = base64.b64encode(script.encode("utf-16-le")).decode("ascii")

    try:
        result = subprocess.run(
            [powershell, "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded_script],
            timeout=8,
            capture_output=True,
        )
        if result.returncode == 0:
            return True
        logger.debug("Windows toast exited with code %s: %s", result.returncode, result.stderr.decode(errors="replace"))
    except FileNotFoundError:
        logger.debug("PowerShell is not available for Windows toast notifications")
    except Exception as exc:
        logger.debug("Windows toast failed: %s", exc)
    return False


def send_notification(title: str, message: str, urgency: str = "normal") -> bool:
    system = platform.system().lower()

    if system == "linux" and notify_send(title, message, urgency):
        logger.info("Sent via notify-send: %s", title)
        return True

    if system == "windows":
        logger.info("Trying plyer on Windows: %s", title)
    elif system == "linux":
        logger.info("notify-send unavailable, trying plyer: %s", title)
    else:
        logger.info("Trying plyer on %s: %s", system, title)

    if notify_plyer(title, message, urgency):
        logger.info("Sent via plyer: %s", title)
        return True

    if system == "windows" and notify_windows_toast(title, message):
        logger.info("Sent via Windows toast API: %s", title)
        return True

    logger.warning("All native notification methods failed for: %s", title)
    return False


def log_notification(deadline_id: str, title: str, check_type: str, message: str = "") -> None:
    from app.services.storage import storage
    entry = {
        "id": uuid.uuid4().hex[:12],
        "title": title,
        "type": check_type,
        "message": message,
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
