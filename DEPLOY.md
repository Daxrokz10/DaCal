# Deploying

Two halves, deployed independently:

- **`public/`** — the app itself. Static files, no build step. Goes on
  Cloudflare Pages, redeployed automatically on every push to `main`.
- **`server/`** — the sync API. Runs on the Ubuntu laptop, reached through a
  Cloudflare Tunnel. Holds the only copy of your log that is not in a browser.

They are deliberately independent. The site keeps working with the laptop
asleep — it falls back to the browser's own copy and reconciles next time the
server answers.

---

## 1. Get the repo onto GitHub

From this folder:

```bash
git add -A
git commit -m "Plate & Platform"
gh repo create plate-platform --private --source=. --push
```

No `gh`? Create an empty private repo on github.com, then:

```bash
git remote add origin git@github.com:<you>/plate-platform.git
git branch -M main
git push -u origin main
```

`server/data/` and `server/.env` are gitignored — your log and your token never
leave the laptop.

---

## 2. Frontend on Cloudflare Pages

Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**,
pick the repo, then:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `public` |
| Root directory | `/` |

Save and deploy. That is the continuous deployment done: every push to `main`
builds and goes live in under a minute, and pull requests get their own preview
URL. Rollback is one click in the Deployments tab.

Then **Custom domains** → add `plate.daksh.site`. Your domain is already on
Cloudflare for Jellyfin, so the DNS record is created for you and the
certificate issues in a minute or two.

---

## 3. Sync server on the Ubuntu laptop

Needs Node 18 or newer (`node --version`; `sudo apt install nodejs` if missing).

```bash
sudo mkdir -p /opt/plate
sudo chown $USER:$USER /opt/plate
git clone git@github.com:<you>/plate-platform.git /opt/plate
cd /opt/plate/server

./setup.sh --origin https://plate.daksh.site
```

`--origin` must be the exact origin the site is served from, no trailing slash.
Anything else and the browser blocks every request before it is even sent —
which looks like the server being down, with nothing in its log.

The installer generates a token (keeping any existing one), writes `.env` at
mode 600, proves the server boots, installs and enables a systemd unit with the
real paths and your username, verifies that an unauthenticated request gets 401
and an authenticated one gets 200, and schedules the daily off-machine backup.
It is idempotent — re-run it whenever you want. It prints the token at the end;
read it again any time with `grep PLATE_TOKEN /opt/plate/server/.env`.

The server binds `127.0.0.1` only. Nothing reaches it except through the tunnel.

**Handing this to an AI agent instead?** Point it at
[`server/AGENT.md`](server/AGENT.md) — same install, written as a runbook, with
the values it must ask you for, the things it must not do to your existing
tunnel, and a verification table it has to report actual output against.

---

## 4. Expose it through a tunnel

**Your connection is IPv6-only, and that is fine — arguably it is the reason
to use a tunnel rather than the reason not to.** `cloudflared` dials *out* to
Cloudflare's edge, so nothing needs to be reachable at your address. Cloudflare
then answers visitors on both IPv4 and IPv6, which means the app still works
from a phone on an IPv4-only network. Nothing about the setup depends on your
address being stable or routable.

Compared with mirroring the Jellyfin approach — an AAAA record at your home
IPv6, proxied — a tunnel avoids three real problems:

| | Proxied AAAA | Tunnel |
|---|---|---|
| Address changes on reconnect | needs dynamic DNS to keep up | irrelevant, connection is outbound |
| Inbound reachability | router firewall must allow the port | nothing inbound at all |
| Port choice | Cloudflare proxies only certain ports, so you need 443 or an origin rule | any local port, `8787` is fine |
| Home IP in public DNS | present in the record, hidden only by the proxy | never published |

If you have never run one:

```bash
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared tunnel login          # pick daksh.site in the browser
cloudflared tunnel create home    # note the UUID it prints
```

Then write `~/.cloudflared/config.yml` from
`server/cloudflared-config.example.yml`, and:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

**The config lives at `/etc/cloudflared/config.yml`** once installed as a
service — the daemon runs as root and ignores `~/.cloudflared/config.yml`.
Edit the wrong one and a restart silently changes nothing.

