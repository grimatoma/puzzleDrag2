# Fish Board — Scoping

Working notes for adding a third biome ("fish" / "harbor" / "shoal") alongside
Farm and Mine. Not a commitment — a sketch of what it would touch and the
shape of the design choices that need to be made before implementation.

## Pitch

A coastal puzzle board where the player drags adjacent matching fish/shellfish
tiles. The biome's twist is **tide**: a cycle that mutates the board state
between turns (tide in / tide out), changing which tiles are reachable, what
spawns, and what chains do. Output is a new resource line — fish → fillet →
preserved fish → barrels — feeding new recipes (chowder, fish oil, soup) and
new orders.

## Why this biome

- Adds a third board with mechanics distinct from Farm (passive growth + weather)
  and Mine (hazards + countdown ore). Tide is a recurring, **predictable**
  modifier — the player can plan around it, unlike weather.
- Unlocks a parallel resource chain so high-level players have a third way to
  earn coins; gives the Castle Needs / Festival larder a new pillar.
- Reuses existing infrastructure (biome switching, slice composition, save
  field). Marginal cost is mostly content: textures + recipes + balance.

## Scope summary

Files / systems that would be touched:

| Layer            | What changes                                                                                                                  |
|------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `constants.js`   | New `BIOMES.fish` entry, `MINE_ENTRY_TIERS`-style entry costs, fish tile pool with `UPGRADE_THRESHOLDS` per resource          |
| `state.js`       | `fish: { savedField: null, tide: 0 }` slot on `createFreshState`; extend `SET_BIOME` allowlist; `CLOSE_SEASON` snapshot path |
| `features/fish/` | New feature dir with `slice.js` (tide tick, special chain rules) + `index.jsx` (Harbor view if needed)                        |
| `GameScene.js`   | Tide-driven background tint and tile-mask rendering; per-biome spawn weights for fish pool                                    |
| `textures/categories/fish.js` | New tile art for ~10 fish/shellfish + tide-state overlays                                                       |
| `migrations.js`  | **N/A** — migrations are no longer maintained; bump `SAVE_SCHEMA_VERSION`                                                     |
| Tests            | New `src/__tests__/fish-*.test.js` for tide cycle, chain product, save round-trip                                             |
| Tutorial         | New step explaining tide once player first enters fish biome                                                                  |
| Almanac / Quests | New entries for fish resources; new daily quest pool                                                                          |

## Mechanics — open design questions

Each of these needs a call before implementation. Defaults shown in **bold**.

1. **Entry cost.** Mine uses `MINE_ENTRY_TIERS` (free / `100◉ + 10 shovels` /
   `2 runes`). Fish could mirror this — defaults: **free at level 3 once
   harbour is built; `200◉ + 10 wood_plank` to construct harbour**.
2. **Board dims.** Keep the same `COLS=6 / ROWS=6` board so existing layout
   logic and HUD don't bend. (Alternative: 7×5 for a "wider sea" feel — more
   work, mostly UI.)
3. **Tide cycle.**
   - **Default: tide flips every 3 turns** (high → low → high). On change,
     the bottom row of tiles is replaced — high tide spawns surface fish
     (sardines, mackerel), low tide exposes shellfish + flotsam.
   - Alternative: tide is global on the season clock (turns 1–5 high, 6–10 low).
4. **Special tiles.**
   - **Driftwood**: appears at low tide; chained ≥3 yields wood + a chance to
     reveal a Pearl tile. Pearl chained with ≥2 fish is a Rune (mirrors mine's
     mysterious-ore mechanic).
   - **Net**: a tool/buyable that, when armed, grabs all fish of one type in a
     row (mirrors Magic Wand but row-restricted).
5. **Resource chain.**
   - Sardine (5) → Fish (raw)
   - Fish (6) → Fillet
   - Fillet + 1 salt (recipe) → Preserved Fish
   - Preserved Fish (4) → Barrel (terminal)
   - Pearl is its own off-chain output, like Runes.
6. **Recipes that use fish.**
   - Chowder: 2 fillet + 1 milk + 1 vegetable → 1 chowder (sells well)
   - Fish oil: 3 fish → 1 fish oil (used by tools)
   - Castle bonus: late-game Castle Needs accept Preserved Fish for a chunk
     of contribution.
7. **Workers / apprentices.** One new harbour worker — **Fisher** — reduces
   chain threshold for fish-category tiles, mirroring Farmer / Miner.
8. **Boss interaction.** Existing `boss` slice already supports per-biome
   spawn bias. New boss: **Storm** — restricts player to chains of 4+ on the
   fish board for 1 turn. Drops at level 6.

## Data shapes (sketch)

```js
// constants.js
export const BIOMES = {
  farm: { /* unchanged */ },
  mine: { /* unchanged */ },
  fish: {
    name: "Harbor",
    icon: "anchor",
    bg: 0x2a4a6a,
    unlockLevel: 3,
    entry: { coins: 200, wood_plank: 10 }, // one-time harbour build
    pool: [
      { key: "fish_sardine", weight: 30 },
      { key: "fish_mackerel", weight: 24 },
      { key: "fish_clam", weight: 18 },     // low-tide only
      { key: "fish_kelp", weight: 18 },
      { key: "fish_driftwood", weight: 6 },  // low-tide only
      { key: "fish_pearl", weight: 0 },      // spawned conditionally
    ],
  },
};

// features/fish/slice.js — tide state
export const initial = {
  fish: { savedField: null, tide: "high", tideTurn: 0 },
};

// CLOSE_SEASON resets tideTurn = 0; END_TURN advances it; at tideTurn % 3 === 0
// flip tide and dispatch a board mutation event the scene listens for.
```

## Texture cost

10 new tile icons (sardine, mackerel, fish, fillet, preserved fish, barrel,
clam, kelp, driftwood, pearl) plus 2 background variants (high/low tide) plus
a harbour building portrait. Roughly 1.5 days of canvas work matching the
existing style; the `resource-add` skill walks the multi-file pipeline.

## Risks / things to watch

- **Save bloat.** Each biome adds a `savedField` slot; not free in storage but
  trivial in practice (~3KB max per slot).
- **Tide UX.** If tide is too sudden, players will lose chains they were
  building. Default mitigation: queue tide change to fire **after** the player
  ends a chain, never mid-drag. Show a 1-turn warning bubble before the flip.
- **Balance.** Fish coins-per-chain has to undercut mine's gem chain or
  mine becomes redundant; or differentiate by making fish primarily feed
  recipes (chowder) rather than direct sale.
- **Carto / map.** `cartography` slice currently lists Farm + Mine. Adding a
  third node means a new portrait, a travel path, and probably a new music cue.

## Implementation order if green-lit

1. **Skeleton:** add `BIOMES.fish`, slice, `SET_BIOME` plumbing, fresh-board
   spawn — no special mechanics yet. Confirm biome switching + save survive.
2. **Textures:** sardine, mackerel, fish, kelp, clam first (chain core).
3. **Tide:** tide state + 3-turn flip + bottom-row mutation. Visual polish later.
4. **Recipes:** add chowder + fish oil; wire bakery/workshop UI.
5. **Pearl + Runes:** mirror mysterious-ore code path.
6. **Worker:** Fisher.
7. **Boss:** Storm modifier.
8. **Tutorial step:** triggers on first entry.
9. **Achievements / quests / castle.**

Steps 1–3 are the minimum viable fish board; the rest are layered content.
