#!/usr/bin/env bash
# One-time project setup: create .env from .env.example and the data directory.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [ -f .env ]; then
  echo "✓ .env already exists — keeping it"
else
  cp .env.example .env
  echo "✓ Created .env from .env.example — edit it if you like (TZ, Ollama, ...)"
fi

mkdir -p data
echo "✓ Data directory ready: $PROJECT_DIR/data"

echo ""
echo "Next:  make up"
