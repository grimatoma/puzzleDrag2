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
import { ITEMS } from "../../constants.js";
import { buildRecipesByOutput } from "../recipeCatalog.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";
import { buildItemReferenceIndex } from "../itemReferences.js";
import { RelationalFooter, CraftingRecipeLinks, WhereUsedLinks } from "../relational.jsx";

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

export default function ResourcesTab({ draft: any, updateDraft: any }) {
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

  // Cross-reference index — used by the "Where used" line on each resource card.
  const referenceIndex = useMemo(() => buildItemReferenceIndex(), []);

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
                      <SmallButton variant="ghost" onClick={() => updateDraft((d: any) => { delete d.items[key]; })}>
                        revert
                      </SmallButton>
                    )}
                  </div>

                  <div>
                    <Label>Label</Label>
                    <TextField value={eff.label} onChange={(v: any) => patchItem(key, { label: v })} />
                  </div>
                  <div>
                    <Label>Sale value</Label>
                    <NumberField value={eff.value} min={0} max={9999} onChange={(v: any) => patchItem(key, { value: v })} width={80} />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <ColorField value={eff.color} onChange={(v: any) => patchItem(key, { color: v })} />
                  </div>
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

              <RelationalFooter title="References" hint="Derived · click to open">
                <div className="mb-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                    Crafting recipes
                  </div>
                  <CraftingRecipeLinks recipes={craftedBy} />
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                    Where used
                  </div>
                  <WhereUsedLinks usages={referenceIndex?.get(key) || []} />
                </div>
              </RelationalFooter>
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

function Label({ children: any }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

