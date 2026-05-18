// Items — discrete objects that sit in your inventory (one or many of each:
// a rake, a comb, a table…). A "tool" is just an item with a power: the
// Effect / Target / Anim fields are what make it a tool.
//
// Tiles (board pieces) and resources (currency-like counts) are NOT items —
// they each have their own tab. This tab only ever lists kinds that aren't
// "tile" or "resource".

import { useState, useMemo } from "react";
import { ITEMS, RECIPES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
  FilterBar, SegmentedFilter,
} from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";

const FILTERS = [
  { id: "all",   label: "All items", iconKey: "ui_build" },
  { id: "tool",  label: "Tools",     iconKey: "rake"     },
  { id: "plain", label: "Plain",     iconKey: "ui_star"  },
];

// Tiles and resources are excluded — those are separate concepts/tabs.
function isItem(r) {
  return r.kind !== "tile" && r.kind !== "resource";
}

// What makes an item a "tool" is that it has a power — a wired effect.
function isTool(r) {
  return r.kind === "tool" || !!r.effect;
}

export default function ItemsTab({ draft, updateDraft }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const itemEntries = useMemo(
    () => Object.entries(ITEMS)
      .filter(([, r]) => isItem(r))
      .sort((a, b) => a[0].localeCompare(b[0])),
    [],
  );

  const filtered = itemEntries.filter(([key, r]) => {
    if (filter === "tool" && !isTool(r)) return false;
    if (filter === "plain" && isTool(r)) return false;
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

  // Map every recipe onto the item it outputs, so each card can show how it's made.
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
      {/* Filter (All / Tools / Plain) + search */}
      <FilterBar>
        <SegmentedFilter options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Item filter" />
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter items by key or label…" />
        </div>
        <Pill>{filtered.length} of {itemEntries.length}</Pill>
      </FilterBar>

      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        Discrete objects you carry in your inventory. A tool is just an item with a power — the Effect / Target / Anim fields below. (Tiles and resources are not items; see their own tabs.)
      </div>

      {/* Items list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(([key, r]) => {
          const patch = draft.items[key] || {};
          const eff = {
            label:       patch.label       ?? r.label,
            color:       patch.color       ?? r.color,
            value:       patch.value       ?? r.value,
            desc:        patch.desc        ?? r.desc ?? "",
            description: patch.description ?? r.description ?? "",
            effect:      patch.effect      ?? r.effect ?? "",
            target:      patch.target      ?? r.target ?? "",
            anim:        patch.anim        ?? r.anim ?? "",
            ms:          patch.ms          ?? r.ms ?? 0,
          };
          const dirty = Object.keys(patch).length > 0;
          const tool = isTool(r);
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
                    <Pill>{tool ? "tool" : (r.kind || "item")}</Pill>
                    {r.biome && <Pill>{r.biome}</Pill>}
                    {dirty && <Pill color="#fff" bg={COLORS.ember}>edited</Pill>}
                    {dirty && (
                      <SmallButton variant="ghost" onClick={() => updateDraft((d) => { delete d.items[key]; })}>
                        revert
                      </SmallButton>
                    )}
                  </div>

                  <div>
                    <Label>Label</Label>
                    <TextField value={eff.label} onChange={(v) => patchItem(key, { label: v })} />
                  </div>
                  <div>
                    <Label>Sale value</Label>
                    <NumberField value={eff.value} min={0} max={9999} onChange={(v) => patchItem(key, { value: v })} width={80} />
                  </div>

                  {/* Plain items carry a colour swatch; tools draw their own glyph. */}
                  {!tool && (
                    <div>
                      <Label>Color</Label>
                      <ColorField value={eff.color} onChange={(v) => patchItem(key, { color: v })} />
                    </div>
                  )}

                  {/* The power — having one of these is what makes an item a tool. */}
                  {tool && (
                    <>
                      <div>
                        <Label>Effect (power)</Label>
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
                        {craftedBy.map((rec) => (
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