If you already have a tunnel, back the config up first
(`sudo cp /etc/cloudflared/config.yml{,.bak-$(date +%F)}`) and add to `ingress`
**above** the `http_status:404` catch-all:

```yaml
  - hostname: plate-api.daksh.site
    service: http://127.0.0.1:8787
```

Then point DNS at the tunnel and restart it:

```bash
cloudflared tunnel route dns <tunnel-name> plate-api.daksh.site
sudo systemctl restart cloudflared
curl https://plate-api.daksh.site/health
```

`server/cloudflared-config.example.yml` shows the whole file if you would
rather compare.

---

## 5. Point the app at it

Open the site → **You** → **Sync**:

- Server address: `https://plate-api.daksh.site`
- Token: the `PLATE_TOKEN` from `.env`

**Test connection**, then **Save & sync**. Do the same on the phone. The
header chip on the Today screen reads *synced just now* when it has been
round the loop.

---

## How syncing behaves

Your browser is always written first, so logging never waits on the network
and never fails because the laptop is asleep. On top of that:

- On load, on returning to the app, and two seconds after any change, the app
  posts its state and gets the merged result back.
- The merge is **per day**. Each day carries a modified timestamp and the newer
  one wins for that day alone, so a session logged on the phone and a weight
  typed on the laptop both survive.
- Only editing the *same day* on two devices while both are offline can lose
  something, and then the later edit wins. In practice you are one person with
  one body, so this does not come up.
- Profile, programme edits and custom exercises move as one group on their own
  timestamp.

The status chip is honest about all of it: *synced 2 min ago*, *not synced*,
or *no answer — is the laptop awake?*

---

## Keeping the data safe

Four copies, which is the actual answer to "is localStorage safe enough" — it
is not, on its own:

1. **Every browser** you use holds a full copy, usable offline.
2. **`server/data/state.json`** on the laptop, written atomically — the server
   writes a temp file and renames it, so a crash or power cut can never leave a
   half-written file.
3. **`server/data/backups/`** — a dated copy each day, 30 kept, taken before
   the first write of the day.
4. **Off the laptop.** Backups 2 and 3 die with the disk, so run the included
   script from cron:

```bash
crontab -e
30 3 * * *  /opt/plate/server/backup.sh >> /var/log/plate-backup.log 2>&1
```

It writes a gzipped dated copy to `~/plate-backups` and keeps 90 days. Point
`PLATE_BACKUP_DIR` at a synced folder or an external disk to get it off the
machine entirely.

Manual restore, any time: **You → Export** writes the whole log as JSON, and
**Import** puts it back.

---

## Hardening, when you want it

The token is a single long secret over HTTPS, which is reasonable for a
personal app. To do better, put **Cloudflare Access** in front of
`plate-api.daksh.site` and require your Google login — same as you would
for Jellyfin. The app would then need an Access service token; ask and I will
wire it in.

Rotating the token: change `PLATE_TOKEN` in `.env`,
`sudo systemctl restart plate-sync`, and re-enter it on each device.

---

## Updating

```bash
git push
```

That is the whole procedure. Both halves follow on their own:

**Frontend** — Cloudflare builds and deploys within a minute. Installed phones
pick it up by themselves: the service worker serves from cache instantly and
re-fetches in the background, so a deploy lands at most one launch late with no
version number to bump. (An earlier version was cache-first and did need a
manual `CACHE` bump; it does not any more.)

**Backend** — `plate-update.timer` checks for new commits every 15 minutes,
fast-forwards, restarts `plate-sync`, and health-checks it. If the new code
fails to answer, it resets to the previous commit and restarts that, so a bad
push cannot leave the sync server down. Watch it with:

```bash
systemctl list-timers plate-update
journalctl -u plate-update -n 30 --no-pager
```

It stays silent when there is nothing new. To update by hand instead, install
with `./setup.sh --origin ... --no-auto-update` and use
`cd /opt/plate && git pull && sudo systemctl restart plate-sync`.

Two things the timer will not do, by design: it only fast-forwards (local
commits on the server stop it rather than being merged over), and it never
touches `data/` or `.env`.
