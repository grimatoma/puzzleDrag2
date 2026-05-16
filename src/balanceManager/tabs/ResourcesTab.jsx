// Resources & Currency — the "counts of stuff" you accumulate. Two flavours,
// both just numbers that go up:
//   • Resources  — fungible amounts held in the per-item inventory
//                  (kind: "resource" — grain, wood, eggs, crafted goods…).
//                  These may have upgrade products, a colour, a
//                  sale value, and can be crafting ingredients.
//   • Currencies — kingdom-wide counters on the root game state (gold / runes
//                  / embers / …). Not entries in the ITEMS registry, so they
//                  are listed for reference rather than edited here.
//
// Tiles (board pieces) and items (inventory objects / tools) are separate
// concepts with their own tabs.

import { useState, useMemo } from "react";
import { ITEMS, RECIPES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";
import { buildItemReferenceIndex } from "../itemReferences.js";
import { findColorClashes, paletteSummary } from "../palettePicker.js";

const BIOME_FILTERS = [
  { value: "all",  label: "All biomes" },
  { value: "farm", label: "Farm"       },
  { value: "mine", label: "Mine"       },
  { value: "fish", label: "Harbor"     },
  { value: "none", label: "No biome"   },
];

// Kingdom-wide currency counters. These are root-state numbers, not entries in
// the ITEMS registry, so there is nothing to patch — they're listed up top so
// the "counts of stuff" picture is complete.
const CURRENCIES = [
  { icon: "🪙", label: "Gold (coins)",    note: "Main coin currency — selling resources, filling orders, daily rewards." },
  { icon: "🔮", label: "Runes",           note: "From Mysterious Ore in the mine; spent on mine-entry tiers." },
  { icon: "🔥", label: "Embers",          note: "Kingdom currency earned by Coexisting with a biome keeper." },
  { icon: "🪨", label: "Core Ingots",     note: "Kingdom currency earned by Driving Out a biome keeper." },
  { icon: "💎", label: "Gems",            note: "Spent to skip the real-time crafting-queue timer." },
  { icon: "🏺", label: "Heirloom tokens", note: "Per-biome story tokens: Heirloom Seed · Pact Iron · Tidesinger Pearl." },
];

export default function ResourcesTab({ draft, updateDraft }) {
  const [biome, setBiome] = useState("all");
  const [search, setSearch] = useState("");

  const resourceEntries = useMemo(
    () => Object.entries(ITEMS)
      .filter(([, r]) => r.kind === "resource")
      .sort((a, b) => a[0].localeCompare(b[0])),
    [],
  );

  const filtered = resourceEntries.filter(([key, r]) => {
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

  // Cross-reference index — used by the "Where used" line on each resource card.
  const referenceIndex = useMemo(() => buildItemReferenceIndex(), []);

  // Colour-clash audit — surfaces tiles whose palette entries are
  // perceptually too close to another item's. Pure read; toggleable
  // because it's a niche audit rather than everyday info.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const clashes = useMemo(() => findColorClashes(), []);
  const palette = useMemo(() => paletteSummary(), []);
  const clashRows = useMemo(() => clashes.filter((c) => c.peers.length > 0).slice(0, 24), [clashes]);

  return (
    <div className="flex flex-col gap-3">
      {/* Currencies — kingdom-wide counters, reference only */}
      <Card>
        <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
          Currencies
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

      {/* Palette clash audit — toggleable */}
      <Card>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
            Palette audit
          </span>
          <span className="text-[11px]" style={{ color: COLORS.inkLight }}>
            {palette.clashingItems} of {palette.totalItems} items have a perceptually close peer ({palette.totalClashes} pairs at threshold {palette.threshold})
          </span>
          <SmallButton className="ml-auto" onClick={() => setPaletteOpen((v) => !v)}>
            {paletteOpen ? "Hide" : "Show"}
          </SmallButton>
        </div>
        {paletteOpen && (
          <div className="flex flex-col gap-1.5">
            {clashRows.length === 0 ? (
              <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>No clashes at the current threshold.</div>
            ) : clashRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono" style={{ color: COLORS.inkSubtle, width: 130 }}>{row.id}</span>
                <span className="inline-block rounded border" style={{ width: 20, height: 14, background: row.hex, borderColor: COLORS.border }} />
                <span style={{ fontFamily: "ui-monospace,monospace", color: COLORS.inkSubtle, width: 64 }}>{row.hex}</span>
                <span className="flex flex-wrap gap-1">
                  {row.peers.slice(0, 5).map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.inkLight, border: `1px solid ${COLORS.border}` }}>
                      <span style={{ width: 8, height: 8, background: p.hex, borderRadius: 2, border: `1px solid ${COLORS.border}` }} />
                      {p.id}
                      <span className="font-mono" style={{ color: COLORS.inkSubtle }}>~{p.distance}</span>
                    </span>
                  ))}
                </span>
              </div>
            ))}
            {clashes.filter((c) => c.peers.length > 0).length > clashRows.length && (
              <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>
                +{clashes.filter((c) => c.peers.length > 0).length - clashRows.length} more (showing the top 24).
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Resources — editable ITEMS entries with kind: "resource" */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-[11px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
          Resources
        </div>
        <div className="flex-shrink-0 w-[130px]">
          <Select value={biome} onChange={setBiome} options={BIOME_FILTERS} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter resources by key or label…" />
        </div>
        <Pill>{filtered.length} of {resourceEntries.length}</Pill>
      </div>
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        Fungible amounts held in your inventory — raw goods, intermediates, and crafted products. Some upgrade into a next tier depending on the active zone rules.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(([key, r]) => {
          const patch = draft.items[key] || {};
          const eff = {
            label:       patch.label       ?? r.label,
            color:       patch.color       ?? r.color,
            value:       patch.value       ?? r.value,
            desc:        patch.desc        ?? r.desc ?? "",
            description: patch.description ?? r.description ?? "",
          };
          const dirty = Object.keys(patch).length > 0;
          const craftedBy = allCraftingMethods[key] || [];

          return (
            <Card key={key} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex gap-3">
                <TileSwatch color={eff.color || 0xdddddd} iconKey={key} size={48} />
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="col-span-2 flex items-center gap-2 mb-1">
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}>
                      {key}
                    </code>
                    <Pill>{r.kind}</Pill>
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
                  <div>
                    <Label>Color</Label>
                    <ColorField value={eff.color} onChange={(v) => patchItem(key, { color: v })} />
                  </div>
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

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <TextArea
                      rows={2}
                      value={eff.desc || eff.description}
                      placeholder="Short flavor text shown in tooltips."
                      onChange={(v) => patchItem(key, { desc: v, description: v })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Where used</Label>
                    <WhereUsed itemKey={key} index={referenceIndex} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No resources match your filter.
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

const USAGE_LABELS = {
  recipe_input:  { label: "Recipe input",   tone: "info" },
  recipe_output: { label: "Recipe output",  tone: "good" },
  building_cost: { label: "Building cost",  tone: "warn" },
  chain_next:    { label: "Chain feeder",   tone: "default" },
  story_outcome: { label: "Story reward",   tone: "ember" },
};
const TONE_BG = {
  info: "rgba(43,34,24,0.06)", good: "rgba(90,158,75,0.10)", warn: "rgba(226,178,74,0.14)",
  ember: "rgba(214,97,42,0.10)", default: COLORS.parchmentDeep,
};
const TONE_FG = {
  info: COLORS.inkLight, good: COLORS.greenDeep, warn: "#7a5810",
  ember: COLORS.emberDeep, default: COLORS.inkSubtle,
};

function WhereUsed({ itemKey, index }) {
  const usages = index?.get(itemKey) || [];
  if (usages.length === 0) {
    return <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>Not referenced anywhere.</div>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {usages.map((u, i) => {
        const meta = USAGE_LABELS[u.kind] || { label: u.kind, tone: "default" };
        const label = u.kind === "recipe_input" ? `${u.recipeId} · ${u.qty}×`
          : u.kind === "recipe_output" ? `${u.recipeId} (output)`
          : u.kind === "building_cost" ? `${u.buildingId} · ${u.qty}×`
          : u.kind === "chain_next" ? `← ${u.fromId}`
          : u.kind === "story_outcome" ? `${u.beatId}/${u.choiceId} · ${u.qty > 0 ? "+" : ""}${u.qty}`
          : u.kind;
        return (
          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono"
            title={meta.label}
            style={{ background: TONE_BG[meta.tone], color: TONE_FG[meta.tone], border: `1px solid ${COLORS.border}55` }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
