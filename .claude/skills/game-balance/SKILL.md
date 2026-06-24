---
name: game-balance
description: >-
  Reusable, codebase-agnostic methodology for balancing a game's economy and progression. It interviews
  the design goals FIRST (teaching balance concepts as it asks), learns the target game's codebase, models
  the economy as faucets/sinks with explicit formulas, instruments the game with a deterministic simulation
  (building one if none exists), proposes targeted changes tied to the goals, applies them on confirmation,
  and re-tests. Use whenever the user wants to balance / tune / rebalance any game's economy or
  progression, fix grind or a difficulty spike, decide what something should cost or be worth, set how long
  the game should take / pacing / time-to-content, investigate a dominant strategy or an over/under-powered
  element, model an economy, set balance targets or KPIs, or have a serious theory-grounded discussion
  about game balance. On first use in a game it generates a per-game Balance Profile (a checked-in design
  doc + config of that game's knobs, formulas, goals, and harness) and remembers cross-game preferences in
  memory, so it gets smarter about each game over time. Pulls genre-specific theory from the open web when
  its handbook doesn't cover a game's genre.
---

# Game Balance — a methodology, not a number generator

This skill is a **reusable engine** for balancing any game. It separates three things on purpose:

- **The brain (this skill):** the method + the [balance handbook](references/balance-handbook.md) + the
  onboarding playbook. Written once, improves once for every game.
- **The per-game Balance Profile (generated):** a checked-in design doc + a small config capturing *this*
  game's knobs, formulas, goals, and how to test it. The "remembers my game" state.
- **Memory (cross-game):** the designer's durable preferences (cozy pacing, anti-grind, no real-money…),
  saved as `feedback`/`user` memories so taste carries between games.

> **Never open by changing numbers.** Balance starts with *what the designer is trying to achieve* and
> *what the economy actually does*. Tuning before goals is how you make a precise wrong answer.

## Two modes

- **New game** → run the full arc below (goals → learn → model → instrument → diagnose → propose → apply →
  verify → record). Generate the Balance Profile at the end.
- **Known game** (a Profile already exists) → load the Profile, re-read its goals + knob registry, then
  resume from step 4 (diagnose) for the task at hand.

---

## The workflow

### 1. Goals interview FIRST — and teach while you ask
Use crisp multiple-choice questions (the `AskUserQuestion` style). For each, give a one-line plain-English
explanation so the designer can decide even if the concept is new to them. Cover:

- **The goal of this pass** — lengthen/shorten the game · kill a dominant strategy · smooth a difficulty
  spike · reduce grind · make resource X matter · hit a monetization-free pacing target.
- **Target player & session shape** — platform, session length (e.g. mobile ~5 min), sessions/day.
- **Intended time-to-content** — how many runs/sessions to reach each milestone.
- **Desired feel** — cozy/relaxed vs optimization/challenge (sets the flow corridor).
- **Feedback loops** — should early wins snowball, or should the game self-stabilize? (Explain both; note
  that in single-player "catch-up/rubber-banding" usually doesn't apply — see handbook §6.)
- **Hard constraints** — save-compat, no real-money, must not break an existing audit/metric.

Write the result as a short **Goals + KPI targets** block. Make every target **actionable and worked
backward to a rate** (handbook §4): "by session N a mid-core player reaches tier 3" → therefore the
economy must yield ≈ X/session. Those numbers become the test targets.

### 2. Learn the codebase (onboard)
Fan out **Explore subagents** (or read directly for a small game) to build:
- the **knob registry** — every tunable value and the `file:line` it lives at (item values, costs, drop
  rates, XP/level curves, timers);
- the **economy map** — sources/faucets, sinks/drains, converters (crafting/upgrades), and traders;
- the **core formulas** — copy the *actual* payout and cost math out of the code, don't paraphrase.

Propose the knob registry + economy map back to the user for sign-off before modeling.
If the game's **genre is outside the handbook's coverage** (shooter, gacha, deckbuilder, RTS…),
**web-research that genre's balancing canon first** (see *Research the web*, below) so you model it with
the right theory rather than forcing the economy lens onto it.

### 2.5 Build the progression map — the alignment checkpoint (handbook §10)
For any game with **gated/sequenced content**, the single most important artifact of the pass is the
**progression map**: the ordered spine of milestones, each rung's cost and unlocks, the gates between
them, and **what is actually reachable from a fresh save**. This is where you and the designer *confirm
you are looking at the same game* before tuning a single number — alignment is the deliverable, not
values.

- **Derive it from the code, not by hand** — a map built from the real zone/tier/recipe/cost tables (as
  a pure function) *cannot drift* from the build; a hand-drawn one certifies agreement on a game that no
  longer exists. Model gate affordability **per resource container** if resources are siloed (§10).
- **Detect dead-ends** — walk the gate graph outward from the start state and flag any **circular /
  unreachable gate** (rung B needs X, X comes only from content gated behind B → *softlock*). This
  cross-track failure is invisible on any single cost curve.
- **Render it visual + interactive** so the designer can actually review it, and **assert it with a
  test** that pins the progression shape, so a later structural change that re-opens a lock breaks CI.
- **Get explicit sign-off**: *Is this the intended order? Anything reachable too early, or walled that
  shouldn't be? Is every gate's demand producible by the time the player hits it?* Only once the map is
  agreed do the step-1 KPI targets attach to real rungs.

### 3. Model before tuning
Draw the faucet→converter→drain flow and write the governing formulas (handbook §3–4). Identify the
feedback loops and the cost-vs-reward curves. **Name the failure mode if you see one** — e.g. "income is
linear but the sink curve is exponential, so without a multiplier the late game stalls (the *cliff*)."
This step is where the skill earns its keep: it tells the designer *what is and isn't possible* given the
current shape, before anyone touches a number.

### 4. Instrument — build the measurement if it doesn't exist
You cannot balance what you cannot measure. Confirm a **deterministic simulation harness** exists that
drives the *real* game logic headlessly. If none does, **propose its design and scaffold it** (gated on
the user's OK): a seeded auto-player that runs the real rules and reports the KPIs from step 1. Prefer
seeded determinism (same seed → identical result) so a change's effect is attributable.

### 5. Diagnose with data, not vibes
Run the harness. Read the metrics against the targets: per-unit economy, **dominant-strategy spread**
(does one option/family dominate? handbook §1), and **progression pacing** (runs/time to each milestone).
Report what the data says, including *what it can't tell you* (telemetry gives the *what/where*, not the
*why* — pair it with judgment).

### 6. Propose — compute, THEN propose
Chain-of-thought discipline: **first** compute current income (per run and per session), **then** the
sink/cost curve, **then** the gap. Only now propose changes. Each proposed knob change states:
- the knob (dotted path / `file:line`), current → proposed value;
- the **predicted effect, via formula** (not "feels better");
- **which goal/KPI it serves.**

**Change one lever family at a time** so the re-test attributes the effect. Use estimation heuristics
(handbook §8): bracket with **intentional overshoot**, don't micro-nudge.

### 7. (Optional, serious passes) Dialectic review
For a high-stakes change, spin up adversarial subagents with distinct lenses — *systems* (does the math
hold?), *game-feel* (does it serve the intended feel?), *safety* (saves/migrations, does it break an
existing test/audit?) — and have them critique the proposal before you apply it. Free; off by default.

### 8. Apply on OK → re-test → attribute
On the user's go-ahead, edit the knob(s) (or stage via the game's own tuning UI if it has one), re-run the
harness, and **diff the metrics**. Confirm the predicted effect landed. Iterate until the KPIs are met or
the user stops. Every code edit is confirmation-gated — this skill advises and applies, it does not
autonomously tune.

### 9. Record + guard
Update the Balance Profile (decision log + any changed targets). Update any metrics snapshot intentionally
(and only intentionally). Keep generated docs / wikis in sync with the new numbers. Run the project's
pre-PR checks before opening a PR.

---

## Cross-cutting: research the web as needed
The handbook can't cover every genre or the latest practice, so treat the open web as a live source. Use
`WebSearch` / `WebFetch` (escalate to a `deep-research` skill for a deeper multi-source pass) when: the
goals interview surfaces a concept the user wants explained with current examples; the game's genre is
outside the handbook's scope; a pricing/curve choice would benefit from how comparable games solve it; or
the user asks for state-of-the-art techniques. Discipline: **handbook first**, research to fill gaps,
**verify and cite sources**, separate handbook-grounded claims from freshly-researched ones, and **fold
durable, verified findings back** into [the handbook](references/balance-handbook.md) (genre-tagged,
cited) or the per-game Profile — so the skill gets smarter instead of re-researching the same thing.

## The per-game Balance Profile
Generated on first use, version-controlled in the game's repo:
- **A design doc** (a self-contained HTML doc under the repo's docs/ folder is ideal): goals & KPI
  targets, the faucet/drain economy map + formulas, target curves, the knob registry, and a decision log.
  The artifact you'd review with another designer. **Write it up with the `design-doc` skill** —
  decisions-only prose, the design split from the status/decision-log and from the generated numbers, and
  *rewritten from blank* when decisions change rather than edited in place (so it doesn't accrete into a
  rambling sticky-note journal).
- **A progression map** (handbook §10) — the interactive, **code-derived** timeline of the spine, gates,
  unlocks, reachability, and any softlock. The alignment artifact; render it visual and back it with a
  shape-pinning test so it can't drift.
- **A machine-readable config** (e.g. `profile.json`): knob paths, core formulas, harness entry/commands,
  KPI target bands. The skill reads this on load to resume on a known game.
- Keep it **thin** — game-specifics and decisions only. Theory stays in the handbook (so it never drifts
  between games).

## Memory (cross-game)
After a pass, persist the designer's durable preferences as `feedback`/`user` memories ("prefers cozy,
anti-grind pacing"; "no real-money mechanics"; "wants every resource family viable"). These are about
*the designer*, not any one game, so they should carry to the next game this skill is pointed at.

## References
- **[balance-handbook.md](references/balance-handbook.md)** — the genre-aware theory: what balance is (§1),
  the genre map of what-applies-where (§2), curves & the cliff (§3), the internal economy & work-backward
  targeting (§4), setting a principled value (§5), feedback loops & fairness (§6), content-economy hygiene
  (§7), estimation heuristics (§8), simulation discipline (§9), the progression map & softlock detection (§10).
- **[sharp-edges.md](references/sharp-edges.md)** — the guardrails: the mistakes this skill must not make,
  plus a slot for per-game pitfalls.

---

## Instance #1 — puzzleDrag2
This skill was proven on puzzleDrag2 (a single-player, turn-based, transitive-economy farming game). Its
Balance Profile lives at `reference/docs/balance/index.html` — the **single, comprehensive, player-first
design doc** (Overview → ① Journey → ② Systems → ③ Economy/Balancing → ④ Findings/Gaps → ⑤ Spine/Simulation
→ Decision log; the standalone journey doc was folded in and the older progression-redesign / zone-tier-ladder
specs archived to `reference/docs/archive/`) — plus `reference/docs/balance/profile.json` (machine config).
The **live progression spine** is the separate, code-generated `reference/docs/balance/progression-timeline.html`
(the can't-drift alignment artifact — handbook §10; kept focused as the generated data view, not prose).
Three artifacts, one job each: authored narrative (index.html) · generated spine (progression-timeline.html)
· machine config (profile.json). Its measurement harness is the seeded playtest rig:
- `npm run playtest` — per-run economy + the family-value spread audit;
- `npm run playtest -- --campaign --zones home --runs 30 --seed 1` — progression *pacing* (runs-to-coin-
  milestone + the tier-stall finding, by actually playing);
- `npm run playtest -- --progression` — the *structural* spine: fresh-save reachability + the per-zone
  siloed oracle + softlock detection, derived from the constants (no runs played). Rewrites the
  progression-timeline data block and emits `progression.json`. Also **diffs against the committed
  baseline** (`reference/docs/balance/progression.baseline.json`) and flags what changed since the last
  review — the dashboard marks changed facts as outdated. Once reviewed, `--progression --accept` promotes
  the current spine to the baseline. Guarded by the progression-shape + diff snapshots in
  `src/__tests__/playtest-harness.test.ts`.

Load the Profile to resume a balance pass there.
