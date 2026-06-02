/**
 * relations.ts — Derive cross-concept links for a given entity in the Dev Panel Wiki.
 *
 * Pure module: no React, no DOM, no side-effects.
 * Every emitted link is validated via getEntity before inclusion — broken
 * references are silently dropped, so the UI never navigates to a dead end.
 */

import { getEntity, conceptForKey } from "./conceptEntities.js";
import { canonicalRecipeEntries, buildRecipesByOutput } from "../recipeCatalog.js";
import { NPC_DATA } from "../../features/npcs/data.js";
import { ZONES } from "../../features/zones/data.js";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Host-specific attachment data (e.g. ability params on a building). */
export interface WikiLinkContext {
  params?: Record<string, unknown>;
  trigger?: string;
}

export interface WikiLink {
  conceptId: string;
  key: string;
  label: string;
  /** Per-host instance data when the link is not a bare id reference. */
  context?: WikiLinkContext;
}

export interface RelationGroup {
  title: string;
  links: WikiLink[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attempt to resolve a link target and, if found, return a validated WikiLink.
 * Returns null when the target conceptId is null or getEntity returns null.
 */
function resolveLink(conceptId: string | null, key: string): WikiLink | null {
  if (!conceptId || !key) return null;
  const target = getEntity(conceptId, key);
  if (target == null) return null;
  const label = String(
    (target as Record<string, unknown>).label ??
      (target as Record<string, unknown>).name ??
      (target as Record<string, unknown>).id ??
      key,
  );
  return { conceptId, key, label };
}

/**
 * Dedupe a list of WikiLinks by (conceptId + key), preserving first occurrence.
 */
function dedupeLinks(links: WikiLink[]): WikiLink[] {
  const seen = new Set<string>();
  const out: WikiLink[] = [];
  for (const link of links) {
    const k = `${link.conceptId}:${link.key}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(link);
    }
  }
  return out;
}

/**
 * Build a group, discarding invalid links and the group itself if empty.
 */
function makeGroup(title: string, rawLinks: Array<WikiLink | null>): RelationGroup | null {
  const links = dedupeLinks(rawLinks.filter((l): l is WikiLink => l !== null));
  if (links.length === 0) return null;
  return { title, links };
}

/**
 * Extract an ability id defensively from an element that may be a string
 * (bare id) or an object with an `id` field.
 */
function extractAbilityId(element: unknown): string | null {
  if (typeof element === "string" && element.length > 0) return element;
  if (element != null && typeof element === "object") {
    const id = (element as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

/** Resolve an ability attachment, preserving params/trigger from the host entity. */
function resolveAbilityAttachment(element: unknown): WikiLink | null {
  const id = extractAbilityId(element);
  if (id == null) return null;
  const base = resolveLink("abilities", id);
  if (base == null) return null;
  if (element == null || typeof element !== "object") return base;

  const obj = element as Record<string, unknown>;
  const context: WikiLinkContext = {};
  const params = obj.params;
  if (params != null && typeof params === "object" && !Array.isArray(params)) {
    context.params = params as Record<string, unknown>;
  }
  if (typeof obj.trigger === "string" && obj.trigger.length > 0) {
    context.trigger = obj.trigger;
  }
  if (context.params != null || context.trigger != null) {
    return { ...base, context };
  }
  return base;
}

// ─── Per-concept relation computers ──────────────────────────────────────────

function relationsForZones(entity: Record<string, unknown>): RelationGroup[] {
  // entity.buildings is string[] — building ids available at this zone.
  const buildings = Array.isArray(entity.buildings) ? (entity.buildings as unknown[]) : [];
  const buildingGroup = makeGroup(
    "Buildings",
    buildings.map((b) => resolveLink("buildings", String(b))),
  );
  return [buildingGroup].filter((g): g is RelationGroup => g !== null);
}

function relationsForBuildings(
  entityKey: string,
  entity: Record<string, unknown>,
): RelationGroup[] {
  const groups: RelationGroup[] = [];

  // "Recipes crafted here": scan canonicalRecipeEntries for station === entityKey
  const recipesHere: (WikiLink | null)[] = canonicalRecipeEntries()
    .filter(([, rec]) => rec.station === entityKey)
    .map(([recId]) => resolveLink("recipes", recId));
  const recipeGroup = makeGroup("Recipes crafted here", recipesHere);
  if (recipeGroup) groups.push(recipeGroup);

  // "Abilities": entity.abilities is an array of string or { id, ... } objects
  const abilitiesRaw = Array.isArray(entity.abilities) ? (entity.abilities as unknown[]) : [];
  const abilityGroup = makeGroup(
    "Abilities",
    abilitiesRaw.map((a) => resolveAbilityAttachment(a)),
  );
  if (abilityGroup) groups.push(abilityGroup);

  return groups;
}

function relationsForRecipes(entity: Record<string, unknown>): RelationGroup[] {
  const groups: RelationGroup[] = [];

  // "Station": entity.station is a building id
  const station = typeof entity.station === "string" ? entity.station : null;
  if (station) {
    const stationGroup = makeGroup("Station", [resolveLink("buildings", station)]);
    if (stationGroup) groups.push(stationGroup);
  }

  // "Output": entity.item is the output item key
  const outputKey = typeof entity.item === "string" ? entity.item : null;
  if (outputKey) {
    const outputGroup = makeGroup("Output", [resolveLink(conceptForKey(outputKey), outputKey)]);
    if (outputGroup) groups.push(outputGroup);
  }

  // "Ingredients": entity.inputs is a Record<string, number>
  const inputs =
    entity.inputs != null && typeof entity.inputs === "object" && !Array.isArray(entity.inputs)
      ? (entity.inputs as Record<string, unknown>)
      : {};
  const ingredientGroup = makeGroup(
    "Ingredients",
    Object.keys(inputs).map((k) => resolveLink(conceptForKey(k), k)),
  );
  if (ingredientGroup) groups.push(ingredientGroup);

  return groups;
}

function relationsForTiles(
  entityKey: string,
  entity: Record<string, unknown>,
): RelationGroup[] {
  const groups: RelationGroup[] = [];

  // "Produces": entity.next is a resource key (may be null)
  const next = typeof entity.next === "string" ? entity.next : null;
  if (next) {
    const producesGroup = makeGroup("Produces", [resolveLink(conceptForKey(next), next)]);
    if (producesGroup) groups.push(producesGroup);
  }

  // Item cross-references (Crafted by / Used in recipes) also apply to tiles
  groups.push(...relationsForItem(entityKey));

  return groups;
}

function relationsForItem(entityKey: string): RelationGroup[] {
  const groups: RelationGroup[] = [];

  // "Crafted by": recipes that produce this item
  const byOutput = buildRecipesByOutput();
  const craftedBy = byOutput[entityKey] ?? [];
  const craftedByGroup = makeGroup(
    "Crafted by",
    craftedBy.map((r) => resolveLink("recipes", r.recId)),
  );
  if (craftedByGroup) groups.push(craftedByGroup);

  // "Used in recipes": recipes whose inputs contain this key
  const usedIn: (WikiLink | null)[] = canonicalRecipeEntries()
    .filter(([, rec]) => Object.prototype.hasOwnProperty.call(rec.inputs, entityKey))
    .map(([recId]) => resolveLink("recipes", recId));
  const usedInGroup = makeGroup("Used in recipes", usedIn);
  if (usedInGroup) groups.push(usedInGroup);

  return groups;
}

function relationsForNpcs(entityKey: string): RelationGroup[] {
  // NPC_DATA has loves/likes; NPCS (what getEntity returns) does not.
  // Read NPC_DATA directly here for the gift-preference relationships.
  const npcData = (NPC_DATA as Record<string, unknown>)[entityKey];
  if (npcData == null || typeof npcData !== "object") return [];

  const record = npcData as Record<string, unknown>;
  const lovesRaw = Array.isArray(record.loves) ? (record.loves as unknown[]) : [];
  const likesRaw = Array.isArray(record.likes) ? (record.likes as unknown[]) : [];

  const groups: RelationGroup[] = [];

  const lovesGroup = makeGroup(
    "Loves",
    lovesRaw.map((k) => {
      const key = String(k);
      return resolveLink(conceptForKey(key), key);
    }),
  );
  if (lovesGroup) groups.push(lovesGroup);

  const likesGroup = makeGroup(
    "Likes",
    likesRaw.map((k) => {
      const key = String(k);
      return resolveLink(conceptForKey(key), key);
    }),
  );
  if (likesGroup) groups.push(likesGroup);

  return groups;
}

function relationsForWorkers(entity: Record<string, unknown>): RelationGroup[] {
  const abilitiesRaw = Array.isArray(entity.abilities) ? (entity.abilities as unknown[]) : [];
  const abilityGroup = makeGroup(
    "Abilities",
    abilitiesRaw.map((a) => resolveAbilityAttachment(a)),
  );
  return abilityGroup ? [abilityGroup] : [];
}

/**
 * Hazard ids that threaten a given board kind. Mine hazards live in the mine
 * HAZARDS array; farm hazards in FARM_HAZARD_META; Harbor has none (tides are a
 * mechanic documented in the authored body). Validated via resolveLink so a
 * stale id is dropped.
 */
const BOARD_KIND_DANGERS: Record<string, string[]> = {
  mine: ["cave_in", "gas_vent", "lava", "mole"],
  farm: ["fire", "wolf", "rats"],
  fish: [],
};

function relationsForBoardKinds(key: string, entity: Record<string, unknown>): RelationGroup[] {
  const tiles = Array.isArray(entity.tiles) ? (entity.tiles as Array<{ key?: unknown }>) : [];
  const tileGroup = makeGroup(
    "Tiles",
    tiles.map((t) => resolveLink("tiles", String(t.key ?? ""))),
  );

  const dangerGroup = makeGroup(
    "Dangers",
    (BOARD_KIND_DANGERS[key] ?? []).map((h) => resolveLink("hazards", h)),
  );

  const flag: "hasFarm" | "hasMine" | "hasWater" =
    key === "farm" ? "hasFarm" : key === "mine" ? "hasMine" : "hasWater";
  const zoneLinks = Object.values(ZONES)
    .filter((z) => z[flag] === true)
    .map((z) => resolveLink("zones", String(z.id)));
  const zoneGroup = makeGroup("Zones", zoneLinks);

  return [tileGroup, dangerGroup, zoneGroup].filter((g): g is RelationGroup => g !== null);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Derive cross-concept relation groups for the given entity.
 *
 * Returns an array of groups (possibly empty). Every link in every group
 * has been validated — `getEntity(link.conceptId, link.key)` is non-null.
 */
export function relationsFor(
  conceptId: string,
  entityKey: string,
  entity: Record<string, unknown> | null,
): RelationGroup[] {
  // For items (tiles/resources/tools) we can still derive recipe links even
  // when the entity is null in the wiki (e.g. a schema mismatch), but
  // generally entity-field-based relations need entity.
  switch (conceptId) {
    case "zones":
      return entity ? relationsForZones(entity) : [];
    case "buildings":
      return entity ? relationsForBuildings(entityKey, entity) : [];
    case "recipes":
      return entity ? relationsForRecipes(entity) : [];
    case "tiles":
      return entity ? relationsForTiles(entityKey, entity) : relationsForItem(entityKey);
    case "resources":
    case "tools":
      return relationsForItem(entityKey);
    case "npcs":
      return relationsForNpcs(entityKey);
    case "workers":
      return entity ? relationsForWorkers(entity) : [];
    case "boardKinds":
      return entity ? relationsForBoardKinds(entityKey, entity) : [];
    default:
      return [];
  }
}
