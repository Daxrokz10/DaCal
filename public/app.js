/* ---------------------------------------------------------------
   Plate & Platform — app logic.
   No build step, no framework, no backend. State lives in
   localStorage under one key and is exportable as JSON.

   A day looks like:
     { items:[{name,unit,qty,kcal,p,c,f}],   // macros are PER UNIT
       sets:[{ex,w,r}],                       // one entry per working set
       done:false, wt:null }
----------------------------------------------------------------*/
"use strict";

const APP_VERSION = "2.1.0";
const el = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r0 = n => Math.round(n);
const fmt = n => r0(n).toLocaleString();
const r1 = n => Math.round(n * 10) / 10;

/* ------------------------------ state ------------------------------ */

const DEFAULT_PROFILE = {sex:"m", age:25, ht:175, wt:72, act:1.375, goal:"cut", split:"mine"};
const LS_KEY = "plate-platform-v1";

const SCHEMA = 2;
let S = {v:SCHEMA, profile:{...DEFAULT_PROFILE}, days:{}, plan:{}, custom:{}, pt:0};
let viewDate = new Date();
let gymSub = "session";      // session | progress
let openEx = null;           // which exercise row is expanded
let liftPick = null;         // which lift the strength chart shows
let liftHover = null;        // index of the point being inspected

const key      = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const todayKey = () => key(new Date());
const addDays  = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const mondayOf = d => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - ((x.getDay()+6)%7)); return x; };
// "2026-09-08" -> a LOCAL date; new Date(key) would read it as UTC and slip a day
const dateFromKey = k => { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); };
const blank    = () => ({items:[], sets:[], done:false, wt:null});
const dayOf    = k => S.days[k] || blank();
const ensure   = k => { const d = S.days[k] = S.days[k] || blank(); d.items = d.items || []; d.sets = d.sets || []; return d; };

const totals = k => dayOf(k).items.reduce((t,i) => ({
  kcal: t.kcal + i.kcal * i.qty, p: t.p + i.p * i.qty,
  c: t.c + i.c * i.qty,          f: t.f + i.f * i.qty
}), {kcal:0, p:0, c:0, f:0});

function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const o = JSON.parse(raw);
    if(!o || !o.profile) return;
    S = {v:o.v || 1, profile:{...DEFAULT_PROFILE, ...o.profile}, days:o.days || {},
         plan:o.plan || {}, custom:o.custom || {}, pt:o.pt || 0};
    migrate(o.v || 1);
  }catch(e){ /* corrupted or blocked storage — carry on with defaults */ }
}
/* Data written by an older version needs bringing forward. */
function migrate(from){
  if(from < 2){
    // v1 stored whole-serving totals with no quantity
    for(const d of Object.values(S.days)){
      d.items = (d.items || []).map(i => i.qty === undefined ? {...i, unit:i.unit || "", qty:1} : i);
      d.sets = d.sets || [];
    }
    // v1 had no "mine" split, so its saved value was only ever the old
    // default rather than a real choice — move it to the real programme
    if(S.profile.split === "ul") S.profile.split = "mine";
  }
  for(const d of Object.values(S.days)){ d.items = d.items || []; d.sets = d.sets || []; }
  S.v = SCHEMA;
}

function save(){
  const cut = key(addDays(new Date(), -70));
  for(const k of Object.keys(S.days)){
    const d = S.days[k];
    const touched = d.items.length || d.sets.length || d.done || d.wt != null ||
                    (d.swaps && Object.keys(d.swaps).length) || (d.extra && d.extra.length);
    if(k < cut || !touched) delete S.days[k];
  }
  stampChanges();
  try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }
  catch(e){ el("storeTag").textContent = "storage blocked"; }
  syncSoon();
}

/* --------------------------- the arithmetic --------------------------- */

function calc(p){
  const bmr  = 10*p.wt + 6.25*p.ht - 5*p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * Number(p.act);
  const adj  = {cut:-500, lean:-250, maintain:0, gain:+300}[p.goal];
  const floor = p.sex === "m" ? 1500 : 1200;
  const target = Math.max(Math.round((tdee + adj)/10)*10, floor, r0(bmr*1.05));

  const protein = r0(p.wt * (p.goal === "gain" ? 1.8 : 2.0));
  let fat   = r0(p.wt * (p.goal === "cut" ? 0.7 : 0.85));
  let carbs = r0((target - protein*4 - fat*9) / 4);
  if(carbs < 60){
    fat   = Math.max(r0(p.wt*0.55), r0((target - protein*4 - 240)/9));
    carbs = r0((target - protein*4 - fat*9) / 4);
  }
  return {bmr:r0(bmr), tdee:r0(tdee), target, protein, carbs, fat,
          rate:(target - tdee) * 7 / 7700, trainBurn:320};
}
const C = () => calc(S.profile);

/* Epley. Good enough up to about 12 reps, which is where the
   programmed work sits. */
const e1rm = (w, r) => w * (1 + r/30);

/* The catalogue plus anything you have added yourself. */
const exInfo = name => (S.custom && S.custom[name]) || MUSCLES[name] || {p:[], s:[], d:"3 x 10"};
const allExercises = () => Object.assign({}, MUSCLES, S.custom || {});

/* A logged set reads differently depending on the movement: minutes for
   the walk and the plank, assistance for assisted pull-ups, weight ×
   reps for everything else. */
const setText = (ex, w, r) =>
  TIMED.has(ex)    ? r + " min" :
  ASSISTED.has(ex) ? "−" + w + " × " + r :
                     w + " × " + r;

function weekDays(d){
  const mon = mondayOf(d), out = [];
  for(let i = 0; i < 7; i++) out.push(key(addDays(mon, i)));
  return out;
}

/* Hard sets per muscle across a week. A primary muscle scores a full
   set, a secondary one half — how most volume landmarks count. */
function weeklyVolume(d){
  const vol = {};
  for(const m of Object.keys(MUSCLE_LABELS)) vol[m] = 0;
  for(const k of weekDays(d)){
    for(const s of dayOf(k).sets){
      const map = exInfo(s.ex);
      for(const m of map.p) if(vol[m] !== undefined) vol[m] += 1;
      for(const m of map.s) if(vol[m] !== undefined) vol[m] += 0.5;
    }
  }
  return vol;
}

/* Best estimated 1RM per day for one lift, oldest first. */
function liftHistory(ex){
  return Object.keys(S.days).sort().map(k => {
    const best = dayOf(k).sets.filter(s => s.ex === ex)
      .reduce((m, s) => Math.max(m, e1rm(s.w, s.r)), 0);
    return best ? {k, v:best, sets:dayOf(k).sets.filter(s => s.ex === ex)} : null;
  }).filter(Boolean);
}

const loggedLifts = () => {
  const count = {};
  for(const d of Object.values(S.days))
    for(const s of d.sets) if(!UNLOADED.has(s.ex)) count[s.ex] = (count[s.ex] || 0) + 1;
  return Object.keys(count).sort((a,b) => count[b] - count[a]);
};

/* ----------------------------- the parser ----------------------------- */

const WORDNUM = {half:0.5, a:1, an:1, one:1, two:2, three:3, four:4, five:5,
                 six:6, seven:7, eight:8, nine:9, ten:10, couple:2, dozen:12};
const FILLER = new Set(["of","the","some","with","and","plus","my","i","ate","had","drank",
  "bowl","bowls","katori","katoris","cup","cups","glass","glasses","plate","plates",
  "piece","pieces","slice","slices","scoop","scoops","tbsp","tsp","spoon","spoons",
  "small","big","large","medium","full","one","serving","servings","portion"]);

