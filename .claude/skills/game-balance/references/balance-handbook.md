# Balance Handbook

A discussion-grade theory reference for tuning game numbers. It is **genre-aware**:
every concept is tagged with the kinds of games it applies to, so the skill knows
what to reach for and what to skip.

**Reference game (first instance): puzzleDrag2** — a single-player, turn-based,
tile-drag match/merge **farming/economy** game with a zone-tier progression spine.
No PvP, no real-time, no HP/DPS combat (its "bosses" are puzzle-constraint
modifiers, not health duels). Worked examples throughout use its real numbers.

When this skill is later pointed at a different genre (PvP, real-time, direct
combat, idle/incremental), the scoped-out concepts in §2 become live — and the
skill should web-research that genre's canon before applying it.

---

## 1. What balance is (and isn't)

Balancing is the continuous process of adjusting rules, thresholds, economic
constraints, and probability matrices to cultivate an intended player experience
(Adams & Dormans, *Game Mechanics*; research B). The industry usually defines it
by **negative space**: a game is balanced when it avoids *broken gameplay*
(research A). Broken gameplay shows up as two failure modes:

- **Dominant strategy** — one option is mathematically or contextually superior
  in (almost) all situations, so every other choice is obsolete and the decision
  evaporates.
- **False choice** — an option *looks* like a real alternative but is strictly
  worse; it misleads rather than informs.

**The power-curve definition.** An element's balance is its **distance from the
aggregate power curve** derived from every *other* element in the system
(research A/B). Build the curve once (resource invested → power returned), then
ask of any single item: how far off the curve does it sit? That distance — not a
gut feeling — is the quantity you tune.

**The equality fallacy.** Perfect equality kills the game. If every card, unit,
or move has identical expected value, strategic decision-making collapses into a
multiple-choice math problem where every option is the same (research A). The
goal is **not** sameness.

**What "balanced" actually means.** Optimal balance is a set of **incomparable**
options with *different* minimum and maximum potentials, each optimal *in some
context* (research A):

- **Minimum potential** — the baseline effect an element provides just by
  existing, independent of player skill.
- **Maximum potential / skill ceiling** — the highest impact it can reach when
  used optimally.

Tune those two so every option is the best choice in *at least one* context. That
preserves meaningful decisions without letting any single line dominate.

**Two anchoring definitions to keep in mind:**

- Sid Meier: a good game is *"a series of interesting decisions"* — a decision is
  interesting only when several options are live (research B).
- David Sirlin: a balanced (multiplayer) game keeps a *reasonably large number of
  options viable, especially at high-level play* (research B). The single-player
  analogue: keep multiple resource/build/route strategies viable across a run,
  not just the one spreadsheet-optimal line.

**Static vs dynamic balance** (research B):

- **Static** — the immutable, pre-runtime layer: rules, baseline stats, cost
  curves, the underlying math. *This is where a single-player economy game lives
  almost entirely.*
- **Dynamic** — the equilibrium that emerges at runtime from player interaction
  and adaptive systems. Matters mostly for multiplayer/real-time; for puzzleDrag2
  it reduces to *pacing* (see §6).

**Schell's 12 types of game balance** (Schell, *The Art of Game Design*) — use as
a checklist when auditing a design. Each line notes relevance to a single-player
economy game:

| # | Type | What it asks | puzzleDrag2 relevance |
|---|------|--------------|------------------------|
| 1 | Fairness (symmetric/asymmetric) | Do sides start even? | Low — no opponent |
| 2 | Challenge vs success | Is difficulty in the flow channel? | High — pacing |
| 3 | Meaningful choices | Are options live, not dominated? | High |
| 4 | Skill vs chance | How much is execution vs RNG? | Med — drag skill + spawn RNG |
| 5 | Head vs hands | Mental vs dexterity load | Med — drag is light dexterity |
| 6 | Competition vs cooperation | — | Low |
| 7 | Short vs long | Session length spread | High — run length, segments |
| 8 | Rewards | Are payouts escalating & legible? | High — coins, resources |
| 9 | Punishment | Cost of failure | Med — turn budget runs out |
| 10 | Freedom vs controlled experience | Open vs guided | Med — zone spine guides |
| 11 | Simple vs complex | Emergent vs contrived complexity | High — merge/chain emergence |
| 12 | Detail vs imagination | — | Low |

