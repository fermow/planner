#!/usr/bin/env python3
"""Deliver deadline alerts through the host operating system's desktop.

This runs outside Docker because a container cannot reliably reach the logged
in user's graphical notification session on Linux, macOS, or Windows.
"""

from __future__ import annotations

import json
import os
import base64
import platform
import shutil
import subprocess
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

API_URL = os.environ.get("CELESTIAL_DESK_API", "http://127.0.0.1:8000/api/notifications")
POLL_SECONDS = 15
DEADLINE_TYPES = {
    "7d", "3d", "1d", "12h", "2h", "1h", "due",
    "catch_up_7d", "catch_up_3d", "catch_up_1d", "catch_up_12h",
    "catch_up_2h", "catch_up_1h", "test",
}


def state_file() -> Path:
    system = platform.system()
    if system == "Windows":
        root = Path(os.environ.get("APPDATA", Path.home() / "AppData/Roaming"))
        return root / "Celestial Desk" / "desktop-notifications.json"
    if system == "Darwin":
        return Path.home() / "Library/Application Support/Celestial Desk/desktop-notifications.json"
    return Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state")) / "celestial-desk" / "desktop-notifications.json"


STATE_FILE = state_file()


def load_seen() -> set[str]:
    try:
        return set(json.loads(STATE_FILE.read_text()))
    except (OSError, json.JSONDecodeError):
        return set()


def save_seen(seen: set[str]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Retain enough history to prevent repeated notices while keeping state tiny.
    STATE_FILE.write_text(json.dumps(sorted(seen)[-2000:]))


def _linux_notification(title: str, message: str) -> None:
    subprocess.run(
        ["notify-send", "-a", "Celestial Desk", "-u", "critical", "-t", "12000", title, message],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=5,
    )


def _mac_notification(title: str, message: str) -> None:
    # Passing text as argv avoids escaping issues with Persian text and quotes.
    script = 'on run argv\n display notification (item 2 of argv) with title (item 1 of argv)\nend run'
    subprocess.run(
        ["osascript", "-e", script, title, message],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=5,
    )


def _windows_notification(title: str, message: str) -> None:
    """Use Windows' built-in toast API; no third-party Python package needed."""
    powershell = shutil.which("powershell.exe") or shutil.which("powershell")
    if not powershell:
        return
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
""".replace("__TITLE__", base64.b64encode(title.encode()).decode()).replace(
        "__MESSAGE__", base64.b64encode(message.encode()).decode()
    )
    subprocess.run(
        [powershell, "-NoProfile", "-NonInteractive", "-EncodedCommand", base64.b64encode(script.encode("utf-16-le")).decode()],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=8,
    )


def deliver(title: str, message: str) -> None:
    system = platform.system()
    try:
        if system == "Windows":
            _windows_notification(title, message)
        elif system == "Darwin":
            _mac_notification(title, message)
        else:
            _linux_notification(title, message)
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        # The alert remains in the app history, and the next notification can
        # still be delivered if a desktop service becomes available later.
        return


def poll(seen: set[str], first_run: bool) -> bool:
    try:
        with urlopen(API_URL, timeout=5) as response:
            notices = json.load(response)
    except (URLError, OSError, json.JSONDecodeError):
        return first_run

    ids = {str(item.get("id", "")) for item in notices if item.get("id")}
    if first_run:
        # Do not replay an old notification history just because this service
        # was installed today. New entries will be delivered from now on.
        seen.update(ids)
        save_seen(seen)
        return False

    for item in notices:
        notice_id = str(item.get("id", ""))
        if not notice_id or notice_id in seen:
            continue
        seen.add(notice_id)
        if item.get("type") in DEADLINE_TYPES:
            deliver(str(item.get("title", "Celestial Desk")), str(item.get("message", "")))
    save_seen(seen)
    return False


def main() -> None:
    seen = load_seen()
    first_run = not STATE_FILE.exists()
    while True:
        first_run = poll(seen, first_run)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
