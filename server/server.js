#!/usr/bin/env node
/* ---------------------------------------------------------------
   Plate & Platform — sync server.

   One user, one JSON document, no dependencies. Runs on the Ubuntu
   machine behind a Cloudflare Tunnel; the phone and the laptop both
   talk to it, and both keep working when it is unreachable.

     GET  /health   liveness, no auth
     GET  /state    the stored state
     POST /sync     merge the posted state in, return the result

   Every request except /health needs:  Authorization: Bearer <token>

   Config, all through the environment:
     PLATE_TOKEN      required, the shared secret
     PLATE_DATA       data directory        (default ./data)
     PLATE_PORT       listen port           (default 8787)
     PLATE_HOST       bind address          (default 127.0.0.1)
     PLATE_ORIGINS    comma-separated allowed browser origins
----------------------------------------------------------------*/
"use strict";

const http = require("node:http");
const fs   = require("node:fs");
const path = require("node:path");

const TOKEN   = process.env.PLATE_TOKEN || "";
const DATADIR = process.env.PLATE_DATA || path.join(__dirname, "data");
const PORT    = Number(process.env.PLATE_PORT || 8787);
const HOST    = process.env.PLATE_HOST || "127.0.0.1";
const ORIGINS = (process.env.PLATE_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

if (!TOKEN || TOKEN.length < 16) {
  console.error("PLATE_TOKEN is missing or too short — set a long random secret.");
  process.exit(1);
}

const STATE   = path.join(DATADIR, "state.json");
const BACKUPS = path.join(DATADIR, "backups");
fs.mkdirSync(BACKUPS, { recursive: true });

const KEEP_DAYS   = 70;     // how much history the log carries
const KEEP_BACKUPS = 30;

/* ------------------------------ storage ------------------------------ */

const EMPTY = { v: 2, profile: null, days: {}, plan: {}, custom: {}, pt: 0 };

function read() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") console.error("state unreadable, starting fresh:", e.message);
    return { ...EMPTY };
  }
}

/* Write to a temp file and rename: a crash mid-write can never leave a
   half-written state.json behind. */
function write(state) {
  backupOncePerDay();
  const tmp = STATE + ".tmp";
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeFileSync(fd, JSON.stringify(state));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, STATE);
}

function backupOncePerDay() {
  if (!fs.existsSync(STATE)) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUPS, `state-${stamp}.json`);
  if (fs.existsSync(dest)) return;
  fs.copyFileSync(STATE, dest);
  const old = fs.readdirSync(BACKUPS).filter(f => f.endsWith(".json")).sort();
  for (const f of old.slice(0, Math.max(0, old.length - KEEP_BACKUPS))) {
    fs.unlinkSync(path.join(BACKUPS, f));
  }
}

/* ------------------------------- merge -------------------------------
   Both sides stamp what they change: every day carries `t`, and the
   profile / programme / custom exercises share `pt`. Merging takes the
   newer of each day independently, so a session logged on the phone and
   a weight typed on the laptop both survive. Only edits to the SAME day
   on two devices can lose one, and then the later edit wins.
----------------------------------------------------------------------*/

const dayKey = /^\d{4}-\d{2}-\d{2}$/;

function merge(mine, theirs) {
  const out = {
    v: Math.max(mine.v || 2, theirs.v || 2),
    days: {},
    profile: null, plan: {}, custom: {}, pt: 0
  };

  const mpt = mine.pt || 0, tpt = theirs.pt || 0;
  const settings = tpt > mpt ? theirs : mine;
  out.profile = settings.profile || mine.profile || theirs.profile || null;
  out.plan    = settings.plan   || {};
  out.custom  = settings.custom || {};
  out.pt      = Math.max(mpt, tpt);

  const keys = new Set([...Object.keys(mine.days || {}), ...Object.keys(theirs.days || {})]);
  for (const k of keys) {
    if (!dayKey.test(k)) continue;
    const a = (mine.days || {})[k], b = (theirs.days || {})[k];
    if (!a) { out.days[k] = b; continue; }
    if (!b) { out.days[k] = a; continue; }
    out.days[k] = (b.t || 0) > (a.t || 0) ? b : a;
  }
  return trim(out);
}

function trim(state) {
  const cut = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  for (const k of Object.keys(state.days)) {
    const d = state.days[k] || {};
    const used = (d.items && d.items.length) || (d.sets && d.sets.length) ||
                 d.done || d.wt != null ||
                 (d.swaps && Object.keys(d.swaps).length) || (d.extra && d.extra.length);
    if (k < cut || !used) delete state.days[k];
  }
  return state;
}

/* ------------------------------- http -------------------------------- */

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ORIGINS.includes(origin) || ORIGINS.includes("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function send(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}

/* Constant-time compare so a wrong token cannot be found byte by byte. */
function tokenOk(header) {
  const given = String(header || "").replace(/^Bearer\s+/i, "");
  if (given.length !== TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < TOKEN.length; i++) diff |= given.charCodeAt(i) ^ TOKEN.charCodeAt(i);
  return diff === 0;
}

const server = http.createServer((req, res) => {
  cors(req, res);
  const url = new URL(req.url, "http://localhost");

  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (url.pathname === "/health") return send(res, 200, { ok: true, at: Date.now() });

  if (!tokenOk(req.headers.authorization)) return send(res, 401, { error: "unauthorized" });

  if (req.method === "GET" && url.pathname === "/state") {
    return send(res, 200, read());
  }

  if (req.method === "POST" && url.pathname === "/sync") {
    let body = "";
    let tooBig = false;
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 4e6) { tooBig = true; req.destroy(); }   // ~4 MB is far beyond a year of logging
    });
    req.on("end", () => {
      if (tooBig) return send(res, 413, { error: "too large" });
      let incoming;
      try { incoming = JSON.parse(body); }
      catch { return send(res, 400, { error: "bad json" }); }
      if (!incoming || typeof incoming !== "object") return send(res, 400, { error: "bad body" });

      const merged = merge(read(), incoming);
      write(merged);
      const days = Object.keys(merged.days).length;
      console.log(new Date().toISOString(), "sync ok —", days, "days stored");
      return send(res, 200, merged);
    });
    return;
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`plate sync listening on http://${HOST}:${PORT}`);
  console.log(`data in ${DATADIR}`);
  if (ORIGINS.length) console.log(`allowed origins: ${ORIGINS.join(", ")}`);
  else console.log("no PLATE_ORIGINS set — browsers will be blocked by CORS");
});
