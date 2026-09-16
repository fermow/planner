#!/usr/bin/env python3
"""Install the per-user host notification bridge for the current OS."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

PROJECT_DIR = Path(__file__).resolve().parent.parent
BRIDGE = PROJECT_DIR / "scripts" / "desktop-notification-bridge.py"
LABEL = "celestial-desk-desktop-notifications"


def run(command: list[str], required: bool = True) -> None:
    result = subprocess.run(command, check=False)
    if required and result.returncode:
        raise SystemExit(f"Command failed ({result.returncode}): {' '.join(command)}")


def install_linux() -> None:
    if not shutil.which("notify-send"):
        raise SystemExit("Install libnotify first, then retry: sudo apt install libnotify-bin")
    unit_dir = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "systemd/user"
    unit_dir.mkdir(parents=True, exist_ok=True)
    unit = unit_dir / f"{LABEL}.service"
    unit.write_text(f"""[Unit]
Description=Celestial Desk desktop notification bridge
After=network-online.target

[Service]
Type=simple
Environment=XDG_RUNTIME_DIR=/run/user/%U
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/%U/bus
ExecStart={sys.executable} {BRIDGE}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
""")
    run(["systemctl", "--user", "daemon-reload"])
    run(["systemctl", "--user", "enable", "--now", unit.name])
    run(["systemctl", "--user", "restart", unit.name])


def install_macos() -> None:
    agents = Path.home() / "Library/LaunchAgents"
    agents.mkdir(parents=True, exist_ok=True)
    plist = agents / f"{LABEL}.plist"
    arguments = "".join(f"<string>{escape(value)}</string>" for value in (sys.executable, str(BRIDGE)))
    plist.write_text(f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\"><dict>
<key>Label</key><string>{LABEL}</string>
<key>ProgramArguments</key><array>{arguments}</array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict></plist>
""")
    domain = f"gui/{os.getuid()}"
    run(["launchctl", "bootout", domain, str(plist)], required=False)
    run(["launchctl", "bootstrap", domain, str(plist)])
    run(["launchctl", "kickstart", "-k", f"{domain}/{LABEL}"])


def install_windows() -> None:
    app_data = Path(os.environ.get("APPDATA", Path.home() / "AppData/Roaming")) / "Celestial Desk"
    app_data.mkdir(parents=True, exist_ok=True)
    pythonw = Path(sys.executable).with_name("pythonw.exe")
    executable = pythonw if pythonw.exists() else Path(sys.executable)
    launcher = app_data / "desktop-notification-bridge.cmd"
    # start /b prevents a terminal window at every sign-in.
    launcher.write_text(f'@echo off\r\nstart "" /b "{executable}" "{BRIDGE}"\r\n')
    task_name = "Celestial Desk Desktop Notifications"
    run(["schtasks", "/Create", "/TN", task_name, "/SC", "ONLOGON", "/TR", f'"{launcher}"', "/F"])
    run(["schtasks", "/Run", "/TN", task_name])


def main() -> None:
    system = platform.system()
    if system == "Windows":
        install_windows()
    elif system == "Darwin":
        install_macos()
    elif system == "Linux":
        install_linux()
    else:
        raise SystemExit(f"Unsupported operating system: {system}")
    print(f"Desktop deadline notifications are enabled for {system}.")


if __name__ == "__main__":
    main()
