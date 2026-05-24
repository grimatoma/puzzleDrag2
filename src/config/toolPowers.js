// Tool Powers catalog — the single source of truth for every active effect
// that a tool item can trigger when the player spends it.
//
// Each entry declares:
//   - id     — stable string used by items data (matches the `effect` field on tool items)
//   - name   — human-readable name shown in the Balance Manager
//   - desc   — short description of the effect
//   - params — schema for the editor + runtime arguments (may be empty)
//
// Contrast with Attributes (src/config/abilities.js) which are *passive* modifiers
// always active while their source is present. Tool Powers are *active* — the player
// deliberately spends the tool item to trigger the effect.

export const TOOL_POWER_PARAM_TYPES = Object.freeze({
  RESOURCE_KEY: "resourceKey",
  HAZARD: "hazard",
});

export const TOOL_POWERS = Object.freeze([
  {
    id: "clear_all",
    name: "Clear All Tiles",
    desc: "Sweeps every tile matching the target resource from the board.",
    params: [{ key: "target", label: "Target Resource", type: "resourceKey" }],
  },
  {
    id: "fill_bias",
    name: "Fill Bias",
    desc: "Biases the next board fill toward the target resource.",
    params: [{ key: "target", label: "Target Resource", type: "resourceKey" }],
  },
  {
    id: "clear_hazard",
    name: "Clear Hazard",
    desc: "Clears all active instances of a hazard from the board.",
    params: [{ key: "target", label: "Hazard", type: "hazard" }],
  },
  {
    id: "scatter_hazard",
    name: "Scatter Hazard",
    desc: "Scares a hazard away for 5 turns.",
    params: [{ key: "target", label: "Hazard", type: "hazard" }],
  },
  {
    id: "water_pump",
    name: "Water Pump",
    desc: "Converts every lava cell on the mine board to stone rubble.",
    params: [],
  },
  {
    id: "explosives",
    name: "Explosives",
    desc: "Clears mole + cave-in hazards from the mine.",
    params: [],
  },
]);

const TOOL_POWER_BY_ID = Object.freeze(
  Object.fromEntries(TOOL_POWERS.map((p) => [p.id, p])),
);

export function getToolPower(id) {
  return TOOL_POWER_BY_ID[id] ?? null;
}

/** Default param object for a tool power id. */
export function defaultsForToolPower(powerId) {
  const p = TOOL_POWER_BY_ID[powerId];
  if (!p) return {};
  const out = {};
  for (const param of p.params) {
    out[param.key] = param.default ?? "";
  }
  return out;
}
