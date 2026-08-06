#!/usr/bin/env bash
# Restore a backup into ./data. Usage: ./scripts/restore.sh <backup.tar.gz>

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [ $# -eq 0 ]; then
  echo "Usage: ./scripts/restore.sh <backup-file.tar.gz>"
  echo ""
  echo "Available backups:"
  ls -1 data/backups 2>/dev/null || echo "  (none yet — run: make backup)"
  exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "✗ File not found: $FILE"
  exit 1
fi

echo "✦ Restoring from $FILE ..."
echo "  ⚠ This overwrites existing data. Make a backup first:  make backup"
read -rp "  Continue? [y/N] " answer
case "$answer" in
  y|Y|yes|YES) ;;
  *) echo "Aborted."; exit 1 ;;
esac

tar -xzf "$FILE" -C data
echo "✓ Restored from $FILE"
echo "  Restart the app with:  make restart"
