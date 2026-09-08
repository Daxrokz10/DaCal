/* ---------------------------------------------------------------
   data.js — the food library and the training library.
   Everything here is plain data; edit freely, the app picks it up.

   These are Daksh's actual foods at the portions he actually eats,
   not a generic database. Macros are PER SERVING; `g` is what one
   serving weighs, which is what lets "200 g curd" scale correctly.
   `a` is the alias list the text parser matches against.

   Where his own reference sheet gave a range, the value here is the
   midpoint. The wide ones are marked: anything fried, any coconut
   chutney, any restaurant portion, and any sabzi whose oil you did
   not measure can be out by a third in either direction. Consistency
   matters more than accuracy — the same estimate every day still
   tracks the trend correctly.
----------------------------------------------------------------*/

const FOODS = [
  // name                    aliases                                          unit             g    kcal   p     c     f

  /* --- rotis and staples --- */
  ["Roti",                  ["roti","chapati","chapatti","phulka"],           "1 medium",      40,  110,  3,    22,   2],
  ["Thin roti",             ["thin roti","patli roti","patla roti"],          "1 thin",        28,  72,   2,    14,   1.3],
  ["Thepla",                ["thepla","theple"],                              "1 medium",      45,  140,  3,    20,   5],
  ["Pav",                   ["pav","pao","bun"],                              "1 pav",         45,  90,   2.5,  17,   1],
  ["Bread",                 ["bread","toast","slice of bread"],               "1 slice",       30,  70,   2.5,  13,   1],

  /* --- tea, coffee, dairy --- */
  ["Chai",                  ["chai","tea","cutting"],                         "1 cup",         150, 100,  2.5,  12,   4],
  ["Coffee",                ["coffee","normal coffee","doodh coffee"],        "1 cup",         200, 75,   2,    9,    3],
  ["Black coffee",          ["black coffee","watery coffee","coffee no sugar"],"1 cup",        200, 20,   0.5,  2,    0.5],
  ["Chaas",                 ["chaas","chhas","buttermilk","matha"],           "1 glass",       250, 60,   3,    5,    2.5],
  ["Dahi with sugar",       ["dahi","curd","yoghurt","yogurt"],               "1 katori",      150, 150,  5,    18,   5],
  ["Lassi (malai, dry fruit)",["lassi","malai lassi","sweet lassi"],          "1 glass",       300, 375,  10,   45,   16],
  ["Cheese cube",           ["cheese cube","cheese","amul cube"],             "1 cube",        20,  57,   3,    1,    4.7],
  ["Milk",                  ["milk","doodh"],                                 "250 ml",        250, 150,  8,    12,   8],

  /* --- your protein staples --- */
  ["Soya chunks",           ["soya","soya chunks","nutrela","soya nuggets"],  "80 g dry",      80,  282,  41,   27,   1],
  ["Whey (Nitra Isolate)",  ["whey","protein","scoop","shake","isolate"],     "1 scoop",       32,  130,  32,   1,    0.5],
  ["Creatine",              ["creatine","creatin"],                           "1 scoop",       5,   0,    0,    0,    0],
  ["Paneer sabzi",          ["paneer sabzi","paneer","matar paneer","shahi paneer"],"1 katori", 150, 285,  14,   8,    22],
  ["Chole",                 ["chole","chola","chana","chickpeas","chhole"],   "1 katori",      150, 260,  11,   33,   9],
  ["Dal",                   ["dal","daal","lentils","tadka"],                 "1 katori",      150, 150,  9,    20,   4],
  ["Rajma",                 ["rajma","kidney beans"],                         "1 katori",      150, 200,  10,   30,   4],
  ["Chicken breast",        ["chicken","chicken breast"],                     "100 g",         100, 165,  31,   0,    3.6],
  ["Egg",                   ["egg","eggs","anda"],                            "1 whole",       50,  78,   6.3,  0.6,  5.3],

  /* --- carbs --- */
  ["Rice",                  ["rice","chawal","bhaat"],                        "100 g cooked",  100, 130,  2.7,  28,   0.3],
  ["Pulao",                 ["pulao","pulav","fried rice","jeera rice"],      "1 plate",       225, 295,  6,    52,   7],
  ["Poha",                  ["poha"],                                         "1 katori",      150, 215,  4.5,  36,   6],
  ["Sabzi (mixed)",         ["sabzi","subzi","vegetable sabzi","bhaji sabzi"],"1 katori",      150, 150,  3,    15,   8],
  ["Fried aloo",            ["fried aloo","aloo","fried potato","aloo fry"],  "100 g",         100, 250,  3,    30,   13],
  ["Fried kachalu",         ["kachalu","fried kachalu","kachalo"],            "small serving", 80,  140,  2,    20,   6],

  /* --- dosa dinner --- */
  ["Dosa (plain)",          ["dosa","plain dosa","sada dosa"],                "1 medium",      120, 150,  3.5,  26,   3.5],
  ["Masala dosa",           ["masala dosa"],                                  "1 homemade",    200, 240,  5,    38,   8],
  ["Cheese dosa",           ["cheese dosa"],                                  "1 homemade",    180, 215,  6,    30,   8],
  ["Sambar",                ["sambar","sambhar"],                             "1 katori",      150, 80,   4,    11,   2],
  ["Coconut chutney",       ["chutney","coconut chutney","nariyal chutney"],  "1 katori",      60,  115,  2,    5,    10],

  /* --- pav bhaji --- */
  ["Bhaji",                 ["bhaji","pav bhaji bhaji"],                      "1 katori",      200, 275,  5,    30,   15],

  /* --- sandwich --- */
  ["Veg sandwich",          ["sandwich","veg sandwich","vegetable sandwich"], "1 sandwich",    120, 150,  4,    25,   4],

  /* --- eating out --- */
  ["Subway chicken 65 bowl",["subway","chicken 65","rice bowl"],              "1 bowl",        400, 650,  34,   70,   25],
  ["McSpicy burger",        ["mcspicy","mcdonalds","burger"],                 "1 burger",      200, 550,  22,   50,   29],
  ["Cheesy fries (large)",  ["cheesy fries","fries","french fries"],          "large",         150, 500,  8,    55,   27],
  ["Coke float",            ["coke float","float","cold drink","coke","pepsi"],"1 regular",    350, 350,  3,    65,   9],
  ["Mocha latte",           ["mocha","latte","mocha latte","cappuccino"],     "1 regular",     300, 250,  7,    33,   10],

  /* --- the ones that quietly add up --- */
  ["Bhujia / sev",          ["bhujia","sev","namkeen"],                       "1 katori",      40,  200,  5,    18,   12],
  ["Ratlami sev (5 rs)",    ["ratlami","ratlami sev"],                        "1 packet",      25,  125,  3,    12,   7.5],
  ["Balaji moong dal (5 rs)",["moong dal namkeen","balaji","moong dal"],      "1 packet",      25,  125,  5,    13,   6],
  ["Kurkure (5 rs)",        ["kurkure"],                                      "1 packet",      25,  125,  1.5,  14,   7],
  ["Bhel",                  ["bhel","bhelpuri","bhel puri"],                  "1 plate",       150, 325,  7,    45,   13],
  ["Oreo",                  ["oreo"],                                         "1 biscuit",     11,  52,   0.5,  7.5,  2.25],
  ["Hide & Seek",           ["hide and seek","hide seek","biscuit","cookie"], "1 biscuit",     10.5,50,   0.6,  6.5,  2.4],
  ["KitKat stick",          ["kitkat","kit kat"],                             "1 stick",       11,  60,   0.7,  7,    3],
  ["Pulse candy",           ["pulse","candy","pulse candy"],                  "1 candy",       4,   12,   0,    3,    0],
  /* per piece, not per handful: a serving defined as a count would be
     multiplied again by the number in "5 soaked almonds" */
  ["Almonds",               ["almonds","badam"],                              "1 almond",      1.2, 7,    0.26, 0.24, 0.6],

  /* --- basically free --- */
  ["Onion",                 ["onion","pyaz","kanda"],                         "1 medium",      110, 38,   1,    9,    0.1],
  ["Boiled beetroot",       ["beetroot","chukandar"],                         "1 serving",     100, 60,   2,    12,   0.2],
  ["Salad",                 ["salad","kachumber","green salad"],              "1 bowl",        150, 60,   2,    9,    2]
].map(a => ({name:a[0], alias:a[1], unit:a[2], g:a[3], kcal:a[4], p:a[5], c:a[6], f:a[7]}));

