/**
 * Board animation documentation for each tool power id.
 * Surfaced in Dev Panel → Tool powers. Timing presets live in boardAnimations.js;
 * per-item `anim` / `ms` on tool rows in constants.js are designer labels (wired
 * to Phaser only where noted below).
 */

export const TOOL_POWER_BOARD_ANIMATION = Object.freeze({
  clear_all: Object.freeze({
    summary:
      "Legacy effect id — superseded by clear_category. Kept for back-compat on ITEMS.effect. No runtime handler.",
    boardPreset: null,
    variants: Object.freeze([]),
  }),

  clear_category: Object.freeze({
    summary:
      "Instant tools mutate the grid in applyToolPower (reducer). Typed tools do not call playBoardAnimation yet — ITEMS anim/ms describe the intended sweep look. Legacy rake / axe / magic_wand still use hardcoded Phaser sweep paths.",
    boardPreset: "sweep",
    variants: Object.freeze([
      Object.freeze({
        label: "Typed instant tools (fruit_picker, hoe, bird_cage, …)",
        wired: "reducer",
        boardPreset: null,
        notes: "sweepTileKeys → grid sync. Per-item anim/ms in constants.js are catalog-only until Phaser reads them.",
      }),
      Object.freeze({
        label: "Rake (legacy tap, 4-connected)",
        wired: "phaser",
        boardPreset: "sweep",
        tint: 0x88ff88,
        handler: "GameScene._applyToolRake",
      }),
      Object.freeze({
        label: "Axe (legacy tap, full row)",
        wired: "phaser",
        boardPreset: "sweep",
        tint: 0xff9900,
        handler: "GameScene._applyToolAxe",
      }),
    ]),
  }),

  fill_bias: Object.freeze({
    summary: "No board tween on spend — sets fertilizerActive (or magic_fertilizer counter) for upcoming fillBoard().",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Fertilizer / bird_feed / sapling / magic_fertilizer",
        wired: "flag",
        boardPreset: null,
        notes: "ITEMS anim shimmer/scatter are not wired to Phaser.",
      }),
    ]),
  }),

  transform_tiles: Object.freeze({
    summary: "Instant grid key swap in applyToolPower — no playBoardAnimation. ITEMS anim labels (sweep, shimmer, pick) are flavor for future VFX.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "bee, drill, golden_*, trimmer, fertilizer (migrated)",
        wired: "reducer",
        boardPreset: null,
        notes: "applyTransformAll mutates matching cells in place.",
      }),
    ]),
  }),

  transform_adjacent: Object.freeze({
    summary: "Tap-target: arms toolPendingPower, fires on TOOL_FIRED with radius. Reducer-only today — no Phaser tween.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Magnet / coal_transmuter",
        wired: "reducer",
        boardPreset: null,
        notes: "applyTransformAdjacent at tap cell; ITEMS anim shimmer.",
      }),
    ]),
  }),

  area_blast: Object.freeze({
    summary:
      "Tap-target clear in radius. Legacy bomb uses GameScene sweep; typed area_blast (explosives power field) may still route through legacy USE_TOOL until fully migrated.",
    boardPreset: "sweep",
    variants: Object.freeze([
      Object.freeze({
        label: "Bomb (legacy tap, 3×3)",
        wired: "phaser",
        boardPreset: "sweep",
        tint: 0xff4444,
        handler: "GameScene._applyToolBomb",
      }),
      Object.freeze({
        label: "Typed area_blast (when not legacy-routed)",
        wired: "reducer",
        boardPreset: null,
        notes: "applyAreaBlast in boardMutations.js.",
      }),
    ]),
  }),

  tap_clear_type: Object.freeze({
    summary: "Magic Wand — tap then sweep every tile matching the tapped key.",
    boardPreset: "sweep",
    variants: Object.freeze([
      Object.freeze({
        label: "Magic Wand",
        wired: "phaser",
        boardPreset: "sweep",
        tint: 0xa070ff,
        handler: "GameScene._applyMagicWand",
      }),
    ]),
  }),

  undo_move: Object.freeze({
    summary: "Hourglass — restores lastChainSnapshot. No board animation.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Hourglass",
        wired: "reducer",
        boardPreset: null,
      }),
    ]),
  }),

  restore_turns: Object.freeze({
    summary: "Magic Seed — adds turns to farmRun. No board animation.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Magic Seed",
        wired: "reducer",
        boardPreset: null,
      }),
    ]),
  }),

  reveal_tiles: Object.freeze({
    summary: "Miner's Hat — flips hidden:true on matching ore cells. No tween until hidden tiles spawn on the board.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Miner's Hat",
        wired: "reducer",
        boardPreset: null,
        notes: "applyRevealTiles; no-op when no hidden cells exist.",
      }),
    ]),
  }),

  clear_hazard: Object.freeze({
    summary: "Clears hazard state (and rat cells on grid). No playBoardAnimation.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Cat / rifle / terrier",
        wired: "reducer",
        boardPreset: null,
        notes: "ITEMS anim scatter/shot are catalog-only.",
      }),
    ]),
  }),

  scatter_hazard: Object.freeze({
    summary: "Timed wolf scare (5 turns). Reducer only.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Hound",
        wired: "reducer",
        boardPreset: null,
        notes: "ITEMS anim bark / ms 400 are catalog-only.",
      }),
    ]),
  }),

  water_pump: Object.freeze({
    summary: "Lava Damper — clears lava hazard / rubble in state. No tile sweep animation.",
    boardPreset: null,
    variants: Object.freeze([
      Object.freeze({
        label: "Water Pump",
        wired: "reducer",
        boardPreset: null,
      }),
    ]),
  }),

  explosives: Object.freeze({
    summary: "Legacy mine tool id — ITEMS.explosives.power is area_blast. Hazard clear path may still use legacy USE_TOOL branch.",
    boardPreset: "sweep",
    variants: Object.freeze([
      Object.freeze({
        label: "Explosives (legacy)",
        wired: "reducer",
        boardPreset: null,
        notes: "Clears mole + caveIn hazards when legacy branch runs.",
      }),
    ]),
  }),
});
