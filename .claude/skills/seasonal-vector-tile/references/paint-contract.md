# Seasonal vector tile — authoring contract (READ FULLY)

You are authoring ONE TypeScript module of procedural HTML5 Canvas-2D vector art
for a cozy farm board-game tile: four per-season redraws, a subtle idle loop per
season, and three forward season→season transition morphs. Pure `ctx` drawing —
no images, no DOM, no libs. Edit ONLY your one file.

## First read (for house style + types)
- `/home/user/puzzleDrag2/src/textures/seasonal/grain/wheat.ts` — house idiom:
  layered dark-then-light strokes, gradients, a `groundShadow` helper,
  deterministic sin/cos-of-`t` motion, origin-centered drawing.
- `/home/user/puzzleDrag2/src/textures/seasonal/veg/pepper.ts` — a clean example
  of the EXACT architecture below (single parameterized paint). Mirror its shape.
- `/home/user/puzzleDrag2/src/textures/seasonal/types.ts` — the type contract.

## Exports & types (must compile under strict `tsc`)
- `import type { SeasonalTileEntry, SeasonalTransitionSet } from "../types.js";`
  (NodeNext — keep the `.js`. Your file sits one level under `seasonal/`.)
- `export const VARIANTS: SeasonalTileEntry = { Spring:{draw,anim}, Summer:{draw,anim}, Autumn:{draw,anim}, Winter:{draw,anim} };`
- `export const TRANSITIONS: SeasonalTransitionSet = { 0: springToSummer, 1: summerToAutumn, 2: autumnToWinter };`
- `draw(ctx)`, `anim(ctx, t)` (`t` = elapsed SECONDS, real, may be large),
  `transition(ctx, p)` (`p` in 0..1).

## ★ CORE ARCHITECTURE — a SINGLE parameterized paint (mandatory)
This is what makes the seasons consistent and the transitions seamless. Do NOT
draw a different subject per season.

1. Define an `interface P` of TWEENABLE params — every value that differs between
   seasons, expressed as numbers or number tuples so it interpolates: colours as
   `[r,g,b]` tuples (subject surfaces, pad grass, soil, outline tint, light wash),
   and scalar amounts in 0..1 (ripeness, gloss, frostAmt, snowCapAmt, padSnowAmt,
   blossomAmt, fallenLeafAmt, and any subject-specific amount). NO booleans, NO
   season strings inside `paint`.
2. `const SP: Record<SeasonName, P>` — the four season parameter sets.
3. `function paint(ctx, p: P, bob: number)` — draws the WHOLE tile (pad + subject
   + dressing + light wash) using ONLY values from `p` and `bob` (a vertical idle
   offset in design px; `bob = 0` is the rest pose). The subject's
   SILHOUETTE/OUTLINE is IDENTICAL for all `P` — only colours and the small
   dressing/frost/snow amounts change. Factor sub-parts into local helpers driven
   by `p`. Clamp every scalar you read.
4. `draw(season) = (ctx) => paint(ctx, SP[season], 0);`
5. `anim(season) = (ctx, t) => { /* additive season micro-motion */ paint(ctx, SP[season], bobAt(t)); }`
   where `bobAt(0) === 0` with zero velocity (e.g. `A*(1-Math.cos(w*t))*0.5`) and
   is a seamless loop. The SUBJECT bob MUST be 0 at `t=0`. Season micro-motion (a
   drifting snowflake/leaf, a glint, dew shimmer, a breath puff) is layered
   ADDITIVELY and may be nonzero at `t=0` (tiny dressing, never the silhouette).
6. `const smoother = (x) => x*x*x*(x*(6*x-15)+10);`
   `transition(from) = (ctx, pp) => paint(ctx, lerpP(SP[from], SP[from+1], smoother(clamp01(pp))), 0);`
   `lerpP` interpolates EVERY field of `P` (tuples component-wise, scalars linearly).

### Why (do not deviate)
- `transition(ctx,0)` is identical to `draw(from)` and `transition(ctx,1)` is
  identical to `draw(to)` — so a morph starts and ENDS exactly on the neighbouring
  season still with NO snap. (The engine hands off to the idle at rest = `draw(to)`.)
- The subject stays the SAME recognizable object in every season (the IDENTITY
  rule, from the project art doc): ripeness/age shows in surface colour and shade,
  NOT an identity change. NEVER remove, hollow out, stub, or swap the subject for a
  season. (Trees are the ONLY exception — their foliage shape may change; the
  trunk keeps identity.)

## Season filter (apply via P)
- **Spring** — fresh lightly-desaturated pastel; pad = bright lime-green dewy
  grass; a tiny pale blossom resting ON the pad (`blossomAmt`). Cool-bright light.
