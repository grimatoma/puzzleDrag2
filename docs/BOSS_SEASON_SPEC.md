# Boss Season Design Spec (Phase 39 Proposal)

## Goals
- Make boss seasons a strategic climax rather than a one-modal event.
- Preserve the current resource-target clarity while adding meaningful tactical pressure.
- Ensure every boss modifier has visible board impact and counterplay.
- Keep losses recoverable so campaign momentum continues.

## Existing Baseline (Implemented)
- Bosses trigger via `BOSS/TRIGGER`, resolve via `BOSS/RESOLVE`, and are cleared from state on completion/failure.
- Boss progress advances from `CHAIN_COLLECTED` (resource-gated) and, for Ember Drake, from forging ingot recipes.
- Boss appears every 4th season in current scheduler; weather rolls on non-boss seasons.
- UI currently supports a boss modal and minimized encounter card with progress + turns-left.

## Proposed Player-Facing Loop

### 1) Omen Season (Preparation)
The season immediately before a boss encounter becomes a prep phase.

#### UX
- Show an **Omen Banner** in HUD:
  - Upcoming boss name + portrait
  - Primary target resource and amount
  - One-line board modifier warning
  - Suggested prep tools/buildings

#### Systems
- Add 2-3 **Preparation Objectives** (optional):
  - Example: “Craft 2 bombs” → `+1 Shatter Charge` (consumable that clears rubble)
  - Example: “Chain 3 berry combos” → `+1 Scout Pulse` (reveals hidden tiles)
- Prep rewards are **boss-season-only consumables** that expire at season end.

#### Design Intent
- Turns boss from surprise punishment into planned climax.
- Connects town/crafting/economy to boss outcomes.

---

### 2) Boss Season (Encounter)
Boss season has two simultaneous success axes.

#### Axis A: Primary Objective (existing style)
- Keep current readability: collect/forge target resource in limited turns.
- Preserve boss-specific target identity (e.g., wood, hay, ingot, fish).

#### Axis B: Pressure Meter (new)
- Add `boss.pressure` from 0–100.
- Pressure reaching 100 causes immediate encounter failure.
- Pressure shifts per action:
  - Violating boss rule: +10 to +20
  - Valid high-skill plays: -5 to -15
  - Tool counterplay: situational pressure reduction
- Display as a second progress bar under objective progress.

#### Why Pressure?
- Prevents single-resource brute-force.
- Creates tactical decisions under constraint.
- Allows richer “win quality” reward scaling.

---

### 3) Aftermath Season (Consequence)
Resolve into a short-lived post-encounter state.

#### On Victory
- Keep base rewards (coins/rune/XP), then offer a **1-of-3 Victory Trait** for 2 seasons:
  - +spawn bias in boss biome
  - +1 first-upgrade bonus on first chain each turn
  - -X% worker wage burden

#### On Defeat
- Apply a 1-season **Lingering Scar**:
  - mild spawn penalty, slower tool regen, or one persistent hazard
- Add a **Recovery Objective** to remove scar early.

#### Design Intent
- Outcomes remain meaningful without soft-locking progression.

## Boss Identity Kit (Per-Boss Mechanic Plan)

### Frostmaw (Winter)
- Current identity: high min-chain.
- Proposed full modifier: **Frozen Columns**
  - 2 columns are frozen and cannot chain.
  - Thaw via adjacent fire chain or Torch consumable.
- Pressure gain:
  - failed short chain while frozen board active: +12

### Quagmire (Spring)
- Current identity: hay/log spawn bias.
- Proposed full modifier: **Saturation Patches**
  - Mud patches spread every 3 turns, reducing movement options.
  - Clear by chaining hay adjacent to mud.
- Pressure reduction:
  - clearing patch: -8

### Ember Drake (Summer)
- Current identity: forge ingots, heat theme.
- Proposed full modifier: **Heat Tiles**
  - 1 heat tile spawns per turn.
  - resource on heat tile for 2 turns burns away.
- Counterplay:
  - Water tool or immediate chain on heated tile.

### Old Stoneface (Autumn)
- Current identity: stone objective.
- Proposed full modifier: **Rubble Blocks**
  - 4 blocked tiles occupy board cells.
  - Clear only by adjacent stone chains or bombs.
- Pressure gain:
  - board collapse blocked by uncleared rubble at turn end: +10

### Mossback (Spring alt)
- Current identity: hidden weakness.
- Proposed full modifier: **Hidden Nodes**
  - 4 face-down tiles hide key resources/penalties.
  - reveal through chain inclusion or scout consumable.
- Bonus mastery:
  - revealing all hidden nodes before turn 5 grants pressure shield.

### The Storm (Summer alt)
- Current identity: min chain 4.
- Proposed full modifier: **Slipline Rule**
  - chains <4 consume turn, yield nothing (existing direction).
  - 5+ fish chains apply extra pressure reduction.