/* The chips on the Today screen — what you actually reach for, in
   roughly the order of a day. Everything else is one line of typing
   away in the parser box. */
const QUICK = ["Roti","Thin roti","Chai","Coffee","Soya chunks","Whey (Nitra Isolate)",
  "Cheese cube","Creatine","Sabzi (mixed)","Paneer sabzi","Chole","Dal","Rice","Poha",
  "Dahi with sugar","Chaas","Onion","Salad","Almonds","Bhujia / sev","Pulse candy"];

/* One tap for the combinations you eat as a unit. The soya stack is the
   whole reason your protein target is reachable on a 1,800 kcal day. */
const COMBOS = [
  {name:"Soya + cheese",       note:"your standard protein hit",
   items:[["Soya chunks",1], ["Cheese cube",1]]},
  {name:"Soya + cheese + whey", note:"the big one — 76 g protein",
   items:[["Soya chunks",1], ["Cheese cube",1], ["Whey (Nitra Isolate)",1]]},
  {name:"Default day",          note:"the whole day, as planned",
   items:[["Roti",6], ["Chai",1], ["Coffee",1], ["Soya chunks",1],
          ["Sabzi (mixed)",1], ["Paneer sabzi",1], ["Whey (Nitra Isolate)",1],
          ["Onion",1], ["Chaas",1], ["Salad",1]]}
];

