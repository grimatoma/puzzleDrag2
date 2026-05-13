// Tiles tab — every per-tile attribute lives here:
//   - tile basics (label, colour, sale value, base chain target, tiles-wiki blurb)
//   - discovery method (formerly the "Unlock Hooks" tab)
//   - what resource the chain produces (per-tile override of base `next`)
//   - attached abilities (free moves, coin bonuses, spawn boosts…)
//
// Tiles are board pieces only — you never own them; they sit on the grid and
// chain into a next tier. (Resources and items are separate concepts with
// their own tabs.) Abilities live in src/config/abilities.js. Runtime
// expansion into the legacy `effects` fields happens in applyTileOverrides →
// expandAbilitiesToEffects.

import { useState, useMemo } from "react";
import { TILE_TYPES, TILE_TYPES_MAP, CATEGORIES } from "../../features/tileCollection/data.js";
import { BIOMES, ITEMS } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";
import AbilitiesEditor from "../AbilitiesEditor.jsx";

const DISCOVERY_METHODS = [
  { value: "default",  label: "Default — always available" },
  { value: "chain",    label: "Chain — long enough chain of source resource" },
  { value: "research", label: "Research — cumulative chain progress" },
  { value: "buy",      label: "Buy — purchase with coins" },
];

function resourceKeyOptions(includeNone = false) {
  const set = new Set();
  for (const b of Object.values(BIOMES)) for (const r of b.resources) set.add(r.key);
  const opts = [...set].sort().map((k) => ({ value: k, label: k }));
  if (includeNone) {
    return [{ value: "", label: "— use base chain —" }, ...opts];
  }
  return [{ value: "", label: "— pick resource —" }, ...opts];
}

function tileSwatchProps(tileId) {
  const tile = TILE_TYPES_MAP[tileId];
  if (!tile) return { color: 0x888888 };
  for (const b of Object.values(BIOMES)) {
    for (const r of b.resources) {
      if (r.key === tile.baseResource) return { color: r.color, iconKey: r.key };
    }
  }
  return { color: 0x888888 };
}

