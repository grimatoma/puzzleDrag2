/**
 * Pure helpers for boss board modifiers.
 * No Phaser references — state-side only.
 */

/**
 * Apply a modifier to a freshly-generated grid, returning the modifierState bag.
 * Mutates tile objects in grid to add overlay flags.
 */
export function applyModifierToFreshGrid(grid, modifier, rng) {
  const { type, params } = modifier;
  if (!grid || grid.length === 0) {
    // Empty grid — return shape-correct modifier state
    if (type === "freeze_columns") return { frozenColumns: [] };
    if (type === "rubble_blocks") return { rubble: [] };
    if (type === "hide_resources") return { hidden: [] };
    if (type === "heat_tiles") return { heat: [] };
    if (type === "respawn_boost") return { boost: params.boost, factor: params.factor };
    return {};
  }

  const rows = grid.length;
  const cols = grid[0].length;

  if (type === "freeze_columns") {
    const picked = new Set();
    while (picked.size < params.n) picked.add(Math.floor(rng() * cols));
    const frozenColumns = [...picked];
    for (const row of grid) for (const c of frozenColumns) row[c].frozen = true;
    return { frozenColumns };
  }

  if (type === "rubble_blocks" || type === "hide_resources") {
    const want = params.count ?? params.hidden;
    const flag = type === "rubble_blocks" ? "rubble" : "hidden";
    // Build a pool of all grid positions, shuffle with rng, take 'want'
    const allCells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) allCells.push({ row: r, col: c });
    // Fisher-Yates shuffle using rng
    for (let i = allCells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = allCells[i]; allCells[i] = allCells[j]; allCells[j] = tmp;
    }
    const cells = allCells.slice(0, Math.min(want, allCells.length));
    for (const { row: r, col: c } of cells) grid[r][c][flag] = true;
    return type === "rubble_blocks" ? { rubble: cells } : { hidden: cells };
  }

  if (type === "heat_tiles") return { heat: [] };

  if (type === "respawn_boost") return { boost: params.boost, factor: params.factor };

  return {};
}

/**
 * tileIsChainable — returns false for frozen, rubble, or hidden tiles.
 * modifier parameter accepted for API compatibility but tile flags are checked directly.
 */
export function tileIsChainable(tile) {
  return !!tile && !(tile.frozen || tile.rubble || tile.hidden);
}

/**
 * tickModifier — advances modifier state one turn.
 * For heat_tiles: increments ages, burns at burnAfter threshold.
 * Returns { newState }.
 */
export function tickModifier(state, modifier) {
  if (modifier.type !== "heat_tiles") return { newState: state };

  const heat = (state.boss?.modifierState?.heat ?? []).map((h) => ({ ...h, age: h.age + 1 }));
  const surviving = [];
  let inv = { ...(state.inventory ?? {}) };

  for (const h of heat) {
    if (h.age > modifier.params.burnAfter) {
      const keys = Object.keys(inv).filter((k) => (inv[k] ?? 0) > 0);
      if (keys.length) {
        const k = keys[Math.floor(Math.random() * keys.length)];
        inv[k] = Math.max(0, inv[k] - 1);
      }
    } else {
      surviving.push(h);
    }
  }

  return {
    newState: {
      ...state,
      inventory: inv,
      boss: {
        ...(state.boss ?? {}),
        modifierState: {
          ...(state.boss?.modifierState ?? {}),
          heat: surviving,
        },
      },
    },
  };
}

/**
 * clearModifier — strips every overlay flag from all tiles in the grid.
 * Called once on boss resolution.
 */
export function clearModifier(grid) {
  if (!grid) return grid;
  for (const row of grid) {
    for (const t of row) {
      delete t.frozen;
      delete t.rubble;
      delete t.hidden;
      delete t.heat;
    }
  }
  return grid;
}