/* --------------------------- training --------------------------- */

const SESSIONS = {
  push:  {name:"Push", focus:"Chest, shoulders, triceps", ex:[
    ["Barbell bench press","4 x 5-8","the money lift — add reps before weight"],
    ["Incline dumbbell press","3 x 8-10","pause a beat on the chest"],
    ["Seated shoulder press","3 x 8-10",""],
    ["Cable fly","3 x 12-15","stretch under load"],
    ["Lateral raise","3 x 15","light, no swinging"],
    ["Triceps pushdown","3 x 10-12",""]]},
  pull:  {name:"Pull", focus:"Back, rear delts, biceps", ex:[
    ["Pull-up or lat pulldown","4 x 6-10","add weight once you hit 10"],
    ["Barbell row","4 x 8-10","torso stays at 45°"],
    ["Seated cable row","3 x 10-12",""],
    ["Face pull","3 x 15","fixes the desk posture"],
    ["Barbell curl","3 x 8-12",""],
    ["Hammer curl","2 x 12",""]]},
  legs:  {name:"Legs", focus:"Quads, hamstrings, calves, core", ex:[
    ["Back squat","4 x 5-8","depth before load"],
    ["Romanian deadlift","3 x 8-10","hinge, don't squat it"],
    ["Leg press","3 x 10-12",""],
    ["Leg curl","3 x 12",""],
    ["Standing calf raise","4 x 12-15","two-second pause at the bottom"],
    ["Hanging leg raise","3 x 12",""]]},
  upper: {name:"Upper", focus:"Chest, back, shoulders, arms", ex:[
    ["Barbell bench press","4 x 5-8","the money lift — add reps before weight"],
    ["Barbell row","4 x 8-10","torso stays at 45°"],
    ["Incline dumbbell press","3 x 10",""],
    ["Lat pulldown","3 x 10-12",""],
    ["Lateral raise","3 x 15","light, no swinging"],
    ["Barbell curl","3 x 10",""],
    ["Triceps pushdown","3 x 10",""]]},
  lower: {name:"Lower", focus:"Quads, hamstrings, glutes, core", ex:[
    ["Back squat","4 x 5-8","depth before load"],
    ["Romanian deadlift","3 x 8-10","hinge, don't squat it"],
    ["Leg press","3 x 12",""],
    ["Leg curl","3 x 12",""],
    ["Standing calf raise","4 x 15",""],
    ["Plank","3 x 45 s",""]]},
  fbA:   {name:"Full body A", focus:"Squat pattern led", ex:[
    ["Back squat","4 x 6-8","depth before load"],
    ["Barbell bench press","4 x 6-8",""],
    ["Barbell row","3 x 8-10",""],
    ["Shoulder press","3 x 10",""],
    ["Leg curl","3 x 12",""],
    ["Hanging leg raise","3 x 12",""]]},
  fbB:   {name:"Full body B", focus:"Hinge pattern led", ex:[
    ["Deadlift","3 x 5","stop the set when the back rounds"],
    ["Incline dumbbell press","4 x 8-10",""],
    ["Lat pulldown","4 x 10",""],
    ["Walking lunge","3 x 12 each",""],
    ["Lateral raise","3 x 15",""],
    ["Barbell curl","3 x 10",""]]},
  fbC:   {name:"Full body C", focus:"Volume and arms", ex:[
    ["Front squat or leg press","4 x 8-10",""],
    ["Weighted dip or press","4 x 8-10",""],
    ["Seated cable row","4 x 10-12",""],
    ["Romanian deadlift","3 x 10",""],
    ["Face pull","3 x 15",""],
    ["Hammer curl + pushdown","3 x 12 each","superset these"]]},
  chest: {name:"Chest", focus:"Chest and triceps", ex:[
    ["Barbell bench press","4 x 5-8","the money lift"],
    ["Incline dumbbell press","4 x 8-10",""],
    ["Cable fly","3 x 12-15","stretch under load"],
    ["Weighted dip","3 x 8-10",""],
    ["Triceps pushdown","3 x 12",""],
    ["Overhead extension","3 x 12",""]]},
  back:  {name:"Back", focus:"Back and biceps", ex:[
    ["Deadlift","3 x 5","stop the set when the back rounds"],
    ["Pull-up or lat pulldown","4 x 8-10",""],
    ["Barbell row","4 x 8-10",""],
    ["Seated cable row","3 x 12",""],
    ["Barbell curl","3 x 10",""],
    ["Hammer curl","3 x 12",""]]},
  sho:   {name:"Shoulders", focus:"Delts and core", ex:[
    ["Overhead press","4 x 5-8","glutes tight, ribs down"],
    ["Seated dumbbell press","3 x 10",""],
    ["Lateral raise","4 x 15","the one that builds width"],
    ["Rear delt fly","3 x 15",""],
    ["Face pull","3 x 15",""],
    ["Cable crunch","3 x 15",""]]},
  arms:  {name:"Arms", focus:"Biceps, triceps, forearms", ex:[
    ["Close-grip bench","4 x 8-10",""],
    ["Barbell curl","4 x 8-10",""],
    ["Skull crusher","3 x 10-12",""],
    ["Incline dumbbell curl","3 x 10-12","full stretch at the bottom"],
    ["Rope pushdown","3 x 15",""],
    ["Hammer curl","3 x 15",""]]},
  cond:  {name:"Conditioning", focus:"Zone 2 cardio and core", ex:[
    ["Incline walk or cycle","30-40 min","conversational pace, nose breathing"],
    ["Hanging leg raise","3 x 12",""],
    ["Plank","3 x 45 s",""],
    ["Cable crunch","3 x 15",""]]},
  rest:  {name:"Rest day", focus:"Recover — this is when you actually grow", ex:[
    ["Walk","20-30 min","keeps the step count up without taxing recovery"],
    ["Stretch or mobility","10 min","hips and thoracic spine"]]},

  /* ---- Daksh's own split ----------------------------------------
     Mon back+biceps, Tue chest+triceps, Wed legs, Thu shoulders +
     forearms + abs, Fri heavy back+biceps, Sat dumbbell chest+triceps,
     Sun rest. Cardio is the same 10-minute incline walk on the four
     upper-body days. */
  mBack: {name:"Back & Biceps", focus:"Lats, upper back, biceps", cardio:true, ex:[
    ["Assisted pull-up","4 x 6-10","log the assist weight — lower is stronger"],
    ["Lat pulldown","3 x 10-12",""],
    ["T-bar row","3 x 8-10","chest into the pad, drive the elbows back"],
    ["Barbell curl","3 x 8-12",""],
    ["Hammer curl","3 x 10-12",""],
    ["Incline walk","10 min","incline 9-12, speed 4-5"]]},

  mChest: {name:"Chest & Triceps", focus:"Chest, triceps", cardio:true, ex:[
    ["Barbell bench press","4 x 5-8","the money lift — add reps before weight"],
    ["Incline chest press machine","3 x 8-12","the upper-chest machine"],
    ["Cable fly","3 x 12-15","stretch under load"],
    ["Triceps pushdown","3 x 10-12",""],
    ["Overhead extension","3 x 12-15","keep the elbows still"],
    ["Incline walk","10 min","incline 9-12, speed 4-5"]]},

  mLegs: {name:"Legs", focus:"Quads, hamstrings, glutes, calves", ex:[
    ["Back squat","4 x 5-8","depth before load"],
    ["Leg press","3 x 10-12",""],
    ["Leg extension","3 x 12-15","the out half"],
    ["Leg curl","3 x 12-15","the in half"],
    ["Standing calf raise","4 x 12-15","two-second pause at the bottom"]]},

  mShoulders: {name:"Shoulders & Core", focus:"Delts, forearms, abs", ex:[
    ["Overhead press","4 x 6-8","glutes tight, ribs down"],
    ["Lateral raise","4 x 12-15","the one that builds width"],
    ["Rear delt fly","3 x 15",""],
    ["Wrist curl","3 x 15",""],
    ["Reverse wrist curl","3 x 15",""],
    ["Hanging leg raise","3 x 12",""],
    ["Cable crunch","3 x 15",""]]},

  mBackHeavy: {name:"Back & Biceps", focus:"Heavy day — deadlift led", cardio:true, ex:[
    ["Deadlift","3 x 5","stop the set when the back rounds"],
    ["Barbell row","4 x 8-10","torso stays at 45°"],
    ["Chest-supported row","3 x 10-12","the angled machine you lean into"],
    ["Incline dumbbell curl","3 x 10-12","full stretch at the bottom"],
    ["Hammer curl","3 x 12",""],
    ["Incline walk","10 min","incline 9-12, speed 4-5"]]},

  mChestDb: {name:"Chest & Triceps", focus:"Dumbbell day", cardio:true, ex:[
    ["Flat dumbbell press","4 x 8-10","controlled, no bouncing"],
    ["Incline dumbbell press","4 x 8-10",""],
    ["Cable fly","3 x 12-15",""],
    ["Close-grip bench","3 x 8-10",""],
    ["Rope pushdown","3 x 12-15",""],
    ["Incline walk","10 min","incline 9-12, speed 4-5"]]}
};

