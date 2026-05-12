import { useState, useMemo } from "react";
import { RECIPES, ITEMS } from "../../constants.js";
import {
  COLORS, NumberField, Select,
  SmallButton, Pill, Card, SearchBar, SearchAndAddPicker,
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

  const allItemKeys = useMemo(() => {
    return Object.keys(ITEMS).sort();
  }, []);

  const recipeEntries = useMemo(() => {
    const out = [];
    // Collect from both RECIPES and draft
    const allIds = new Set([...Object.keys(RECIPES), ...Object.keys(draft.recipes || {})]);
    for (const recId of allIds) {
      const r = RECIPES[recId] || {};
      const draftR = draft.recipes[recId] || {};
      const effItem = draftR.item ?? r.item;
      // Skip if it somehow doesn't target an item (shouldn't happen)
      if (!effItem) continue;
      out.push([recId, { ...r, ...draftR, _isDraft: !!draft.recipes[recId] }]);
    }
    return out.sort((a, b) => a[1].item.localeCompare(b[1].item));
  }, [draft.recipes]);

  const filtered = recipeEntries.filter(([recId, r]) => {
    if (stationFilter !== "all" && r.station !== stationFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!recId.toLowerCase().includes(q) && !r.item.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function patch(recId, fields) {
    updateDraft((d) => {
      const cur = d.recipes[recId] || {};
      const next = { ...cur, ...fields };
      for (const k of Object.keys(next)) if (next[k] === "" || next[k] === undefined) delete next[k];
      if (Object.keys(next).length === 0) delete d.recipes[recId];
      else d.recipes[recId] = next;
    });
  }

  function patchInputs(recId, inputs) {
    patch(recId, { inputs });
  }

  function createNewRecipe() {
    const recId = `rec_new_${Date.now()}`;
    updateDraft((d) => {
      d.recipes[recId] = { item: "bread", station: "workshop", inputs: {}, tier: 1 };
    });
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
          <SearchBar value={search} onChange={setSearch} placeholder="Filter recipes by ID or Item…" />
        </div>
        <Pill>{filtered.length} recipes</Pill>
        <SmallButton onClick={createNewRecipe}>+ New Recipe</SmallButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(([recId, eff]) => {
          const dirty = eff._isDraft;
          const isNew = !RECIPES[recId];

          return (
            <Card key={recId} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded grid place-items-center bg-[#e0d4be] text-[20px] overflow-hidden">
                    <Icon iconKey={eff.item} size={28} />
                  </div>
                  <div className="min-w-0">
                    <code
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded inline-block mb-1"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                    >
                      {recId}
                    </code>
                    <div className="flex gap-1 mt-0.5">
                      <Pill>{eff.station}</Pill>
                      {eff.tier && <Pill>tier {eff.tier}</Pill>}
                      {dirty && <Pill color="#fff" bg={COLORS.ember}>edited</Pill>}
                      {isNew && <Pill color="#fff" bg={COLORS.ember}>new</Pill>}
                    </div>
                  </div>
                </div>
                {dirty && (
                  <SmallButton
                    variant="ghost"
                    onClick={() => updateDraft((d) => { delete d.recipes[recId]; })}
                  >
                    {isNew ? "delete" : "revert"}
                  </SmallButton>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2 mt-3">
                <div className="col-span-2">
                  <Label>Target Item</Label>
                  <Select
                    value={eff.item}
                    options={allItemKeys.map(k => ({ value: k, label: k }))}
                    onChange={(v) => patch(recId, { item: v })}
                  />
                </div>
                <div>
                  <Label>Station</Label>
                  <Select value={eff.station} options={STATIONS}
                    onChange={(v) => patch(recId, { station: v })} />
                </div>
                <div>
                  <Label hint="Town-level gate. T2 recipes need town level 3 to craft.">Tier</Label>
                  <NumberField value={eff.tier} min={1} max={5} width={60}
                    onChange={(v) => patch(recId, { tier: v })} />
                </div>
              </div>

              {/* Inputs editor */}
              <div className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>
                  Ingredients
                </div>
                <IngredientsEditor
                  ingredients={eff.inputs || {}}
                  availableKeys={allItemKeys}
                  onChange={(nextInputs) => patchInputs(recId, nextInputs)}
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
  const availableOptions = useMemo(() => {
    return availableKeys.filter((k) => !(k in ingredients)).map((k) => ({
      id: k,
      searchText: k,
      renderNode: (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-[#e0d4be]">
            <Icon iconKey={k} size={24} />
          </div>
          <div className="text-[12px] font-bold truncate flex-1 min-w-0" style={{ color: COLORS.ink }}>
            {k}
          </div>
        </div>
      )
    }));
  }, [ingredients, availableKeys]);

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

      <SearchAndAddPicker
        label="Add Ingredient"
        placeholder="Search items…"
        options={availableOptions}
        onSelect={(k) => updateIngredient(k, 1)}
        gridClass="grid-cols-2 md:grid-cols-3"
      />
    </div>
  );
}
