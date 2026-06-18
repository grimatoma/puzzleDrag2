---
name: wiki-content
description: Author or edit the in-app Wiki's hand-written prose (src/balanceManager/content/**/*.html) without it drifting from the game. Use whenever you add or change a narrative page (Overview, Direction, Balance, Story, Zones, Future) or a per-entity body (a building/resource/zone/boss/hazard description), when a wiki page states a number/roster/cost/tier that disagrees with code, when reviewing the wiki for staleness, or when you change game data (tiers, costs, plots, building rosters) and a wiki page describes it. Covers the generated-vs-authored split, the live fact-injection placeholders (data-wiki-tier-ladder / data-wiki-fact) that make structured facts un-driftable, the guard tests that fail CI on dangling keys or re-typed ladders, and the rule that code is truth.
---

# wiki-content — keep authored wiki prose from drifting

The Dev Panel Wiki (`/b/#`, code under `src/balanceManager/wiki/`) is **two layers**:

1. **Generated catalog — CANNOT drift.** Every tile/resource/recipe/building/boss/zone
   page is built live from the source maps the game runs on (`ITEMS`, `BUILDINGS`,
   `RECIPES`, `ZONES`, `BOSSES`, …) via `concepts.ts`, `infoboxFacts.ts`,
   `conceptStats.ts`, the `sections/*` components. Change a value in code → the
   wiki changes with it. Never duplicate this in prose.
2. **Hand-authored prose — THE ONLY DRIFT SURFACE.** The HTML fragments under
   `src/balanceManager/content/**/*.html` supply the *why*, the plans, the world.
   They are rendered through `HtmlBody.tsx`. This is the file you edit — and the
   only place the wiki can go out of sync with the game.

**The failure this skill prevents:** prose that hard-types a structured fact
(tier-ladder rungs, plot counts, upgrade costs, building rosters, sell values,
turn budgets) which then goes stale when code changes. The PC2 cost port did
exactly this — the Direction page claimed a 3-rung Hamlet→City home ladder while
the code shipped a 6-rung Camp→Manor ladder, and the Balance page showed coin
costs that no longer existed.

## The rule

> **Code is truth. If prose and code disagree, fix the prose in the same change.**
> Don't hand-type a fact you can derive — inject it, or defer to a generated section.

## How to keep a fact from drifting (in priority order)

### 1. Inject it live — `data-wiki-tier-ladder` and `data-wiki-fact`

`HtmlBody.tsx` swaps two placeholder elements for live, code-derived components
(see `derivedFacts.tsx`). Use them instead of typing the numbers:

```html
<!-- A whole settlement-tier ladder: rung names, plots, per-rung unlocks, cost.
     Reads ZONES[zoneId].tiers at render time — cannot drift. -->
<div data-wiki-tier-ladder="home"></div>
<div data-wiki-tier-ladder="quarry"></div>

<!-- An inline scalar fact, e.g. inside a heading or sentence. -->
home · <span data-wiki-fact="zone.home.rungCount"></span> rungs
the <span data-wiki-fact="zone.home.ladderSpan"></span> ladder   <!-- "Camp → Manor" -->
locked until <span data-wiki-fact="zone.quarry.gate"></span>      <!-- "Hearthwood Vale at City" -->
```

`data-wiki-fact` keys (all `zone.<id>.<field>`): `name`, `boardKind`, `baseTurns`,
`entryCoins`, `level`, `rungCount`, `plotsTop`, `plotsByTier`, `firstTierName`,
`topTierName`, `ladderSpan`, `tierNames`, `gate`, `dangerCount`. Need another?
Extend `resolveFact()` in `derivedFacts.tsx` — keep it reading only the live
source-of-truth maps, never a copied constant.

### 2. Defer to a generated section

Per-entity pages already render the structured facts: buildings show a **Cost to
build** chip + an abilities section; recipes show their IO; zones show drop rates
and the tier infobox. So in a building/resource body, describe the cost
*qualitatively* ("planks and a few refined goods, shown above") — never restate
the exact numbers, and never claim a coin cost (building/tier costs are
**resource-only**; coins are spent on founding and the Market, not construction).

### 3. Only then, plain prose — and keep it qualitative

If a fact genuinely can't be derived (a design intention, a tuning rationale),
write it as intent, not as a hard number that will rot ("a moderate run-budget",
not "~15–25 runs"). Add a `data-wiki-fact` if a concrete anchor is needed.

## Guard tests (these fail CI — satisfy them, don't bypass)

- `derivedFacts.test.ts` — every `data-wiki-fact` key in content must resolve
  (no dangling keys ship); every `data-wiki-tier-ladder` id must be a real tiered
  zone; the generated rows must track `ZONES`; and the economy pages
  (`pages/direction`, `pages/balance`) must use the **embed**, not a hand-typed
  ladder/cost `<table>` (a `<th>Plots</th>` / `<th>…cost</th>` there fails — this
  is the reverse-drift guard).
- `htmlContent.test.ts` — every fragment loads and every `[[wikilink]]` resolves.
- `staleContent.test.ts` — forbidden tokens that name removed systems
  (`balance.json`, `docs/engineering/`). When you remove or rename a system, add
  its old token here in the same change.

Run: `node ../../../node_modules/vitest/vitest.mjs run src/balanceManager/wiki`
(worktrees have no local `node_modules`; use the parent binary).

## Re-auditing for drift

To re-check the whole wiki against code, audit each `content/**/*.html` fragment
against its authoritative code module (tier/cost/plot facts → `cartography/data.ts`
`MAP_NODES[*].tiers`; building costs/abilities → `constants.ts` `BUILDINGS`;
resource values/production → `ITEMS`/`RECIPES`; bosses/hazards → their feature
data). Confirm every concrete claim; treat code as truth. A multi-agent Workflow
(one auditor per content group + an adversarial verifier) is the thorough way to
do this comprehensively.

## Checklist before committing a content edit

- [ ] No hand-typed tier ladder, plot count, cost table, or building roster that
      `data-wiki-tier-ladder` / `data-wiki-fact` could supply.
- [ ] No exact build/tier cost numbers in prose; no "coins" claimed for a
      building or tier upgrade (those are resource-only).
- [ ] Every number/name/roster still matches code (open the cited module).
- [ ] `[[wikilinks]]` resolve; the wiki tests pass.
