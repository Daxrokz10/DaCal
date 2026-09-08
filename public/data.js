/* ---------------------------------------------------------------
   data.js — the food library and the training library.
   Everything here is plain data; edit freely, the app picks it up.
   Macros are PER SERVING. `g` is the weight of one serving in grams,
   which is what lets "200 g curd" scale correctly.
   `a` is the alias list the text parser matches against.
----------------------------------------------------------------*/

const FOODS = [
  // name              aliases                                   unit          g     kcal   p     c     f
  ["Roti",            ["roti","chapati","chapatti","phulka"],    "1 roti",      40,   110,  3,    22,   2],
  ["Paratha",         ["paratha","parantha"],                    "1 with ghee", 90,   260,  6,    36,   10],
  ["Rice",            ["rice","chawal","bhaat"],                 "1 katori",    150,  200,  4,    44,   0.5],
  ["Jeera rice",      ["jeera rice","fried rice"],               "1 katori",    150,  280,  5,    45,   9],
  ["Biryani",         ["biryani","biriyani"],                    "1 plate",     300,  550,  22,   65,   22],
  ["Dal",             ["dal","daal","lentils","tadka"],          "1 katori",    150,  150,  9,    20,   4],
  ["Rajma",           ["rajma","kidney beans"],                  "1 katori",    150,  200,  10,   30,   4],
  ["Chole",           ["chole","chana","chickpeas","chhole"],    "1 katori",    150,  210,  10,   31,   5],
  ["Mixed sabzi",     ["sabzi","subzi","vegetables","veg"],      "1 katori",    150,  120,  3,    12,   6],
  ["Aloo sabzi",      ["aloo","potato sabzi","aloo sabzi"],      "1 katori",    150,  180,  3,    26,   7],
  ["Palak paneer",    ["palak paneer","saag paneer"],            "1 katori",    150,  280,  13,   9,    21],
  ["Paneer",          ["paneer","cottage cheese"],               "100 g",       100,  265,  18,   3,    21],
  ["Tofu",            ["tofu"],                                  "100 g",       100,  144,  16,   3,    8],
  ["Chicken breast",  ["chicken","chicken breast"],              "100 g",       100,  165,  31,   0,    3.6],
  ["Chicken curry",   ["chicken curry","butter chicken"],        "1 katori",    150,  300,  22,   8,    20],
  ["Fish",            ["fish","rohu","salmon","tilapia"],        "100 g",       100,  180,  22,   0,    10],
  ["Mutton curry",    ["mutton","lamb","gosht"],                 "1 katori",    150,  330,  22,   6,    24],
  ["Egg",             ["egg","eggs","anda"],                     "1 whole",     50,   78,   6.3,  0.6,  5.3],
  ["Egg whites",      ["egg white","egg whites","whites"],       "3 whites",    100,  51,   10.8, 0.6,  0],
  ["Omelette",        ["omelette","omelet","bhurji"],            "2 eggs",      130,  220,  13,   2,    17],
  ["Whey protein",    ["whey","protein shake","scoop","shake"],  "1 scoop 30 g",30,   120,  24,   2,    1.5],
  ["Soya chunks",     ["soya","soya chunks","nutrela"],          "50 g dry",    50,   172,  26,   17,   0.5],
  ["Curd",            ["curd","dahi","yoghurt","yogurt"],        "100 g",       100,  60,   3.5,  4.7,  3.3],
  ["Greek yoghurt",   ["greek yoghurt","greek yogurt","hung curd"],"100 g",     100,  97,   9,    4,    5],
  ["Milk",            ["milk","doodh"],                          "250 ml full", 250,  150,  8,    12,   8],
  ["Toned milk",      ["toned milk","skim milk","low fat milk"], "250 ml",      250,  110,  8,    12,   3.5],
  ["Buttermilk",      ["buttermilk","chaas","lassi salted"],     "1 glass",     250,  60,   3,    5,    2.5],
  ["Cheese slice",    ["cheese","cheese slice"],                 "1 slice",     20,   70,   4,    1,    5.5],
  ["Oats",            ["oats","oatmeal","porridge"],             "50 g dry",    50,   190,  6.5,  33,   3.5],
  ["Poha",            ["poha"],                                  "1 plate",     200,  250,  5,    45,   6],
  ["Upma",            ["upma"],                                  "1 plate",     200,  250,  6,    40,   8],
  ["Idli",            ["idli","idly"],                           "2 pieces",    100,  116,  4,    24,   0.8],
  ["Dosa",            ["dosa","dose"],                           "1 plain",     120,  170,  4,    30,   4],
  ["Masala dosa",     ["masala dosa"],                           "1 dosa",      200,  330,  6,    50,   12],
  ["Vada",            ["vada","medu vada"],                      "1 piece",     50,   150,  3,    17,   8],
  ["Bread",           ["bread","toast","slice of bread"],        "1 slice",     30,   70,   2.5,  13,   1],
  ["Brown bread",     ["brown bread","whole wheat bread"],       "1 slice",     30,   75,   3.5,  12,   1.2],
  ["Banana",          ["banana","kela"],                         "medium",      120,  105,  1.3,  27,   0.4],
  ["Apple",           ["apple","seb"],                           "medium",      180,  95,   0.5,  25,   0.3],
  ["Orange",          ["orange","mosambi"],                      "medium",      150,  62,   1.2,  15,   0.2],
  ["Mango",           ["mango","aam"],                           "medium",      200,  150,  1.4,  38,   0.6],
  ["Grapes",          ["grapes"],                                "100 g",       100,  69,   0.7,  18,   0.2],
  ["Dates",           ["dates","khajur"],                        "2 pieces",    24,   66,   0.4,  18,   0],
  ["Peanut butter",   ["peanut butter","pb"],                    "1 tbsp",      16,   95,   4,    3.5,  8],
  ["Peanuts",         ["peanuts","moongphali"],                  "30 g",        30,   170,  7.6,  4.8,  14],
  ["Almonds",         ["almonds","badam"],                       "10 nuts",     12,   70,   2.5,  2.5,  6],
  ["Walnuts",         ["walnuts","akhrot"],                      "4 halves",    12,   78,   1.8,  1.6, 7.8],
  ["Ghee",            ["ghee"],                                  "1 tsp",       5,    45,   0,    0,    5],
  ["Butter",          ["butter","makhan"],                       "1 tsp",       5,    36,   0,    0,    4],
  ["Cooking oil",     ["oil","cooking oil","refined oil"],       "1 tsp",       5,    40,   0,    0,    4.5],
  ["Sugar",           ["sugar","cheeni"],                        "1 tsp",       5,    20,   0,    5,    0],
  ["Honey",           ["honey","shahad"],                        "1 tsp",       7,    21,   0,    5.8,  0],
  ["Chai",            ["chai","tea","cutting"],                  "1 cup sugar", 150,  90,   2,    11,   4],
  ["Black coffee",    ["black coffee","coffee no sugar"],        "1 cup",       200,  5,    0.3,  0,    0],
  ["Latte",           ["latte","cappuccino","coffee"],           "1 regular",   250,  120,  6,    12,   5],
  ["Cold drink",      ["cold drink","coke","pepsi","soda","soft drink"],"330 ml",330, 139,  0,    35,   0],
  ["Fruit juice",     ["juice","orange juice","fruit juice"],    "1 glass",     250,  115,  1,    27,   0.3],
  ["Beer",            ["beer"],                                  "330 ml",      330,  145,  1.5,  11,   0],
  ["Whisky / vodka",  ["whisky","whiskey","vodka","rum","peg"],  "1 large 60 ml",60,  140,  0,    0,    0],
  ["Samosa",          ["samosa"],                                "1 piece",     70,   260,  4,    30,   14],
  ["Pakora",          ["pakora","bhajji","pakoda"],              "4 pieces",    80,   280,  6,    26,   17],
  ["Pav bhaji",       ["pav bhaji"],                             "1 plate",     300,  520,  11,   62,   25],
  ["Chole bhature",   ["chole bhature","bhature"],               "1 plate",     350,  700,  17,   80,   34],
  ["Pizza slice",     ["pizza","pizza slice"],                   "1 slice",     100,  270,  11,   30,   11],
  ["Burger",          ["burger"],                                "1 regular",   180,  400,  17,   40,   19],
  ["French fries",    ["fries","french fries"],                  "medium",      110,  340,  4,    43,   17],
  ["Maggi",           ["maggi","instant noodles","noodles"],     "1 pack",      70,   350,  7,    50,   13],
  ["Ice cream",       ["ice cream","icecream"],                  "1 scoop",     70,   140,  2.5,  16,   7],
  ["Gulab jamun",     ["gulab jamun","jamun"],                   "1 piece",     45,   150,  2,    21,   7],
  ["Dark chocolate",  ["dark chocolate","chocolate"],            "20 g",        20,   120,  1.5,  9,    9],
  ["Biscuit",         ["biscuit","cookie","parle","marie"],      "2 biscuits",  20,   90,   1.2,  14,   3.5],
  ["Protein bar",     ["protein bar","bar"],                     "1 bar",       60,   210,  20,   21,   6],
  ["Salad",           ["salad","green salad","kachumber"],       "1 bowl",      150,  60,   2,    9,    2],
  ["Sprouts",         ["sprouts","moong sprouts"],               "1 katori",    100,  100,  8,    16,   0.6]
].map(a => ({name:a[0], alias:a[1], unit:a[2], g:a[3], kcal:a[4], p:a[5], c:a[6], f:a[7]}));

/* The chips shown on the Today screen — the everyday twenty, in the
   order you actually reach for them. Everything else is one line of
   typing away in the parser box. */
const QUICK = ["Roti","Rice","Dal","Rajma","Chole","Mixed sabzi","Curd","Paneer",
  "Chicken breast","Egg","Egg whites","Whey protein","Milk","Oats","Banana",
  "Peanut butter","Ghee","Chai","Bread","Almonds","Samosa","Cold drink"];

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
