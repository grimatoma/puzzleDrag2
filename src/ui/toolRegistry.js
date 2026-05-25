/**
 * Player-facing tool catalog for the on-board Tools panel.
 * Generated from canonical `ITEMS` tool entries + `isTapTargetPower`.
 */
import { ITEMS } from "../constants.js";
import { isTapTargetPower } from "../config/toolPowers.js";

const FIELD_TOOLS = new Set(["clear", "basic", "rare", "shuffle", "bomb"]);

function toolCategory(key) {
  if (FIELD_TOOLS.has(key)) return "field";
  if (ITEMS[key]?.kind === "tool") return "workshop";
  return "workshop";
}

function toolArmed(power) {
  if (!power?.id) return "instant";
  if (power.id === "arm_fill_bias" || power.id === "fill_bias") return "passive";
  return isTapTargetPower(power.id) ? "tap" : "instant";
}

function entryFromItem(key) {
  const item = ITEMS[key];
  if (!item || item.kind !== "tool") return null;
  const power = item.power ?? {};
  return {
    key,
    category: toolCategory(key),
    iconKey: item.iconKey ?? key,
    name: item.label ?? key,
    armed: toolArmed(power),
    desc: item.desc ?? power.bubble ?? "",
  };
}

export const TOOL_CATALOG = Object.keys(ITEMS)
  .map(entryFromItem)
  .filter(Boolean);

export const TOOL_BY_KEY = Object.fromEntries(TOOL_CATALOG.map((t) => [t.key, t]));

export const TOOL_CATEGORIES = [
  { key: "field", label: "Field" },
  { key: "workshop", label: "Workshop" },
];

export function isTapTargetTool(key) {
  const power = ITEMS[key]?.power;
  return !!(power?.id && isTapTargetPower(power.id));
}

export function visibleTools(toolsState = {}) {
  return TOOL_CATALOG.map((t) => ({
    ...t,
    count: toolsState[t.key] || 0,
  }));
}
