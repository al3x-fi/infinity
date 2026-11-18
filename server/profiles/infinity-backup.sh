#!/bin/sh
# Daily copy of the INFINITY profiles data. Keeps the last 14 days. Installed by infinity-backup.timer.
set -e
SRC=/var/lib/infinity-profiles
DEST=/var/backups/infinity-profiles
DAY="$DEST/$(date +%F)"
mkdir -p "$DAY"
for f in "$SRC"/*.json; do [ -f "$f" ] && cp -p "$f" "$DAY/"; done
chmod -R go-rwx "$DEST"
find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "backup ok: $DAY"
