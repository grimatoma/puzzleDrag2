/**
 * Player-facing tool catalog for the on-board Tools panel.
 * Generated from canonical `ITEMS` tool entries + `isTapTargetPower`.
 */
import { ITEMS, getItem } from "../constants.js";
import type { ToolPowerDefinition } from "../constants.js";
import { isTapTargetPower } from "../config/toolPowers.js";

const DEFAULT_PIN_KEYS = ["clear", "basic", "rare", "shuffle", "bomb"];
const FARM_TOOL_KEYS = new Set([
  "clear", "basic", "rare", "rake", "axe", "sickle", "fertilizer", "cat",
  "bird_cage", "scythe_full", "rifle", "hound", "hoe", "bird_feed", "sapling",
  "trimmer", "plough", "fruit_picker", "herders_crook", "milk_churn", "saddle",
  "bee", "terrier", "magic_fertilizer", "golden_apple", "golden_carrot",
  "golden_idol", "golden_sheep",
]);
const MINE_TOOL_KEYS = new Set([
  "stone_hammer", "iron_pick", "auger", "blast_charge", "water_pump", "explosives",
  "drill", "coal_hammer", "gold_pick", "magnet", "coal_transmuter",
  "philosophers_stone", "miners_hat",
]);
const FISH_TOOL_KEYS = new Set<string>([]);
export type ToolBoardKind = "all" | "farm" | "mine" | "fish";

const TOOL_BOARD_KIND_ORDER: ToolBoardKind[] = ["all", "farm", "mine", "fish"];

export const TOOL_BOARD_KIND_LABELS: Record<ToolBoardKind, string> = {
  all: "All boards",
  farm: "Farm board",
  mine: "Mine board",
  fish: "Harbor board",
};

export interface ToolEntry {
  key: string;
  /** Board kind this tool is most relevant to; `all` means board-agnostic. */
  boardKind: ToolBoardKind;
  /** Human-readable group label used by grouped tool strips. */
  category: string;
  iconKey: string;
  name: string;
  armed: "instant" | "passive" | "tap";
  desc: string;
  count?: number;
}

function toolBoardKind(key: string): ToolBoardKind {
  if (FARM_TOOL_KEYS.has(key)) return "farm";
  if (MINE_TOOL_KEYS.has(key)) return "mine";
  if (FISH_TOOL_KEYS.has(key)) return "fish";
  return "all";
}

function toolArmed(power: ToolPowerDefinition | undefined): "instant" | "passive" | "tap" {
  if (!power?.id) return "instant";
  if (power.id === "fill_bias") return "passive";
  return isTapTargetPower(power.id) ? "tap" : "instant";
}

function entryFromItem(key: string): ToolEntry | null {
  const item = getItem(key);
  if (!item || item.kind !== "tool") return null;
  const power = item.power;
  const boardKind = toolBoardKind(key);
  return {
    key,
    boardKind,
    category: TOOL_BOARD_KIND_LABELS[boardKind],
    iconKey: item.look?.iconKey ?? key,
    name: item.label ?? key,
    armed: toolArmed(power),
    desc: item.desc ?? power?.bubble ?? "",
  };
}

export const TOOL_CATALOG: ToolEntry[] = Object.keys(ITEMS)
  .map(entryFromItem)
  .filter((t): t is ToolEntry => t !== null)
  .sort((a, b) => TOOL_BOARD_KIND_ORDER.indexOf(a.boardKind) - TOOL_BOARD_KIND_ORDER.indexOf(b.boardKind));

export const TOOL_BY_KEY: Record<string, ToolEntry> = Object.fromEntries(TOOL_CATALOG.map((t) => [t.key, t]));

export const TOOL_CATEGORIES = (Object.keys(TOOL_BOARD_KIND_LABELS) as ToolBoardKind[]).map((key) => ({
  key,
  label: TOOL_BOARD_KIND_LABELS[key],
}));

export const DEFAULT_TOOL_PINS = DEFAULT_PIN_KEYS.filter((key) => !!TOOL_BY_KEY[key]);

export function isTapTargetTool(key: string): boolean {
  const power = getItem(key)?.power;
  return !!(power?.id && isTapTargetPower(power.id));
}

export function visibleTools(toolsState: Record<string, number> = {}): ToolEntry[] {
  return TOOL_CATALOG.map((t) => ({
    ...t,
    count: toolsState[t.key] || 0,
  }));
}