---

## 2. Genre map — what applies to which game

Tag legend: **[economy]** transitive/economy & progression games (puzzleDrag2,
farming/merge, builders, most CCG economies), **[pvp]** competitive symmetric/
asymmetric, **[rt]** real-time, **[combat]** direct HP/DPS combat, **[idle]**
idle/incremental.

### Applies to puzzleDrag2 (cover in full — see later sections)

| Concept | Tags | Section |
|---|---|---|
| Power-curve / distance metric; equality fallacy; incomparable options | all | §1 |
| Static vs dynamic; Schell's 12; Meier/Sirlin | all | §1 |
| Cost/reward curves (linear→sigmoid); Level-15 Cliff; which-curve-for-which-knob | [economy][idle] | §3 |
| Faucets/drains/converters/traders; EV & work-backward; ROI; segmentation; macro-target | [economy][idle] | §4 |
| Normalize → curve → weighted-mean value-setting | [economy][combat][pvp] | §5 |
| Feedback loops (single-player reframe); CORREL snowball test; perceived vs statistical fairness | all | §6 |
| Vanilla Test; opportunity cost; power creep (horizontal vs vertical) | [economy] | §7 |
| Fermi, quick-pointing, triple-tapping, intentional overshoot | all | §8 |
| Deterministic sim, many seeds, distributions; Monte-Carlo/VaR | all | §9 |

### Explicitly scoped out (not for a single-player turn-based economy)

Each gets one line. These are **dormant**, not wrong — if the skill is later
pointed at a matching genre, turn them on and web-research that genre's canon.

- **Lanchester's Laws (Linear/Square attrition, Helmbold parameters)** — predict
  army-vs-army outcomes; *applies to [rt][combat] strategy/4X, not a board of
  tiles.* (research B)
- **Effective Health Pool / armor / mitigation / TTK / DPS math** — survivability
  and time-to-kill modeling; *applies to [combat] MOBA/ARPG/FPS.* (research A/B)
- **Fighting-game frame data (startup/active/recovery, frame advantage)** —
  micro-balance at 1/60 s; *applies to [pvp][rt] fighting games.* (research B)
- **Intransitive Rock-Paper-Scissors payoff matrices / Nash equilibria /
  fictitious play** — cyclic counter design so no unit dominates; *applies to
  [pvp][rt] unit-counter games.* puzzleDrag2's economy is **transitive** (see §3,
  §7). (research A/B)
- **Competitive rubber-banding / catch-up mechanics (Blue Shell, DDA, AI
  Director)** — negative feedback against a *leader*; *applies to [pvp][rt]; a
  solo player has no leader to rubber-band.* (research A/B; see §6 reframe)
- **Idle-game prestige math** (reset-for-multiplier, `prestige ≈ sqrt(lifetime)`)
  — escaping an exponential wall via persistent multipliers; *applies to [idle].*
  (research B)
- **Multi-agent adversarial faction self-play (RuleSmith-style LLM balancing)** —
  two LLM agents play opposing factions to converge win rates to 50%; *applies to
  [pvp] asymmetric games; there's no faction war in a solo farm.* (research A)

---

## 3. Curves & progression

