# Plate & Platform

A calorie, macro and training tracker built around a **weekly** budget, so one
big dinner is something you spend on purpose rather than a week written off.

No build step and no framework. The app is static files; a small sync server
keeps your phone and laptop in step. It installs to a phone home screen and
works with no signal.

- `public/` — the app. Deployed to Cloudflare Pages on every push.
- `server/` — the sync API. Runs on the Ubuntu box behind a Cloudflare Tunnel.

**Deployment, sync behaviour and backups: [DEPLOY.md](DEPLOY.md).**

## Run it locally

```
cd DaCal
python serve.py            # http://localhost:5173  (serves public/)
```

To run the sync server too:

```
cd server
PLATE_TOKEN=a-long-test-secret PLATE_ORIGINS=http://localhost:5173 node server.js
```

The server prints your LAN address too, so you can open the same page on your
phone over wifi and try it where you will actually use it. Any static server
works — `npx serve`, `php -S`, whatever you have.

## Put it on your domain

See **[DEPLOY.md](DEPLOY.md)** — Cloudflare Pages for the site with deploy-on-push,
the sync server on the Ubuntu laptop through your existing tunnel, and how the
backups are layered.

## Install on your phone

Open the site in the phone browser, then:

- **Android / Chrome** — menu → *Add to Home screen*
- **iPhone / Safari** — share button → *Add to Home Screen*

It then opens fullscreen with no browser chrome, like an app.

## The four screens

