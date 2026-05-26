/**
 * Player-facing tool catalog for the on-board Tools panel.
 * Generated from canonical `ITEMS` tool entries + `isTapTargetPower`.
 */
import { ITEMS } from "../constants.js";
import { isTapTargetPower } from "../config/toolPowers.js";

const FIELD_TOOLS = new Set(["clear", "basic", "rare", "shuffle", "bomb"]);

const _ITEMS = ITEMS as Record<string, any>;

interface ToolPower {
  id?: string;
  bubble?: string;
  [key: string]: unknown;
}

export interface ToolEntry {
  key: string;
  category: "field" | "workshop";
  iconKey: string;
  name: string;
  armed: "instant" | "passive" | "tap";
  desc: string;
  count?: number;
}

function toolCategory(key: string): "field" | "workshop" {
  if (FIELD_TOOLS.has(key)) return "field";
  if (_ITEMS[key]?.kind === "tool") return "workshop";
  return "workshop";
}

function toolArmed(power: ToolPower): "instant" | "passive" | "tap" {
  if (!power?.id) return "instant";
  if (power.id === "arm_fill_bias" || power.id === "fill_bias") return "passive";
  return isTapTargetPower(power.id) ? "tap" : "instant";
}

function entryFromItem(key: string): ToolEntry | null {
  const item = _ITEMS[key];
  if (!item || item.kind !== "tool") return null;
  const power: ToolPower = item.power ?? {};
  return {
    key,
    category: toolCategory(key),
    iconKey: item.iconKey ?? key,
    name: item.label ?? key,
    armed: toolArmed(power),
    desc: item.desc ?? power.bubble ?? "",
  };
}

export const TOOL_CATALOG: ToolEntry[] = Object.keys(_ITEMS)
  .map(entryFromItem)
  .filter((t): t is ToolEntry => t !== null);

export const TOOL_BY_KEY: Record<string, ToolEntry> = Object.fromEntries(TOOL_CATALOG.map((t) => [t.key, t]));

export const TOOL_CATEGORIES = [
  { key: "field", label: "Field" },
  { key: "workshop", label: "Workshop" },
];

export function isTapTargetTool(key: string): boolean {
  const power = _ITEMS[key]?.power;
  return !!(power?.id && isTapTargetPower(power.id));
}

export function visibleTools(toolsState: Record<string, number> = {}): ToolEntry[] {
  return TOOL_CATALOG.map((t) => ({
    ...t,
    count: toolsState[t.key] || 0,
  }));
}