const norm = s => s.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim();
const singular = w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0,-1) : w;

const INDEX = FOODS.map(f => ({
  food: f,
  keys: [f.name, ...f.alias].map(norm).map(s => s.split(" ").map(singular).join(" "))
}));

function matchFood(query){
  if(!query) return null;
  const qTokens = query.split(" ").map(singular).filter(Boolean);
  if(!qTokens.length) return null;
  let best = null, bestKey = null, bestScore = 0;
  for(const entry of INDEX){
    for(const k of entry.keys){
      const kTokens = k.split(" ");
      let score = 0;
      for(const kt of kTokens) if(qTokens.includes(kt)) score += 2;
      if(query.includes(k)) score += kTokens.length * 3;   // verbatim alias wins
      if(score > bestScore){ bestScore = score; best = entry.food; bestKey = kTokens; }
    }
  }
  return bestScore >= 2 ? {food:best, used:bestKey} : null;
}

function parseMeal(text){
  const phrases = text.split(/,|\band\b|\bwith\b|\+|\n|;/i).map(norm).filter(Boolean);
  const items = [], missed = [];

  for(const phrase of phrases){
    let qty = null, grams = null;

    const gm = phrase.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams|ml|l)\b/);
    if(gm){
      let v = parseFloat(gm[1]);
      if(gm[2] === "kg" || gm[2] === "l") v *= 1000;
      grams = v;
    }
    const nm = phrase.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:x\s*)?(?![a-z])/);
    if(nm && !(gm && gm[1] === nm[1])) qty = parseFloat(nm[1]);

    const rest = phrase
      .replace(/\d+(?:\.\d+)?\s*(kg|g|gm|gms|gram|grams|ml|l)\b/g, " ")
      .replace(/\d+(?:\.\d+)?/g, " ")
      .replace(/\bx\b/g, " ");
    const words = rest.split(" ").filter(Boolean);
    if(qty === null) for(const w of words) if(WORDNUM[w] !== undefined){ qty = WORDNUM[w]; break; }

    let remaining = words.filter(w => !FILLER.has(w) && WORDNUM[w] === undefined).map(singular);

    // one phrase can name more than one food — "dal chawal", "rajma rice"
    for(let pass = 0; pass < 3 && remaining.length; pass++){
      const hit = matchFood(remaining.join(" "));
      if(!hit){ missed.push(remaining.join(" ")); break; }
      const f = hit.food;
      const factor = (grams && f.g) ? (grams / f.g) : (qty === null ? 1 : qty);
      items.push({name:f.name, unit:f.unit, qty:Math.round(factor*100)/100,
                  kcal:f.kcal, p:f.p, c:f.c, f:f.f});
      remaining = remaining.filter(w => !hit.used.includes(w));
    }
  }
  return {items, missed};
}

/* ------------------------------ helpers ------------------------------ */

/* Under target the track is the target and the fill is your progress.
   Over it, the track becomes the total eaten: the solid part is the
   target, the striped part is the overage. Either way the boundary
   between the two is always the target line. */
function fillPair(now, target){
  if(!(target > 0)) return [0, 0];
  if(now <= target) return [now/target*100, 0];
  const fill = target/now*100;
  return [fill, 100 - fill];
}
function setBar(barId, spillId, now, target){
  const [fill, spill] = fillPair(now, target);
  el(barId).style.width   = fill.toFixed(1) + "%";
  el(spillId).style.width = spill.toFixed(1) + "%";
}
const qtyLabel = i => (i.qty === 1 ? i.unit : r1(i.qty) + " × " + i.unit);
const svgEl = (tag, attrs, text) => {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for(const [k,v] of Object.entries(attrs)) n.setAttribute(k, v);
  if(text !== undefined) n.textContent = text;
  return n;
};

/* ------------------------------ TODAY ------------------------------ */

function renderToday(){
  const c = C(), k = key(viewDate), t = totals(k), isToday = k === todayKey();

  el("dlabel").textContent = isToday ? "Today"
    : viewDate.toLocaleDateString(undefined, {weekday:"short", day:"numeric", month:"short"});
  el("nextday").disabled = k >= todayKey();

  const left = c.target - t.kcal;
  el("kcalLeft").textContent = fmt(Math.abs(left));
  el("kcalLeft").classList.toggle("over", left < 0);
  el("kcalCap").textContent = left >= 0 ? "kcal left" + (isToday ? " today" : "") : "kcal over target";
  el("kcalSub").textContent = fmt(t.kcal) + " of " + fmt(c.target) + " eaten";

  const [railF, railS] = fillPair(t.kcal, c.target);
  el("railFill").style.width  = railF.toFixed(1) + "%";
  el("railSpill").style.width = railS.toFixed(1) + "%";

  const v = el("verdict");
  v.className = "verdict";
  if(t.kcal === 0)                  v.textContent = "Nothing logged yet";
  else if(left < 0)               { v.textContent = fmt(-left) + " past the line"; v.classList.add("over"); }
  else if(left < c.target * 0.12) { v.textContent = "Cutting it fine · " + fmt(left) + " left"; v.classList.add("good"); }
  else                            { v.textContent = "On track · room for " + fmt(left); v.classList.add("good"); }

  el("pNow").textContent = r0(t.p); el("pTgt").textContent = c.protein;
  el("cNow").textContent = r0(t.c); el("cTgt").textContent = c.carbs;
  el("fNow").textContent = r0(t.f); el("fTgt").textContent = c.fat;
  setBar("pBar","pSpill", t.p, c.protein);
  setBar("cBar","cSpill", t.c, c.carbs);
  setBar("fBar","fSpill", t.f, c.fat);

  const items = dayOf(k).items;
  el("logCount").textContent = items.length ? items.length + (items.length === 1 ? " item" : " items") : "";
  const log = el("log");
  log.textContent = "";

  if(!items.length){
    const e = document.createElement("div");
    e.className = "empty";
    const y = dayOf(key(addDays(viewDate, -1)));
    e.textContent = "Nothing logged. ";
    if(y.items.length){
      const b = document.createElement("button");
      b.textContent = "Copy yesterday";
      b.onclick = () => {
        ensure(k).items = y.items.map(i => ({...i}));
        save(); renderAll();
      };
      e.appendChild(b);
    } else {
      e.textContent = "Nothing logged. Tap a chip above — it takes one thumb.";
    }
    log.appendChild(e);
  }

  items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "entry";
    row.innerHTML =
      '<div class="en"><b></b><span></span></div>' +
      '<span class="ek"></span>' +
      '<span class="stepper"><button class="minus" aria-label="One less">&minus;</button>' +
      '<span class="q"></span><button class="plus" aria-label="One more">+</button></span>';
    row.querySelector("b").textContent = it.name;
    row.querySelector(".en span").textContent =
      (it.unit ? qtyLabel(it) + "  ·  " : "") +
      "P " + r0(it.p*it.qty) + " · C " + r0(it.c*it.qty) + " · F " + r0(it.f*it.qty);
    row.querySelector(".ek").textContent = fmt(it.kcal * it.qty);
    row.querySelector(".q").textContent = r1(it.qty);
    row.querySelector(".plus").onclick = () => { it.qty = r1(it.qty + 1); save(); renderAll(); };
    row.querySelector(".minus").onclick = () => {
      it.qty = r1(it.qty - 1);
      if(it.qty <= 0) S.days[k].items.splice(idx, 1);
      save(); renderAll();
    };
    log.appendChild(row);
  });

  el("wIn").value = dayOf(k).wt == null ? "" : dayOf(k).wt;
  const pick = (from, to) => {
    const out = [];
    for(let i = from; i < to; i++){ const w = dayOf(key(addDays(viewDate, -i))).wt; if(w != null) out.push(w); }
    return out;
  };
  const avg = a => a.reduce((x,y) => x+y, 0) / a.length;
  const wk = pick(0,7), prev = pick(7,14);
  if(wk.length){
    el("wTrend").textContent = avg(wk).toFixed(1);
    if(prev.length){
      const d = avg(wk) - avg(prev);
      el("wNote").innerHTML = "Seven-day average is <b>" + (d >= 0 ? "+" : "") + d.toFixed(2) +
        " kg</b> on the week before, against a plan of " + (c.rate >= 0 ? "+" : "") + c.rate.toFixed(2) +
        " kg. Two weeks off plan is your cue to move the target — not one.";
    } else {
      el("wNote").innerHTML = "Averaged over " + wk.length + " weigh-in" + (wk.length > 1 ? "s" : "") +
        ". At two full weeks the trend becomes readable.";
    }
  } else {
    el("wTrend").textContent = "—";
  }
}

