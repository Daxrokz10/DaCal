/* ---------------------------------------------------------------
   sync.js — offline-first sync against the Ubuntu box.

   localStorage stays the working copy: every log, every set, every
   weigh-in lands there first and the UI never waits on the network.
   Sync is a background reconciliation on top of that, so a sleeping
   laptop or dead gym wifi degrades to "not synced yet" rather than
   "cannot log".

   Change tracking: each day carries `t` (last modified, ms) and the
   profile / programme / custom exercises share `pt`. Those stamps are
   set automatically by diffing against the last saved snapshot, so no
   call site has to remember to mark anything dirty. The server merges
   day by day, newest stamp wins.
----------------------------------------------------------------*/
"use strict";

const SYNC_CFG = "plate-sync-config";

const sync = {
  url: "", token: "",
  state: "off",            // off | idle | busy | ok | error
  last: 0, message: "",
  timer: null, snapshot: null
};

function loadSyncConfig(){
  try{
    const raw = localStorage.getItem(SYNC_CFG);
    if(raw){
      const o = JSON.parse(raw);
      sync.url = o.url || "";
      sync.token = o.token || "";
    }
  }catch(e){ /* fall back to unconfigured */ }
  sync.state = sync.url && sync.token ? "idle" : "off";
}
function saveSyncConfig(){
  try{
    localStorage.setItem(SYNC_CFG, JSON.stringify({url:sync.url, token:sync.token}));
  }catch(e){ /* nothing we can do */ }
}

/* ------------------------- change stamping ------------------------- */

const dayFingerprint = d => JSON.stringify([d.items, d.sets, d.done, d.wt, d.swaps, d.extra]);
const settingsFingerprint = () => JSON.stringify([S.profile, S.plan, S.custom]);

function takeSnapshot(){
  const days = {};
  for(const [k, d] of Object.entries(S.days)) days[k] = dayFingerprint(d);
  sync.snapshot = {days, settings:settingsFingerprint()};
}

/* Called from save(): stamp whatever actually changed since last time. */
function stampChanges(){
  const now = Date.now();
  if(!sync.snapshot){ takeSnapshot(); return; }

  for(const [k, d] of Object.entries(S.days)){
    const fp = dayFingerprint(d);
    if(sync.snapshot.days[k] !== fp){ d.t = now; sync.snapshot.days[k] = fp; }
  }
  for(const k of Object.keys(sync.snapshot.days)){
    if(!S.days[k]) delete sync.snapshot.days[k];
  }
  const sfp = settingsFingerprint();
  if(sync.snapshot.settings !== sfp){ S.pt = now; sync.snapshot.settings = sfp; }
}

/* ----------------------------- merging -----------------------------
   The same rule the server applies, so both ends agree without a round
   trip: take each day from whichever side stamped it later. */
function mergeInto(remote){
  if(!remote || typeof remote !== "object") return false;
  let changed = false;

  if((remote.pt || 0) > (S.pt || 0)){
    if(remote.profile) S.profile = {...DEFAULT_PROFILE, ...remote.profile};
    S.plan   = remote.plan   || {};
    S.custom = remote.custom || {};
    S.pt = remote.pt;
    changed = true;
  }
  for(const [k, rd] of Object.entries(remote.days || {})){
    const mine = S.days[k];
    if(!mine || (rd.t || 0) > (mine.t || 0)){
      S.days[k] = rd;
      S.days[k].items = S.days[k].items || [];
      S.days[k].sets  = S.days[k].sets  || [];
      changed = true;
    }
  }
  return changed;
}

/* ------------------------------ network ----------------------------- */

async function syncNow(reason){
  if(!sync.url || !sync.token) return;
  if(sync.state === "busy") return;

  sync.state = "busy";
  sync.message = "syncing…";
  renderSyncBadge();

  const ctl = new AbortController();
  const bail = setTimeout(() => ctl.abort(), 10000);

  try{
    const res = await fetch(sync.url.replace(/\/+$/, "") + "/sync", {
      method:"POST",
      headers:{"Content-Type":"application/json", "Authorization":"Bearer " + sync.token},
      body: JSON.stringify({v:S.v, profile:S.profile, days:S.days, plan:S.plan, custom:S.custom, pt:S.pt || 0}),
      signal: ctl.signal
    });

    if(res.status === 401){
      sync.state = "error";
      sync.message = "token rejected — check it in Your data";
      renderSyncBadge();
      return;
    }
    if(!res.ok) throw new Error("HTTP " + res.status);

    const merged = await res.json();
    const changed = mergeInto(merged);
    takeSnapshot();
    try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){}

    sync.state = "ok";
    sync.last = Date.now();
    sync.message = "";
    if(changed) renderAll(); else renderSyncBadge();
  }catch(err){
    sync.state = "error";
    sync.message = err.name === "AbortError"
      ? "no answer — is the laptop awake?"
      : "offline — saved on this device";
    renderSyncBadge();
  }finally{
    clearTimeout(bail);
  }
}

/* Logging fires save() constantly; hold off a couple of seconds so a
   set of five is one request, not five. */
function syncSoon(){
  if(!sync.url || !sync.token) return;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(() => syncNow("change"), 2000);
}

function syncAgo(){
  if(!sync.last) return "never";
  const s = Math.round((Date.now() - sync.last)/1000);
  if(s < 60) return "just now";
  if(s < 3600) return Math.round(s/60) + " min ago";
  if(s < 86400) return Math.round(s/3600) + " h ago";
  return Math.round(s/86400) + " d ago";
}

function renderSyncBadge(){
  const tag = el("storeTag");
  if(tag){
    tag.textContent =
      sync.state === "off"   ? "on this device" :
      sync.state === "busy"  ? "syncing…" :
      sync.state === "ok"    ? "synced " + syncAgo() :
      sync.state === "error" ? "not synced" : "on this device";
  }
  const box = el("syncState");
  if(!box) return;
  box.className = "syncstate " + sync.state;
  box.textContent =
    sync.state === "off"   ? "Not set up — this device only." :
    sync.state === "busy"  ? "Syncing…" :
    sync.state === "ok"    ? "Synced " + syncAgo() + "." :
    sync.state === "error" ? sync.message :
                             "Ready.";
}

async function syncTest(){
  const base = el("syncUrl").value.trim().replace(/\/+$/, "");
  const box = el("syncState");
  box.className = "syncstate busy";
  box.textContent = "Checking…";
  try{
    const res = await fetch(base + "/health", {signal:AbortSignal.timeout(8000)});
    const j = await res.json();
    box.className = "syncstate ok";
    box.textContent = j && j.ok ? "Server reachable." : "Answered, but not the sync server.";
  }catch(e){
    box.className = "syncstate error";
    box.textContent = "No answer. Check the address, and that the laptop is awake.";
  }
}
