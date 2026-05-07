/**
 * Castle Needs — resource contribution targets.
 * Players donate resources from inventory toward each Castle Need; the Castle
 * is a one-way sink (no reset) per REFERENCE_CATALOG.md §11.
 *
 * Soup is the only need wired in this slice. The other entries are placeholders
 * for future contribution chains.
 */
export const CASTLE_NEEDS = {
  soup:  { target: 53, label: "Soup",  resource: "soup"  },
  meat:  { target: 47, label: "Meat",  resource: "meat"  },
  coal:  { target: 43, label: "Coal",  resource: "coal"  },
  cocoa: { target: 33, label: "Cocoa", resource: "cocoa" },
  ink:   { target: 12, label: "Ink",   resource: "ink"   },
};