A **cost/reward curve** maps the resources a player invests (time, actions, gold)
to the power or progress they receive (research A/B). Get the curve right and
every item priced against it inherits the balance. Get it wrong and **one curve
error breaks every item on it** — the defining risk of a transitive economy
(research B: "a single mathematical error disrupts the viability of every object
evaluated against that curve").

### The catalog

| Curve | Form | Good for | Risk |
|---|---|---|---|
| **Linear** | `y = a·x + b` | Baseline income, per-action rewards, predictable pacing | Lacks escalating sense of accomplishment over a long game (research A) |
| **Polynomial** | `y = a·xⁿ` (n≈2–3) | Mid-length progression; smoothly stretches gaps without exploding | Needs a sensible exponent; still grows without bound |
| **Exponential** | `y = a·bˣ` | Sinks/upgrade costs that must always stay ahead of income; preventing power-player exhaustion | Values reach incomprehensible scale fast; can force stat-squish; **the cliff** below |
| **Logarithmic** | `y = a·ln(x)+b` | Diminishing returns on investment/mastery | If applied to core power, late effort feels worthless → disengagement (research A/B) |
| **Sigmoid (S-curve)** | `y = L / (1 + e^(−k(x−x₀)))` | Gentle onboarding → steep mid-game ramp → late plateau; preserves "goal density" and induces flow | Hard to tune the inflection points; needs a steepness param `k` (research B) |

### The "Level-15 Cliff" failure mode

The signature economy bug: an **exponential sink outpaces a linear (or polynomial)
income**. Because `exp` invariably overtakes any polynomial, the cost of the next
unlock eventually rockets past what the player can earn — progression stalls and
players churn at the wall (research A/B; named the "Level 15 Cliff"). Telemetry
shows it as a sharp retention drop at a fixed level/stage.

Fix by reshaping *either* side: flatten the sink (smaller base `b`), lift income
(raise the linear slope or add a faucet), or insert a soft cap. Always plot both
curves on the same axes — the cliff is visible as the x where they cross.

### Which curve for which knob

- **Income / per-action reward → linear (or gentle polynomial).** Predictable,
  legible, segment-friendly.
- **Sinks / upgrade & unlock costs → exponential (or steep polynomial).** Keeps a
  goal perpetually out of reach for power players (§4) — but watch the cliff.
- **XP / progression spine → sigmoid or polynomial.** Sigmoid for narrative
  pacing and goal density; polynomial when you want steady, bounded growth.
- **Mastery / efficiency returns → logarithmic.** Diminishing, never invalidating.

### puzzleDrag2 worked examples

- **Linear income.** Chain coins are earned as
  `coins = max(1, floor(chainLength × tileValue))` per chain — roughly **linear**
  in chain length. Double the chain, roughly double the payout. Predictable, easy
  to reason about across segments.
- **Exponential sink.** Settlement founding cost is
  `round(300 × 1.7^(k-1))` → **300, 510, 867, 1474, 2507, …** A textbook
  exponential drain: the 5th settlement costs ~8× the 1st. This is the side of the
  economy that *should* outpace the linear coin income — by design — so late
  foundings stay aspirational. It is also exactly the shape that produces a cliff
  if coin income doesn't keep pace.
- **Converter chain as progression spine.** The home settlement tier ladder is
  **resource-gated** (resources, `coins = 0`): tier 1 (Hamlet) needs crafted
  `bread`; tier 2 (Village) needs mine goods `block` / `coke` / `silver_bar`.
  This isn't a curve at all — it's a **converter chain** (§4) gating progress
  across subsystems. A clean design, *and* a candidate cliff: if the player can't
  reach the inputs (no mine access, no flour), progression stalls even with a full
  coin purse. (See the §9 measured stall.)

---

## 4. The internal economy

The internal economy is the game's circulatory system: how one resource becomes
another over time (Adams & Dormans, *Game Mechanics* / Machinations; research A/B).
Model it as four node types before touching any number.

| Node | Role | puzzleDrag2 example |
|---|---|---|
| **Faucet (source)** | Creates resource from nothing at some rate | Chaining tiles mints coins; tiles roll into inventory units |
| **Drain (sink)** | Destroys/consumes resource | Founding a settlement (`300×1.7^(k-1)`); crafting consumes inputs |
| **Converter** | Turns resource A into resource B | grass→hay; flour+→`bread`; ore→`block`/`coke`/`silver_bar` |
| **Trader** | Exchanges A for B at a rate (no creation/destruction) | Market sell at item `value` (coins for goods) |

Tuning the economy *is* tuning the rates on these nodes so resource transfer stays
stable over a whole run (research A/B). Two failure directions: **hyperinflation**
(faucets >> drains → numbers balloon, challenge dies) and **stagnation** (drains >>
faucets → the cliff). Aim for the corridor between.

### Expected Value (EV) and working backward

For any random payout, `EV = Σ (outcome × probability)`. A fair d6 has
`EV = (1+2+3+4+5+6)/6 = 3.5` (research A). The professional move is to run this
**backward**: fix the *target* EV that the macro-economy needs, then derive the
drop rates / values that hit it (research A — "set a target EV and work backward,
establishing min/max thresholds and assigning probabilities"). You almost never
pick drop rates first; you pick the income they must produce and solve for them.

### ROI

`ROI = cost / income-per-time` — how long an investment takes to pay for itself
(research A). If an asset costs 1,000 and yields 10/hour, ROI = **100 hours**;
weigh that against expected session length before shipping the price. In
puzzleDrag2 terms, a building's cost divided by the extra coins-per-run it enables
is its ROI in runs — and that number should sit sensibly inside a player's
expected number of sessions.

### Player segmentation

Earn rates must serve conflicting segments simultaneously (research A/B):

- **Casual** — ~15–20 min/day. Needs tangible micro-wins each session or they
  churn. *Tune so a single run delivers visible progress.*
- **Mid-core** — a few sessions/day. The **primary signal for baseline pacing**;
  balance to this segment first.
- **Power players** — aggressively exhaust the economy. Sinks (typically
  exponential, §3) must scale fast enough that an aspirational goal is always just
  out of reach, or they destabilize the game by hoarding.

### The macro-target template (use this verbatim)

State an explicit, falsifiable target, then **back out the required earn rate**
(research A/B):

> "By **[day/session N]**, a **[segment]** player should reach **[milestone]**."

Worked (research A's own example): *"By Day 7, a once-daily player upgrades their
main item to tier 3."* If tier 3 costs **400 coins**, required average earn rate =
`400 / 7 ≈ 57 coins/day`. Now check the faucets actually deliver ~57/day for that
segment; if not, adjust a faucet or the cost.

puzzleDrag2 template instance: *"By session ~6, a farm-only player should found
their 3rd settlement and reach home tier 1."* Coin pacing supports founding #3 at
~run 6 — but the tier-1 half of the milestone has a **separate gate** (bread),
which is where simulation earns its keep (§9).

---

## 5. Setting a principled value

When you need to set a resource's value or a building's cost and have several
disparate inputs (a weapon's damage *and* its inventory footprint; a resource's
rarity *and* its craft depth), don't guess — use the **spreadsheet method**
(research A/B). Three steps:

**1. Normalize every input to 0–1.** Different inputs live on different scales;
normalization projects them onto a common floating-point range so no attribute
dominates by sheer magnitude (research B):

```
norm = (value − min) / (max − min)
```

**2. Apply a distribution / easing curve.** Raw normalized data often *clusters*
(one "ultimate" item at 1.0, everything else near 0.0). Apply a curve — e.g. a
cubic easing `f(x) = x³` or its inverse — to spread the cluster across the full
0–1 range so values don't bunch (research B). Pick the curve from §3 to match the
spread you want.

**3. Weighted mean → cost/value.** Combine the curved, normalized inputs with
integer weights from a single global table (research B). If damage matters 5× as
much as footprint:

```
score = (5·norm_damage + 1·norm_footprint) / (5 + 1)
value = min_value + score · (max_value − min_value)
```

Keep raw inputs, the curve, and the weights in **separate, color-coded columns**
so changing a base value propagates through the whole table without manual
recompute (research A/B). Adjusting one global weight then re-prices hundreds of
items at once while preserving relative balance.

### Worked example (puzzleDrag2 resource value)

Suppose a new resource has two inputs: **rarity** (how rare its tile is to spawn)
and **craft depth** (how many converter steps feed it).

1. Normalize: rarity 0.8, craft-depth 0.5 (both already on a 0–1 inventory scale).
2. Curve: apply mild cubic to rarity to separate it from common tiles →
   `0.8³ ≈ 0.51`; leave depth linear → `0.5`.
3. Weight (rarity 3×, depth 1×):
   `score = (3·0.51 + 1·0.5) / 4 ≈ 0.51`.
4. Map to a 10–800 value band: `value ≈ 10 + 0.51·(800−10) ≈ 413`.

Then sanity-check against the power curve (§6): does **413** put its
*per-tile* realized value inside the family-value corridor, or does it spike
above 3× the median? If it spikes, lower a weight or raise its `TILES_PER_RESOURCE`
rather than hand-fudging the 413.

---

## 6. Feedback loops & fairness

### Feedback loops — the control-theory model

Every feedback loop has three parts (research A): a **sensor** (reads game state),
a **comparator** (tests it against a threshold), and an **activator** (changes the
state in response).

- **Positive (snowball)** — output feeds back as more input; self-reinforcing,
  pushes *away* from equilibrium, accelerates the ending (research A/B). In a 4X
  game, early territory → more extractors → more armies → more territory.
- **Negative (stabilizing)** — output triggers friction that pulls *toward*
  equilibrium; the "brakes" (research A/B). E.g. exponential XP-per-level lets
  laggards catch up.

### The single-player reframe (important for puzzleDrag2)

With **no opponent**, the competitive vocabulary mostly doesn't apply. There's no
runaway *leader*, so **rubber-banding / catch-up mechanics are scoped out** (§2).
What *does* survive is the loop's effect on **pacing and difficulty**:

- A positive loop in a solo economy doesn't beat anyone — it makes the *game* get
  too easy/fast (snowballing coins → trivialized challenge → boredom, the wrong
  side of the flow channel).
- A negative loop in a solo economy is a **soft cap / diminishing return** that
  keeps later content meaningful (e.g. exponential founding costs in §3 are a
  deliberate brake on a coin snowball).

So: read positive/negative loops as *pacing knobs*, not *competition knobs*.
Snowball control = "does the game stay challenging?", not "can the loser still
win?".

### The CORREL snowball test

A concrete, runnable diagnostic (research A): correlate an **early-game metric**
(e.g. coins banked by run 2, or chain length in the first season) against the
**final outcome** (e.g. settlements founded by end of campaign) across many
simulated runs. Use the spreadsheet `CORREL` function:

- Correlation **→ +1.0** = a runaway positive loop: early advantage rigidly
  dictates the finish. In solo terms, the opening *solves* the game and the rest
  is foregone.
- Correlation **near 0** = early state doesn't lock the outcome; mid/late
  decisions still matter.

If CORREL is too high, weaken the positive loop (add a soft cap, flatten an early
faucet) until later play regains leverage.

### Perceived vs statistical fairness

A mathematically perfect game can still *feel* broken, because human probability
intuition is biased (research B):

- **Gambler's fallacy** — players believe past independent results change future
  odds; they don't.
- **Confirmation bias** — bad-luck streaks are remembered far more vividly than
  good ones.
- **The 75% trap** — a displayed 75% chance is read as near-certain; when the 25%
  fires, the player feels cheated despite correct math.

Designers therefore bend perception toward intuition (research B):

- **Probability fudging** — a *displayed high chance should over-deliver* vs raw
  odds (a shown 75–95% is secretly nudged up), aligning math with expectation.
- **Input forgiveness** — *coyote time* (a few frames of grace after leaving a
  ledge) and *hitbox tuning* (player hitbox slightly smaller, hazards slightly
  larger) so "near misses" don't feel like robbery.

**puzzleDrag2 application.** Two surfaces matter:

- **Spawn RNG.** If the board *displays* or implies a high chance of a needed
  tile, let the realized rate meet or beat the implied odds — and consider a
  pity/streak-breaker so a long drought of a gated resource doesn't read as
  "broken." Avoid the gambler's-fallacy frustration of independent spawns feeling
  rigged.
- **The drag mechanic.** Apply input forgiveness to chain-building: a slightly
  generous adjacency/snap tolerance (the drag analogue of coyote-time/hitbox
  buffering) so a near-miss drag completes the chain the player clearly intended,
  rather than punishing imprecise touch input.

---

## 7. Content economy hygiene

How to add resources/zones/items over time **without rotting the existing set**.
This is the transitive-economy maintenance discipline (research B).

### The Vanilla Test

Borrowed from CCGs (research B): establish a **baseline stat-to-cost curve** for a
plain item with no special abilities ("vanilla"), then price everything against
it. MTG/Runeterra's classic baseline: total stats ≈ `2·cost + 1`, so a 2-cost
vanilla unit provides 5 total stats. When you add a keyword/mechanic, you
**deduct raw stats to pay for it**, keeping the unit on the curve.

The general principle for *any* transitive economy: **define the baseline
value-per-cost curve explicitly, then justify every new entity as a point on (or a
priced deviation from) that curve.** For puzzleDrag2 the "vanilla curve" is the
realized **value-per-tile** relationship — see the distance metric below.

### Opportunity cost

Cost isn't only the resource spent; it's also what you *gave up* (research B). In
a CCG, a 1-cost card also spends one card from a limited hand, so 1-cost cards
need inflated stats to be worth the card slot. In puzzleDrag2, the analogue is the
**turn budget**: every tile chained for resource A is a tile *not* chained for B.
A resource's true value must be judged against the opportunity cost of the board
space and turns it consumes — which is exactly why the per-tile metric (not the
raw item value) is the honest yardstick.

### The distance-from-the-power-curve metric (puzzleDrag2)

Resource accrual: a tile rolls into 1 inventory unit every `TILES_PER_RESOURCE`
tiles chained (e.g. grass→hay every **6** tiles). So the realized
**value-per-tile** is:

```
valuePerTile = resourceValue / TILES_PER_RESOURCE
```

That single number *is* each resource's distance from the power curve. The game's
family-value audit flags any family more than **3× the median** value-per-tile:

- pearls ≈ `800 / 6 ≈ 133`/tile
- pie ≈ `90 / 7 ≈ 12.9`/tile

That's a **~10× spread** — pearls sit far above the curve, pie near the bottom.
The fix is *not* to make them equal (equality fallacy, §1) but to pull the
outliers back inside the corridor so each family is the optimal target *in some
context* (§1), tuning `resourceValue` and/or `TILES_PER_RESOURCE`.

### Power creep — and how to avoid it

Power creep is the insidious drift where **new content silently outclasses old**,
so players abandon legacy options and the metagame/economy collapses (research B).
The mitigation is **horizontal, not vertical, expansion** (research B):

- **Vertical** (bad) — new resource/zone is *strictly stronger* (higher
  value-per-tile, dominates older ones). Old content dies.
- **Horizontal** (good) — new content brings a *distinct trade-off* (different
  inputs, different best context), sitting *beside* the existing curve rather than
  above it.

**Rule for puzzleDrag2:** *don't let a new resource or zone invalidate older
ones.* A new zone's resources should open new strategies (horizontal), not simply
out-value the home board's (vertical). Run the value-per-tile audit on every
addition; if the newcomer exceeds 3× the median, it's vertical creep — re-price it.

---

## 8. Estimation & iteration

When exact equilibrium is incomputable before playtest (the common case), use
estimation heuristics instead of stalling (research A).

- **Fermi estimation ("Fermi Solution").** Decompose an unknown into estimable
  factors and multiply — get an order-of-magnitude answer fast. Good for "roughly
  how many coins should a run yield?" before any sim exists.
- **Quick pointing.** Rapidly assign 1–5 values to *hundreds* of elements. By
  wisdom-of-crowds, the aggregate sums approximate reality, letting you compare
  the total power of whole factions/strategies cheaply (research A). For
  puzzleDrag2: point every resource 1–5 on "usefulness," sum per family, and spot
  families that are obviously over/under before precise tuning.
- **Triple tapping.** For a value that's hard to quantify (a delayed reward vs an
  immediate one), pick a cost **obviously too high** and one **obviously too low**,
  then take the midpoint (research A). Bracket, don't agonize.
- **Intentional overshoot.** During iteration, *deliberately overshoot* the target
  to bracket the true value from both sides, instead of micro-nudging toward it
  (research A). Set it too generous, observe; set it too stingy, observe; the
  answer is between — and you found it in 2 passes, not 20.

The through-line: **bracket the truth, then close in.** Cheap wrong-on-purpose
estimates converge faster than careful one-directional tweaks.

---

## 9. Simulation discipline

Economies are too interconnected to balance by hand; model them before (and after)
implementation (research A/B). The discipline:

1. **Build a deterministic sim.** Drive the *real* rules (the actual reducer, not
   a reimplementation) headlessly. Determinism = seeded RNG so a run is
   reproducible. puzzleDrag2 already has this: a headless harness that drives the
   real reducer (`FARM/ENTER → CHAIN_COLLECTED → CLOSE_SEASON`) with a seeded
   `Math.random`.
2. **Run many seeds.** A single run is an anecdote. Run hundreds/thousands and
   read the **distribution**, not one number.
3. **Read mean / median / standard deviation** (research A). The **mean** is the
   expected outcome; the **stdev** is the variance — how reliable a strategy is.
   Two strategies with the same mean but very different stdev are *not* the same
   choice (one is a gamble). Report all three.
4. **Use CORREL** (§6) on the seeded runs to catch runaway loops.

### Monte-Carlo + Value-at-Risk (optional stochastic extension)

When inputs are themselves random (daily logins, session lengths, spawn variance),
go stochastic (research B): draw inputs from distributions (mean + stdev), run
10k+ iterations, and plot the resulting histogram — e.g. projected currency
**inflation** over 30 days. Then read the **Value-at-Risk (VaR)**: the ~5%
worst-case tail where the economy spirals (power players hoarding, runaway
inflation). Adjust sinks proactively against that tail, not just the average
(research B). This is optional for puzzleDrag2's deterministic core but is the
right tool the moment randomized live-ops inputs enter.

### Worked example — simulation surfacing a cross-subsystem gate

A real measured result from the puzzleDrag2 campaign sim: a **farm-only home
campaign banks coins fine** — founding #2 at ~run 2, #3 at ~run 6 — **but stalls
before home tier 1** because it can't craft `bread`.

This is the lesson in one data point: **coin pacing and progression pacing are
different axes.** The coin faucet is healthy (the linear income in §3 is doing its
job), yet the player is wedged because tier 1's *converter* gate (bread) depends on
inputs a farm-only run never produces (§3/§4). No amount of staring at the coin
curve reveals this — only a sim that drives the real converter chain across many
runs surfaces the cross-subsystem gate. That's why §9 exists: the cliff that bites
isn't always on the curve you were watching.

---

## 10. The progression map — the alignment artifact

*Applies to:* any game with **sequenced or gated content** — campaigns, tech
trees, zone/biome unlocks, settlement tiers, skill trees, chapter gates. (A pure
arcade score-attack game with no unlocks doesn't need one.) For a single-player
progression game it is the **most important artifact the balance skill produces**,
because it is where the designer and the skill *confirm they are looking at the
same game* before a single number is tuned.

**Why it comes before tuning.** Goals (§ workflow step 1) say where the designer
wants the journey to *go*. The economy model (§4) says how resources *flow*. The
progression map says what the journey actually *is*, right now, as the code
encodes it: the ordered spine of milestones, what each one costs, what it unlocks,
and what gates stand between them. Tuning a cost before you both agree on the
map is how you optimize the wrong rung. **Alignment is the deliverable here, not
numbers** — the map is the handshake.

### What it must show

1. **The spine** — the ordered backbone of major milestones (the tiers/chapters/
   ranks a player climbs), with each rung's **entry/upgrade cost** and **what it
   unlocks** (content, buildings, recipes, zones, abilities).
2. **The gates** — every precondition between rungs. A gate is a *content faucet
   valve*: "you may not reach B until you have done A." Name the gate *type*:
   - **resource gate** — needs N of resource X (the common case);
   - **tier/level gate** — needs another track at a given rung (e.g. *zone Y unlocks
     at home tier 3*);
   - **token/quest gate** — needs a scripted item or beat.
3. **Reachability** — from a *fresh save*, which content is actually attainable?
   Walk the gate graph outward from the start state. Anything you can't reach is
   either intended late-game or an accidental dead-end (see below).
4. **Branches & convergence** — where the path forks (optional zones, side tracks)
   and where forks rejoin (a gate that needs goods from two branches).

### The gating math, and the failure mode it hides

A progression gate is fine **iff** the resources it demands are *producible by
content the player has already reached* when they hit the gate. The failure mode
is the **circular / unreachable gate**: rung B needs resource X; X is only made by
content C; C is gated behind rung B (or behind something downstream of B). No
first step exists — the player is **softlocked**. This is the progression analogue
of §3's cliff, and it is invisible on any single cost curve because it spans
*tracks*: each track looks climbable in isolation; only the cross-track gate graph
reveals the lock.

**Per-container resources (the subtle one).** If resources are **siloed** — held
per zone/save-slot/inventory rather than globally — then a gate on track T can
only ever be paid from what track T *itself* produces. Goods made elsewhere can't
be spent here even if the player owns them. Model affordability **per container**,
not globally, or you will declare a wall passable that isn't. (puzzleDrag2's tier-
ups spend the *target zone's own* inventory; a sibling zone's output can't pay
them — so the home ladder's mine-good costs are unpayable no matter what other
zones produce.)

### Make it code-derived, or it lies

A progression map hand-drawn in a slide deck **drifts the instant a cost changes**,
and a stale alignment artifact is worse than none — it certifies agreement on a
game that no longer exists. The discipline: **derive the map from the same
constants the game runs on** (the zone/tier/recipe/building tables), as a pure
function, so the picture *cannot* diverge from the build. Then:

- **Render it** — a visual, interactive timeline/graph is the form a designer can
  actually review and sign off on (spine + gates + reachability, costs coloured by
  resource family, locks called out). Visual + interactive beats a wall of tables.
- **Assert it** — turn the reachability/softlock check into a **test** that pins
  the progression shape. A constant edit that re-gates a zone or re-opens a lock
  then *breaks CI intentionally* — which is exactly how you catch the regression
  class that introduces a softlock in the first place. (The lock most often
  arrives as collateral from a *structural* progression rework, not a deliberate
  number change — so a guard that watches the shape, not the values, is what
  catches it.)
- **Diff it across runs** — a balance pass is iterative, so the map must be a
  *living instrument*, not a one-time snapshot. Keep a committed **baseline** of
  the last *reviewed* spine; on every regeneration, diff the fresh spine against
  it and surface **what moved** — did the softlock clear, did a zone become
  reachable, did a tier cost change — classified by significance (a created/
  cleared softlock or a reachability flip is *critical*; a gate or wall move is
  *major*; a cost tweak is *minor*). Render changed facts as **outdated** in the
  report (strike the old value, show the new) so a stale claim reads as stale at a
  glance, and promote the baseline only on an explicit **review/accept** step (the
  snapshot-test model: see the diff, then accept). This closes the loop: change a
  number → regenerate → the map tells you, in the designer's own terms, exactly
  what your change did to the journey.

### How to read it with the designer

Put the map in front of them and ask the alignment questions the numbers can't:
*Is this the order you intended? Is anything reachable that shouldn't be yet — or
walled that shouldn't be? Is every gate's demand producible by then?* Only once
the map is **agreed** do the KPI targets (workflow step 1) attach to real rungs
and the tuning in steps 5–8 have a correct target. The map is the shared mental
model; the rest of the pass edits against it.

*Instance:* puzzleDrag2's map is `reference/docs/balance/progression-timeline.html`
(the interactive artifact), derived by `src/playtest/progression.ts` and emitted
via `npm run playtest -- --progression`; its softlock guard is the progression-
shape snapshot in `src/__tests__/playtest-harness.test.ts`.

---

## Sources

Primary research documents (this handbook draws its named concepts and worked
formulas from them; consult their Works-cited lists for the underlying articles):

- **Research A** — *The Quantitative and Systems Dynamics of Video Game Balancing:
  A Comprehensive Framework for Algorithmic and LLM-Assisted Design.*
- **Research B** — *The Architecture of Game Balance: Mathematical Models,
  Psychological Dynamics, and AI-Driven System Design.*

Named authorities cited inline (via the research docs):

- Schell, J. — *The Art of Game Design* (the 12 types of game balance).
- Adams, E. & Dormans, J. — *Game Mechanics: Advanced Game Design* / Machinations
  (internal economy: faucets, drains, converters, traders).
- Meier, S. — "a series of interesting decisions" (interesting-decision heuristic).
- Sirlin, D. — *Balancing Multiplayer Games* (viable options at high-level play).
- Csíkszentmihályi, M. — *Flow* (the flow channel between boredom and anxiety).
- Collectible-card-game design canon (MTG / Legends of Runeterra / Hearthstone) —
  the Vanilla Test, opportunity cost, and power-creep mitigation.

Where a claim cannot be tied to a specific named author, it is attributed to the
research document generally (e.g. "research A/B"). No citations here are invented;
unverifiable specifics were left attributed to the research docs rather than
fabricated.
