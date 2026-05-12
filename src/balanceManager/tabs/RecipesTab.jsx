// Recipes tab — edit crafting recipe inputs, station, coin reward, glyph,
// description.

import { useState, useMemo } from "react";
import { RECIPES, BIOMES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select,
  SmallButton, Pill, Card, SearchBar,
} from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";

const STATIONS = [
  { value: "bakery",   label: "Bakery" },
  { value: "larder",   label: "Larder" },
  { value: "forge",    label: "Forge" },
  { value: "workshop", label: "Workshop" },
];

const STATION_FILTERS = [
  { id: "all",      label: "All",      iconKey: "ui_star" },
  { id: "bakery",   label: "Bakery",   iconKey: "ui_star" },
  { id: "larder",   label: "Larder",   iconKey: "ui_star" },
  { id: "forge",    label: "Forge",    iconKey: "ui_star" },
  { id: "workshop", label: "Workshop", iconKey: "ui_devtools" },
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
            desc: p.desc ?? r.desc ?? "",
          };
          const dirty = Object.keys(p).length > 0;

          return (
            <Card key={key} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded grid place-items-center bg-[#e0d4be] text-[20px] overflow-hidden">
                    <Icon iconKey={key} size={28} />
                  </div>
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

              </div>

              {/* Inputs editor */}
              <div className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>
                  Ingredients
                </div>
                <IngredientsEditor
                  ingredients={eff.inputs}
                  availableKeys={allResourceKeys}
                  onChange={(nextInputs) => patchInputs(key, nextInputs)}
                />
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

function IngredientsEditor({ ingredients, availableKeys, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const available = availableKeys.filter(
    (k) => !(k in ingredients) && k.toLowerCase().includes(query.toLowerCase())
  );

  function updateIngredient(resKey, qty) {
    const next = { ...ingredients };
    if (qty === null || qty === undefined || qty <= 0) {
      delete next[resKey];
    } else {
      next[resKey] = qty;
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.keys(ingredients).length === 0 && (
        <div
          className="text-center py-3 text-[12px] italic rounded-lg border-2 border-dashed"
          style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}
        >
          No ingredients added.
        </div>
      )}

      {Object.entries(ingredients).map(([resKey, qty]) => (
        <Card key={resKey}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon iconKey={resKey} size={20} />
              <span className="text-[12px] font-bold" style={{ color: COLORS.ink }}>
                {resKey}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NumberField
                value={qty}
                min={1}
                max={9999}
                width={70}
                onChange={(v) => updateIngredient(resKey, v)}
              />
              <SmallButton variant="danger" onClick={() => updateIngredient(resKey, null)}>
                ✕
              </SmallButton>
            </div>
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
          Add Ingredient
        </div>
        <SmallButton onClick={() => setPickerOpen((v) => !v)}>
          {pickerOpen ? "Hide" : "Search & Add"}
        </SmallButton>
      </div>

      {pickerOpen && (
        <div className="flex flex-col gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources & recipes…"
            className="px-2 py-1.5 rounded border text-[12px]"
            style={{ background: "#fffaf1", borderColor: COLORS.border, color: COLORS.ink }}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {available.map((k) => (
              <button
                key={k}
                onClick={() => {
                  updateIngredient(k, 1);
                  setQuery("");
                }}
                className="flex items-center gap-2 text-left p-2 rounded-lg border-2 transition-colors hover:opacity-90"
                style={{ background: COLORS.parchment, borderColor: COLORS.border }}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-[#e0d4be]">
                  <Icon iconKey={k} size={24} />
                </div>
                <div className="text-[12px] font-bold truncate flex-1 min-w-0" style={{ color: COLORS.ink }}>
                  {k}
                </div>
              </button>
            ))}
            {available.length === 0 && (
              <div className="text-[11px] italic px-1 col-span-full" style={{ color: COLORS.inkSubtle }}>
                No matching ingredients.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
