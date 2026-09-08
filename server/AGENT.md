# Agent runbook — install the sync server on Ubuntu

You are setting up the backend for Plate & Platform on the user's own Ubuntu
machine. The frontend is already (or will be) on Cloudflare Pages; you are not
touching it.

Read this whole file before running anything. `../DEPLOY.md` is the same
process written for a person, with more of the "why" — consult it if something
here does not match what you find.

---

## What you are building

A Node HTTP server on `127.0.0.1:8787` that stores one JSON document, reached
from the internet only through the user's existing Cloudflare Tunnel. It holds
the user's food and training log. Losing that data is the worst outcome
available to you; treat `data/state.json` as precious.

---

## Ask the user for these first

Do not guess any of them. Stop and ask if you do not have them.

| Needed | Looks like | Why |
|---|---|---|
| Site origin | `https://plate.yourdomain.com` | Goes in `PLATE_ORIGINS`. Must be the exact origin the app is served from — wrong value means the browser blocks every request and the user sees "not synced" with no clue why. |
| API hostname | `plate-api.yourdomain.com` | The tunnel hostname you will route. Must not be one already in use. |
| Tunnel name or UUID | from `cloudflared tunnel list` | The user already runs a tunnel for Jellyfin. Reuse it; do not create a second one without asking. |
| Install location | default `/opt/plate` | Only if they want it elsewhere. |

---

## Hard rules

- **Never overwrite an existing `.env` token.** If `.env` has a token, keep it.
  Regenerating it silently locks every already-configured device out, and the
  user may not notice for days.
- **Never edit the cloudflared config without backing it up first**
  (`cp config.yml config.yml.bak-$(date +%F)`). A wrong edit takes Jellyfin
  down too. Read the file, understand the existing `ingress` list, and append.
- **The catch-all `- service: http_status:404` must stay last.** Ingress rules
  match top to bottom; anything below the catch-all is dead.
- **Never open a firewall port and never bind `0.0.0.0`.** The tunnel reaches
  the server from the same machine. Exposing it directly puts the user's log on
  the public internet behind one secret.
- **Never `rm -rf` anything under `data/`.** If you think data must be removed,
  stop and ask.
- **Do not run the server as root.** The unit runs as the user's own account.
- **Do not commit `.env` or `data/`.** Both are gitignored; keep it that way.
- **Do not paste the token into chat logs, commit messages, or files other than
  `.env`.** Showing it once in the terminal at the end is fine — that is how
  the user gets it onto their phone.

---

## Steps

### 1. Get the code onto the machine

```bash
sudo mkdir -p /opt/plate
sudo chown "$USER:$USER" /opt/plate
git clone <the user's repo url> /opt/plate
cd /opt/plate/server
```

If `/opt/plate` already contains the repo, `git pull` instead of cloning.

### 2. Run the installer

```bash
chmod +x setup.sh backup.sh
./setup.sh --origin https://plate.yourdomain.com
```

It is idempotent — re-running is safe and is the right response to most
failures once you have fixed the cause. It will:

1. check Node ≥ 18, openssl, systemd
2. generate a token **only if one does not already exist**, and write `.env` 0600
3. start the server once to prove it boots, then stop it
4. write and enable a systemd unit with the real paths and username
5. verify `/health` answers, that no token gives **401**, and the token gives **200**
6. add a daily off-machine backup to cron

It stops at the first failure with an error naming what to fix. Do not work
around a failure by skipping the step.

### 3. Route the tunnel — the manual part

The installer deliberately does not touch cloudflared. Find the config:

```bash
ls -l ~/.cloudflared/config.yml /etc/cloudflared/config.yml 2>/dev/null
cloudflared tunnel list
```

Back it up, then add **above** the catch-all:

```yaml
  - hostname: plate-api.yourdomain.com
    service: http://127.0.0.1:8787
```

Validate before restarting anything:

```bash
cloudflared tunnel ingress validate
cloudflared tunnel ingress url https://plate-api.yourdomain.com   # should name the http://127.0.0.1:8787 rule
```

Then route DNS and restart:

```bash
cloudflared tunnel route dns <tunnel-name> plate-api.yourdomain.com
sudo systemctl restart cloudflared
```

If `route dns` says the record already exists, that is fine — check in the
Cloudflare dashboard that it points at this tunnel.

### 4. Verify from outside

```bash
curl -fsS https://plate-api.yourdomain.com/health
```

Expect `{"ok":true,"at":...}`. This is the acceptance test: until it passes,
the install is not done.

### 5. Hand over

Tell the user, in plain terms:

- the API address: `https://plate-api.yourdomain.com`
- the token: `grep PLATE_TOKEN /opt/plate/server/.env`
- that they enter both under **You → Sync** in the app, on each device, and
  press **Test connection** then **Save & sync**
- that the header chip should read *synced just now*

---

## Verification checklist

Report the actual command output, not a claim that it passed.

| Check | Command | Expected |
|---|---|---|
| Service running | `systemctl is-active plate-sync` | `active` |
| Starts at boot | `systemctl is-enabled plate-sync` | `enabled` |
| Local health | `curl -fsS localhost:8787/health` | `{"ok":true,...}` |
| Auth required | `curl -s -o /dev/null -w '%{http_code}' localhost:8787/state` | `401` |
| Token works | `curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" localhost:8787/state` | `200` |
| Not publicly bound | `ss -ltnp \| grep 8787` | `127.0.0.1:8787` only |
| Public health | `curl -fsS https://plate-api.yourdomain.com/health` | `{"ok":true,...}` |
| Env is private | `stat -c '%a' /opt/plate/server/.env` | `600` |
| Backup scheduled | `crontab -l \| grep backup.sh` | one line |
| Jellyfin still up | whatever its URL is | unchanged |

That last one matters: you edited a shared tunnel config. Confirm you did not
break the thing that was already working.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE` on 8787 | something already on the port | `ss -ltnp \| grep 8787`; stop it or `./setup.sh --port 8788` and update the tunnel |
| Service restarts in a loop | bad `.env`, or Node too old | `journalctl -u plate-sync -n 50 --no-pager` |
| Public URL 502 | server down, or tunnel points at the wrong port | check `systemctl is-active plate-sync`, then the ingress entry |
| Public URL 404 | ingress rule is below the catch-all, or hostname typo | `cloudflared tunnel ingress url https://plate-api.yourdomain.com` |
| App says "not synced", server healthy | `PLATE_ORIGINS` does not match the site origin exactly | compare with the browser address bar; no trailing slash; re-run setup with the right `--origin` |
| App says "token rejected" | token mismatch | `grep PLATE_TOKEN .env` and re-enter it in the app |
| Sync works on wifi, not on mobile data | the user is reaching the site but not the API, or DNS has not propagated | `curl` the health URL from the phone's browser |

**CORS is the most likely failure and the least obvious.** The browser refuses
before sending, so `journalctl` shows nothing at all. Silence in the server log
plus "not synced" in the app almost always means `PLATE_ORIGINS`.

---

## Updating later

```bash
cd /opt/plate && git pull && sudo systemctl restart plate-sync
```

`.env` and `data/` are untracked, so a pull never disturbs the token or the log.
Re-run `./setup.sh --origin <same origin>` only if the unit file or environment
needs regenerating; it will keep the existing token.

## Uninstalling

```bash
sudo systemctl disable --now plate-sync
sudo rm /etc/systemd/system/plate-sync.service
sudo systemctl daemon-reload
crontab -l | grep -v 'backup.sh' | crontab -
```

Leave `/opt/plate/server/data/` alone unless the user explicitly asks for it to
be deleted, and tell them to export from the app first if so.
