#!/usr/bin/env bash
# Environment check: Docker, Compose, free ports and .env file.

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

FAIL=0

echo "✦ Celestial Desk — environment check"
echo ""

if command -v docker >/dev/null 2>&1; then
  echo "✓ Docker      : $(docker --version)"
else
  echo "✗ Docker not found — run:  make install"
  FAIL=1
fi

if docker compose version >/dev/null 2>&1; then
  echo "✓ Compose     : $(docker compose version | head -1)"
elif command -v docker-compose >/dev/null 2>&1; then
  echo "✓ Compose     : $(docker-compose --version)"
else
  echo "✗ Docker Compose not found — run:  make install"
  FAIL=1
fi

echo ""
for port in 3030 8000; do
  if (command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":$port "); then
    echo "⚠ Port $port is already in use"
  elif (command -v lsof >/dev/null 2>&1 && lsof -i ":$port" >/dev/null 2>&1); then
    echo "⚠ Port $port is already in use"
  else
    echo "✓ Port $port is free"
  fi
done

echo ""
if [ -f .env ]; then
  echo "✓ .env file exists"
else
  echo "ℹ .env missing — run:  make setup"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✓ All good! Run:  make up"
else
  echo "✗ Fix the issues above, then re-run:  make doctor"
  exit 1
fi
