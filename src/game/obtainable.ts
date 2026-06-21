/**
 * obtainable.ts — Resource reachability for dev validation.
 *
 * THE PROBLEM THIS SOLVES. A resource should only exist in the game if the
 * player can actually get it — either GATHER it from the board (some tile family
 * produces it) or CRAFT it (a recipe whose inputs are themselves obtainable).
 * A resource that is defined but has no path to it is dead weight: it can never
 * appear in the inventory, yet it pads catalogs and balance views.
 *
 * This module computes the obtainable set as a fixpoint and exposes a helper to
 * list the orphans, so a dev guard test (and the Dev-Panel Progression page) can
 * surface them. It is pure and Phaser-free — safe to import from `/b/`.
 *
 * Board-produced resources are derived from the real tile catalogue
 * (`TILE_TYPES` → `producedResource`), so a resource produced only by a family
 * that has no tile is correctly treated as unreachable. Craftable resources are
 * grown to a fixpoint over `RECIPES`: a recipe's `item` becomes obtainable once
 * every one of its `inputs` is obtainable.
 */

import { RESOURCES, RECIPES, TILES } from "../constants.js";
import { TILE_TYPES } from "../features/tileCollection/data.js";
import { producedResource } from "./producedResource.js";

interface RecipeLike {
  item?: string;
  inputs?: Record<string, number>;
}

/**
 * Resources the board can produce directly. A resource is board-produced when a
 * tile yields it through any of the real production paths:
 *   - `producedResource(tile)` — per-tile override > tile-family default, and
 *   - the legacy tile item's `next` field (e.g. Blackberry → jam), which the
 *     chain pipeline also honours for tiles that "ripen" straight into a good.
 */
function boardProducedResources(): Set<string> {
  const out = new Set<string>();
  const isResource = (k: string): boolean =>
    Object.prototype.hasOwnProperty.call(RESOURCES, k);
  for (const t of TILE_TYPES as ReadonlyArray<{ id: string }>) {
    const res = producedResource({ key: t.id });
    if (res) out.add(res);
  }
  for (const tile of Object.values(TILES) as ReadonlyArray<{ next?: string | null }>) {
    const next = tile?.next;
    if (typeof next === "string" && isResource(next)) out.add(next);
  }
  return out;
}

/** Distinct recipe definitions (RECIPES carries alias keys → same object). */
function distinctRecipes(): RecipeLike[] {
  const seen = new Set<RecipeLike>();
  const out: RecipeLike[] = [];
  for (const r of Object.values(RECIPES) as RecipeLike[]) {
    if (!r || typeof r !== "object" || !r.item || !r.inputs) continue;
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}

/**
 * The set of keys reachable in the game — board-produced resources plus the
 * transitive closure of craftable items whose inputs are all obtainable. The
 * set may include non-resource items (tools crafted at the Workshop); callers
 * intersect with `RESOURCES` when they only care about resources.
 */
export function getObtainableResources(): Set<string> {
  const obtainable = boardProducedResources();
  const recipes = distinctRecipes();
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of recipes) {
      const item = r.item as string;
      if (obtainable.has(item)) continue;
      const inputs = Object.keys(r.inputs ?? {});
      if (inputs.every((k) => obtainable.has(k))) {
        obtainable.add(item);
        changed = true;
      }
    }
  }
  return obtainable;
}

/**
 * Defined resources (kind: "resource") that have no path to them — neither
 * board-produced nor craftable from obtainable inputs. Sorted for stable output.
 *
 * ITEMS maps alias spellings to the SAME object (e.g. `gem_crown` and `gemcrown`,
 * `gold_ring` and `goldring`), and recipes reference only one spelling. Keys that
 * point at the same resource object are treated as equally obtainable, so an
 * alias is never reported as an orphan of its canonical twin.
 */
export function findUnobtainableResources(): string[] {
  const obtainable = getObtainableResources();
  const obtainableObjects = new Set<object>();
  for (const [key, def] of Object.entries(RESOURCES)) {
    if (obtainable.has(key)) obtainableObjects.add(def as object);
  }
  return Object.keys(RESOURCES)
    .filter((key) => !obtainable.has(key) && !obtainableObjects.has(RESOURCES[key as keyof typeof RESOURCES] as object))
    .sort();
}