const SPLITS = {
  mine:{label:"My split — 6 days",            days:["mBack","mChest","mLegs","mShoulders","mBackHeavy","mChestDb","rest"]},
  ul:  {label:"Upper / Lower — 4 days",       days:["upper","lower","rest","upper","lower","cond","rest"]},
  ppl: {label:"Push / Pull / Legs — 6 days",  days:["push","pull","legs","push","pull","legs","rest"]},
  fb:  {label:"Full body — 3 days",           days:["fbA","rest","fbB","rest","fbC","cond","rest"]},
  bro: {label:"Body part split — 5 days",     days:["chest","back","sho","arms","legs","cond","rest"]}
};

const DAYNAMES  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAYSHORT  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ------------------------- muscles worked -------------------------
   Every exercise above maps to the muscles it trains. `p` counts as a
   full hard set toward weekly volume, `s` as half a set — which is how
   most volume landmarks treat indirect work.
-------------------------------------------------------------------*/

const MUSCLE_LABELS = {
  chest:"Chest", back:"Back", shoulders:"Shoulders", biceps:"Biceps",
  triceps:"Triceps", forearms:"Forearms", core:"Core", quads:"Quads",
  hams:"Hamstrings", glutes:"Glutes", calves:"Calves"
};

/* 10–20 hard sets per muscle per week is the range most of the training
   literature converges on. Below 10 you are maintaining; above 20 you are
   usually just accumulating fatigue. */
