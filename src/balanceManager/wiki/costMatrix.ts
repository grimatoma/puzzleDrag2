// costMatrix.ts — pure builders for the Dev Panel Wiki "Cost matrix" view.
//
// Turns the three cost-bearing catalogs into one uniform, editable matrix shape
// so a single table component can render any of them:
//
//   - buildings  → BUILDINGS[*].cost            (coins + material resources)
//   - tools      → RECIPES[*].inputs (workshop) (craftable tool recipes)
//   - resources  → ITEMS[*].value + RECIPES[*].inputs (sell value + recipe cost)
//
// Each builder takes a flat `overrides` map (dotted edit-path → number) coming
// from the local cost-edit store and bakes the *effective* value plus a
// `changed` flag into every cell. The catalogs themselves are never mutated —
// the game always reads the real constants; these edits are a staging scratch
// pad that the Export view turns into an LLM-ready change list.
//
// PURE module — no React, no storage, no side effects. Fully unit-testable off
// the static catalogs.

import { BUILDINGS, ITEMS, RECIPES } from "../../constants.js";
import { iconLabel } from "../../textures/iconRegistry.js";
import { canonicalRecipeEntries } from "../recipeCatalog.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CostMatrixId = "buildings" | "tools" | "resources";

export type CostOverrides = Record<string, number>;

export interface CostMatrixColumn {
  /** Stable column key — a resource/currency key, or the synthetic "value". */
  key: string;
  /** Human label for the header. */
  label: string;
  /** Icon-registry key for the header glyph (falls back to the column key). */
  iconKey: string;
  /** Currencies (coins/runes/…) sort first and render with a subtle accent. */
  currency: boolean;
  /**
   * True when this column was added by the user (a resource that no entity in
   * the matrix natively costs) rather than derived from the catalogs. Extra
   * columns are removable in the editor.
   */
  extra?: boolean;
}

export interface CostMatrixCell {
  colKey: string;
  /** Effective value after overrides (0 when the entity has no such cost). */
  value: number;
  /** Baseline value straight from the catalogs, before any override. */
  original: number;
  /** True when an override actually differs from the baseline. */
  changed: boolean;
  /** Whether this cell can be edited (false for input cells of un-craftable rows). */
  editable: boolean;
  /** Dotted edit path, e.g. "BUILDINGS.mill.cost.plank" ("" when not editable). */
  editPath: string;
}

export interface CostMatrixContext {
  key: string;
  label: string;
  value: string;
}

export interface CostMatrixRow {
  /** Entity id (building id / tool key / resource key). */
  id: string;
  name: string;
  /** Icon-registry key for the row glyph, when one exists. */
  iconKey?: string;
  /** Read-only context columns (level/biome or station/tier). */
  context: CostMatrixContext[];
  /** colKey → cell. */
  cells: Record<string, CostMatrixCell>;
  /** Optional grouping band label; consecutive rows sharing it form a band. */
  group?: string;
}

