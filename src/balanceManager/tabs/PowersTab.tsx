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
import type { ReactNode } from "react";
import { TILE_TYPES, TILE_TYPES_MAP, CATEGORIES } from "../../features/tileCollection/data.js";
import { BIOMES, ITEMS, getItem, tileFamilyResource } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
  SegmentedFilter,
} from "../shared.jsx";
import AbilitiesEditor, { type AbilityInstance } from "../AbilitiesEditor.jsx";
import { CardAttachmentFooter } from "../relational.jsx";
import {
  TILE_DISCOVERY_METHODS,
  getTileDiscoveryMethod,
  defaultsForTileDiscoveryMethod,
} from "../../config/tileDiscoveryMethods.js";
import type { BalanceDraft, TabProps } from "../index.jsx";

interface TilePower {
  abilities?: AbilityInstance[];
  producesResource?: string;
  [extra: string]: unknown;
}

interface TileUnlock {
  method: string;
  [extra: string]: unknown;
}

interface TileItemOverride {
  label?: string;
  color?: number;
  value?: number;
  next?: string;
  [extra: string]: unknown;
}

const DISCOVERY_METHOD_OPTIONS = TILE_DISCOVERY_METHODS.map((m) => ({
  value: m.id,
  label: `${m.name} — ${m.desc}`,
}));

function resourceKeyOptions(includeNone = false) {
  const set = new Set<string>();
  for (const b of Object.values(BIOMES) as Array<{ tiles: Array<{ key: string }>; resources: Array<{ key: string }> }>) {
    for (const r of [...b.tiles, ...b.resources]) set.add(r.key);
  }
  const opts = [...set].sort().map((k) => ({ value: k, label: k }));
  if (includeNone) {
    return [{ value: "", label: "— use base chain —" }, ...opts];
  }
  return [{ value: "", label: "— pick resource —" }, ...opts];
}

// Build the produces-resource options for a specific tile. The empty-value
// (no override) entry is labelled with that tile's family-default resource so
// the user can see what "leave unset" actually produces.
function producesOptionsFor(tileId: string) {
  const set = new Set<string>();
  for (const b of Object.values(BIOMES) as Array<{ tiles: Array<{ key: string }>; resources: Array<{ key: string }> }>) {
    for (const r of [...b.tiles, ...b.resources]) set.add(r.key);
  }
  const opts = [...set].sort().map((k) => ({ value: k, label: k }));
  const familyDefault = tileFamilyResource(tileId);
  const placeholder = familyDefault
    ? { value: "", label: `Family default (${familyDefault})` }
    : { value: "", label: "— no default —" };
  return [placeholder, ...opts];
}

function tileSwatchProps(tileId: string): { color: number; iconKey: string } {
  const tile = TILE_TYPES_MAP[tileId];
  if (!tile) return { color: 0x888888, iconKey: "" };
  for (const b of Object.values(BIOMES)) {
    for (const r of [...b.tiles, ...b.resources]) {
      if (r.key === tile.baseResource) return { color: r.color, iconKey: r.key };
    }
  }
  return { color: 0x888888, iconKey: "" };
}

