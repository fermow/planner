#!/usr/bin/env bash
set -e

echo "✦ Enabling Celestial Desk auto-start on boot..."
echo ""

# Enable IPv4 forwarding for Docker networking
echo "→ Enabling IPv4 forwarding..."
if sudo sh -c 'echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-celestial-desk.conf' 2>/dev/null && sudo sysctl -w net.ipv4.ip_forward=1 2>/dev/null; then
  echo "✓ IPv4 forwarding enabled"
else
  echo "⚠ Could not set IPv4 forwarding (try: sudo sysctl -w net.ipv4.ip_forward=1)"
fi

# Enable Docker to start on boot
echo "→ Enabling Docker to start on boot..."
if sudo systemctl enable docker 2>/dev/null; then
  echo "✓ Docker will start on boot"
else
  echo "⚠ Could not enable Docker (try: sudo systemctl enable docker)"
fi

# Ensure Docker is running
echo "→ Starting Docker if not running..."
sudo systemctl start docker 2>/dev/null || true
sleep 1

# Enable linger for user services to run at boot without login
echo "→ Enabling linger for user services..."
sudo loginctl enable-linger "$(whoami)" 2>/dev/null || true

# Reload and enable the celestial-desk user service
echo "→ Enabling celestial-desk user service..."
systemctl --user daemon-reload 2>/dev/null || true
systemctl --user enable celestial-desk.service 2>/dev/null || true

echo ""
echo "✓ Auto-start configured!"
echo ""
echo "Next steps:"
echo "  1. Reboot or run:  systemctl --user start celestial-desk"
echo "  2. Check status:   systemctl --user status celestial-desk"
