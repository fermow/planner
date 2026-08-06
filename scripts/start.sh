#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$PROJECT_DIR/data"

echo "✦ Celestial Desk — Starting..."
echo ""

# Ensure data directory exists
mkdir -p "$DATA_DIR"
echo "✓ Data directory ready: $DATA_DIR"

# Auto-detect host timezone so the app runs on the user's local clock.
# Only used when TZ is not already set (e.g. in .env).
if [ -z "${TZ:-}" ]; then
    if [ -f /etc/timezone ]; then
        TZ="$(cat /etc/timezone)"
    elif command -v timedatectl >/dev/null 2>&1; then
        TZ="$(timedatectl show -p Timezone --value 2>/dev/null)"
    fi
    if [ -n "$TZ" ]; then
        export TZ
        echo "✓ Auto-detected timezone: $TZ"
    fi
fi

# Check for docker compose
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_CMD="docker compose"
else
    echo "✗ Docker Compose not found. Please install Docker."
    exit 1
fi

# Run boot setup if flag given
if [ "$1" = "--enable-boot" ]; then
  echo "✦ Running boot setup..."
  bash "$PROJECT_DIR/scripts/enable-boot.sh"
  echo ""
fi

echo "✦ Starting Celestial Desk in dev mode (hot reload)..."
cd "$PROJECT_DIR"
$DOCKER_CMD up --build -d

echo ""
echo "✦ Celestial Desk is running! (dev mode)"
echo "  Frontend: http://localhost:3030 (hot reload)"
echo "  Backend:  http://localhost:8000 (auto reload)"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Run 'stop.sh' to stop."

echo ""
echo "For production mode (requires rebuild):"
echo "  docker compose --profile prod up --build -d"
echo ""
echo "To enable auto-start on boot:"
echo "  sudo ./scripts/enable-boot.sh"
