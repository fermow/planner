#!/usr/bin/env bash
# Create a timestamped tarball of the ./data directory.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

mkdir -p data/backups
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="data/backups/celestial-desk-$STAMP.tar.gz"

tar -czf "$FILE" --exclude=./backups -C data .

echo "✓ Backup saved: $FILE"
echo "  Restore with: make restore FILE=$FILE"