| Screen | What it is for |
|---|---|
| **Today** | Calorie scoreboard, macro meters, food logging, morning weight |
| **Week** | The calorie bank: budget, what is left, what you can eat per remaining day |
| **Gym** | Two tabs — *Session* (today's work, per-set logging) and *Progress* (the charts) |
| **You** | Your stats, the calculated targets, backup and restore |

## The training split

`SPLITS.mine` in `data.js` is the default and mirrors what you actually do:

| Day | Session |
|---|---|
| Mon | Back & Biceps — assisted pull-up, lat pulldown, T-bar row, barbell curl, hammer curl, walk |
| Tue | Chest & Triceps — bench, incline machine, cable fly, pushdown, overhead extension, walk |
| Wed | Legs — squat, leg press, leg extension, leg curl, calf raise |
| Thu | Shoulders & Core — OHP, lateral raise, rear delt fly, wrist curls both ways, leg raise, cable crunch |
| Fri | Back & Biceps (heavy) — deadlift, barbell row, chest-supported row, incline curl, hammer curl, walk |
| Sat | Chest & Triceps (dumbbell) — flat DB press, incline DB press, fly, close-grip bench, rope pushdown, walk |
| Sun | Rest |

The four upper-body days carry the same 10-minute incline walk (incline 9–12,
speed 4–5), which is worth +100 kcal on the session's burn estimate.

Three movement types are handled specially:

- **Timed work** (`TIMED` in `data.js`) — the walk and planks take minutes,
  not weight × reps, and are excluded from tonnage and set counts.
- **Assisted pull-ups** (`ASSISTED`) — you log the *assist*, so the field is
  labelled "assist kg" and sets read as "−25 × 8". They are kept off the
  strength curves on purpose: getting stronger lowers the number, which would
  draw a line sloping the wrong way.
- **Forearms** are a tracked muscle group, fed by the wrist curls directly and
  by every row, pulldown and deadlift as secondary work.

## Swapping exercises

The **⇄** button on any exercise opens the picker. It leads with movements
for the same muscle, marks the ones already in the session, and searches all
91 in the catalogue. Two scopes, chosen at the top of the sheet:

- **Just today** — the machine is taken, or you fancy something else. Stored
  on the day, your programme untouched.
- **Change my programme** — replaces it in that session from now on, saved as
  an override in `S.plan`. *Reset this session to default* undoes it. Note that
  each weekday is its own session, so editing Tuesday's chest day leaves
  Saturday's alone even though both are called Chest & Triceps.

A programme edit changes how past days render too, since the plan is not
stored per date. Sets you actually logged are never hidden by that: anything
with logged work appears in the list regardless of whether the current
programme still contains it.

**+ Add an exercise** at the bottom of the session adds one rather than
replacing, with the same two scopes, and the picker's *Add one that isn't
listed* saves a movement of your own (name, muscle, set scheme) into your
catalogue permanently — for the machines only your gym has.

Sets are logged against the exercise *name*, so swapping never disturbs
either lift's history: swap out bench for a month and its strength line is
waiting exactly where you left it when you swap back.

## Logging your training

On **Gym → Session**, tap any exercise to open it. It shows what you did
last time for that lift, then takes weight and reps for each working set.
The inputs pre-fill with your last set, so a straight-across session is
three taps per set. Tap a logged set to delete it; a set that beats your
best estimated 1RM is outlined as a PR.

That per-set data drives **Gym → Progress**:

- **Strength** — estimated 1RM per session for any lift you have logged,
  as a line you can tap through point by point. Epley: weight × (1 + reps ÷ 30),
  which puts a set of 8 and a set of 3 on one scale.
- **Weekly volume** — hard sets per muscle this week against the 10–20 set
  range. Primary muscles score a full set, secondary ones half. Each row is
  labelled *Under / In range / Over*, so the status never rests on colour alone.
- **What you trained** — front and back figures shaded by this week's set
  count. Tap a muscle for its number.

Which muscles an exercise trains is defined in `MUSCLES` in `data.js`, and
`VOLUME_MIN` / `VOLUME_MAX` set the range the bars are judged against.

## Logging food

Three ways, fastest first:

1. **Type the meal** — "2 rotis, katori of rajma, 200g curd and a chai". The
   parser matches each phrase against the food library, handles counts
   ("3 eggs"), weights ("200g curd", "250ml milk") and word numbers
   ("half a pizza slice"), then shows you what it read before anything is
   added. Runs offline; there is no API call.
2. **Quick-add chips** — one tap for the twenty-odd things you eat most.
3. **Manual** — name and macros, for anything the library does not know.

## The numbers

- **BMR** — Mifflin-St Jeor.
- **TDEE** — BMR × your activity multiplier (1.2 to 1.725).
- **Target** — TDEE minus 500 (steady cut), 250 (gentle), 0, or plus 300
  (lean gain), floored so it can never drop somewhere unsafe.
- **Protein** — 2.0 g/kg while losing, 1.8 g/kg while gaining.
- **Fat** — 0.7 g/kg on a cut, 0.85 otherwise, with a floor.
- **Carbs** — whatever calories are left.
- **Weekly budget** — daily target × 7. This is the number that decides
  whether you lose fat; no single day does.

These are a starting estimate. After two weeks, trust your weight trend over
the formula and move the target by 150–200 kcal.

## Editing the food library

`data.js` — one line per food:

```js
["Roti", ["roti","chapati","phulka"], "1 roti", 40, 110, 3, 22, 2]
//  name    aliases the parser matches   unit    g  kcal  P   C  F
```

Macros are per serving. `g` is what one serving weighs, which is what lets
"200 g curd" scale correctly. Add a food and both the parser and the search
pick it up on reload; add its name to `QUICK` to give it a chip.

`SESSIONS` and `SPLITS` in the same file define the training programmes; add
an exercise to a session and give it a `MUSCLES` entry so it counts toward
volume.

## Colour

The data colours come from Olympic plate coding — 25 kg red is protein,
15 kg yellow is carbs, 10 kg green is fat, 20 kg blue is the interface.
Both the dark and light sets are checked for lightness band, chroma floor,
colour-vision separation and contrast against their own surface; the
red/yellow pair sits in the floor band, which is why every meter also
carries a text label. If you re-colour anything in `:root`, re-run that
check rather than eyeballing it.

## Files

```
public/       the app — this is what Cloudflare Pages publishes
  index.html    markup for all four screens
  styles.css    design tokens and layout, dark and light
  data.js       food library, sessions, splits, exercise catalogue
  app.js        state, maths, meal parser, set logging, charts, rendering
  sync.js       offline-first sync against your own server
  sw.js         service worker — offline cache
  manifest.webmanifest, icon.svg, icon-maskable.svg
server/       the sync API
  server.js     zero-dependency HTTP server, JSON storage, day-wise merge
  setup.sh      idempotent Ubuntu installer
  update.sh     pull, restart, health-check, roll back on failure
  AGENT.md      the same install written as a runbook for an AI agent
  plate-sync.service, cloudflared-config.example.yml, backup.sh, .env.example
serve.py      local dev server
DEPLOY.md     the deployment runbook
```
