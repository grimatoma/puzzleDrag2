# balance.json schema

Dev Panel and committed tuning overrides. **Canonical game data** (ITEMS, RECIPES, ZONES, …) lives in TypeScript; this file only patches existing ids. This doc is the *contributor* reference for the override **file format**; for the per-field meaning of each attribute (what `value`, `next`, `effect`, … mean on a given concept) see that concept's page in the Game Wiki at `/b/`, whose field reference is generated from the same Zod schemas.

Runtime validation: `balanceSchema` in [`schemas/balance.ts`](schemas/balance.ts), applied at load via `parseBalanceOverrides` in [`schemas/parseBalance.ts`](schemas/parseBalance.ts).

- **DEV:** invalid document throws at startup.
- **PROD:** invalid document is ignored (warn-once); game uses defaults.

## Top-level keys

| Key | Purpose |
|-----|---------|
| `version` | Draft format version (default `1`) |
| `upgradeThresholds` | Per-resource upgrade threshold overrides (positive integers) |
| `items` | Patch rows in `ITEMS` (see item overrides below) |
| `resources` | Legacy alias for `items` |
| `recipes` | Patch `RECIPES` by recipe id |
| `buildings` | Patch `BUILDINGS` by building id |
| `tilePowers` | Tile ability/hook overrides (`tilePowers`, not `items`) |
| `tileUnlocks` | Discovery/unlock patches per tile id |
| `tileDescriptions` | Replace tile description string |
| `zones` | Zone/map node patches |
| `workers` | Worker type patches |
| `keepers` | Keeper presentation patches |
| `expedition` | Expedition food-turn tables |
| `biomes` | Settlement biome presentation |
| `tuning` | Global tuning constants |
| `npcs` | NPC gift prefs and bond bands |
| `story` | Story beat presentation patches |
| `flags` | Flag definition patches |
| `bosses` | Boss presentation patches |
| `achievements` | Achievement presentation patches |
| `dailyRewards` | Daily login reward patches |

Field-level documentation is defined in Zod `.describe()` on each schema under [`schemas/`](schemas/).

## Item overrides (`items`)

Allowed patch fields only (unknown keys rejected at parse):

- `label`, `color`, `dark`, `value`, `next`, `glyph`, `description`, `desc`
- `effect`, `target`, `anim`, `ms` (tools)

Keys must already exist in `ITEMS`.

## Tuning (`tuning`)

- `craftQueueHours`, `craftGemSkipCost`, `minExpeditionTurns`, `foundingBaseCoins`, `foundingGrowth`, `homeBiome`, `fireHazardEnabled`

## CI validation

Canonical config shape is checked in Vitest (`src/__tests__/configSchemas.test.ts`), not on every game load.