export default function PowersTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTile, setSelectedTile] = useState(TILE_TYPES[0]?.id);

  const producesOptions = useMemo(() => resourceKeyOptions(true), []);
  const sourceOptions = useMemo(() => resourceKeyOptions(), []);
  // Base chain target — a tile chains into another tile or a resource.
  const chainTargetOptions = useMemo(() => {
    const keys = Object.keys(ITEMS)
      .filter((k) => ITEMS[k].kind === "tile" || ITEMS[k].kind === "resource")
      .sort();
    return [{ value: "", label: "— none (terminal) —" }, ...keys.map((k) => ({ value: k, label: k }))];
  }, []);

  const tilesFiltered = TILE_TYPES.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.id.toLowerCase().includes(q) && !(t.displayName || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selected = TILE_TYPES_MAP[selectedTile];
  const draftPower = draft.tilePowers[selectedTile] || null;
  const abilities = draftPower?.abilities ?? selected?.abilities ?? [];

  // Per-tile produces-resource override. Empty string = use base chain.
  const liveProduces = selected?.effects?.producesResource || "";
  const draftProduces = draftPower && Object.prototype.hasOwnProperty.call(draftPower, "producesResource")
    ? (draftPower.producesResource || "")
    : null;
  const effProduces = draftProduces ?? liveProduces;

  // Discovery / unlock hooks (formerly the Unlocks tab).
  const draftUnlock = draft.tileUnlocks[selectedTile] || null;
  const effDiscovery = draftUnlock || selected?.discovery || { method: "default" };
  const unlockDirty = !!draftUnlock;

  // Basic per-tile metadata — label / colour / sale value / base chain target /
  // tiles-wiki blurb. These patch the shared ITEMS overrides + the
  // tileDescriptions map, the same plumbing as every other tile attribute here.
  const itemRow = ITEMS[selectedTile];
  const itemPatch = draft.items[selectedTile] || null;
  const descPatch = draft.tileDescriptions[selectedTile];
  const metaDirty = !!itemPatch || descPatch !== undefined;
  const effMeta = {
    label: itemPatch?.label ?? itemRow?.label ?? "",
    color: itemPatch?.color ?? itemRow?.color,
    value: itemPatch?.value ?? itemRow?.value ?? 0,
    next:  itemPatch?.next  ?? itemRow?.next  ?? "",
    desc:  descPatch ?? itemRow?.description ?? "",
  };

  function patchPower(tileId, patch) {
    updateDraft((d) => {
      const cur = d.tilePowers[tileId] || {};
      const next = { ...cur, ...patch };
      // Drop empty patches so the JSON stays minimal.
      if (Object.prototype.hasOwnProperty.call(next, "producesResource") && !next.producesResource) {
        delete next.producesResource;
      }
      if (Object.keys(next).length === 0) delete d.tilePowers[tileId];
      else d.tilePowers[tileId] = next;
    });
  }

  function setAbilitiesForTile(tileId, list) {
    // An empty array is a meaningful instruction — "remove all abilities
    // from this tile" — so we keep an empty array entry rather than
    // dropping it. The merge layer will then recompute `effects` to the
    // base (non-ability) fields.
    patchPower(tileId, { abilities: Array.isArray(list) ? list : [] });
  }

  function setProduces(tileId, resourceKey) {
    patchPower(tileId, { producesResource: resourceKey });
  }

  function patchUnlock(tileId, patch) {
    updateDraft((d) => {
      const merged = { ...(d.tileUnlocks[tileId] || {}), ...patch };
      d.tileUnlocks[tileId] = merged;
    });
  }

  function setUnlockMethod(tileId, method) {
    updateDraft((d) => {
      d.tileUnlocks[tileId] = { method };
    });
  }

  function revertUnlock(tileId) {
    updateDraft((d) => { delete d.tileUnlocks[tileId]; });
  }

  function patchItemMeta(tileId, fields) {
    updateDraft((d) => {
      const cur = d.items[tileId] || {};
      const next = { ...cur, ...fields };
      // Drop empty patches so the JSON stays minimal.
      for (const k of Object.keys(next)) {
        if (next[k] === "" || next[k] === undefined) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.items[tileId];
      else d.items[tileId] = next;
    });
  }

  function patchTileDesc(tileId, value) {
    updateDraft((d) => {
      if (!value) delete d.tileDescriptions[tileId];
      else d.tileDescriptions[tileId] = value;
    });
  }

  function revertBasics(tileId) {
    updateDraft((d) => {
      delete d.items[tileId];
      delete d.tileDescriptions[tileId];
    });
  }

  function revertTile(tileId) {
    updateDraft((d) => {
      delete d.tilePowers[tileId];
      delete d.tileUnlocks[tileId];
      delete d.items[tileId];
      delete d.tileDescriptions[tileId];
    });
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full min-h-0">
      {/* Left: tile picker */}
      <div className="col-span-4 flex flex-col gap-2 min-h-0">
        <SearchBar value={search} onChange={setSearch} placeholder="Filter tiles…" />
        <div className="flex flex-wrap gap-1">
          <CategoryChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>all</CategoryChip>
          {CATEGORIES.map((c) => (
            <CategoryChip key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
              {c}
            </CategoryChip>
          ))}
        </div>
        <div
          className="flex flex-col gap-1 overflow-y-auto rounded-lg border-2 p-2 flex-1 min-h-0"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          {tilesFiltered.map((t) => {
            const sw = tileSwatchProps(t.id);
            const draftPow = draft.tilePowers[t.id];
            const abilityCount = Array.isArray(draftPow?.abilities)
              ? draftPow.abilities.length
              : (Array.isArray(t.abilities) ? t.abilities.length : 0);
            const active = selectedTile === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTile(t.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px]"
                style={
                  active
                    ? { background: COLORS.ember, color: "#fff" }
                    : { background: COLORS.parchment, color: COLORS.inkLight, border: `1px solid ${COLORS.border}` }
                }
              >
                <TileSwatch color={sw.color} iconKey={sw.iconKey} size={22} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{t.displayName}</div>
                  <div className="text-[10px] opacity-80 font-mono truncate">{t.id}</div>
                </div>
                {abilityCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: active ? "#fff" : COLORS.ember, color: active ? COLORS.ember : "#fff" }}
                  >
                    ⚡{abilityCount}
                  </span>
                )}
              </button>
            );
          })}
          {tilesFiltered.length === 0 && (
            <div className="text-center py-4 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
              No tiles match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Right: editor for the selected tile */}
      <div className="col-span-8 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
        {!selected ? (
          <Card><div style={{ color: COLORS.inkSubtle }}>Select a tile.</div></Card>
        ) : (
          <>
            <Card accent={(draftPower !== null || draftUnlock !== null || metaDirty) ? COLORS.ember : COLORS.border}>
              <div className="flex items-start gap-3">
                <TileSwatch {...tileSwatchProps(selected.id)} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-bold" style={{ color: COLORS.ink }}>
                    {selected.displayName}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}>
                      {selected.id}
                    </code>
                    <Pill>{selected.category}</Pill>
                    <Pill>tier {selected.tier}</Pill>
                    {(draftPower !== null || draftUnlock !== null || metaDirty) && (
                      <Pill color="#fff" bg={COLORS.ember}>edited</Pill>
                    )}
                  </div>
                  <div className="text-[11px] italic mt-1" style={{ color: COLORS.inkSubtle }}>
                    {selected.description}
                  </div>
                </div>
                {(draftPower !== null || draftUnlock !== null || metaDirty) && (
                  <SmallButton variant="ghost" onClick={() => revertTile(selected.id)}>revert</SmallButton>
                )}
              </div>
            </Card>

            {/* Tile basics — label / colour / sale value / base chain target / wiki blurb */}
            {itemRow && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
                  Tile basics {metaDirty && <span style={{ color: COLORS.ember }}>· edited</span>}
                </div>
                <Card>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <Label>Label</Label>
                      <TextField value={effMeta.label} onChange={(v) => patchItemMeta(selected.id, { label: v })} />
                    </div>
                    <div>
                      <Label>Sale value</Label>
                      <NumberField value={effMeta.value} min={0} max={9999} width={90}
                        onChange={(v) => patchItemMeta(selected.id, { value: v })} />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <ColorField value={effMeta.color} onChange={(v) => patchItemMeta(selected.id, { color: v })} />
                    </div>
                    <div>
                      <Label>Base chain target</Label>
                      <Select value={effMeta.next} options={chainTargetOptions}
                        onChange={(v) => patchItemMeta(selected.id, { next: v })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Tile-collection description</Label>
                      <TextArea
                        rows={2}
                        value={effMeta.desc}
                        placeholder="Long-form description for the Tile Collection screen."
                        onChange={(v) => patchTileDesc(selected.id, v)}
                      />
                    </div>
                    {metaDirty && (
                      <div className="col-span-2">
                        <SmallButton variant="ghost" onClick={() => revertBasics(selected.id)}>revert basics</SmallButton>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Discovery / Unlock */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
                Discovery {unlockDirty && <span style={{ color: COLORS.ember }}>· edited</span>}
              </div>
              <Card>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="col-span-2">
                    <Label>Discovery method</Label>
                    <Select
                      value={effDiscovery.method}
                      options={DISCOVERY_METHODS}
                      onChange={(v) => setUnlockMethod(selected.id, v)}
                    />
                  </div>
                  {effDiscovery.method === "chain" && (
                    <>
                      <div>
                        <Label>Source resource</Label>
                        <Select
                          value={effDiscovery.chainLengthOf ?? ""}
                          options={sourceOptions}
                          onChange={(v) => patchUnlock(selected.id, { chainLengthOf: v })}
                        />
                      </div>
                      <div>
                        <Label>Required chain length</Label>
                        <NumberField
                          value={effDiscovery.chainLength ?? 6}
                          min={1}
                          max={50}
                          width={70}
                          onChange={(v) => patchUnlock(selected.id, { chainLength: v })}
                        />
                      </div>
                    </>
                  )}
                  {effDiscovery.method === "research" && (
                    <>
                      <div>
                        <Label>Source resource</Label>
                        <Select
                          value={effDiscovery.researchOf ?? ""}
                          options={sourceOptions}
                          onChange={(v) => patchUnlock(selected.id, { researchOf: v })}
                        />
                      </div>
                      <div>
                        <Label>Cumulative chain target</Label>
                        <NumberField
                          value={effDiscovery.researchAmount ?? 30}
                          min={1}
                          max={500}
                          width={80}
                          onChange={(v) => patchUnlock(selected.id, { researchAmount: v })}
                        />
                      </div>
                    </>
                  )}
                  {effDiscovery.method === "buy" && (
                    <div>
                      <Label>Coin cost</Label>
                      <NumberField
                        value={effDiscovery.coinCost ?? 100}
                        min={0}
                        max={99999}
                        width={90}
                        onChange={(v) => patchUnlock(selected.id, { coinCost: v })}
                      />
                    </div>
                  )}
                  {unlockDirty && (
                    <div className="col-span-2">
                      <SmallButton variant="ghost" onClick={() => revertUnlock(selected.id)}>
                        revert discovery
                      </SmallButton>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Produces resource */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
                Produces resource {draftProduces !== null && <span style={{ color: COLORS.ember }}>· edited</span>}
              </div>
              <Card>
                <div className="text-[11px] mb-2" style={{ color: COLORS.inkSubtle }}>
                  Picks the resource the chain spawns when this tile is the active species
                  for its category. Leave at “use base chain” to fall through to the
                  resource's native upgrade or the active zone's redirect.
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={effProduces}
                    options={producesOptions}
                    onChange={(v) => setProduces(selected.id, v)}
                    width={220}
                  />
                  {draftProduces !== null && (
                    <SmallButton
                      variant="ghost"
                      title="Revert to baseline"
                      onClick={() => patchPower(selected.id, { producesResource: undefined })}
                    >
                      ↺
                    </SmallButton>
                  )}
                </div>
              </Card>
            </div>

            {/* Abilities — shared editor (catalog + active list + picker). */}
            <div>
              <AbilitiesEditor
                scope="tile"
                abilities={abilities}
                onChange={(next) => setAbilitiesForTile(selected.id, next)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-[10px] font-bold rounded-full border"
      style={
        active
          ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
          : { background: COLORS.parchment, borderColor: COLORS.border, color: COLORS.inkLight }
      }
    >
      {children}
    </button>
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}