- **Summer** — richest, most-saturated palette (PEAK); pad = saturated mid-green
  grass. Warm light, strong shadow.
- **Autumn** — gold/orange/rust; pad = olive-tan browning grass; a couple of
  fallen leaves resting ON the pad (`fallenLeafAmt`). Low amber light.
- **Winter** — cool blue-grey light; pad snow-covered (white cap over muted
  grey-green) + frost sparkle (`padSnowAmt`); a snow cap + frost dusting on the
  subject's UPWARD surfaces (`snowCapAmt`, `frostAmt`) — the subject stays CLEARLY
  VISIBLE in its own colour underneath. NO white-out, NO full ice coating, NO
  bright flash/bloom/sparkle on the subject.

## Framing (origin-centered −24..+24 design box; caller already at tile centre)
- Ground pad: a low flat ellipse `x ∈ [−18,+18]`, centered near `y ≈ +19`, only
  ~5–6 px tall (a shallow turf disc), soft tufted edge + shaded underside, on
  transparency, with a soft contact shadow toward lower-right. Pad surface colour
  from `P`.
- Subject: contact/base centered on the pad (base within ±16 wide), rising upward
  (negative y) to about `y ≈ −24` max. Small loose items sit lower. Light from
  upper-left; one soft contact shadow lower-right.
- Style: cozy farm board-game look but vector — flat cel-shaded with a soft dark
  outline, clean readable silhouette, limited warm palette, layered
  dark-then-light for depth (like wheat.ts). Must read at ~64px.

## Category framing notes (use the one for your subject)
- **Tree** — whole plant; trunk base at pad centre, canopy fills the upper ¾ and
  may overhang the pad width. Foliage SHAPE may change with season via a
  `leafDensity` param (evergreens stay full + gain snow; deciduous may thin/bare
  in winter). The trunk keeps the tree's identity every season.
- **Fruit / Veg / Grain** — the iconic harvested ITEM only (never a bush/tree).
  One hero item (a small cluster where the item is tiny), constant outline; root
  veg keep their leafy top for read. Ripeness = colour/shade only.
- **Grass** — a dense raised tuft of blades fanning from the pad centre, taller
  than the pad's own grass; seasonal colour + winter snow among the blades.
- **Flower** — the bloom itself on a short stem; constant bloom shape, only
  colour/openness + frost change (never wither to a bare stub). On-model
  examples: `flower/heather.ts`, `flower/pansy.ts`, `flower/waterLily.ts` — all
  keep a recognizable bloom in winter (frost-dusted + a snow cap), not a husk.
- **Bird / Herd / Cattle / Mount (animals)** — the animal stands on the pad in
  front-¾, turned ~15–20° toward lower-left, full body readable (may overhang the
  pad width); legs/contact on the pad. Honour the subject's PALETTE LOCK — seasons
  change coat/fleece thickness (a `coatVolume`/`fluff` param), the pad, and the
  light, plus winter snow on the back + a small breath-fog puff at the nose — NOT
  the animal's identity colours. Idle = a gentle breathing bob + an occasional
  small ear/tail/head flick (seamless).
- **Aquatic (fish/clam/oyster/kelp/pearl)** — the ground pad reads as still WATER
  (a bluish reflective ellipse), not grass; the subject rests on/in it. Winter
  FREEZES the water to pale blue-white ice (`iceAmt`) with frost sparkle; the
  subject stays clearly visible. Idle = a gentle water-ripple shimmer + subject bob.
- **Mineral (gem/gold/ore/stone)** — the subject is rock bearing the mineral,
  sitting on a rocky/earth pad. Seasonal change is mostly the global filter: a
  little moss/grass tint in spring/summer, snow cap + frost sparkle on the rock in
  winter, warm vs cool light. The mineral's own colour is locked and stays bright
  and clearly visible all year. Idle = a soft specular glint travelling the facets
  + a tiny bob.

## Idle rules
Subtle "breathing bob" (the subject rises a little, settles to rest); seamless;
`bob(0)=0`. Plus the season micro-motion noted in your spec. Keep the SUBJECT's
colours/brightness constant — NO flash/glow/sparkle/white highlight on the subject
itself (dressing like a snowflake or a water glint is fine).

## Safety
Never throw for any `t` or `p`. Clamp `p` to [0,1] (define a local `clamp01`).
`save`/`restore` around every translate/rotate/globalAlpha; reset `globalAlpha`
to 1 before returning.

## Finish
Run: `cd /home/user/puzzleDrag2 && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i '<YOUR_FILE_SUBPATH>' || echo "no type errors"`
to confirm your file is clean (ignore errors in other files). Report the file path
and a one-line summary per season + transition.
