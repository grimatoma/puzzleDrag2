export function filterAbilityCatalog(catalog, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter((def) => (
    String(def.id ?? "").toLowerCase().includes(q)
    || String(def.name ?? "").toLowerCase().includes(q)
    || String(def.desc ?? "").toLowerCase().includes(q)
  ));
}