export default function PowersTab({ draft, updateDraft }: TabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTile, setSelectedTile] = useState<string>(TILE_TYPES[0]?.id);

  const sourceOptions = useMemo(() => resourceKeyOptions(), []);
  // Base chain target — a tile chains into another tile or a resource.
  const chainTargetOptions = useMemo(() => {
    const keys = Object.keys(ITEMS)
      .filter((k) => {
        const item = getItem(k);
        return item?.kind === "tile" || item?.kind === "resource";
      })
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
  const categoryOptions = useMemo(
    () => [{ id: "all", label: "all" }, ...CATEGORIES.map((id) => ({ id, label: id }))],
    [],
  );

  const selected = TILE_TYPES_MAP[selectedTile];
  const draftPower = (draft.tilePowers[selectedTile] as TilePower | undefined) || null;
  const abilities = draftPower?.abilities ?? selected?.abilities ?? [];

  // Per-tile produces-resource override. Empty string = use family default
  // (TILE_FAMILY_RESOURCE map → GameScene.nextResource). The Select below
  // surfaces the family-default resource as the placeholder label so the user
  // can see what "no override" produces.
  const liveProduces = (selected?.effects as { producesResource?: string } | undefined)?.producesResource || "";
  const draftProduces = draftPower && Object.prototype.hasOwnProperty.call(draftPower, "producesResource")
    ? (draftPower.producesResource || "")
    : null;
  const effProduces = draftProduces ?? liveProduces;
  const selectedId = selected?.id ?? null;
  const producesOptions = useMemo(
    () => (selectedId ? producesOptionsFor(selectedId) : resourceKeyOptions(true)),
    [selectedId],
  );

  // Discovery / unlock hooks (formerly the Unlocks tab).
  const draftUnlock = (draft.tileUnlocks[selectedTile] as TileUnlock | undefined) || null;
  const effDiscovery: TileUnlock & Record<string, unknown> = (draftUnlock || (selected?.discovery as TileUnlock) || { method: "default" }) as TileUnlock & Record<string, unknown>;
  const unlockDirty = !!draftUnlock;

  // Basic per-tile metadata — label / colour / sale value / base chain target /
  // tiles-wiki blurb. These patch the shared ITEMS overrides + the
  // tileDescriptions map, the same plumbing as every other tile attribute here.
  const itemRow = getItem(selectedTile);
  const itemPatch = (draft.items[selectedTile] as TileItemOverride | undefined) || null;
  const descPatch = draft.tileDescriptions[selectedTile] as string | undefined;
  const metaDirty = !!itemPatch || descPatch !== undefined;
  const effMeta = {
    label: itemPatch?.label ?? itemRow?.label ?? "",
    color: itemPatch?.color ?? itemRow?.color,
    value: itemPatch?.value ?? itemRow?.value ?? 0,
    next:  itemPatch?.next  ?? itemRow?.next  ?? "",
    desc:  descPatch ?? itemRow?.description ?? "",
  };

  function patchPower(tileId: string, patch: Partial<TilePower>) {
    updateDraft((d: BalanceDraft) => {
      const powers = d.tilePowers as Record<string, TilePower>;
      const cur: TilePower = powers[tileId] || {};
      const next: TilePower = { ...cur, ...patch };
      // Drop empty patches so the JSON stays minimal.
      if (Object.prototype.hasOwnProperty.call(next, "producesResource") && !next.producesResource) {
        delete next.producesResource;
      }
      if (Object.keys(next).length === 0) delete powers[tileId];
      else powers[tileId] = next;
    });
  }

  function setAbilitiesForTile(tileId: string, list: AbilityInstance[] | unknown) {
    // An empty array is a meaningful instruction — "remove all abilities
    // from this tile" — so we keep an empty array entry rather than
    // dropping it. The merge layer will then recompute `effects` to the
    // base (non-ability) fields.
    patchPower(tileId, { abilities: Array.isArray(list) ? (list as AbilityInstance[]) : [] });
  }

  function setProduces(tileId: string, resourceKey: string) {
    // If the user picked the family default, clear the override so this tile
    // stays in sync with future family-default changes. patchPower already
    // drops falsy producesResource values, so passing "" is equivalent to
    // "no override".
    const fam = tileFamilyResource(tileId);
    if (resourceKey && fam && resourceKey === fam) {
      patchPower(tileId, { producesResource: "" });
    } else {
      patchPower(tileId, { producesResource: resourceKey });
    }
  }

  function patchUnlock(tileId: string, patch: Partial<TileUnlock>) {
    updateDraft((d: BalanceDraft) => {
      const unlocks = d.tileUnlocks as Record<string, TileUnlock>;
      const merged: TileUnlock = { ...(unlocks[tileId] || { method: "default" }), ...patch };
      unlocks[tileId] = merged;
    });
  }

  function setUnlockMethod(tileId: string, method: string) {
    updateDraft((d: BalanceDraft) => {
      const unlocks = d.tileUnlocks as Record<string, TileUnlock>;
      unlocks[tileId] = { method, ...defaultsForTileDiscoveryMethod(method) };
    });
  }

  function revertUnlock(tileId: string) {
    updateDraft((d: BalanceDraft) => { delete d.tileUnlocks[tileId]; });
  }

  function patchItemMeta(tileId: string, fields: TileItemOverride) {
    updateDraft((d: BalanceDraft) => {
      const items = d.items as Record<string, TileItemOverride>;
      const cur: TileItemOverride = items[tileId] || {};
      const next: TileItemOverride = { ...cur, ...fields };
      // Drop empty patches so the JSON stays minimal.
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v === undefined) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete items[tileId];
      else items[tileId] = next;
    });
  }

  function patchTileDesc(tileId: string, value: string) {
    updateDraft((d: BalanceDraft) => {
      if (!value) delete d.tileDescriptions[tileId];
      else d.tileDescriptions[tileId] = value;
    });
  }

  function revertBasics(tileId: string) {
    updateDraft((d: BalanceDraft) => {
      delete d.items[tileId];
      delete d.tileDescriptions[tileId];
    });
  }

  function revertTile(tileId: string) {
    updateDraft((d: BalanceDraft) => {
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
        <SegmentedFilter
          options={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          ariaLabel="Tile category filter"
          className="[&>button]:!px-2 [&>button]:!py-0.5 [&>button]:!text-[10px] [&>button]:!rounded-full"
        />
        <div
          className="flex flex-col gap-1 overflow-y-auto rounded-lg border-2 p-2 flex-1 min-h-0"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          {tilesFiltered.map((t) => {
            const sw = tileSwatchProps(t.id);
            const draftPow = draft.tilePowers[t.id] as TilePower | undefined;
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
                      <TextField value={effMeta.label} onChange={(v: string) => patchItemMeta(selected.id, { label: v })} />
                    </div>
                    <div>
                      <Label>Sale value</Label>
                      <NumberField value={effMeta.value} min={0} max={9999} width={90}
                        onChange={(v: number) => patchItemMeta(selected.id, { value: v })} />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <ColorField value={effMeta.color} onChange={(v: number) => patchItemMeta(selected.id, { color: v })} />
                    </div>
                    <div>
                      <Label>Base chain target</Label>
                      <Select value={effMeta.next} options={chainTargetOptions}
                        onChange={(v: string) => patchItemMeta(selected.id, { next: v })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Tile-collection description</Label>
                      <TextArea
                        rows={2}
                        value={effMeta.desc}
                        placeholder="Long-form description for the Tile Collection screen."
                        onChange={(v: string) => patchTileDesc(selected.id, v)}
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

            {/* Discovery / Unlock — schema-driven from src/config/tileDiscoveryMethods.js */}
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
                      options={DISCOVERY_METHOD_OPTIONS}
                      onChange={(v: string) => setUnlockMethod(selected.id, v)}
                    />
                  </div>
                  {(getTileDiscoveryMethod(effDiscovery.method)?.params ?? []).map((p: { key: string; label: string; type: string; default?: number; min?: number; max?: number }) => {
                    if (p.type === "resourceKey") {
                      return (
                        <div key={p.key}>
                          <Label>{p.label}</Label>
                          <Select
                            value={effDiscovery[p.key] ?? ""}
                            options={sourceOptions}
                            onChange={(v: string) => patchUnlock(selected.id, { [p.key]: v })}
                          />
                        </div>
                      );
                    }
                    if (p.type === "int") {
                      const rawVal = effDiscovery[p.key];
                      const numVal = typeof rawVal === "number" ? rawVal : (p.default ?? 0);
                      return (
                        <div key={p.key}>
                          <Label>{p.label}</Label>
                          <NumberField
                            value={numVal}
                            min={p.min ?? 0}
                            max={p.max ?? 9999}
                            width={90}
                            onChange={(v: number) => patchUnlock(selected.id, { [p.key]: v })}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
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
                  for its category. Leave at the family default to inherit the family's
                  base resource (so future family-default changes flow through automatically).
                  Pick a different resource to override just this tile.
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={effProduces}
                    options={producesOptions}
                    onChange={(v: string) => setProduces(selected.id, v)}
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

            <CardAttachmentFooter title="Attributes" standalone>
              <AbilitiesEditor
                scope="tile"
                abilities={abilities}
                onChange={(next: AbilityInstance[]) => setAbilitiesForTile(selected.id, next)}
              />
            </CardAttachmentFooter>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}