/* ------------------------------- WEEK ------------------------------- */

function renderWeek(){
  const c = C(), mon = mondayOf(viewDate), tk = todayKey();
  const days = weekDays(viewDate).map(k => ({k, kcal:totals(k).kcal, past:k < tk, isToday:k === tk}));

  el("weekRange").textContent =
    mon.toLocaleDateString(undefined, {day:"numeric", month:"short"}) + " – " +
    addDays(mon,6).toLocaleDateString(undefined, {day:"numeric", month:"short"});

  const budget      = c.target * 7;
  const eaten       = days.reduce((s,x) => s + x.kcal, 0);
  const leftBudget  = budget - eaten;
  const daysLeft    = days.filter(x => !x.past).length;
  const eatenBefore = days.filter(x =>  x.past).reduce((s,x) => s + x.kcal, 0);
  const perDay      = daysLeft > 0 ? (budget - eatenBefore) / daysLeft : 0;

  el("bankNum").textContent = fmt(Math.abs(leftBudget));
  el("bankNum").style.color = leftBudget >= 0 ? "" : "var(--over)";
  el("bankLbl").textContent = leftBudget >= 0 ? "kcal left this week" : "kcal over for the week";

  el("bankLede").innerHTML = daysLeft === 0
    ? (leftBudget >= 0 ? "Week closed under budget by " + fmt(leftBudget) + " kcal."
                       : "Week closed " + fmt(-leftBudget) + " kcal over.")
    : perDay < c.target * 0.55
      ? "Eat <b>" + fmt(perDay) + "</b> a day for the rest of the week to pull it back. That is tight — " +
        "taking " + fmt(c.target*0.8) + " a day and accepting a smaller deficit is the saner move."
      : "You can eat <b>" + fmt(perDay) + "</b> a day for the remaining " + daysLeft +
        " day" + (daysLeft > 1 ? "s" : "") + " and still land on budget.";

  el("wkEaten").textContent  = fmt(eaten) + " eaten";
  el("wkBudget").textContent = fmt(budget) + " budget";
  const [wkF, wkS] = fillPair(eaten, budget);
  el("wkBar").style.width   = wkF.toFixed(1) + "%";
  el("wkSpill").style.width = wkS.toFixed(1) + "%";

  const scale = Math.max(c.target * 1.35, ...days.map(x => x.kcal));
  const chart = el("weekchart");
  chart.textContent = "";
  days.forEach((x, i) => {
    const w = document.createElement("div");
    w.className = "wday" + (x.isToday ? " today" : "");
    const h = x.kcal ? clamp(x.kcal/scale*100, 3, 100) : 1.5;
    const cls = !x.kcal ? "none" : (x.kcal > c.target ? "over" : "");
    w.innerHTML =
      '<div class="wcol"><div class="targetline" style="bottom:' + (c.target/scale*100).toFixed(1) + '%"></div>' +
      '<div class="wbar ' + cls + '" style="height:' + h.toFixed(1) + '%"></div></div>' +
      '<span class="dlbl">' + DAYSHORT[i].charAt(0) + '</span>';
    w.title = DAYNAMES[i] + ": " + (x.kcal ? fmt(x.kcal) + " kcal" : "not logged");
    chart.appendChild(w);
  });

  const rows = [
    ["Daily target",                fmt(c.target) + " kcal"],
    ["Weekly budget",               fmt(budget) + " kcal"],
    ["Eaten so far",                fmt(eaten) + " kcal"],
    [leftBudget >= 0 ? "Left in the bank" : "Over the bank", fmt(Math.abs(leftBudget)) + " kcal"],
    ["Days still to log",           String(daysLeft)],
    ["Allowance per remaining day", daysLeft ? fmt(perDay) + " kcal" : "—"]
  ];
  el("mathTable").innerHTML = rows.map(r => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>").join("");

  const overDays = days.filter(x => x.kcal > c.target).length;
  el("weekAdvice").textContent = overDays === 0
    ? "No day over target yet this week. The bank exists so one big dinner does not end the week — spend it deliberately rather than by accident."
    : overDays + " day" + (overDays > 1 ? "s" : "") + " over target so far. That is fine as long as the week balances: the bank above is the number that decides whether you lose fat, not any single day.";
}

/* --------------------------- GYM: session --------------------------- */

function sessionFor(d){
  const split = SPLITS[S.profile.split];
  const idx = (d.getDay()+6)%7;
  const sesKey = split.days[idx];
  return {split, idx, sesKey, ses:SESSIONS[sesKey]};
}

/* The programme as edited (S.plan), then today's one-off changes
   (day.swaps / day.extra) laid over the top. Sets are logged against the
   exercise NAME, so a swap never disturbs either lift's history. */
const DROPPED = "\u0000dropped";

function planEx(sesKey, ses){
  return (S.plan && S.plan[sesKey]) ? S.plan[sesKey] : ses.ex;
}
function effectiveEx(sesKey, ses, dayK){
  const day = dayOf(dayK), swaps = day.swaps || {}, out = [];
  planEx(sesKey, ses).forEach(e => {
    const to = swaps[e[0]];
    if(to === DROPPED) return;
    if(to) out.push([to, exInfo(to).d || e[1], "in place of " + e[0], e[0]]);
    else out.push(e);
  });
  (day.extra || []).forEach(n => out.push([n, exInfo(n).d, "added today", null]));

  // Work you actually did always shows, even if the programme has since
  // moved on — otherwise editing a session would hide sets logged under
  // an exercise it no longer contains.
  const listed = new Set(out.map(e => e[0]));
  day.sets.forEach(st => {
    if(listed.has(st.ex)) return;
    listed.add(st.ex);
    out.push([st.ex, exInfo(st.ex).d, "logged, not in this session", null]);
  });
  return out;
}

/* the most recent earlier day this lift was trained */
function lastTime(ex, beforeKey){
  const ks = Object.keys(S.days).filter(k => k < beforeKey).sort().reverse();
  for(const k of ks){
    const sets = dayOf(k).sets.filter(s => s.ex === ex);
    if(sets.length) return {k, sets};
  }
  return null;
}
function bestBefore(ex, beforeKey){
  let best = 0;
  for(const k of Object.keys(S.days)) if(k < beforeKey)
    for(const s of dayOf(k).sets) if(s.ex === ex) best = Math.max(best, e1rm(s.w, s.r));
  return best;
}

function renderSession(){
  const c = C(), k = key(viewDate);
  const {split, idx, sesKey, ses} = sessionFor(viewDate);
  const isRest = ses.name === "Rest day", isCond = ses.name === "Conditioning";
  const day = dayOf(k);

  el("sesBadgeDay").textContent = DAYSHORT[idx];
  el("sesBadgeN").textContent   = isRest ? "—" : (idx + 1);
  el("sesName").textContent     = ses.name;
  el("sesFocus").textContent    = ses.focus;
  el("sesDay").textContent      = DAYNAMES[idx];

  // "10 min" must not be read as ten sets
  const plannedSets = e => TIMED.has(e[0]) ? 0 : (parseInt(e[1], 10) || 0);
  const todayEx = effectiveEx(sesKey, ses, k);
  const planned = todayEx.reduce((s, e) => s + plannedSets(e), 0);
  const doneSets = day.sets.filter(x => !TIMED.has(x.ex)).length;
  const tonnage = day.sets.filter(x => !TIMED.has(x.ex)).reduce((s, x) => s + x.w * x.r, 0);
  el("sesSets").firstChild.textContent = doneSets;
  el("sesSetsOf").textContent = "/" + (isRest ? 0 : planned);
  el("sesTon").firstChild.textContent = tonnage >= 1000 ? (tonnage/1000).toFixed(1) : fmt(tonnage);
  el("sesTon").querySelector("small").textContent = tonnage >= 1000 ? "t" : "kg";
  // the ten-minute incline walk on top of the lifting
  el("sesBurn").textContent = isRest ? "120"
    : isCond ? "350"
    : (ses.cardio ? c.trainBurn + 100 : c.trainBurn);

  const list = el("exlist");
  list.textContent = "";

  todayEx.forEach((e, i) => {
    const name = e[0], scheme = e[1], cue = e[2], replaced = e[3];
    const mine = day.sets.map((s, si) => ({...s, si})).filter(s => s.ex === name);
    const targetSets = plannedSets(e);

    const wrap = document.createElement("div");
    wrap.className = "ex";

    const head = document.createElement("button");
    head.className = "exhead";
    head.setAttribute("aria-expanded", String(openEx === name));
    head.innerHTML = '<span class="idx"></span><div class="exn"><b></b><span></span></div><span class="tick"></span>';
    head.querySelector(".idx").textContent = i + 1;
    const nameEl = head.querySelector("b");
    nameEl.textContent = name;
    if(replaced){
      const tag = document.createElement("span");
      tag.className = "swapped";
      tag.textContent = "swapped";
      nameEl.appendChild(tag);
    }
    head.querySelector(".exn span").textContent = scheme + (cue ? " · " + cue : "");
    const tick = head.querySelector(".tick");
    tick.textContent = mine.length + (targetSets ? "/" + targetSets : "");
    if(targetSets && mine.length >= targetSets) tick.classList.add("hit");
    head.onclick = () => { openEx = (openEx === name ? null : name); renderSession(); };
    wrap.appendChild(head);

    const swapBtn = document.createElement("button");
    swapBtn.className = "swap";
    swapBtn.innerHTML = "&#8646;";
    swapBtn.title = "Swap or remove " + name;
    swapBtn.setAttribute("aria-label", "Swap or remove " + name);
    swapBtn.onclick = ev => { ev.stopPropagation(); openSheet(sesKey, k, name); };
    head.appendChild(swapBtn);

    if(openEx === name){
      const body = document.createElement("div");
      body.className = "exbody";

      const prev = lastTime(name, k);
      const ref = document.createElement("div");
      ref.className = "lastref";
      if(prev){
        const when = dateFromKey(prev.k).toLocaleDateString(undefined, {day:"numeric", month:"short"});
        ref.innerHTML = "Last time (" + when + "): <b>" +
          prev.sets.map(s => setText(name, s.w, s.r)).join(", ") + "</b>";
      } else {
        ref.textContent = "First time logging this — whatever you do today becomes the number to beat.";
      }
      body.appendChild(ref);

      if(mine.length){
        const sr = document.createElement("div");
        sr.className = "setrow";
        // a PR badge only means something where more weight is better
        const rankable = !UNLOADED.has(name) && !TIMED.has(name);
        const pb = rankable ? bestBefore(name, k) : 0;
        mine.forEach(s => {
          const chip = document.createElement("button");
          chip.className = "setchip" + (pb && e1rm(s.w, s.r) > pb ? " pr" : "");
          chip.textContent = setText(name, s.w, s.r);
          chip.title = "Tap to delete this set";
          chip.onclick = () => { ensure(k).sets.splice(s.si, 1); save(); renderGym(); };
          sr.appendChild(chip);
        });
        body.appendChild(sr);
      }

      const lastSet = mine.length ? mine[mine.length-1] : (prev ? prev.sets[prev.sets.length-1] : null);
      const timed = TIMED.has(name);
      const inp = document.createElement("div");
      inp.className = "setinput";
      inp.style.gridTemplateColumns = timed ? "1fr auto" : "1fr 1fr auto";
      inp.innerHTML = timed
        ? '<label class="fld"><span>minutes</span><input type="number" inputmode="numeric" class="r"></label>' +
          '<button class="btn primary">Log it</button>'
        : '<label class="fld"><span>' + (ASSISTED.has(name) ? "assist kg" : "kg") + '</span>' +
          '<input type="number" step="0.5" inputmode="decimal" class="w"></label>' +
          '<label class="fld"><span>reps</span><input type="number" inputmode="numeric" class="r"></label>' +
          '<button class="btn primary">Log set</button>';
      const wIn = inp.querySelector(".w"), rIn = inp.querySelector(".r");
      if(lastSet){ if(wIn) wIn.value = lastSet.w; rIn.value = lastSet.r; }
      inp.querySelector("button").onclick = () => {
        const w = timed ? 0 : parseFloat(wIn.value);
        const r = parseInt(rIn.value, 10);
        if(!(w >= 0) || !(r > 0)){ (wIn || rIn).focus(); return; }
        ensure(k).sets.push({ex:name, w, r});
        save(); renderGym();
      };
      body.appendChild(inp);
      wrap.appendChild(body);
    }
    list.appendChild(wrap);
  });

  if(!isRest){
    const add = document.createElement("button");
    add.className = "addex";
    add.textContent = "+ Add an exercise";
    add.onclick = () => openSheet(sesKey, k, null);
    list.appendChild(add);
  }

  el("cue").innerHTML = isRest
    ? "<b>Today's target: do nothing hard.</b> Muscle is built between sessions, not during them. Walk, sleep, hit your protein — that is the whole job."
    : isCond
      ? "<b>Today's target: 30–40 minutes at a pace you could hold a conversation through.</b> If you are gasping, slow down — this session is for recovery and appetite control, not punishment."
      : "<b>Today's target: beat last week on the first two lifts.</b> One more rep at the same weight counts, and is usually the smarter progression. Once you hit the top of the rep range on every set, add 2.5 kg and drop back to the bottom.";

  const perMeal = Math.round(c.protein / 4 / 5) * 5;
  el("fuel").innerHTML = isRest
    ? "Protein stays at <b>" + c.protein + " g</b> today — it is a recovery day, not a diet day. Around " + perMeal + " g across four meals gets you there."
    : "Put a fair share of today's <b>" + c.carbs + " g of carbs</b> in the two meals around training, and land <b>" + perMeal +
      " g of protein</b> per meal across four meals. The session burns roughly <b>" + el("sesBurn").textContent +
      " kcal</b> — already inside your activity multiplier, so do not eat it back on top.";

  let streak = 0;
  for(let i = 0; i < 60; i++){
    const d = addDays(new Date(), -i), kk = key(d);
    const rest = SESSIONS[split.days[(d.getDay()+6)%7]].name === "Rest day";
    if(dayOf(kk).sets.length || dayOf(kk).done || rest){ streak++; continue; }
    if(i === 0) continue;
    break;
  }
  el("streak").textContent = streak > 1 ? streak + " day streak" : split.label;

  const mon = mondayOf(viewDate);
  el("splitTable").innerHTML = split.days.map((sk, i) => {
    const s = SESSIONS[sk], dk = key(addDays(mon, i));
    const n = dayOf(dk).sets.length;
    const mark = n ? " · " + n + " sets" : (dayOf(dk).done ? " ✓" : "");
    const cur = i === idx ? ' style="color:var(--accent); font-weight:600"' : "";
    return "<tr" + cur + "><td>" + DAYNAMES[i] + "</td><td>" + s.name + mark + "</td></tr>";
  }).join("");
}

/* --------------------------- GYM: strength --------------------------- */

function renderStrength(){
  const lifts = loggedLifts();
  const chips = el("liftChips");
  chips.textContent = "";

  if(!lifts.length){
    el("liftReadout").innerHTML = '<span class="r2">No sets logged yet.</span>';
    el("liftChart").innerHTML = "";
    el("liftNote").textContent =
      "Log a few sets on the Session tab and this becomes a line per lift — estimated one-rep max over time, which is the cleanest answer to whether you are actually getting stronger.";
    return;
  }
  if(!liftPick || !lifts.includes(liftPick)) liftPick = lifts[0];

  lifts.slice(0, 8).forEach(name => {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = name;
    b.setAttribute("aria-pressed", String(name === liftPick));
    b.onclick = () => { liftPick = name; liftHover = null; renderStrength(); };
    chips.appendChild(b);
  });

  const hist = liftHistory(liftPick);
  const svg = el("liftChart");
  svg.textContent = "";

  // R stops short of the viewBox so the emphasised last marker (r=5)
  // and the "7 Sept" label both sit inside the drawing
  const W = 320, H = 158, L = 36, R = 302, T = 14, B = 122;

  if(hist.length < 2){
    const only = hist[0];
    el("liftReadout").innerHTML =
      '<span class="r1">' + (only ? r1(only.v) : 0) + ' kg</span><span class="r2">estimated 1RM · one session</span>';
    svg.appendChild(svgEl("text", {x:W/2, y:H/2 - 6, "text-anchor":"middle", fill:"var(--ink3)"},
      "One session logged."));
    svg.appendChild(svgEl("text", {x:W/2, y:H/2 + 10, "text-anchor":"middle", fill:"var(--ink3)"},
      "The line starts at the second."));
    el("liftNote").textContent = "Estimated 1RM uses the Epley formula: weight × (1 + reps ÷ 30). It lets a set of 8 and a set of 3 sit on the same scale.";
    return;
  }

  const vals = hist.map(h => h.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, 2);
  lo = Math.max(0, lo - pad); hi = hi + pad;
  const x = i => L + (R - L) * (hist.length === 1 ? 0.5 : i / (hist.length - 1));
  const y = v => B - (B - T) * ((v - lo) / (hi - lo));

  // grid + y labels
  for(let g = 0; g <= 2; g++){
    const v = lo + (hi - lo) * g / 2, yy = y(v);
    svg.appendChild(svgEl("line", {x1:L, y1:yy, x2:R, y2:yy, class:"gridline"}));
    svg.appendChild(svgEl("text", {x:L - 6, y:yy + 3, "text-anchor":"end"}, r0(v)));
  }
  svg.appendChild(svgEl("line", {x1:L, y1:B, x2:R, y2:B, class:"axis"}));

  // x labels: first, last, and the middle one if it fits
  const dlabel = k => dateFromKey(k).toLocaleDateString(undefined, {day:"numeric", month:"short"});
  const ticks = hist.length > 2 ? [0, Math.floor((hist.length-1)/2), hist.length-1] : [0, hist.length-1];
  [...new Set(ticks)].forEach(i => {
    svg.appendChild(svgEl("text", {
      x:clamp(x(i), L, R), y:B + 14,
      "text-anchor": i === 0 ? "start" : (i === hist.length-1 ? "end" : "middle")
    }, dlabel(hist[i].k)));
  });

  svg.appendChild(svgEl("path", {
    d: hist.map((h,i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(h.v).toFixed(1)).join(" "),
    class:"series"
  }));

  hist.forEach((h, i) => {
    const last = i === hist.length - 1;
    svg.appendChild(svgEl("circle", {cx:x(i), cy:y(h.v), r:last ? 5 : 3.5, class:"marker"}));
  });

  // crosshair for whichever point is being inspected
  const shown = liftHover === null ? hist.length - 1 : liftHover;
  svg.appendChild(svgEl("line", {x1:x(shown), y1:T, x2:x(shown), y2:B, class:"crosshair"}));

  // generous hit targets
  hist.forEach((h, i) => {
    const half = (R - L) / Math.max(hist.length - 1, 1) / 2;
    const rect = svgEl("rect", {
      x:Math.max(L, x(i) - half), y:T, width:half*2, height:B - T, class:"hit"
    });
    const show = () => { liftHover = i; renderStrength(); };
    rect.addEventListener("mouseenter", show);
    rect.addEventListener("click", show);
    svg.appendChild(rect);
  });

  const cur = hist[shown], first = hist[0];
  const delta = cur.v - first.v;
  const dcls = Math.abs(delta) < 0.5 ? "flat" : (delta > 0 ? "up" : "down");
  el("liftReadout").innerHTML =
    '<span class="r1">' + r1(cur.v) + ' kg</span>' +
    '<span class="delta ' + dcls + '">' + (delta >= 0 ? "+" : "") + r1(delta) + '</span>' +
    '<span class="r2">' + dateFromKey(cur.k).toLocaleDateString(undefined, {day:"numeric", month:"short"}) +
    ' · best set ' + (() => {
      const b = cur.sets.reduce((m,s) => e1rm(s.w,s.r) > e1rm(m.w,m.r) ? s : m);
      return setText(liftPick, b.w, b.r) + (TIMED.has(liftPick) ? "" : " kg");
    })() + '</span>';

  el("liftNote").textContent =
    "Estimated 1RM, Epley: weight × (1 + reps ÷ 30) — it puts a set of 8 and a set of 3 on the same scale. " +
    hist.length + " sessions logged, " + (delta >= 0 ? "up " : "down ") + Math.abs(r1(delta)) + " kg since the first.";
}

/* ---------------------------- GYM: volume ---------------------------- */

function renderVolume(){
  const vol = weeklyVolume(viewDate);
  const list = el("volList");
  list.textContent = "";

  const keys = Object.keys(MUSCLE_LABELS).sort((a,b) => vol[b] - vol[a]);
  const peak = Math.max(VOLUME_MAX + 5, ...Object.values(vol));

  keys.forEach(m => {
    const n = vol[m];
    const state = n < VOLUME_MIN ? "low" : (n > VOLUME_MAX ? "high" : "in");
    const word  = n < VOLUME_MIN ? (n === 0 ? "None" : "Under") : (n > VOLUME_MAX ? "Over" : "In range");

    const row = document.createElement("div");
    row.className = "volrow";
    row.innerHTML =
      '<div class="vtop"><span class="vname"></span>' +
      '<span class="vval"><b></b>sets <span class="vstate ' + state + '"></span></span></div>' +
      '<div class="vtrack"><div class="vband"></div><div class="vfill ' + state + '"></div></div>';
    row.querySelector(".vname").textContent = MUSCLE_LABELS[m];
    row.querySelector("b").textContent = r1(n);
    row.querySelector(".vstate").textContent = word;
    const band = row.querySelector(".vband");
    band.style.left  = (VOLUME_MIN/peak*100) + "%";
    band.style.width = ((VOLUME_MAX - VOLUME_MIN)/peak*100) + "%";
    row.querySelector(".vfill").style.width = clamp(n/peak*100, 0, 100) + "%";
    list.appendChild(row);
  });

  el("volTable").innerHTML =
    "<table><thead><tr><th>Muscle</th><th>Sets</th><th>Status</th></tr></thead><tbody>" +
    keys.map(m => {
      const n = vol[m];
      const word = n < VOLUME_MIN ? (n === 0 ? "None" : "Under") : (n > VOLUME_MAX ? "Over" : "In range");
      return "<tr><td>" + MUSCLE_LABELS[m] + "</td><td>" + r1(n) + "</td><td>" + word + "</td></tr>";
    }).join("") + "</tbody></table>";
}

/* --------------------------- GYM: heatmap ---------------------------- */

/* A stylised figure, front and back. Each region is one muscle group;
   head, forearms and feet are structure, not data. */
const BODY = {
  front: [
    {m:null,        el:"circle",  a:{cx:50, cy:16, r:11}},
    {m:null,        el:"rect",    a:{x:45, y:25, width:10, height:8, rx:3}},
    {m:"shoulders", el:"ellipse", a:{cx:27, cy:44, rx:10, ry:8}},
    {m:"shoulders", el:"ellipse", a:{cx:73, cy:44, rx:10, ry:8}},
    {m:"chest",     el:"rect",    a:{x:34, y:36, width:32, height:24, rx:7}},
    {m:"core",      el:"rect",    a:{x:40, y:62, width:20, height:33, rx:5}},
    {m:"biceps",    el:"ellipse", a:{cx:22, cy:65, rx:6.5, ry:13}},
    {m:"biceps",    el:"ellipse", a:{cx:78, cy:65, rx:6.5, ry:13}},
    {m:"forearms",  el:"ellipse", a:{cx:18, cy:92, rx:5.5, ry:14}},
    {m:"forearms",  el:"ellipse", a:{cx:82, cy:92, rx:5.5, ry:14}},
    {m:"quads",     el:"ellipse", a:{cx:40, cy:124, rx:11, ry:27}},
    {m:"quads",     el:"ellipse", a:{cx:60, cy:124, rx:11, ry:27}},
    {m:"calves",    el:"ellipse", a:{cx:39, cy:174, rx:7.5, ry:19}},
    {m:"calves",    el:"ellipse", a:{cx:61, cy:174, rx:7.5, ry:19}}
  ],
  back: [
    {m:null,        el:"circle",  a:{cx:50, cy:16, r:11}},
    {m:null,        el:"rect",    a:{x:45, y:25, width:10, height:8, rx:3}},
    {m:"shoulders", el:"ellipse", a:{cx:27, cy:44, rx:10, ry:8}},
    {m:"shoulders", el:"ellipse", a:{cx:73, cy:44, rx:10, ry:8}},
    {m:"back",      el:"polygon", a:{points:"36,36 64,36 68,56 59,78 41,78 32,56"}},
    {m:"triceps",   el:"ellipse", a:{cx:22, cy:65, rx:6.5, ry:13}},
    {m:"triceps",   el:"ellipse", a:{cx:78, cy:65, rx:6.5, ry:13}},
    {m:"forearms",  el:"ellipse", a:{cx:18, cy:92, rx:5.5, ry:14}},
    {m:"forearms",  el:"ellipse", a:{cx:82, cy:92, rx:5.5, ry:14}},
    {m:"glutes",    el:"ellipse", a:{cx:42, cy:90, rx:9.5, ry:9}},
    {m:"glutes",    el:"ellipse", a:{cx:58, cy:90, rx:9.5, ry:9}},
    {m:"hams",      el:"ellipse", a:{cx:40, cy:128, rx:11, ry:26}},
    {m:"hams",      el:"ellipse", a:{cx:60, cy:128, rx:11, ry:26}},
    {m:"calves",    el:"ellipse", a:{cx:39, cy:174, rx:7.5, ry:19}},
    {m:"calves",    el:"ellipse", a:{cx:61, cy:174, rx:7.5, ry:19}}
  ]
};

const heatStep = n => n === 0 ? 0 : n < 6 ? 1 : n < 11 ? 2 : n <= VOLUME_MAX ? 3 : 4;

function renderHeat(){
  const vol = weeklyVolume(viewDate);
  const host = el("heat");
  host.textContent = "";

  for(const view of ["front","back"]){
    const fig = document.createElement("figure");
    const svg = svgEl("svg", {viewBox:"0 0 100 200", role:"img",
      "aria-label":view + " view, shaded by sets trained this week"});

    for(const part of BODY[view]){
      const node = svgEl(part.el, part.a);
      if(part.m){
        const n = vol[part.m];
        node.setAttribute("fill", "var(--heat" + heatStep(n) + ")");
        node.setAttribute("class", "mz");
        node.appendChild(svgEl("title", {}, MUSCLE_LABELS[part.m] + " — " + r1(n) + " sets this week"));
        node.addEventListener("click", () => {
          el("heatNote").innerHTML = "<b>" + MUSCLE_LABELS[part.m] + "</b> — " + r1(n) +
            " hard sets this week. " + (n < VOLUME_MIN
              ? "Below the 10-set maintenance mark."
              : n > VOLUME_MAX ? "Above 20 sets; more fatigue than stimulus for most people."
              : "Inside the 10–20 set range.");
        });
      } else {
        node.setAttribute("class", "body-outline");
      }
      svg.appendChild(node);
    }
    fig.appendChild(svg);
    const cap = document.createElement("figcaption");
    cap.textContent = view;
    fig.appendChild(cap);
    host.appendChild(fig);
  }

  const total = Object.values(vol).reduce((a,b) => a+b, 0);
  const under = Object.keys(MUSCLE_LABELS).filter(m => vol[m] < VOLUME_MIN);
  el("heatNote").innerHTML = total === 0
    ? "Nothing logged this week. Shading appears as you log sets — tap any muscle for its number."
    : r1(total) + " hard sets this week. " + (under.length
        ? "Still under 10: <b>" + under.map(m => MUSCLE_LABELS[m].toLowerCase()).join(", ") + "</b>."
        : "Every group is inside the range.") + " Tap a muscle for its count.";
}

function renderGym(){
  el("g-session").hidden  = gymSub !== "session";
  el("g-progress").hidden = gymSub !== "progress";
  document.querySelectorAll("#gymSeg button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.sub === gymSub)));
  if(gymSub === "session") renderSession();
  else { renderStrength(); renderVolume(); renderHeat(); }
}

/* -------------------------------- YOU -------------------------------- */

function renderYou(){
  const p = S.profile, c = C();
  document.querySelectorAll("#segSex button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === p.sex)));
  el("pAge").value = p.age; el("pHt").value = p.ht; el("pWt").value = p.wt;
  el("pAct").value = String(p.act); el("pGoal").value = p.goal; el("pSplit").value = p.split;

  const rows = [
    ["Resting burn (BMR)",  fmt(c.bmr) + " kcal"],
    ["Maintenance (TDEE)",  fmt(c.tdee) + " kcal"],
    ["Daily target",        "<b>" + fmt(c.target) + " kcal</b>"],
    ["Weekly budget",       fmt(c.target*7) + " kcal"],
    ["Protein",             c.protein + " g  (" + fmt(c.protein*4) + " kcal)"],
    ["Carbs",               c.carbs + " g  (" + fmt(c.carbs*4) + " kcal)"],
    ["Fat",                 c.fat + " g  (" + fmt(c.fat*9) + " kcal)"],
    ["Projected change",    (c.rate >= 0 ? "+" : "") + c.rate.toFixed(2) + " kg / week"]
  ];
  el("calcTable").innerHTML = rows.map(r => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>").join("");
  el("calcNote").textContent =
    "Mifflin-St Jeor for the resting burn, multiplied by your activity, then adjusted for the goal. Protein is set at " +
    (p.goal === "gain" ? "1.8" : "2.0") + " g per kg to hold muscle while the weight moves; fat is floored so hormones stay happy; " +
    "carbs take whatever is left. A starting estimate — after two weeks trust your weight trend over the formula and move the target by 150–200 kcal.";

  el("syncUrl").value = sync.url;
  el("syncToken").value = sync.token;
  renderSyncBadge();

  const setCount = Object.values(S.days).reduce((n,d) => n + d.sets.length, 0);
  el("verNote").textContent = "v" + APP_VERSION + " · " + FOODS.length + " foods · " +
    setCount + " sets logged · runs entirely offline once loaded.";
}

function renderAll(){ renderToday(); renderWeek(); renderGym(); renderYou(); }

/* ------------------------------ actions ------------------------------ */

function addFood(f){
  const k = key(viewDate), day = ensure(k);
  const same = day.items.find(i => i.name === f.name && i.kcal === f.kcal && i.unit === f.unit);
  if(same) same.qty = r1(same.qty + f.qty);
  else day.items.push({...f});
  save(); renderAll();
}

const chipHost = el("chips");
QUICK.forEach(name => {
  const f = FOODS.find(x => x.name === name);
  if(!f) return;
  const b = document.createElement("button");
  b.className = "chip"; b.type = "button";
  b.innerHTML = "<span></span><em>" + f.kcal + "</em>";
  b.querySelector("span").textContent = f.name;
  b.title = f.unit + " · " + f.kcal + " kcal";
  b.onclick = () => addFood({name:f.name, unit:f.unit, qty:1, kcal:f.kcal, p:f.p, c:f.c, f:f.f});
  chipHost.appendChild(b);
});

el("parseGo").onclick = () => {
  const text = el("parseText").value.trim();
  const pend = el("pending");
  if(!text){ el("parseText").focus(); return; }

  const {items, missed} = parseMeal(text);
  pend.textContent = "";

  if(!items.length){
    const m = document.createElement("div");
    m.className = "miss";
    m.textContent = 'Could not recognise anything there. Try naming the food plainly — "2 rotis, 1 katori dal" — or use manual entry below.';
    pend.appendChild(m);
    pend.hidden = false;
    return;
  }

  const head = document.createElement("span");
  head.className = "lbl";
  head.textContent = "Read as — check it, then add";
  pend.appendChild(head);

  items.forEach(i => {
    const row = document.createElement("div");
    row.className = "prow";
    row.innerHTML = "<span></span><b></b>";
    row.querySelector("span").textContent = i.name + " · " + qtyLabel(i) +
      "  ·  P " + r0(i.p*i.qty) + " C " + r0(i.c*i.qty) + " F " + r0(i.f*i.qty);
    row.querySelector("b").textContent = fmt(i.kcal * i.qty);
    pend.appendChild(row);
  });

  if(missed.length){
    const m = document.createElement("div");
    m.className = "miss";
    m.textContent = "Not in the library: " + missed.join(", ") + " — add those manually.";
    pend.appendChild(m);
  }

  const go = document.createElement("button");
  go.className = "btn primary wide";
  go.textContent = "Add " + items.length + " item" + (items.length > 1 ? "s" : "") +
                   " · " + fmt(items.reduce((s,i) => s + i.kcal*i.qty, 0)) + " kcal";
  go.onclick = () => { items.forEach(addFood); el("parseText").value = ""; pend.hidden = true; };
  pend.appendChild(go);
  pend.hidden = false;
};

el("mAdd").onclick = () => {
  const n = el("mName").value.trim(), k = parseFloat(el("mK").value);
  if(!n || !(k >= 0)){ el("mName").focus(); return; }
  addFood({name:n, unit:"", qty:1, kcal:k,
           p:parseFloat(el("mP").value) || 0,
           c:parseFloat(el("mC").value) || 0,
           f:parseFloat(el("mF").value) || 0});
  ["mName","mK","mP","mC","mF"].forEach(id => el(id).value = "");
};

el("wIn").onchange = e => {
  const k = key(viewDate), v = parseFloat(e.target.value);
  ensure(k).wt = isNaN(v) ? null : v;
  if(!isNaN(v) && k === todayKey()) S.profile.wt = v;
  save(); renderAll();
};

function bindProfile(id, field, cast){
  el(id).onchange = e => {
    const v = cast(e.target.value);
    if(v !== null && v !== undefined && v !== "" && !Number.isNaN(v)){ S.profile[field] = v; save(); renderAll(); }
  };
}
bindProfile("pAge",  "age",   v => clamp(parseInt(v,10) || 25,  13, 90));
bindProfile("pHt",   "ht",    v => clamp(parseInt(v,10) || 175, 120, 230));
bindProfile("pWt",   "wt",    v => clamp(parseFloat(v)  || 72,  30, 250));
bindProfile("pAct",  "act",   v => parseFloat(v));
bindProfile("pGoal", "goal",  v => v);
bindProfile("pSplit","split", v => v);
document.querySelectorAll("#segSex button").forEach(b => {
  b.onclick = () => { S.profile.sex = b.dataset.v; save(); renderAll(); };
});

el("volTableBtn").onclick = () => {
  const t = el("volTable");
  t.hidden = !t.hidden;
  el("volTableBtn").textContent = t.hidden ? "Show as table" : "Hide table";
};

el("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "plate-platform-" + todayKey() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
el("importBtn").onclick = () => el("importFile").click();
el("importFile").onchange = e => {
  const file = e.target.files[0];
  if(!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const o = JSON.parse(fr.result);
      if(!o || !o.profile) throw new Error("not a backup");
      if(!confirm("Replace everything on this device with the backup?")) return;
      S = {v:o.v || 1, profile:{...DEFAULT_PROFILE, ...o.profile}, days:o.days || {},
         plan:o.plan || {}, custom:o.custom || {}, pt:o.pt || 0};
      migrate(o.v || 1);
      save(); renderAll();
    }catch(err){ alert("That file is not a Plate & Platform backup."); }
  };
  fr.readAsText(file);
  e.target.value = "";
};
el("resetBtn").onclick = () => {
  if(!confirm("Clear every logged day? Your profile and targets stay.")) return;
  S.days = {}; save(); renderAll();
};

/* ------------------------- swapping exercises ------------------------- */

let sheet = null;   // {sesKey, dayK, target}  target null = adding

function openSheet(sesKey, dayK, target){
  sheet = {sesKey, dayK, target, scope:"today"};
  el("sheetKicker").textContent = target ? "Swap" : "Add to";
  el("sheetTitle").textContent  = target || SESSIONS[sesKey].name;
  el("sheetRemove").hidden = !target;
  el("sheetRemove").textContent = "Remove " + (target || "") + " from this session";
  el("sheetReset").hidden = !(S.plan && S.plan[sesKey]);
  el("exSearch").value = "";
  el("exSearch").placeholder = "Search " + Object.keys(allExercises()).length + " exercises";
  el("customBox").open = false;
  ["cxName","cxScheme"].forEach(id => el(id).value = "");
  document.querySelectorAll("#scopeSeg button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.scope === "today")));
  const sel = el("cxMuscle");
  sel.innerHTML = MUSCLE_ORDER.map(m => '<option value="' + m + '">' + MUSCLE_LABELS[m] + "</option>").join("");
  drawScopeNote();
  drawOptions();
  el("sheet").hidden = false;
}
function closeSheet(){ sheet = null; el("sheet").hidden = true; }

function drawScopeNote(){
  el("scopeNote").textContent = sheet.scope === "today"
    ? "Changes only " + (key(viewDate) === todayKey() ? "today" : "this day") + ". Your programme stays as it is."
    : "Changes every " + SESSIONS[sheet.sesKey].name + " day from now on. Sets you have already logged are untouched.";
}

function drawOptions(){
  const host = el("exOpts");
  host.textContent = "";
  const q = el("exSearch").value.trim().toLowerCase();
  const cat = allExercises();
  const inUse = new Set(effectiveEx(sheet.sesKey, SESSIONS[sheet.sesKey], sheet.dayK).map(e => e[0]));

  // the movement being replaced decides which group leads
  const lead = sheet.target ? (exInfo(sheet.target).p[0] || null) : null;
  const groups = lead ? [lead].concat(MUSCLE_ORDER.filter(m => m !== lead)) : MUSCLE_ORDER.slice();
  groups.push("other");

  let shown = 0;
  for(const g of groups){
    const names = Object.keys(cat).filter(n => {
      const info = cat[n];
      const primary = info.p[0] || "other";
      if(primary !== g) return false;
      if(n === sheet.target) return false;
      return !q || n.toLowerCase().includes(q);
    }).sort();
    if(!names.length) continue;

    const h = document.createElement("div");
    h.className = "exgrp";
    h.textContent = (MUSCLE_LABELS[g] || "Cardio and recovery") +
      (g === lead ? " — same muscle" : "");
    host.appendChild(h);

    names.forEach(n => {
      const b = document.createElement("button");
      b.className = "exopt" + (inUse.has(n) ? " current" : "");
      b.innerHTML = "<span></span><span class='sch'></span>";
      b.querySelector("span").textContent = n;
      b.querySelector(".sch").textContent = cat[n].d;
      b.onclick = () => applyChoice(n);
      host.appendChild(b);
      shown++;
    });
  }
  if(!shown){
    const none = document.createElement("p");
    none.className = "sheetnote";
    none.style.padding = "12px 4px";
    none.textContent = "Nothing matches that. Add it below and it becomes part of your catalogue.";
    host.appendChild(none);
  }
}

function applyChoice(name){
  const {sesKey, dayK, target, scope} = sheet;
  const ses = SESSIONS[sesKey];
  if(scope === "today"){
    const day = ensure(dayK);
    if(target){ day.swaps = day.swaps || {}; day.swaps[target] = name; }
    else { day.extra = day.extra || []; day.extra.push(name); }
  } else {
    S.plan = S.plan || {};
    const base = (S.plan[sesKey] || ses.ex).map(e => e.slice());
    if(target){
      const i = base.findIndex(e => e[0] === target);
      const entry = [name, exInfo(name).d, ""];
      if(i >= 0) base[i] = entry; else base.push(entry);
    } else {
      base.push([name, exInfo(name).d, ""]);
    }
    S.plan[sesKey] = base;
  }
  openEx = name;
  save(); closeSheet(); renderGym();
}

el("sheetRemove").onclick = () => {
  const {sesKey, dayK, target, scope} = sheet;
  if(!target) return;
  if(scope === "today"){
    const day = ensure(dayK);
    if((day.extra || []).includes(target)) day.extra = day.extra.filter(n => n !== target);
    else { day.swaps = day.swaps || {}; day.swaps[target] = DROPPED; }
  } else {
    S.plan = S.plan || {};
    S.plan[sesKey] = (S.plan[sesKey] || SESSIONS[sesKey].ex).filter(e => e[0] !== target);
  }
  if(openEx === target) openEx = null;
  save(); closeSheet(); renderGym();
};

el("sheetReset").onclick = () => {
  if(!confirm("Put this session back to how it started?")) return;
  if(S.plan) delete S.plan[sheet.sesKey];
  save(); closeSheet(); renderGym();
};

el("cxAdd").onclick = () => {
  const name = el("cxName").value.trim();
  if(!name){ el("cxName").focus(); return; }
  const muscle = el("cxMuscle").value;
  const scheme = el("cxScheme").value.trim() || "3 x 10-12";
  S.custom = S.custom || {};
  S.custom[name] = {p:[muscle], s:[], d:scheme};
  save();
  applyChoice(name);
};

el("exSearch").oninput = () => drawOptions();
el("sheetClose").onclick = closeSheet;
el("sheetBg").onclick = closeSheet;
document.addEventListener("keydown", e => { if(e.key === "Escape" && sheet) closeSheet(); });
document.querySelectorAll("#scopeSeg button").forEach(b => {
  b.onclick = () => {
    sheet.scope = b.dataset.scope;
    document.querySelectorAll("#scopeSeg button").forEach(x =>
      x.setAttribute("aria-pressed", String(x === b)));
    drawScopeNote();
  };
});

/* ------------------------------ sync ui ------------------------------ */

el("syncSave").onclick = () => {
  sync.url = el("syncUrl").value.trim().replace(/\/+$/, "");
  sync.token = el("syncToken").value.trim();
  saveSyncConfig();
  sync.state = sync.url && sync.token ? "idle" : "off";
  takeSnapshot();
  renderSyncBadge();
  if(sync.state !== "off") syncNow("configured");
};
el("syncTest").onclick = syncTest;
el("syncNow").onclick = () => syncNow("manual");
el("syncForget").onclick = () => {
  if(!confirm("Stop syncing? Your log stays on this device.")) return;
  sync.url = ""; sync.token = ""; sync.state = "off";
  saveSyncConfig();
  renderYou();
};

/* ---------------------------- navigation ---------------------------- */

document.querySelectorAll("nav.tabs button").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll("nav.tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    ["today","week","gym","you"].forEach(t => { el("v-" + t).hidden = (t !== b.dataset.tab); });
    window.scrollTo({top:0, behavior:"smooth"});
  };
});
document.querySelectorAll("#gymSeg button").forEach(b => {
  b.onclick = () => { gymSub = b.dataset.sub; liftHover = null; renderGym(); };
});
el("prevday").onclick = () => { viewDate = addDays(viewDate, -1); openEx = null; renderAll(); };
el("nextday").onclick = () => { if(key(viewDate) < todayKey()){ viewDate = addDays(viewDate, 1); openEx = null; renderAll(); } };
document.addEventListener("visibilitychange", () => {
  if(document.hidden) return;
  renderAll();
  syncNow("foreground");     // pick up anything logged on the other device
});
window.addEventListener("online", () => syncNow("online"));

/* -------------------------------- go -------------------------------- */
loadSyncConfig();
load();
takeSnapshot();
renderAll();
syncNow("startup");

/* The service worker is cache-first, which is right on the real domain and
   maddening during local development — an edit would keep serving stale.
   So it only registers off localhost. */
const isLocal = ["localhost","127.0.0.1","::1"].includes(location.hostname) ||
                /^192\.168\.|^10\./.test(location.hostname);
if("serviceWorker" in navigator && location.protocol !== "file:" && !isLocal){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
} else if("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}