const VOLUME_MIN = 10, VOLUME_MAX = 20;

/* The exercise catalogue. For each movement: `p` primary muscles (a full
   hard set each), `s` secondary (half a set), `d` the default set scheme
   used when it is swapped into a session. The swap picker is built from
   this list, grouped by primary muscle — add a line here and it shows up
   in the app on the next reload. */
const MUSCLES = {
  /* chest */
  "Barbell bench press":     {p:["chest"], s:["triceps","shoulders"], d:"4 x 5-8"},
  "Incline barbell press":   {p:["chest"], s:["shoulders","triceps"], d:"4 x 6-8"},
  "Flat dumbbell press":     {p:["chest"], s:["triceps","shoulders"], d:"4 x 8-10"},
  "Incline dumbbell press":  {p:["chest"], s:["shoulders","triceps"], d:"4 x 8-10"},
  "Decline bench press":     {p:["chest"], s:["triceps"],             d:"3 x 8-10"},
  "Incline chest press machine":{p:["chest"], s:["shoulders","triceps"], d:"3 x 8-12"},
  "Chest press machine":     {p:["chest"], s:["triceps"],             d:"3 x 10-12"},
  "Cable fly":               {p:["chest"], s:[],                      d:"3 x 12-15"},
  "Pec deck":                {p:["chest"], s:[],                      d:"3 x 12-15"},
  "Dumbbell fly":            {p:["chest"], s:[],                      d:"3 x 12-15"},
  "Weighted dip":            {p:["chest"], s:["triceps"],             d:"3 x 8-10"},
  "Weighted dip or press":   {p:["chest"], s:["triceps","shoulders"], d:"4 x 8-10"},
  "Push-up":                 {p:["chest"], s:["triceps","core"],      d:"3 x 15-20"},

  /* back */
  "Deadlift":                {p:["back","hams"], s:["glutes","core","forearms"], d:"3 x 5"},
  "Rack pull":               {p:["back"], s:["glutes","forearms"],    d:"3 x 5-8"},
  "Pull-up":                 {p:["back"], s:["biceps","forearms"],    d:"4 x 6-10"},
  "Assisted pull-up":        {p:["back"], s:["biceps","forearms"],    d:"4 x 6-10"},
  "Chin-up":                 {p:["back","biceps"], s:["forearms"],    d:"3 x 6-10"},
  "Pull-up or lat pulldown": {p:["back"], s:["biceps","forearms"],    d:"4 x 6-10"},
  "Lat pulldown":            {p:["back"], s:["biceps","forearms"],    d:"3 x 10-12"},
  "Close-grip pulldown":     {p:["back"], s:["biceps"],               d:"3 x 10-12"},
  "Barbell row":             {p:["back"], s:["biceps","forearms"],    d:"4 x 8-10"},
  "T-bar row":               {p:["back"], s:["biceps","forearms"],    d:"3 x 8-10"},
  "Dumbbell row":            {p:["back"], s:["biceps","forearms"],    d:"3 x 8-12"},
  "Seated cable row":        {p:["back"], s:["biceps"],               d:"3 x 10-12"},
  "Chest-supported row":     {p:["back"], s:["biceps"],               d:"3 x 10-12"},
  "Machine row":             {p:["back"], s:["biceps"],               d:"3 x 10-12"},
  "Straight-arm pulldown":   {p:["back"], s:[],                       d:"3 x 12-15"},
  "Shrug":                   {p:["back"], s:["forearms"],             d:"3 x 12-15"},

  /* shoulders */
  "Overhead press":          {p:["shoulders"], s:["triceps","core"],  d:"4 x 6-8"},
  "Seated shoulder press":   {p:["shoulders"], s:["triceps"],         d:"3 x 8-10"},
  "Seated dumbbell press":   {p:["shoulders"], s:["triceps"],         d:"3 x 10"},
  "Shoulder press":          {p:["shoulders"], s:["triceps"],         d:"3 x 10"},
  "Arnold press":            {p:["shoulders"], s:["triceps"],         d:"3 x 10"},
  "Lateral raise":           {p:["shoulders"], s:[],                  d:"4 x 12-15"},
  "Cable lateral raise":     {p:["shoulders"], s:[],                  d:"3 x 15"},
  "Front raise":             {p:["shoulders"], s:[],                  d:"3 x 12-15"},
  "Rear delt fly":           {p:["shoulders"], s:["back"],            d:"3 x 15"},
  "Face pull":               {p:["shoulders"], s:["back"],            d:"3 x 15"},
  "Upright row":             {p:["shoulders"], s:["back","biceps"],   d:"3 x 12"},

  /* biceps */
  "Barbell curl":            {p:["biceps"], s:["forearms"],           d:"3 x 8-12"},
  "Dumbbell curl":           {p:["biceps"], s:["forearms"],           d:"3 x 10-12"},
  "Incline dumbbell curl":   {p:["biceps"], s:[],                     d:"3 x 10-12"},
  "Hammer curl":             {p:["biceps"], s:["forearms"],           d:"3 x 10-12"},
  "Preacher curl":           {p:["biceps"], s:[],                     d:"3 x 10-12"},
  "Cable curl":              {p:["biceps"], s:[],                     d:"3 x 12-15"},
  "Concentration curl":      {p:["biceps"], s:[],                     d:"3 x 12"},

  /* triceps */
  "Close-grip bench":        {p:["triceps"], s:["chest"],             d:"4 x 8-10"},
  "Triceps pushdown":        {p:["triceps"], s:[],                    d:"3 x 10-12"},
  "Rope pushdown":           {p:["triceps"], s:[],                    d:"3 x 12-15"},
  "Skull crusher":           {p:["triceps"], s:[],                    d:"3 x 10-12"},
  "Overhead extension":      {p:["triceps"], s:[],                    d:"3 x 12-15"},
  "Triceps kickback":        {p:["triceps"], s:[],                    d:"3 x 12-15"},
  "Dip":                     {p:["triceps"], s:["chest"],             d:"3 x 8-12"},
  "Hammer curl + pushdown":  {p:["biceps","triceps"], s:[],           d:"3 x 12"},

  /* forearms */
  "Wrist curl":              {p:["forearms"], s:[],                   d:"3 x 15"},
  "Reverse wrist curl":      {p:["forearms"], s:[],                   d:"3 x 15"},
  "Reverse curl":            {p:["forearms","biceps"], s:[],          d:"3 x 12-15"},
  "Farmer carry":            {p:["forearms"], s:["core"],             d:"3 x 40 s"},

  /* quads */
  "Back squat":              {p:["quads"], s:["glutes","core"],       d:"4 x 5-8"},
  "Front squat":             {p:["quads"], s:["core","glutes"],       d:"4 x 6-8"},
  "Front squat or leg press":{p:["quads"], s:["core","glutes"],       d:"4 x 8-10"},
  "Hack squat":              {p:["quads"], s:["glutes"],              d:"3 x 8-12"},
  "Goblet squat":            {p:["quads"], s:["glutes","core"],       d:"3 x 12"},
  "Leg press":               {p:["quads"], s:["glutes"],              d:"3 x 10-12"},
  "Leg extension":           {p:["quads"], s:[],                      d:"3 x 12-15"},
  "Bulgarian split squat":   {p:["quads"], s:["glutes"],              d:"3 x 10"},
  "Walking lunge":           {p:["quads"], s:["glutes"],              d:"3 x 12 each"},
  "Hip adduction machine":   {p:["quads"], s:[],                      d:"3 x 15"},

  /* hamstrings and glutes */
  "Romanian deadlift":       {p:["hams"], s:["glutes","back"],        d:"3 x 8-10"},
  "Leg curl":                {p:["hams"], s:[],                       d:"3 x 12-15"},
  "Seated leg curl":         {p:["hams"], s:[],                       d:"3 x 12-15"},
  "Good morning":            {p:["hams"], s:["glutes","back"],        d:"3 x 10"},
  "Hip thrust":              {p:["glutes"], s:["hams"],               d:"3 x 10-12"},
  "Hip abduction machine":   {p:["glutes"], s:[],                     d:"3 x 15"},

  /* calves */
  "Standing calf raise":     {p:["calves"], s:[],                     d:"4 x 12-15"},
  "Seated calf raise":       {p:["calves"], s:[],                     d:"3 x 15"},
  "Calf press":              {p:["calves"], s:[],                     d:"3 x 15"},

  /* core */
  "Hanging leg raise":       {p:["core"], s:[],                       d:"3 x 12"},
  "Cable crunch":            {p:["core"], s:[],                       d:"3 x 15"},
  "Plank":                   {p:["core"], s:[],                       d:"3 x 45 s"},
  "Ab wheel":                {p:["core"], s:[],                       d:"3 x 10"},
  "Russian twist":           {p:["core"], s:[],                       d:"3 x 20"},
  "Crunch":                  {p:["core"], s:[],                       d:"3 x 20"},

  /* cardio and recovery — no muscle credit, logged in minutes */
  "Incline walk":            {p:[], s:[], d:"10 min"},
  "Incline walk or cycle":   {p:[], s:[], d:"30-40 min"},
  "Cycling":                 {p:[], s:[], d:"20 min"},
  "Stair climber":           {p:[], s:[], d:"15 min"},
  "Rowing machine":          {p:[], s:[], d:"15 min"},
  "Walk":                    {p:[], s:[], d:"20-30 min"},
  "Stretch or mobility":     {p:[], s:[], d:"10 min"}
};

/* The order the swap picker groups movements in. */
const MUSCLE_ORDER = ["chest","back","shoulders","biceps","triceps","forearms",
                      "quads","hams","glutes","calves","core"];

/* Kept off the strength curves. Assisted pull-ups belong here because the
   number you log is the ASSIST: getting stronger makes it fall, which would
   draw a line sloping the wrong way. */
const UNLOADED = new Set(["Plank","Walk","Stretch or mobility","Incline walk or cycle",
  "Incline walk","Cycling","Stair climber","Rowing machine","Hanging leg raise",
  "Assisted pull-up","Push-up","Crunch","Russian twist","Ab wheel","Farmer carry"]);

/* Logged in minutes, not weight × reps. */
const TIMED = new Set(["Incline walk","Incline walk or cycle","Cycling","Stair climber",
  "Rowing machine","Plank","Walk","Stretch or mobility"]);

/* Logged as the assistance used — less is better. */
const ASSISTED = new Set(["Assisted pull-up"]);
