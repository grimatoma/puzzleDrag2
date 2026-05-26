interface AbilityCatalogEntry {
  id?: string;
  name?: string;
  desc?: string;
  [extra: string]: unknown;
}

export function filterAbilityCatalog<T extends AbilityCatalogEntry>(catalog: T[], query: string | null | undefined): T[] {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter((def: T) => (
    String(def.id ?? "").toLowerCase().includes(q)
    || String(def.name ?? "").toLowerCase().includes(q)
    || String(def.desc ?? "").toLowerCase().includes(q)
  ));
}
