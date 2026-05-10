// Recipes tab — edit crafting recipe inputs, station, coin reward, glyph,
// description.

import { useState, useMemo } from "react";
import { RECIPES, BIOMES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select,
  SmallButton, Pill, Card, SearchBar,
} from "../shared.jsx";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";

const STATIONS = [
  { value: "bakery",   label: "Bakery" },
  { value: "larder",   label: "Larder" },
  { value: "forge",    label: "Forge" },
  { value: "workshop", label: "Workshop" },
];

const STATION_FILTERS = [
  { id: "all",      label: "All",      icon: "🍳" },
  { id: "bakery",   label: "Bakery",   icon: "🥖" },
  { id: "larder",   label: "Larder",   icon: "🫙" },
  { id: "forge",    label: "Forge",    icon: "⚒" },
  { id: "workshop", label: "Workshop", icon: "🛠" },
];

export default function RecipesTab({ draft, updateDraft }) {
  const [stationFilter, setStationFilter] = useState("all");
  const [search, setSearch] = useState("");

  const allResourceKeys = useMemo(() => {
    const set = new Set();
    for (const b of Object.values(BIOMES)) for (const r of b.resources) set.add(r.key);
    // Recipes can also accept other crafted items as inputs.
    for (const k of Object.keys(RECIPES)) set.add(k);
    return [...set].filter((k) => typeof k === "string").sort();
  }, []);

  const recipeOptions = useMemo(
    () => [{ value: "", label: "— pick resource —" },
            ...allResourceKeys.map((k) => ({ value: k, label: k }))],
    [allResourceKeys],
  );

  // Filter the RECIPES map: skip alias entries like `iron_frame: RECIPES.ironframe`
  // by tracking object identity.
  const recipeEntries = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const [key, value] of Object.entries(RECIPES)) {
      if (!value || typeof value !== "object" || !value.name) continue;
      if (seen.has(value)) continue; // alias
      seen.add(value);
      out.push([key, value]);
    }
    return out.sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, []);

  const filtered = recipeEntries.filter(([key, r]) => {
    if (stationFilter !== "all" && r.station !== stationFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!key.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function patch(key, fields) {
    updateDraft((d) => {
      const cur = d.recipes[key] || {};
      const next = { ...cur, ...fields };
      for (const k of Object.keys(next)) if (next[k] === "" || next[k] === undefined) delete next[k];
      if (Object.keys(next).length === 0) delete d.recipes[key];
      else d.recipes[key] = next;
    });
  }

  function patchInputs(key, inputs) {
    patch(key, { inputs });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-shrink-0">
          {STATION_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStationFilter(s.id)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2"
              style={
                stationFilter === s.id
                  ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
                  : { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }
              }
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter recipes…" />
        </div>
        <Pill>{filtered.length} of {recipeEntries.length}</Pill>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(([key, r]) => {
          const p = draft.recipes[key] || {};
          const eff = {
            name: p.name ?? r.name,
            inputs: p.inputs ?? r.inputs ?? {},
            tier: p.tier ?? r.tier ?? 1,
            station: p.station ?? r.station ?? "workshop",
            coins: p.coins ?? r.coins ?? 0,
            glyph: p.glyph ?? r.glyph ?? "",
            desc: p.desc ?? r.desc ?? "",
          };
          const dirty = Object.keys(p).length > 0;

          return (
            <Card key={key} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {hasIcon(key) ? (
                    <div className="flex-shrink-0 w-8 h-8 rounded grid place-items-center bg-[#e0d4be] text-[20px] overflow-hidden">
                      <IconCanvas iconKey={key} size={32} />
                    </div>
                  ) : (
                    <span className="text-[20px]">{eff.glyph || "🍳"}</span>
                  )}
                  <div className="min-w-0">
                    <code
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded inline-block"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                    >
                      {key}
                    </code>
                    <Pill>{eff.station}</Pill>
                    {eff.tier && <Pill>tier {eff.tier}</Pill>}
                  </div>
                </div>
                {dirty && (
                  <SmallButton
                    variant="ghost"
                    onClick={() => updateDraft((d) => { delete d.recipes[key]; })}
                  >
                    revert
                  </SmallButton>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
                <div>
                  <Label>Name</Label>
                  <TextField value={eff.name} onChange={(v) => patch(key, { name: v })} />
                </div>
                <div>
                  <Label>Coins reward</Label>
                  <NumberField value={eff.coins} min={0} max={9999} width={80}
                    onChange={(v) => patch(key, { coins: v })} />
                </div>
                <div>
                  <Label>Station</Label>
                  <Select value={eff.station} options={STATIONS}
                    onChange={(v) => patch(key, { station: v })} />
                </div>
                <div>
                  <Label hint="Town-level gate. T2 recipes need town level 3 to craft.">Tier</Label>
                  <NumberField value={eff.tier} min={1} max={5} width={60}
                    onChange={(v) => patch(key, { tier: v })} />
                </div>
                <div>
                  <Label hint="Emoji icon shown next to this recipe in the crafting UI (cosmetic only).">Glyph</Label>
                  <TextField value={eff.glyph} onChange={(v) => patch(key, { glyph: v })} />
                </div>
              </div>

              {/* Inputs editor */}
              <div className="mb-2">
                <Label>Ingredients</Label>
                <div className="flex flex-col gap-1">
                  {Object.entries(eff.inputs).map(([resKey, qty]) => (
                    <div key={resKey} className="flex items-center gap-2">
                      <Select
                        value={resKey}
                        options={recipeOptions}
                        onChange={(v) => {
                          const next = { ...eff.inputs };
                          delete next[resKey];
                          if (v) next[v] = qty;
                          patchInputs(key, next);
                        }}
                      />
                      <NumberField
                        value={qty}
                        min={1}
                        max={99}
                        width={60}
                        onChange={(v) => patchInputs(key, { ...eff.inputs, [resKey]: v })}
                      />
                      <SmallButton
                        variant="danger"
                        onClick={() => {
                          const next = { ...eff.inputs };
                          delete next[resKey];
                          patchInputs(key, next);
                        }}
                      >
                        ✕
                      </SmallButton>
                    </div>
                  ))}
                  <SmallButton
                    onClick={() => {
                      const empty = allResourceKeys.find((k) => !(k in eff.inputs)) || "";
                      if (empty) patchInputs(key, { ...eff.inputs, [empty]: 1 });
                    }}
                  >
                    + Add ingredient
                  </SmallButton>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <TextArea
                  rows={2}
                  value={eff.desc}
                  placeholder="Short flavor copy shown in the crafting screen."
                  onChange={(v) => patch(key, { desc: v })}
                />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No recipes match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, hint }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5 flex items-center gap-1" style={{ color: COLORS.inkSubtle }}>
      <span>{children}</span>
      {hint && (
        <span
          title={hint}
          className="cursor-help inline-block w-3.5 h-3.5 leading-[14px] text-center rounded-full text-[9px]"
          style={{ background: COLORS.parchmentDeep, color: COLORS.inkLight, border: `1px solid ${COLORS.border}` }}
        >
          ?
        </span>
      )}
    </div>
  );
}
