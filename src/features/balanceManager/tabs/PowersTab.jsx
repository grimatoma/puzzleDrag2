// Tiles tab — every per-tile attribute lives here:
//   - discovery method (formerly the "Unlock Hooks" tab)
//   - what resource the chain produces (per-tile override of base `next`)
//   - attached power hooks (free moves, coin bonuses, spawn boosts…)
//
// The hook library lives in src/config/powerHooks.js; runtime expansion
// into legacy `effects` fields happens in
// applyTileOverrides → expandHooksToEffects.

import { useState, useMemo } from "react";
import { TILE_TYPES, TILE_TYPES_MAP, CATEGORIES } from "../../tileCollection/data.js";
import { BIOMES } from "../../../constants.js";
import { POWER_HOOKS, getPowerHook, defaultParamsFor } from "../../../config/powerHooks.js";
import {
  COLORS, NumberField, Select, SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";

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
  if (!tile) return { color: 0x888888, glyph: "?" };
  for (const b of Object.values(BIOMES)) {
    for (const r of b.resources) {
      if (r.key === tile.baseResource) return { color: r.color, glyph: r.glyph };
    }
  }
  return { color: 0x888888, glyph: "?" };
}

export default function PowersTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTile, setSelectedTile] = useState(TILE_TYPES[0]?.id);

  const resOptions = useMemo(() => resourceKeyOptions(), []);
  const producesOptions = useMemo(() => resourceKeyOptions(true), []);
  const sourceOptions = useMemo(() => resourceKeyOptions(), []);

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
  const draftHooks = draftPower?.hooks ?? null;
  // Effective hooks: draft override if any, otherwise the runtime tile's
  // existing hooks (already merged from balance.json).
  const liveHooks = selected?.effects?.hooks || [];
  const hooks = draftHooks ?? liveHooks;

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

  function patchPower(tileId, patch) {
    updateDraft((d) => {
      const cur = d.tilePowers[tileId] || {};
      const next = { ...cur, ...patch };
      // Drop empty patches so the JSON stays minimal.
      if (next.hooks && next.hooks.length === 0) delete next.hooks;
      if (Object.prototype.hasOwnProperty.call(next, "producesResource") && !next.producesResource) {
        delete next.producesResource;
      }
      if (Object.keys(next).length === 0) delete d.tilePowers[tileId];
      else d.tilePowers[tileId] = next;
    });
  }

  function setHooksForTile(tileId, hooksArr) {
    if (!hooksArr || hooksArr.length === 0) {
      // Setting an empty array is a meaningful instruction — "remove all
      // power hooks from this tile" — so we keep an empty array entry
      // rather than dropping it. The merge layer will then recompute
      // `effects` to the base (non-hook) fields.
      patchPower(tileId, { hooks: [] });
    } else {
      patchPower(tileId, { hooks: hooksArr });
    }
  }

  function addHook(hookId) {
    const def = getPowerHook(hookId);
    if (!def) return;
    const next = [...hooks, { id: hookId, params: defaultParamsFor(hookId) }];
    setHooksForTile(selectedTile, next);
  }

  function removeHookAt(idx) {
    const next = hooks.filter((_, i) => i !== idx);
    setHooksForTile(selectedTile, next);
  }

  function updateParam(idx, paramKey, value) {
    const next = hooks.map((h, i) =>
      i === idx ? { ...h, params: { ...(h.params || {}), [paramKey]: value } } : h,
    );
    setHooksForTile(selectedTile, next);
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

  function revertTile(tileId) {
    updateDraft((d) => {
      delete d.tilePowers[tileId];
      delete d.tileUnlocks[tileId];
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
            const hooked = (draft.tilePowers[t.id]?.hooks?.length ?? null) ?? (t.effects?.hooks?.length ?? 0);
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
                <TileSwatch color={sw.color} glyph={sw.glyph} size={22} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{t.displayName}</div>
                  <div className="text-[10px] opacity-80 font-mono truncate">{t.id}</div>
                </div>
                {hooked > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: active ? "#fff" : COLORS.ember, color: active ? COLORS.ember : "#fff" }}
                  >
                    ⚡{hooked}
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
            <Card accent={(draftPower !== null || draftUnlock !== null) ? COLORS.ember : COLORS.border}>
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
                    {(draftPower !== null || draftUnlock !== null) && (
                      <Pill color="#fff" bg={COLORS.ember}>edited</Pill>
                    )}
                  </div>
                  <div className="text-[11px] italic mt-1" style={{ color: COLORS.inkSubtle }}>
                    {selected.description}
                  </div>
                </div>
                {(draftPower !== null || draftUnlock !== null) && (
                  <SmallButton variant="ghost" onClick={() => revertTile(selected.id)}>revert</SmallButton>
                )}
              </div>
            </Card>

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

            {/* Active hooks */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
                Active Power Hooks ({hooks.length})
              </div>
              {hooks.length === 0 && (
                <div className="text-center py-3 text-[12px] italic rounded-lg border-2 border-dashed"
                  style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}>
                  No hooks attached. Pick one below to grant this tile a passive power.
                </div>
              )}
              <div className="flex flex-col gap-2">
                {hooks.map((hk, idx) => {
                  const def = getPowerHook(hk.id);
                  if (!def) {
                    return (
                      <Card key={idx}>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px]" style={{ color: COLORS.red }}>
                            ⚠ Unknown hook id: <code>{hk.id}</code>
                          </span>
                          <SmallButton variant="danger" onClick={() => removeHookAt(idx)}>remove</SmallButton>
                        </div>
                      </Card>
                    );
                  }
                  return (
                    <Card key={idx}>
                      <div className="flex items-start justify-between mb-1.5 gap-2">
                        <div>
                          <div className="text-[13px] font-bold" style={{ color: COLORS.ember }}>
                            {def.icon} {def.name}
                          </div>
                          <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                            {def.desc}
                          </div>
                        </div>
                        <SmallButton variant="danger" onClick={() => removeHookAt(idx)}>✕</SmallButton>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {def.params.map((p) => (
                          <div key={p.key} className="flex items-center gap-2">
                            <span className="text-[11px] font-bold flex-shrink-0" style={{ color: COLORS.ink }}>
                              {p.label}
                            </span>
                            {p.type === "int" ? (
                              <NumberField
                                value={hk.params?.[p.key] ?? p.default}
                                min={p.min ?? 0}
                                max={p.max ?? 9999}
                                width={70}
                                onChange={(v) => updateParam(idx, p.key, v)}
                              />
                            ) : p.type === "resourceKey" ? (
                              <Select
                                value={hk.params?.[p.key] ?? ""}
                                options={resOptions}
                                onChange={(v) => updateParam(idx, p.key, v)}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Available hooks */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>
                Available Hooks · click to attach
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {POWER_HOOKS.map((def) => (
                  <button
                    key={def.id}
                    onClick={() => addHook(def.id)}
                    className="flex flex-col items-start text-left p-2 rounded-lg border-2 transition-colors hover:opacity-90"
                    style={{ background: COLORS.parchment, borderColor: COLORS.border }}
                  >
                    <div className="text-[12px] font-bold" style={{ color: COLORS.ember }}>
                      {def.icon} {def.name}
                    </div>
                    <div className="text-[10px] italic mt-0.5" style={{ color: COLORS.inkSubtle }}>
                      {def.desc}
                    </div>
                  </button>
                ))}
              </div>
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
