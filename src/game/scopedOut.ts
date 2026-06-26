/**
 * scopedOut.ts — the executable form of the scope doc's "Out of Scope" tab.
 *
 * Most out-of-scope content is hidden purely by DERIVATION (src/game/reachability.ts):
 * strand a zone → its exclusive buildings/recipes/tools fall out; a recipe whose input
 * is unreachable (cut_gem, honey, fish) falls out; a worker whose target tile-family has
 * no reachable tile falls out. No flag needed for any of that.
 *
 * This manifest is the IRREDUCIBLE RESIDUE — content the relations CANNOT derive out
 * because its station + inputs (or its target family) are all in scope, yet the design
 * defers it. Under the project rule "the building that makes it exists ⇒ the tool is
 * reachable", once Bakery/Workshop/Forge are reachable every recipe pointed at them is
 * reachable too. To honor the doc's tight "5 tools / 11 recipes / 11 workers" we subtract
 * this one CENTRAL list rather than scattering per-entity `isInGame` flags (the rejected,
 * drift-prone approach). The reachability guard test pins it: `findUnreachable()` must equal
 * the expected deferred universe, so a key that silently becomes reachable — or a newly
 * orphaned key missing from here — fails CI. One list, test-enforced, un-driftable.
 *
 * Keyed the same way the catalog and wiki are: recipes by ITEM key (the recipe's output),
 * workers by `WorkerTypeId`. Pure / Phaser-free — safe for the game bundle and `/b`.
 */

import { WorkerTypeId } from "../types/catalog/workers.js";

export interface ScopedOut {
  /** Building ids with no derivable gate that must still be deferred. (Usually empty —
   *  out-of-scope buildings are simply absent from every reachable zone's roster.) */
  buildings: ReadonlySet<string>;
  /** Recipe ITEM keys (output) — in-scope station + in-scope inputs, but deferred. */
  recipes: ReadonlySet<string>;
  /** Tool item keys that survive as reachable (granted / no out-of-scope input) yet defer. */
  tools: ReadonlySet<string>;
  /** Tile ids to force-defer that would otherwise read as reachable/gated. */
  tiles: ReadonlySet<string>;
  /** Worker ids whose target family + cost are in scope, but the role is deferred. */
  workers: ReadonlySet<WorkerTypeId>;
}

export const SCOPED_OUT: ScopedOut = {
  buildings: new Set<string>([
    // Out-of-scope buildings are dropped by trimming the in-scope zones' rosters, so they
    // never appear in a reachable zone — nothing to list here by default.
  ]),

  // Recipes whose station (Bakery/Larder/Forge/Workshop) and inputs are all in scope, but
  // which the doc holds back. (The deep-mine / animal / fish / kitchen recipes are NOT here —
  // they auto-defer through an unreachable input or the deferred Kitchen station.)
  recipes: new Set<string>([
    // Fancy food — celebratory bakery/larder goods past the early loaf/pie/preserve.
    // (wedding_pie used to auto-defer through its `honey` input; main's economy de-trap
    // dropped honey, so its station + inputs are now all in scope — defer it here.)
    "honeyroll", "festival_loaf", "tincture", "wedding_pie",
    // Forge metalwork past the in-scope iron_hinge + lantern.
    "cobblepath", "ironframe", "stonework",
    // Workshop tool tree past the in-scope rake / sickle / fertilizer / plough / fruit_picker.
    "axe", "cat", "bird_cage", "scythe_full", "rifle", "hound", "hoe",
    "stone_hammer", "iron_pick", "auger", "blast_charge", "bird_feed", "sapling",
    "water_pump", "explosives", "trimmer", "herders_crook", "milk_churn", "saddle",
    "terrier", "drill", "coal_hammer", "magnet", "coal_transmuter",
  ]),

  // Tools are normally hidden by deferring their recipe above (no reachable producer). Any
  // tool that is granted by a reachable building yet still out of scope goes here.
  tools: new Set<string>([
    "shuffle", // Reshuffle Horn — deferred per doc; no in-scope recipe, guard against grants.
  ]),

  tiles: new Set<string>([
    // The out-of-scope default tiles are re-gated to a deferred building (structurally
    // unreachable); nothing extra needed here by default.
  ]),

  // Workers whose target family/cost is in scope but the ROLE is deferred: the two coin
  // workers + rune seeker, the Digger (dirt is in scope), and all 8 promotion (cross-yield)
  // workers. The family-targeted deferrals (Bee Keeper/Dairywoman/Wrangler/Gem-cutter/
  // Gold Miner/Fisherman) are NOT here — they derive out via an unreachable target family.
  workers: new Set<WorkerTypeId>([
    WorkerTypeId.TaxCollector,
    WorkerTypeId.Florist,
    WorkerTypeId.RuneSeeker,
    WorkerTypeId.Digger,
    WorkerTypeId.Steward,
    WorkerTypeId.Greengrocer,
    WorkerTypeId.Perfumer,
    WorkerTypeId.Rancher,
    WorkerTypeId.Drover,
    WorkerTypeId.Equerry,
    WorkerTypeId.Smelter,
    WorkerTypeId.Assayer,
  ]),
};
