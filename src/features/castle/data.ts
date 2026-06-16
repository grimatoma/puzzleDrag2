/**
 * Castle Needs — resource contribution targets.
 * Players donate resources from inventory toward each Castle Need; the Castle
 * is a one-way sink (no reset) per REFERENCE_CATALOG.md §11.
 *
 * NOTE: the Castle is slated to be reworked into a quest chain that unlocks
 * the final settlement (see the narrative Direction page at /b/#/page/direction). For now it
 * keeps three wired needs; the `cocoa`/`ink` placeholder needs were removed.
 */
export const CASTLE_NEEDS = {
  soup:  { target: 53, label: "Soup",  resource: "soup",  flavor: "Warm bowls for the capital's poor — nourishment they'll remember." },
  meat:  { target: 47, label: "Meat",  resource: "meat",  flavor: "Salted provisions to carry the garrison through the long winter." },
  // Need-key `coal`; `resource` points to the prefixed mine inventory key.
  coal:  { target: 43, label: "Coal",  resource: "tile_mine_coal", flavor: "Fuel to keep the great hearths of the capital burning." },
};
