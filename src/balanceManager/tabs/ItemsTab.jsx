import { useState, useMemo } from "react";
import { ITEMS, RECIPES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";

const CATEGORY_TABS = [
  { id: "all", label: "All Items", icon: "ui_star" },
  { id: "farm", label: "Farm", icon: "grass_hay" },
  { id: "mine", label: "Mine", icon: "mine_stone" },
  { id: "fish", label: "Harbor", icon: "fish_sardine" },
  { id: "tool", label: "Tools", icon: "ui_build" },
  { id: "resource", label: "Products", icon: "pie" },
];

export default function ItemsTab({ draft, updateDraft }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const itemEntries = useMemo(() => {
    return Object.entries(ITEMS).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const nextOptions = useMemo(
    () => [{ value: "", label: "— none (terminal) —" },
            ...itemEntries.map(([k]) => ({ value: k, label: k }))],
    [itemEntries],
  );

  const filtered = itemEntries.filter(([key, r]) => {
    if (category !== "all") {
      if (category === "farm" && r.biome !== "farm") return false;
      if (category === "mine" && r.biome !== "mine") return false;
      if (category === "fish" && r.biome !== "fish") return false;
      if (category === "tool" && r.kind !== "tool") return false;
      if (category === "resource" && r.kind === "resource" && r.biome === undefined) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!key.toLowerCase().includes(q) && !(r.label || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function patchItem(key, fields) {
    updateDraft((d) => {
      const cur = d.items[key] || {};
      const next = { ...cur, ...fields };
      // Drop empty patches to keep the JSON tidy.
      for (const k of Object.keys(next)) {
        if (next[k] === "" || next[k] === undefined) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.items[key];
      else d.items[key] = next;
    });
  }

  function patchDescription(tileId, value) {
    updateDraft((d) => {
      if (!value) delete d.tileDescriptions[tileId];
      else d.tileDescriptions[tileId] = value;
    });
  }

  // To show how items are crafted, we need to map over all recipes that output this item.
  // We look at the actual current RECIPES and the draft recipes.
  const allCraftingMethods = useMemo(() => {
    const methods = {};
    for (const [recId, rec] of Object.entries(RECIPES)) {
      const draftRec = draft.recipes[recId];
      const effItem = draftRec?.item ?? rec.item;
      if (!methods[effItem]) methods[effItem] = [];
      methods[effItem].push({ recId, ...rec, ...draftRec });
    }
    return methods;
  }, [draft.recipes]);

  return (
    <div className="flex flex-col gap-3">
      {/* Category switcher + search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-shrink-0">
          {CATEGORY_TABS.map((b) => (
            <button
              key={b.id}
              onClick={() => setCategory(b.id)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2 transition-colors flex items-center gap-1"
              style={
                category === b.id
                  ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
                  : { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }
              }
            >
              <Icon iconKey={b.icon} size={16} /> {b.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder={`Filter items by key or label…`} />
        </div>
        <Pill>{filtered.length} of {itemEntries.length}</Pill>
      </div>

      {/* Items list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(([key, r]) => {
          const patch = draft.items[key] || {};
          const eff = {
            label:       patch.label       ?? r.label,
            color:       patch.color       ?? r.color,
            dark:        patch.dark        ?? r.dark,
            value:       patch.value       ?? r.value,
            next:        patch.next        ?? r.next ?? "",
            description: patch.description ?? r.description ?? "",
            desc:        patch.desc        ?? r.desc ?? "",
            effect:      patch.effect      ?? r.effect ?? "",
            target:      patch.target      ?? r.target ?? "",
            anim:        patch.anim        ?? r.anim ?? "",
            ms:          patch.ms          ?? r.ms ?? 0,
          };
          const tileDescPatch = draft.tileDescriptions[key];
          const tileDesc = tileDescPatch ?? eff.description;
          const dirty = Object.keys(patch).length > 0 || tileDescPatch !== undefined;

          const craftedBy = allCraftingMethods[key] || [];

          return (
            <Card key={key} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex gap-3">
                <TileSwatch color={eff.color || 0xdddddd} iconKey={key} size={48} />
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {/* Key (read-only) */}
                  <div className="col-span-2 flex items-center gap-2 mb-1">
                    <code
                      className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                    >
                      {key}
                    </code>
                    {r.kind && <Pill>{r.kind}</Pill>}
                    {r.biome && <Pill>{r.biome}</Pill>}
                    {dirty && <Pill color="#fff" bg={COLORS.ember}>edited</Pill>}
                    {dirty && (
                      <SmallButton
                        variant="ghost"
                        onClick={() => {
                          updateDraft((d) => {
                            delete d.items[key];
                            delete d.tileDescriptions[key];
                          });
                        }}
                      >
                        revert
                      </SmallButton>
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <Label>Label</Label>
                    <TextField value={eff.label} onChange={(v) => patchItem(key, { label: v })} />
                  </div>

                  {/* Sale value */}
                  <div>
                    <Label>Sale value</Label>
                    <NumberField value={eff.value} min={0} max={9999}
                      onChange={(v) => patchItem(key, { value: v })} width={80} />
                  </div>

                  {/* Color (if tile or resource) */}
                  {r.kind !== "tool" && (
                    <div>
                      <Label>Color</Label>
                      <ColorField value={eff.color} onChange={(v) => patchItem(key, { color: v })} />
                    </div>
                  )}

                  {/* Next-tier upgrade (if tile or resource) */}
                  {r.kind !== "tool" && (
                    <div className="col-span-1">
                      <Label>Next-tier target</Label>
                      <Select value={eff.next} options={nextOptions}
                        onChange={(v) => patchItem(key, { next: v })} />
                    </div>
                  )}

                  {/* Tool-specific properties */}
                  {r.kind === "tool" && (
                    <>
                      <div>
                        <Label>Effect</Label>
                        <TextField value={eff.effect} onChange={(v) => patchItem(key, { effect: v })} />
                      </div>
                      <div>
                        <Label>Target</Label>
                        <TextField value={eff.target} onChange={(v) => patchItem(key, { target: v })} />
                      </div>
                      <div>
                        <Label>Anim</Label>
                        <TextField value={eff.anim} onChange={(v) => patchItem(key, { anim: v })} />
                      </div>
                      <div>
                        <Label>Anim MS</Label>
                        <NumberField value={eff.ms} min={0} max={5000} onChange={(v) => patchItem(key, { ms: v })} width={80} />
                      </div>
                    </>
                  )}

                  {/* Crafting recipes read-only summary */}
                  <div className="col-span-2">
                    <Label>Crafting Recipes</Label>
                    {craftedBy.length === 0 ? (
                      <div className="text-[10px] italic text-gray-500">Not craftable.</div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {craftedBy.map(rec => (
                          <div key={rec.recId} className="text-[10px] flex items-center gap-1 border rounded px-1.5 py-1" style={{ borderColor: COLORS.border }}>
                            <Pill>{rec.station}</Pill>
                            <span className="text-gray-600">Requires:</span>
                            {Object.entries(rec.inputs || {}).map(([inp, qty]) => (
                              <span key={inp} className="flex items-center gap-0.5">
                                <Icon iconKey={inp} size={12} /> {qty}x
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <TextArea
                      rows={2}
                      value={eff.desc || eff.description}
                      placeholder="Short flavor text shown in tooltips."
                      onChange={(v) => patchItem(key, { desc: v, description: v })}
                    />
                  </div>

                  {/* Tile description (used by tile collection screen) */}
                  {r.kind !== "tool" && (
                    <div className="col-span-2">
                      <Label>Tile-collection description</Label>
                      <TextArea
                        rows={2}
                        value={tileDesc}
                        placeholder="Long-form description for the Tile Collection screen."
                        onChange={(v) => patchDescription(key, v)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No items match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}
