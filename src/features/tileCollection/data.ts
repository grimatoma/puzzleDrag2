// Back-compat shim. The core tile catalog moved to src/tileCatalog.ts (health
// review #5) because it is the canonical game catalog, not a feature-private
// module. Existing importers keep working through this re-export; new code
// should import from "../../tileCatalog.js" directly.
export * from "../../tileCatalog.js";
