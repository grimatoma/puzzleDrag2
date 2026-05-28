// Canonical recipe iteration for Dev Panel UIs.
//
// RECIPES includes backward-compat aliases: RECIPES[rake] → same object as
// rec_rake, plus underscore variants (rec_iron_frame → rec_ironframe). UIs
// that map outputs must dedupe by recipe object identity.

import { RECIPES } from "../constants.js";

type RecipeInputsDto = Record<string, number>;

export interface CanonicalRecipeDto extends Record<string, unknown> {
  item: string;
  station: string;
  inputs: RecipeInputsDto;
}

export interface DraftRecipeDto extends Record<string, unknown> {
  item?: string;
  station?: string;
  inputs?: RecipeInputsDto;
}

export interface RecipeByOutputDto extends Record<string, unknown> {
  recId: string;
  item: string;
  station: string;
  inputs: RecipeInputsDto;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseInputs(value: unknown): RecipeInputsDto | undefined {
  if (!isRecord(value)) return undefined;
  const inputs: RecipeInputsDto = {};
  for (const [key, qty] of Object.entries(value)) {
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) inputs[key] = qty;
  }
  return inputs;
}

function parseCanonicalRecipe(value: unknown): CanonicalRecipeDto | null {
  if (!isRecord(value)) return null;
  if (typeof value.item !== "string" || typeof value.station !== "string") return null;
  const inputs = parseInputs(value.inputs);
  if (!inputs) return null;
  return {
    ...value,
    item: value.item,
    station: value.station,
    inputs,
  };
}

function parseDraftRecipe(value: unknown): DraftRecipeDto | null {
  if (!isRecord(value)) return null;
  const item = typeof value.item === "string" ? value.item : undefined;
  const station = typeof value.station === "string" ? value.station : undefined;
  const inputs = parseInputs(value.inputs);
  const draft: DraftRecipeDto = { ...value };
  if (item === undefined) delete draft.item;
  else draft.item = item;
  if (station === undefined) delete draft.station;
  else draft.station = station;
  if (inputs === undefined) delete draft.inputs;
  else draft.inputs = inputs;
  return draft;
}

function parseDraftRecipes(draftRecipes: Record<string, unknown>): Record<string, DraftRecipeDto> {
  const parsed: Record<string, DraftRecipeDto> = {};
  for (const [recId, value] of Object.entries(draftRecipes || {})) {
    const recipe = parseDraftRecipe(value);
    if (recipe) parsed[recId] = recipe;
  }
  return parsed;
}

export function canonicalRecipeEntries(recipes: Record<string, unknown> = RECIPES): [string, CanonicalRecipeDto][] {
  const seen = new Set<object>();
  const out: [string, CanonicalRecipeDto][] = [];
  for (const [recipeId, recipe] of Object.entries(recipes || {})) {
    if (!recipe || typeof recipe !== "object") continue;
    if (seen.has(recipe as object)) continue;
    seen.add(recipe as object);
    const parsed = parseCanonicalRecipe(recipe);
    if (parsed) out.push([recipeId, parsed]);
  }
  return out;
}

/**
 * Map item id → recipes that craft it (draft overlays merged per recipe).
 *
 * `draftRecipes` comes from the BalanceDraft/localStorage path and is the one
 * unsafe boundary here; parse it once, then merge typed recipe DTOs internally.
 */
export function buildRecipesByOutput({
  recipes = RECIPES,
  draftRecipes = {},
}: {
  recipes?: Record<string, unknown>;
  draftRecipes?: Record<string, unknown>;
} = {}): Record<string, RecipeByOutputDto[]> {
  const methods: Record<string, RecipeByOutputDto[]> = {};
  const seen = new Set<object>();
  const parsedDraftRecipes = parseDraftRecipes(draftRecipes);

  for (const [recId, rec] of canonicalRecipeEntries(recipes)) {
    const rawRecipe = recipes[recId];
    if (rawRecipe && typeof rawRecipe === "object") seen.add(rawRecipe);
    const draftRec = parsedDraftRecipes[recId];
    const effItem = draftRec?.item ?? rec.item;
    if (!effItem) continue;
    if (!methods[effItem]) methods[effItem] = [];
    methods[effItem].push({
      ...rec,
      ...draftRec,
      recId,
      item: effItem,
      station: draftRec?.station ?? rec.station,
      inputs: draftRec?.inputs ?? rec.inputs,
    });
  }

  // Draft-only recipes (created in Dev Panel, not yet in RECIPES).
  for (const [recId, draftRec] of Object.entries(parsedDraftRecipes)) {
    if (!draftRec.item) continue;
    const base = recipes[recId];
    if (base && seen.has(base)) continue;
    if (!methods[draftRec.item]) methods[draftRec.item] = [];
    methods[draftRec.item].push({
      ...draftRec,
      recId,
      item: draftRec.item,
      station: draftRec.station ?? "",
      inputs: draftRec.inputs ?? {},
    });
  }

  return methods;
}