export interface CostMatrix {
  id: CostMatrixId;
  title: string;
  subtitle: string;
  /** Section header used in the export report. */
  exportLabel: string;
  /** Read-only context column headers (in render order). */
  contextColumns: { key: string; label: string }[];
  /** Editable numeric columns (in render order). */
  columns: CostMatrixColumn[];
  rows: CostMatrixRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Currencies render first, in this order; everything else is alphabetical.
 * Cost keys (coins/runes/…) differ from their icon-registry keys, so each
 * carries its real icon key + a tidy label (mirrors EconomyRollup's set).
 */
const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  coins: { icon: "tile_coin_golden", label: "Coins" },
  runes: { icon: "rune_stone", label: "Runes" },
  embers: { icon: "cur_embers", label: "Embers" },
  coreIngots: { icon: "cur_core_ingot", label: "Core Ingots" },
  gems: { icon: "cur_gems", label: "Gems" },
};
const CURRENCY_ORDER = Object.keys(CURRENCY_META);
const CURRENCY_RANK = new Map(CURRENCY_ORDER.map((k, i) => [k, i]));

/** The synthetic resource "sell value" column key. */
export const VALUE_COL = "value";

function toNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function itemKind(key: string): string | undefined {
  const item = (ITEMS as Record<string, { kind?: string }>)[key];
  return item?.kind;
}

function itemLabel(key: string): string {
  const item = (ITEMS as Record<string, { label?: string }>)[key];
  return iconLabel(key) || item?.label || key;
}

function columnFor(key: string): CostMatrixColumn {
  if (key === VALUE_COL) {
    return { key, label: "Value", iconKey: CURRENCY_META.coins.icon, currency: false };
  }
  const cur = CURRENCY_META[key];
  if (cur) return { key, label: cur.label, iconKey: cur.icon, currency: true };
  return { key, label: itemLabel(key), iconKey: key, currency: false };
}

/**
 * Order cost columns: currencies first (in CURRENCY_ORDER), then the rest
 * alphabetically by label. `valueFirst` pins the synthetic value column to the
 * very front (resources matrix).
 */
function orderColumns(keys: Iterable<string>, valueFirst = false): CostMatrixColumn[] {
  const cols = [...new Set(keys)].map(columnFor);
  cols.sort((a, b) => {
    if (valueFirst) {
      if (a.key === VALUE_COL) return -1;
      if (b.key === VALUE_COL) return 1;
    }
    const ar = CURRENCY_RANK.get(a.key);
    const br = CURRENCY_RANK.get(b.key);
    if (ar != null && br != null) return ar - br;
    if (ar != null) return -1;
    if (br != null) return 1;
    return a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
  });
  return cols;
}

/**
 * Fold user-added column keys into the natural column set: append the ones the
 * catalog doesn't already cover, build the ordered columns, then flag each
 * non-natural column `extra` so the editor can offer to remove it.
 */
function withExtraColumns(
  naturalKeys: Set<string>,
  extraColumns: readonly string[],
  valueFirst = false,
): CostMatrixColumn[] {
  const extra = extraColumns.filter((k) => k && !naturalKeys.has(k));
  const columns = orderColumns([...naturalKeys, ...extra], valueFirst);
  for (const col of columns) col.extra = !naturalKeys.has(col.key);
  return columns;
}

/** Build a single cell, applying overrides + change detection. */
function makeCell(
  colKey: string,
  original: number,
  editPath: string,
  editable: boolean,
  overrides: CostOverrides,
): CostMatrixCell {
  const canEdit = editable && editPath !== "";
  const has = canEdit && Object.prototype.hasOwnProperty.call(overrides, editPath);
  const value = has ? overrides[editPath] : original;
  return {
    colKey,
    original,
    value,
    changed: has && overrides[editPath] !== original,
    editable: canEdit,
    editPath: canEdit ? editPath : "",
  };
}

/** Local catalog scan — resources/tools of a given ITEMS kind, sorted by label. */
function itemsOfKind(kind: string): Array<{ key: string; label: string; iconKey: string }> {
  const out: Array<{ key: string; label: string; iconKey: string }> = [];
  for (const [key, item] of Object.entries(ITEMS) as Array<[string, { kind?: string }]>) {
    if (item?.kind !== kind) continue;
    out.push({ key, label: itemLabel(key), iconKey: key });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

// ─── Add-column picker ────────────────────────────────────────────────────────

export interface CostColumnOption {
  key: string;
  label: string;
  iconKey: string;
}

export interface CostColumnOptionGroup {
  group: string;
  options: CostColumnOption[];
}

/**
 * Every resource/currency that can be ADDED as a new cost column, grouped for a
 * picker and excluding any key already present in the matrix. Currencies first,
 * then resource items, then tool items — each group alphabetised by label.
 *
 * PURE — derived from the static CURRENCY_META + ITEMS catalogs.
 */
export function costColumnOptions(existing: Iterable<string> = []): CostColumnOptionGroup[] {
  const taken = new Set(existing);
  const groups: CostColumnOptionGroup[] = [];

  const currencies = CURRENCY_ORDER
    .filter((k) => !taken.has(k))
    .map((k) => ({ key: k, label: CURRENCY_META[k].label, iconKey: CURRENCY_META[k].icon }));
  if (currencies.length) groups.push({ group: "Currencies", options: currencies });

  for (const [kind, label] of [["resource", "Resources"], ["tool", "Tools"]] as const) {
    const options = itemsOfKind(kind)
      .filter((it) => !taken.has(it.key))
      .map((it) => ({ key: it.key, label: it.label, iconKey: it.iconKey }));
    if (options.length) groups.push({ group: label, options });
  }

  return groups;
}

/**
 * Map output-item key → its first canonical recipe. RECIPES carries aliases
 * (item-key → same object) and underscore variants; canonicalRecipeEntries
 * dedupes by object identity so each `rec_*` is visited once.
 */
function recipeByItem(): Map<string, { recId: string; station: string; tier: number | null; inputs: Record<string, number> }> {
  const map = new Map<string, { recId: string; station: string; tier: number | null; inputs: Record<string, number> }>();
  for (const [recId, rec] of canonicalRecipeEntries(RECIPES)) {
    if (map.has(rec.item)) continue;
    const tierRaw = (rec as { tier?: unknown }).tier;
    map.set(rec.item, {
      recId,
      station: rec.station,
      tier: typeof tierRaw === "number" && Number.isFinite(tierRaw) ? tierRaw : null,
      inputs: rec.inputs,
    });
  }
  return map;
}

// ─── Buildings ──────────────────────────────────────────────────────────────

interface RawBuilding {
  id: string;
  name?: string;
  lv?: number;
  biome?: string;
  cost?: Record<string, number>;
}

function buildingList(): RawBuilding[] {
  const list = Array.isArray(BUILDINGS) ? BUILDINGS : Object.values(isRecord(BUILDINGS) ? BUILDINGS : {});
  return list
    .filter((b): b is RawBuilding => isRecord(b) && typeof b.id === "string")
    .slice()
    .sort((a, b) => (toNum(a.lv) - toNum(b.lv)) || String(a.name ?? a.id).localeCompare(String(b.name ?? b.id)));
}

export function buildBuildingCostMatrix(
  overrides: CostOverrides = {},
  extraColumns: readonly string[] = [],
): CostMatrix {
  const buildings = buildingList();

  const keys = new Set<string>();
  for (const b of buildings) {
    for (const k of Object.keys(b.cost ?? {})) keys.add(k);
  }
  const columns = withExtraColumns(keys, extraColumns);

  const rows: CostMatrixRow[] = buildings.map((b) => {
    const cost = isRecord(b.cost) ? b.cost : {};
    const cells: Record<string, CostMatrixCell> = {};
    for (const col of columns) {
      cells[col.key] = makeCell(col.key, toNum(cost[col.key]), `BUILDINGS.${b.id}.cost.${col.key}`, true, overrides);
    }
    return {
      id: b.id,
      name: b.name ?? b.id,
      context: [
        { key: "lv", label: "Lv", value: b.lv != null ? String(b.lv) : "—" },
        { key: "biome", label: "Biome", value: b.biome || "—" },
      ],
      cells,
    };
  });

  return {
    id: "buildings",
    title: "Building costs",
    subtitle: "What each town building costs to construct, across every resource. Edit a cell to stage a change.",
    exportLabel: "Buildings — BUILDINGS[*].cost",
    contextColumns: [{ key: "lv", label: "Lv" }, { key: "biome", label: "Biome" }],
    columns,
    rows,
  };
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export function buildToolCostMatrix(
  overrides: CostOverrides = {},
  extraColumns: readonly string[] = [],
): CostMatrix {
  const recipes = recipeByItem();
  const tools = [...recipes.entries()]
    .filter(([item]) => itemKind(item) === "tool")
    .map(([item, rec]) => ({ item, ...rec }))
    .sort((a, b) => itemLabel(a.item).localeCompare(itemLabel(b.item)));

  const keys = new Set<string>();
  for (const t of tools) {
    for (const k of Object.keys(t.inputs)) keys.add(k);
  }
  const columns = withExtraColumns(keys, extraColumns);

  const rows: CostMatrixRow[] = tools.map((t) => {
    const cells: Record<string, CostMatrixCell> = {};
    for (const col of columns) {
      cells[col.key] = makeCell(col.key, toNum(t.inputs[col.key]), `RECIPES.${t.recId}.inputs.${col.key}`, true, overrides);
    }
    return {
      id: t.item,
      name: itemLabel(t.item),
      iconKey: t.item,
      context: [
        { key: "station", label: "Station", value: t.station || "—" },
        { key: "tier", label: "Tier", value: t.tier != null ? String(t.tier) : "—" },
      ],
      cells,
    };
  });

  return {
    id: "tools",
    title: "Tool costs",
    subtitle: "Workshop recipe inputs for every craftable tool. Granted/portal tools have no recipe and are omitted.",
    exportLabel: "Tools — RECIPES[*].inputs (workshop)",
    contextColumns: [{ key: "station", label: "Station" }, { key: "tier", label: "Tier" }],
    columns,
    rows,
  };
}

// ─── Resources ──────────────────────────────────────────────────────────────

export function buildResourceCostMatrix(
  overrides: CostOverrides = {},
  extraColumns: readonly string[] = [],
): CostMatrix {
  const recipes = recipeByItem();
  const resources = itemsOfKind("resource");

  // Columns: synthetic value column first, then the union of every recipe input.
  const keys = new Set<string>([VALUE_COL]);
  for (const r of resources) {
    const rec = recipes.get(r.key);
    if (rec) for (const k of Object.keys(rec.inputs)) keys.add(k);
  }
  const columns = withExtraColumns(keys, extraColumns, true);

  // Craftable rows first (grouped by station), then raw/chain-sourced resources.
  const decorated = resources.map((r) => ({ ...r, rec: recipes.get(r.key) ?? null }));
  decorated.sort((a, b) => {
    const ac = a.rec ? 0 : 1;
    const bc = b.rec ? 0 : 1;
    if (ac !== bc) return ac - bc;
    const as = a.rec?.station ?? "";
    const bs = b.rec?.station ?? "";
    return as.localeCompare(bs) || a.label.localeCompare(b.label);
  });

  const rows: CostMatrixRow[] = decorated.map((r) => {
    const rec = r.rec;
    const cells: Record<string, CostMatrixCell> = {};
    for (const col of columns) {
      if (col.key === VALUE_COL) {
        const original = toNum((ITEMS as Record<string, { value?: number }>)[r.key]?.value);
        cells[col.key] = makeCell(col.key, original, `ITEMS.${r.key}.value`, true, overrides);
      } else if (rec) {
        cells[col.key] = makeCell(col.key, toNum(rec.inputs[col.key]), `RECIPES.${rec.recId}.inputs.${col.key}`, true, overrides);
      } else {
        // Raw resource — no recipe to edit; render an inert blank input cell.
        cells[col.key] = makeCell(col.key, 0, "", false, overrides);
      }
    }
    return {
      id: r.key,
      name: r.label,
      iconKey: r.iconKey,
      group: rec ? `Crafted · ${rec.station}` : "Raw / chain-sourced",
      context: [
        { key: "station", label: "Station", value: rec?.station ?? "—" },
        { key: "tier", label: "Tier", value: rec?.tier != null ? String(rec.tier) : "—" },
      ],
      cells,
    };
  });

  return {
    id: "resources",
    title: "Resource costs & value",
    subtitle: "Sell value plus crafting recipe inputs for every resource. Raw chain-sourced resources have no recipe cost.",
    exportLabel: "Resources — ITEMS[*].value & RECIPES[*].inputs",
    contextColumns: [{ key: "station", label: "Station" }, { key: "tier", label: "Tier" }],
    columns,
    rows,
  };
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export const COST_MATRIX_IDS: CostMatrixId[] = ["buildings", "tools", "resources"];

/** Per-matrix user-added column keys (the staging columns store shape). */
export type CostColumnsByMatrix = Partial<Record<CostMatrixId, string[]>>;

export function buildCostMatrix(
  id: CostMatrixId,
  overrides: CostOverrides = {},
  extraColumns: readonly string[] = [],
): CostMatrix {
  switch (id) {
    case "buildings":
      return buildBuildingCostMatrix(overrides, extraColumns);
    case "tools":
      return buildToolCostMatrix(overrides, extraColumns);
    case "resources":
      return buildResourceCostMatrix(overrides, extraColumns);
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unknown cost matrix id: ${String(_exhaustive)}`);
    }
  }
}

/** Build all three matrices with the same overrides (export + unified page). */
export function buildAllCostMatrices(
  overrides: CostOverrides = {},
  extraColumns: CostColumnsByMatrix = {},
): CostMatrix[] {
  return COST_MATRIX_IDS.map((id) => buildCostMatrix(id, overrides, extraColumns[id] ?? []));
}

/**
 * Narrow a matrix's rows to those whose name or id contains `query`
 * (case-insensitive). A blank query returns the matrix unchanged (same
 * reference). Columns and context headers are preserved; CostMatrixTable
 * recomputes grouping bands from the surviving rows, so empty groups simply
 * vanish.
 *
 * PURE — drives the Cost Matrix page's search box and is unit-tested directly.
 */
export function filterMatrixRows(matrix: CostMatrix, query: string): CostMatrix {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return matrix;
  const rows = matrix.rows.filter(
    (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
  );
  if (rows.length === matrix.rows.length) return matrix;
  return { ...matrix, rows };
}
