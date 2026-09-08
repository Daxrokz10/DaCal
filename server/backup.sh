#!/usr/bin/env bash
# Copy the log somewhere off this machine. Run it from cron:
#   crontab -e
#   30 3 * * *  /opt/plate/server/backup.sh >> /var/log/plate-backup.log 2>&1
#
# The server already keeps 30 dated copies in data/backups, but those die
# with the laptop. This is the copy that survives the laptop.
set -euo pipefail

SRC="${PLATE_DATA:-/opt/plate/server/data}/state.json"
DEST="${PLATE_BACKUP_DIR:-$HOME/plate-backups}"

mkdir -p "$DEST"
[ -f "$SRC" ] || { echo "$(date -Is) nothing to back up yet"; exit 0; }

STAMP="$(date +%F)"
gzip -c "$SRC" > "$DEST/state-$STAMP.json.gz"

# keep 90 days
find "$DEST" -name 'state-*.json.gz' -mtime +90 -delete

echo "$(date -Is) backed up to $DEST/state-$STAMP.json.gz"
