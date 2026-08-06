#!/usr/bin/env bash
# Install Docker + Docker Compose for the current OS.
# Supports Debian/Ubuntu (apt), Fedora (dnf), Arch (pacman) and macOS (Homebrew).

set -euo pipefail

echo "✦ Installing Docker for your OS..."
echo ""

# Already installed?
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "✓ Docker + Compose are already installed."
  exit 0
fi

OS="$(uname -s)"

case "$OS" in
  Linux*)
    if command -v apt-get >/dev/null 2>&1; then
      # Debian / Ubuntu / Mint ...
      sudo apt-get update
      sudo apt-get install -y docker.io libnotify-bin || true
      COMPOSE_PKG=""
      for pkg in docker-compose-v2 docker-compose-plugin docker-compose; do
        if sudo apt-get install -y "$pkg" >/dev/null 2>&1; then
          COMPOSE_PKG="$pkg"
          break
        fi
      done
      [ -n "$COMPOSE_PKG" ] || echo "⚠ Could not install a compose package. See README."
    elif command -v dnf >/dev/null 2>&1; then
      # Fedora / RHEL / Rocky ...
      sudo dnf install -y docker docker-compose-plugin libnotify
      sudo systemctl enable --now docker
    elif command -v pacman >/dev/null 2>&1; then
      # Arch / Manjaro ...
      sudo pacman -Sy --noconfirm docker docker-compose libnotify
      sudo systemctl enable --now docker
    else
      echo "✗ No supported package manager found."
      echo "  Install Docker manually: https://docs.docker.com/engine/install/"
      exit 1
    fi

    sudo usermod -aG docker "$USER" || true
    echo ""
    echo "✓ Docker installed."
    echo "⚠ Log out and back in (or run 'newgrp docker') so you can use Docker without sudo."
    ;;

  Darwin*)
    if command -v brew >/dev/null 2>&1; then
      brew install --cask docker
      echo ""
      echo "✓ Docker Desktop installed. Open it once from your Applications folder."
    else
      echo "✗ Homebrew not found. Install it first: https://brew.sh  then run: make install"
      exit 1
    fi
    ;;

  MINGW* | MSYS* | CYGWIN*)
    echo "Windows detected."
    echo "Install Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/"
    echo "Then open 'make up' from Git Bash or WSL2."
    ;;

  *)
    echo "✗ Unsupported OS: $OS. See README for manual installation."
    exit 1
    ;;
esac

echo ""
echo "Next steps:  make setup   →   make up"
