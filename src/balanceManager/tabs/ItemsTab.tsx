// Items — discrete objects that sit in your inventory (one or many of each:
// a rake, a comb, a table…). A "tool" is just an item with a tool power: the
// power / target fields are what make it a tool. Each tool has its own board anim + ms (even when sharing a power).
//
// Tiles (board pieces) are separate. This tab is the unified inventory model:
// resources + plain items + tools.

import { useState, useMemo } from "react";
import { ITEMS } from "../../constants.js";
import { buildRecipesByOutput } from "../recipeCatalog.js";
import { tagsForItemKey, sourceTagsForItem } from "../../features/inventory/tags.js";
import {
  COLORS, NumberField, TextField, TextArea, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
  FilterBar, SegmentedFilter, Select, resourceKeyOptions, tileKeyOptions, hazardOptions,
} from "../shared.jsx";
import { TOOL_POWERS, getToolPower, defaultsForToolPower, defaultBoardAnimForPower } from "../../config/toolPowers.js";
import { CardAttachmentFooter, RelationalFooter, CraftingRecipeLinks } from "../relational.jsx";

const FILTERS = [
  { id: "all",      label: "All",       iconKey: "ui_build" },
  { id: "resource", label: "Resources", iconKey: "grain"    },
  { id: "tool",     label: "Tools",     iconKey: "rake"     },
  { id: "item",     label: "Items",     iconKey: "ui_star"  },
];

function isItem(r: any) {
  return r.kind !== "tile";
}

// What makes an item a "tool" is that it has a tool power wired (stored as `effect` in data).
function isTool(r: any) {
  return r.kind === "tool" || !!r.effect;
}