## Difficulty & Scaling
Use 3-variable scaling by year:

1. **Target scaling**: increase required amount (modest).
2. **Hazard scaling**: increase modifier intensity.
3. **Counterplay scaling**: increase prep tools available.

### Suggested Year Tuning
- Year 1: target x1.00, hazard x1.00, pressure fail at 100.
- Year 2: target x1.15, hazard x1.20, pressure fail at 100.
- Year 3+: target x1.30, hazard x1.40, pressure fail at 105 with stronger counterplay tools.

## UI/UX Spec

### Boss Modal
Add sections:
1. Objective progress bar (existing)
2. Pressure bar (new)
3. “How to reduce pressure” tips (boss-specific bullets)
4. Available prep consumables with counts
5. Predicted reward tier (Bronze/Silver/Gold) based on finish margin + pressure

### Minimized Boss Card
- Show compact pressure meter + red pulse when `pressure >= 75`.
- Badge for active hazard (`Frozen`, `Rubble`, `Heat`, etc.).

### On-Board Signaling
- Tile overlays/icons for hazard states.
- Explicit toast when a rule violation increases pressure.

## Economy & Progression Integration
- Preparation objectives consume and reward meaningful economy inputs.
- Victory traits encourage adapting subsequent seasons.
- Defeat scars create short-term friction and recovery play.
- Keep all effects bounded to avoid runaway snowball.

## Technical Implementation Blueprint

### State Additions (boss slice)
```js
boss: {
  key,
  progress,
  targetCount,
  turnsLeft,
  minChain,
  pressure,            // 0-100
  hazardState,         // boss-specific runtime payload
  consumables,         // boss-only temporary tools
  rewardTierPreview,   // bronze/silver/gold
}
omen: {
  bossKey,
  prepObjectives,
  prepRewards,
}
aftermath: {
  type,                // victory_trait | lingering_scar
  key,
  turnsLeft,
}
```

### Action Surface
- `BOSS/OMEN_START`
- `BOSS/PREP_OBJECTIVE_PROGRESS`
- `BOSS/START_ENCOUNTER`
- `BOSS/PRESSURE_DELTA`
- `BOSS/USE_CONSUMABLE`
- `BOSS/APPLY_HAZARD_TICK`
- `BOSS/ROLL_AFTERMATH`
- `BOSS/CLEAR_AFTERMATH`

### Reducer Hooks
- `CHAIN_COLLECTED`: objective progress + hazard interaction + pressure deltas.
- `CLOSE_SEASON`: omen scheduling, encounter start, aftermath decay.
- `CRAFTING/CRAFT_RECIPE`: prep objective progress and boss-specific objective routing.

## Balancing Guardrails
- Boss win rate target:
  - Year 1: 65–75%
  - Year 2: 55–65%
  - Year 3+: 45–60%
- Mean turns remaining on win: 1–3.
- Mean pressure at win: 40–70 (high tension without constant wipeouts).
- Scar frequency target: <35% in Year 1, <45% overall.

## Telemetry (for tuning)
Capture per encounter:
- Boss ID, year, win/loss
- Turns used / turns left
- Pressure timeline (per turn)
- Consumables acquired/used
- Hazard-specific fail events
- Reward tier achieved

## Test Plan (Phase 39)

### Unit (boss slice)
1. Omen season schedules correct boss and prep objectives.
2. Pressure increases/decreases from rule violations and counterplay.
3. Pressure reaching threshold triggers loss regardless of progress.
4. Victory trait and lingering scar selection + duration decay.
5. Each modifier updates hazard state deterministically with seeded RNG.

### Integration
1. Full year flow includes omen → boss → aftermath.
2. Weather suppression during active boss remains intact.
3. Economy impact remains bounded (no infinite consumable loops).

### E2E
1. Player can view omen info and complete prep objective.
2. Boss season displays dual bars and hazard hints.
3. Winning yields trait choice; losing applies scar and recovery objective.

## Rollout Plan

### Milestone A — Core Encounter Upgrade
- Add pressure meter + UI and loss condition.
- Implement one fully-realized modifier (Storm or Stoneface).

### Milestone B — Modifier Expansion
- Implement Frostmaw + Ember + one hidden-information boss.
- Add consumables and omen prep objectives.

### Milestone C — Aftermath Layer
- Add trait/scar systems, recovery objectives, and balancing telemetry.

### Milestone D — Polish
- VFX, accessibility text cues, tuning pass, final QA.

## Success Criteria
- Players report boss seasons as a highlight event, not interruption.
- Encounter outcomes feel earned and explainable.
- Build diversity increases due to prep and aftermath systems.
- Engagement improves across years because boss fights change tactical play.
