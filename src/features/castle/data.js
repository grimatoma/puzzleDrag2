/**
 * Castle Needs — resource contribution targets.
 * Players donate resources from inventory toward each Castle Need; the Castle
 * is a one-way sink (no reset) per REFERENCE_CATALOG.md §11.
 *
 * NOTE: the Castle is slated to be reworked into a quest chain that unlocks
 * the final settlement (see the_long_return_master_doc_v3.md). For now it
 * keeps three wired needs; the `cocoa`/`ink` placeholder needs were removed.
 */
export const CASTLE_NEEDS = {
  soup:  { target: 53, label: "Soup",  resource: "soup"  },
  meat:  { target: 47, label: "Meat",  resource: "meat"  },
  // Need-key `coal`; `resource` points to the prefixed mine inventory key.
  coal:  { target: 43, label: "Coal",  resource: "mine_coal" },
};
