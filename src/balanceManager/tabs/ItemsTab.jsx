import { useState, useMemo } from "react";
import { ITEMS, RECIPES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";

// The game has three distinct kinds of "thing", and this tab keeps them in
// three separate views so their schemas don't bleed into each other:
//   • Tiles     — board pieces (kind: "tile"). You never own them; they sit
//                 on the grid and chain into a next-tier target.
//   • Resources — fungible amounts you hold in inventory (kind: "resource" —
//                 grain, wood, eggs, crafted goods…), plus the kingdom-wide
//                 currency counters (gold / runes / embers / …) listed up top.
//   • Items     — discrete useful objects in your inventory: tools today
//                 (rake, axe…), and combs / tables / … later. Items do NOT
//                 have a "next tier" — that concept is tile/resource-only.
const VIEWS = [
  { id: "tile",     label: "Tiles",     icon: "grass_hay" },
  { id: "resource", label: "Resources", icon: "grain"     },
  { id: "item",     label: "Items",     icon: "ui_build"  },
];

const BIOME_FILTERS = [
  { value: "all",  label: "All biomes" },
  { value: "farm", label: "Farm"       },
  { value: "mine", label: "Mine"       },
  { value: "fish", label: "Harbor"     },
  { value: "none", label: "No biome"   },
];

// Kingdom-wide currency counters. These are root-state numbers, not entries in
// the ITEMS registry, so there's nothing here to patch — they're listed for
// reference at the top of the Resources view.
const CURRENCIES = [
  { icon: "🪙", label: "Gold (coins)",    note: "Main coin currency — selling resources, filling orders, daily rewards." },
  { icon: "🔮", label: "Runes",           note: "From Mysterious Ore in the mine; spent on mine-entry tiers." },
  { icon: "🔥", label: "Embers",          note: "Kingdom currency earned by Coexisting with a biome keeper." },
  { icon: "🪨", label: "Core Ingots",     note: "Kingdom currency earned by Driving Out a biome keeper." },
  { icon: "💎", label: "Gems",            note: "Spent to skip the real-time crafting-queue timer." },
  { icon: "🏺", label: "Heirloom tokens", note: "Per-biome story tokens: Heirloom Seed · Pact Iron · Tidesinger Pearl." },
];

// Map a registry `kind` onto one of the three views. Tools (and any future
// non-tile / non-resource kind) belong to the Items bucket.
function bucketOf(kind) {
  if (kind === "tile") return "tile";
  if (kind === "resource") return "resource";
  return "item";
}

export default function ItemsTab({ draft, updateDraft }) {
  const [view, setView] = useState("tile");
  const [biome, setBiome] = useState("all");
  const [search, setSearch] = useState("");

  const itemEntries = useMemo(
    () => Object.entries(ITEMS).sort((a, b) => a[0].localeCompare(b[0])),
    [],
  );

  // A chain can only upgrade into a tile or a resource — never into an item
  // (a rake is not "the next tier" of anything), so keep tools out of the list.
  const nextOptions = useMemo(
    () => [
      { value: "", label: "— none (terminal) —" },
      ...itemEntries
        .filter(([, r]) => bucketOf(r.kind) !== "item")
        .map(([k]) => ({ value: k, label: k })),
    ],
    [itemEntries],
  );

  const bucketTotal = useMemo(
    () => itemEntries.filter(([, r]) => bucketOf(r.kind) === view).length,
    [itemEntries, view],
  );

  const filtered = itemEntries.filter(([key, r]) => {
    if (bucketOf(r.kind) !== view) return false;
    if (biome === "none" && r.biome) return false;
    if (biome !== "all" && biome !== "none" && r.biome !== biome) return false;
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

  // To show how items are crafted, map over all recipes that output this item.
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

  const isResources = view === "resource";

  return (
    <div className="flex flex-col gap-3">
      {/* View switcher + biome filter + search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-shrink-0">
          {VIEWS.map((b) => (
            <button
              key={b.id}
              onClick={() => setView(b.id)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2 transition-colors flex items-center gap-1"
              style={
                view === b.id
                  ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
                  : { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }
              }
            >
              <Icon iconKey={b.icon} size={16} /> {b.label}
            </button>
          ))}
        </div>
        <div className="flex-shrink-0 w-[130px]">
          <Select value={biome} onChange={setBiome} options={BIOME_FILTERS} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter by key or label…" />
        </div>
        <Pill>{filtered.length} of {bucketTotal}</Pill>
      </div>

      {/* What this view holds */}
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        {view === "tile" && "Board pieces — they live on the grid, never in your inventory. Each one chains into a next-tier target."}
        {view === "resource" && "Fungible amounts you hold in inventory (grain, wood, eggs, crafted goods…), plus the kingdom currency counters below."}
        {view === "item" && "Discrete useful objects in your inventory — tools today (rake, axe…), and combs / tables / … later. Items don't have a next tier."}
      </div>

      {/* Kingdom currencies — reference list, shown only on the Resources view */}
      {isResources && (
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
            Kingdom currencies
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
            {CURRENCIES.map((c) => (
              <div key={c.label} className="flex items-start gap-2 text-[11px]" style={{ color: COLORS.inkLight }}>
                <span className="text-[14px] leading-none flex-shrink-0" aria-hidden>{c.icon}</span>
                <span><span className="font-bold">{c.label}</span> — {c.note}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] italic mt-1.5" style={{ color: COLORS.inkSubtle }}>
            Counters on the root game state — listed for reference, not edited here.
          </div>
        </Card>
      )}

      {/* Entries */}
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

          const isTool = r.kind === "tool";
          const canChain = r.kind === "tile" || r.kind === "resource";
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

                  {/* Color (tiles and resources have one; tools don't) */}
                  {!isTool && (
                    <div>
                      <Label>Color</Label>
                      <ColorField value={eff.color} onChange={(v) => patchItem(key, { color: v })} />
                    </div>
                  )}

                  {/* Next-tier target — chain mechanic, so tiles & resources only */}
                  {canChain && (
                    <div className="col-span-1">
                      <Label>Next-tier target</Label>
                      <Select value={eff.next} options={nextOptions}
                        onChange={(v) => patchItem(key, { next: v })} />
                    </div>
                  )}

                  {/* Tool-specific properties */}
                  {isTool && (
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

                  {/* Tile-collection description — used by the Tile Collection screen */}
                  {r.kind === "tile" && (
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
            No {VIEWS.find((v) => v.id === view)?.label.toLowerCase()} match your filter.
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