export default function ItemsTab({ draft, updateDraft }: { draft: any; updateDraft: any }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const itemEntries = useMemo(
    () => Object.entries(ITEMS)
      .filter(([, r]) => isItem(r))
      .sort((a, b) => a[0].localeCompare(b[0])),
    [],
  );

  const filtered = itemEntries.filter(([key, r]) => {
    if (filter === "resource" && r.kind !== "resource") return false;
    if (filter === "tool" && !isTool(r)) return false;
    if (filter === "item" && (r.kind === "resource" || isTool(r))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!key.toLowerCase().includes(q) && !(r.label || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function patchItem(key: any, fields: any) {
    updateDraft((d: any) => {
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

  const allCraftingMethods = useMemo(
    () => buildRecipesByOutput({ draftRecipes: draft.recipes }),
    [draft.recipes],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Filter (All / Resources / Tools / Items) + search */}
      <FilterBar>
        <SegmentedFilter options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Item filter" />
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter items by key or label…" />
        </div>
        <Pill>{filtered.length} of {itemEntries.length}</Pill>
      </FilterBar>

      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        Unified inventory editor. Filter across resources, tools, and plain items. Existing tags (like kind/resource and biome/farm) are shown on each card.
      </div>

      {/* Items list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(([key, r]) => {
          const patch = draft.items[key] || {};
          const eff = {
            label:       patch.label       ?? r.label,
            color:       patch.color       ?? r.color,
            value:       patch.value       ?? r.value,
            sellable:    patch.sellable    ?? r.sellable ?? false,
            desc:        patch.desc        ?? r.desc ?? "",
            description: patch.description ?? r.description ?? "",
            effect:      patch.effect      ?? r.effect ?? "",
            target:      patch.target      ?? r.target ?? "",
            anim:        patch.anim        ?? r.anim ?? "",
            ms:          patch.ms          ?? r.ms ?? 0,
          };
          const dirty = Object.keys(patch).length > 0;
          const tool = isTool(r);
          const powerId = tool ? (eff.effect || r.power?.id) : null;
          const def = powerId ? defaultBoardAnimForPower(powerId) : null;
          const animMatchesDefault = !!(def && eff.anim === def.anim && eff.ms === def.ms);
          const craftedBy = allCraftingMethods[key] || [];
          const semanticTags = tagsForItemKey(key);
          const sourceTags = sourceTagsForItem(key, { recipesByOutput: allCraftingMethods });

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
                    {semanticTags.map((tag) => <Pill key={`semantic-${tag}`}>{tag}</Pill>)}
                    {sourceTags.map((tag) => <Pill key={`source-${tag}`}>{tag}</Pill>)}
                    {dirty && <Pill color="#fff" bg={COLORS.ember}>edited</Pill>}
                    {dirty && (
                      <SmallButton variant="ghost" onClick={() => updateDraft((d: any) => { delete d.items[key]; })}>
                        revert
                      </SmallButton>
                    )}
                  </div>

                  <div>
                    <Label>Label</Label>
                    <TextField value={eff.label} onChange={(v: any) => patchItem(key, { label: v })} />
                  </div>
                  <div className="col-span-2 flex items-end gap-3 flex-wrap">
                    <label className="text-[11px] flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!eff.sellable}
                        onChange={(e) => patchItem(key, { sellable: e.target.checked })}
                      />
                      Sellable in market
                    </label>
                    {eff.sellable && (
                      <div>
                        <Label>Sale value</Label>
                        <NumberField value={eff.value} min={0} max={9999} onChange={(v: any) => patchItem(key, { value: v })} width={80} />
                      </div>
                    )}
                  </div>

                  {/* Resources and plain items carry a colour swatch; tools draw their own glyph. */}
                  {!tool && (
                    <div>
                      <Label>Color</Label>
                      <ColorField value={eff.color} onChange={(v: any) => patchItem(key, { color: v })} />
                    </div>
                  )}

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <TextArea
                      rows={2}
                      value={eff.desc || eff.description}
                      placeholder="Short flavor text shown in tooltips."
                      onChange={(v: any) => patchItem(key, { desc: v, description: v })}
                    />
                  </div>
                </div>
              </div>

              {tool && (
                <CardAttachmentFooter title="Tool power">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div className="col-span-2">
                      <Label>Tool power</Label>
                      <Select
                        value={eff.effect}
                        options={[
                          { value: "", label: "— pick power —" },
                          ...TOOL_POWERS.map((p) => ({ value: p.id, label: `${p.name} — ${p.id}` })),
                        ]}
                        onChange={(v: any) => {
                          const defaults = defaultsForToolPower(v);
                          patchItem(key, { effect: v, target: defaults.target ?? "", ...defaults });
                        }}
                      />
                      {getToolPower(eff.effect)?.desc && (
                        <div className="text-[10px] italic mt-0.5" style={{ color: COLORS.inkSubtle }}>
                          {getToolPower(eff.effect)?.desc}
                        </div>
                      )}
                    </div>
                    {(getToolPower(eff.effect)?.params ?? []).map((p) => {
                      const effRec = eff as unknown as Record<string, unknown>;
                      return (
                        <div key={p.key}>
                          <Label>{p.label}</Label>
                          {p.type === "resourceKey" ? (
                            <Select value={effRec[p.key] ?? ""} options={resourceKeyOptions()}
                              onChange={(v: any) => patchItem(key, { [p.key]: v })} />
                          ) : p.type === "tileKey" ? (
                            <Select value={effRec[p.key] ?? ""} options={tileKeyOptions()}
                              onChange={(v: any) => patchItem(key, { [p.key]: v })} />
                          ) : p.type === "hazard" ? (
                            <Select value={effRec[p.key] ?? ""} options={hazardOptions()}
                              onChange={(v: any) => patchItem(key, { [p.key]: v })} />
                          ) : null}
                        </div>
                      );
                    })}
                    <div>
                      <Label>Anim</Label>
                      <Select
                        value={animMatchesDefault ? "" : eff.anim}
                        options={(() => {
                          const known = [...new Set(
                            Object.values(ITEMS).filter((it) => it.kind === "tool" && it.anim).map((it) => it.anim),
                          )].sort();
                          const emptyLabel = def ? "(use power default)" : "— none —";
                          const opts = [{ value: "", label: emptyLabel }, ...known.map((a) => ({ value: a, label: a }))];
                          if (eff.anim && !known.includes(eff.anim) && !animMatchesDefault) opts.unshift({ value: eff.anim, label: `${eff.anim} (custom)` });
                          return opts;
                        })()}
                        onChange={(v: any) => {
                          if (v === "") {
                            patchItem(key, { anim: "", ms: 0 });
                          } else {
                            patchItem(key, { anim: v });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>Anim MS</Label>
                      <NumberField value={eff.ms} min={0} max={5000} onChange={(v: any) => patchItem(key, { ms: v })} width={80} />
                    </div>
                    {def && (
                      <div className="col-span-2 text-[10px]" style={{ color: COLORS.inkSubtle }}>
                        {animMatchesDefault ? (
                          <>Using power default: <code className="font-mono">{def.anim}</code> · {def.ms}ms</>
                        ) : (
                          <>Power default: <code className="font-mono">{def.anim}</code> · {def.ms}ms<span style={{ color: COLORS.ember }}> — tool override</span></>
                        )}
                      </div>
                    )}
                  </div>
                </CardAttachmentFooter>
              )}

              <RelationalFooter title="Crafting recipes" hint="Derived · click to open">
                <CraftingRecipeLinks recipes={craftedBy} />
              </RelationalFooter>
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

function Label({ children }: { children: any }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}
