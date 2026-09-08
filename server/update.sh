#!/usr/bin/env bash
# Pull the latest server code and restart, but only if the health check still
# passes afterwards. If it does not, roll straight back to the commit that was
# working and restart that.
#
# Run by plate-update.timer as root. Does nothing at all when there is nothing
# new, so running it every 15 minutes costs one HTTPS request to GitHub.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$DIR/.." && pwd)"
ENV_FILE="$DIR/.env"

log() { printf '%s %s\n' "$(date -Is)" "$*"; }

[ -f "$ENV_FILE" ] || { log "no .env — is the server installed?"; exit 1; }
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
HEALTH="http://${PLATE_HOST:-127.0.0.1}:${PLATE_PORT:-8787}/health"

# the repo belongs to the service user; root touching it needs this
OWNER="$(stat -c '%U' "$REPO")"
git config --global --add safe.directory "$REPO" 2>/dev/null || true

cd "$REPO"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BEFORE="$(git rev-parse HEAD)"

git fetch --quiet origin "$BRANCH"
AFTER="$(git rev-parse "origin/$BRANCH")"

if [ "$BEFORE" = "$AFTER" ]; then
  exit 0                      # nothing new; stay quiet so the journal stays readable
fi

log "updating $BRANCH: ${BEFORE:0:8} -> ${AFTER:0:8}"

# fast-forward only: never rewrite or merge anything on the server
if ! git merge --ff-only "origin/$BRANCH" --quiet; then
  log "not a fast-forward — someone has local commits here. Leaving it alone."
  exit 1
fi
chown -R "$OWNER:$OWNER" "$REPO" 2>/dev/null || true

systemctl restart plate-sync
sleep 3

if curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1; then
  log "updated and healthy at ${AFTER:0:8}"
  exit 0
fi

log "health check FAILED after update — rolling back to ${BEFORE:0:8}"
git reset --hard --quiet "$BEFORE"
chown -R "$OWNER:$OWNER" "$REPO" 2>/dev/null || true
systemctl restart plate-sync
sleep 3

if curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1; then
  log "rolled back, service healthy again. The bad commit is ${AFTER:0:8}."
else
  log "STILL UNHEALTHY after rollback — needs a human. journalctl -u plate-sync -n 50"
fi
exit 1
