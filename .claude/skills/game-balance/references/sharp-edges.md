# Sharp edges — balancing mistakes to avoid

Guardrails for a balance pass. The generic ones apply to any game; append game-specific ones to the
"per-game" section (or the game's Balance Profile) as you discover them.

## Method guardrails

- **Numbers before goals.** Never tune before the goals interview. A change that "feels better" with no
  stated objective is a precise wrong answer. Goal → KPI → predicted effect → change. In that order.
- **Propose before you compute.** Always compute current income (per run *and* per session) and the sink
  curve *first*; only then propose. A proposal without the arithmetic in front of it is a guess.
- **Changing more than one lever family at once.** If you move two unrelated knobs and re-test, you can't
  attribute the result. One lever family per iteration.
- **Micro-nudging toward a target.** Bracket with intentional overshoot (set it clearly too high, measure,
  then close in). Repeated ±5% nudges waste iterations.
- **Trusting telemetry to tell you *why*.** Sim/metrics give you the *what* and *where* (this resource
  dominates; pacing stalls at run 12). The *why* is a human call — pair data with judgment.
- **Balancing for the average only.** Check the spread (stdev), not just the mean. A fine mean with huge
  variance is a different game for the unlucky player. Check the tails.
- **Equality as the goal.** Perfectly equal options destroy meaningful choice. Aim for *viable and
  distinct* (each best in some context), not *identical*. (Handbook §1.)
- **Importing the wrong genre's theory.** Don't apply combat/PvP math (TTK, Lanchester, RPS/Nash, frame
  data) to a single-player economy, or vice-versa. Check the genre map (handbook §2); web-research the
  genre's canon if the handbook doesn't cover it.

## Engineering guardrails

- **You can't balance what you can't measure.** If there's no deterministic sim, build one before tuning.
  Prefer seeded determinism (same seed → identical result) so effects are attributable and tests are
  stable.
- **Silent metric drift.** A balance change *should* move the numbers — so it should also update any
  committed metrics snapshot, *intentionally*. Never `--update` a snapshot without reading the diff.
- **Save/economy migrations.** Changing the *shape* of persisted economy state (not just a value) can
  invalidate or corrupt existing saves. Check whether a change needs a save-version bump / migration
  before shipping it. Changing a value usually doesn't; changing a structure usually does.
- **Doc / wiki drift.** If a number is also stated in prose (a wiki, a design doc, a tutorial), changing
  the constant without the prose creates a lie. Update both, or inject the value so it can't drift.
- **Fakes in the harness.** The sim must drive the *real* game rules. A harness that re-implements the
  payout math will agree with itself and lie to you. Read state after the real logic runs.

## Per-game sharp edges
> Append game-specific footguns here (or in the game's Balance Profile) as you find them — the unlock
> gates, the circular dependencies, the "this number is read in three places," etc.

### puzzleDrag2
- **Cross-subsystem progression gates.** The home tier ladder is resource-gated and pulls in *crafted*
  (`bread`) and *cross-zone* (`block`, `coke`, `silver_bar`) inputs. A farm-only loop legitimately stalls
  before tier 1 — confirm whether that gating is intended before "fixing" the farm economy in isolation.
- **Coin pacing ≠ progression pacing.** Coins accumulate cleanly from farm runs (founding prices are
  coin-gated and exponential: `300 × 1.7^(k-1)`), but tier-ups are *resource*-gated. Measure both; they
  answer different questions. The campaign harness (`--campaign`) reports each separately.
- **The family-value spread audit is a guarded invariant.** `src/playtest/` pins the realized
  value-per-tile spread (e.g. pearls ≈ 133/tile vs pie ≈ 12.9/tile, flagged >3× median). Changing an
  `ITEMS[].value` moves it and breaks the snapshot test by design — update the snapshot intentionally.
- **Reducer slice footgun.** New action types must be registered (see the repo's `check-slice-action`
  skill) or they silently no-op. Balance changes that add actions are subject to this.
