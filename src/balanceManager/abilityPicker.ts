export function filterAbilityCatalog(catalog: any, query: any) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter((def: any) => (
    String(def.id ?? "").toLowerCase().includes(q)
    || String(def.name ?? "").toLowerCase().includes(q)
    || String(def.desc ?? "").toLowerCase().includes(q)
  ));
}
