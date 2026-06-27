import { useState, useMemo, useRef } from "react";
import Icon from "../../ui/Icon.jsx";
import { ZONES, zoneCategories, DEFAULT_ZONE, ZONE_TO_TILE_CATEGORIES, turnBudgetAdditiveBonusForZone, turnBudgetForZone, zoneBaseTurns, settlementHazards } from "./data.js";
import { TILE_TYPES_BY_CATEGORY, TILE_TYPES_MAP } from "../tileCollection/data.js";
import { TileIcon } from "../tileCollection/index.jsx";
import useFocusTrap from "../../ui/primitives/useFocusTrap.js";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import Button from "../../ui/primitives/Button.jsx";
import { UPGRADE_THRESHOLDS } from "../../constants.js";
import { AbilitySummary } from "../../ui/primitives/BrowserDetail.jsx";
import ZoneEntryCostInfo from "./ZoneEntryCostInfo.jsx";
import type { GameState, Dispatch } from "../../types/state.js";

interface TileTypeDef {
  id: string;
  displayName: string;
  tier?: number;
  baseResource?: string;
  description?: string | null;
  abilities?: Array<Record<string, unknown>>;
  effects?: Record<string, unknown>;
}

interface UnlockedRow { tileCat: string; tile: TileTypeDef }

const CATEGORY_LABEL: Record<string, string> = {
  grass: "Grass",
  grain: "Grain",
  trees: "Trees",
  birds: "Birds",
  vegetables: "Vegetables",
  fruits: "Fruits",
  flowers: "Flowers",
  herd_animals: "Herd Animals",
  cattle: "Cattle",
  mounts: "Mounts",
};

const CATEGORY_GLYPH: Record<string, string> = {
  grass: "🌿",
  grain: "🌾",
  trees: "🌳",
  birds: "🐦",
  vegetables: "🥕",
  fruits: "🍎",
  flowers: "🌸",
  herd_animals: "🐖",
  cattle: "🐄",
  mounts: "🐎",
};

const MAX_SLOTS = 8;

/** Tile-collection categories backing a zone-level category. Zone "trees"
 *  intentionally covers both the tile-collection `trees` and `wood` chains. */
function tileCategoriesForZoneCategory(zoneCat: string): string[] {
  return (ZONE_TO_TILE_CATEGORIES as Record<string, string[] | undefined>)[zoneCat] ?? [zoneCat];
}


/** Returns the currently-active tile-type id for a zone category, or null. */
function activeTileForZoneCategory(state: GameState, zoneCat: string): string | null {
  const tileCats = tileCategoriesForZoneCategory(zoneCat);
  const active = state?.tileCollection?.activeByCategory ?? {};
  for (const tc of tileCats) {
    const id = active[tc];
    if (id) return id;
  }
  return null;
}

/** All discovered (unlocked) tile-type rows for a zone category, grouped by
 *  their tile-collection category. */
function unlockedRowsForZoneCategory(state: GameState, zoneCat: string): UnlockedRow[] {
  const discovered = state?.tileCollection?.discovered ?? {};
  const out: UnlockedRow[] = [];
  for (const tc of tileCategoriesForZoneCategory(zoneCat)) {
    const types: TileTypeDef[] = (TILE_TYPES_BY_CATEGORY as Record<string, TileTypeDef[] | undefined>)[tc] ?? [];
    for (const t of types) {
      if (!discovered[t.id]) continue;
      out.push({ tileCat: tc, tile: t });
    }
  }
  return out;
}

interface TileSlotProps {
  category: string;
  selected: boolean;
  locked: boolean;
  activeTileId: string | null;
  variantCount: number;
  onToggle: () => void;
  onChoose: () => void;
}

function TileSlot({ category, selected, locked, activeTileId, variantCount, onToggle, onChoose }: TileSlotProps) {
  const label = CATEGORY_LABEL[category] ?? category;
  const fallbackGlyph = CATEGORY_GLYPH[category] ?? "•";
  const activeTile: TileTypeDef | null = activeTileId ? ((TILE_TYPES_MAP as Record<string, TileTypeDef | undefined>)[activeTileId] ?? null) : null;
  // A locked slot only does something on click when there's more than one
  // discovered variant to swap to. With a single variant there's nothing to
  // edit, so it shouldn't read as tappable.
  const interactive = !locked || variantCount > 1;
  const baseStyle = {
    background: selected ? "#fffaf1" : "#dbcfb6",
    color: "#2b2218",
    border: selected ? "3px solid #91bf24" : "3px solid #8c7656",
    boxShadow: selected ? "0 2px 8px rgba(145,191,36,.25)" : "none",
    opacity: locked ? 0.85 : 1,
    cursor: interactive ? "pointer" : "default",
  };
  // When mustPick is on, a single click toggles inclusion. A dedicated
  // "Change" affordance opens the picker so toggling the slot off doesn't
  // accidentally open it. Hide it when there's only a single discovered
  // variant — there's nothing to swap to, so the pencil would be a dead end.
  const showChangeButton = selected && variantCount > 1;
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-col items-center justify-center rounded-xl px-2 py-3 text-[12px] font-bold w-full transition-colors"
        style={baseStyle}
        aria-pressed={selected}
        aria-label={`${label}${selected ? " selected" : ""}${locked ? " locked" : ""}`}
      >
        <span className="grid place-items-center" style={{ width: 56, height: 56 }}>
          {activeTile ? (
            <TileIcon tileId={activeTile.id} size={56} />
          ) : (
            <span className="text-[36px] leading-none">{fallbackGlyph}</span>
          )}
        </span>
        <span className="mt-1 leading-tight text-center">
          {activeTile ? activeTile.displayName : label}
        </span>
        <span className="text-[10px] text-on-panel-faint leading-tight mt-0.5 truncate max-w-full">
          {activeTile ? label : "Pick a tile"}
        </span>
      </button>
      {showChangeButton && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChoose(); }}
          className="absolute top-1 right-1 bg-[#744d2e] text-[#fffaf1] rounded-md text-[10px] font-bold px-1.5 py-0.5 hover:bg-[#8a6040]"
          title="Change tile"
        >
          ✎
        </button>
      )}
    </div>
  );
}

/** A read-only "card" that sits in the same grid as the tile slots, surfacing a
 *  hazard that will be active on the field. Styled to match a TileSlot footprint
 *  but with a danger tint + dashed border (and no ✎) so it reads as fixed. */
function DangerCard({ hazard }: { hazard: string }) {
  const label = hazard.replace(/_/g, " ");
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-2 py-3 text-[12px] font-bold w-full"
      style={{
        background: "#f6e7e1",
        color: "#7a2c1e",
        border: "3px dashed #b56a52",
        cursor: "default",
      }}
      aria-label={`Active danger: ${label}`}
      title="This danger is active on the field and cannot be removed."
    >
      <span className="grid place-items-center" style={{ width: 56, height: 56 }}>
        <Icon iconKey="dangers_header" size={44} />
      </span>
      <span className="mt-1 leading-tight text-center capitalize">{label}</span>
      <span className="text-[10px] leading-tight mt-0.5 text-[#9a3a2a]/80">Danger</span>
    </div>
  );
}

interface TileChooserPopupProps {
  zoneCategory: string;
  state: GameState;
  dispatch: Dispatch;
  onClose: () => void;
}

function TileChooserPopup({ zoneCategory, state, dispatch, onClose }: TileChooserPopupProps) {
  const label = CATEGORY_LABEL[zoneCategory] ?? zoneCategory;
  const rows: UnlockedRow[] = useMemo(
    () => unlockedRowsForZoneCategory(state, zoneCategory),
    [state, zoneCategory],
  );
  const active = state?.tileCollection?.activeByCategory ?? {};
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(panelRef, true, onClose);

  function pick(row: UnlockedRow) {
    // Clear sibling tile-collection categories that share this zone slot, so
    // the active tile is unambiguous (e.g. picking a "wood_*" tile clears any
    // active "tree_*" entry from the trees slot).
    for (const tc of tileCategoriesForZoneCategory(zoneCategory)) {
      if (tc !== row.tileCat && active[tc]) {
        dispatch({ type: "SET_ACTIVE_TILE", payload: { category: tc, tileId: null } });
      }
    }
    dispatch({
      type: "SET_ACTIVE_TILE",
      payload: { category: row.tileCat, tileId: row.tile.id },
    });
    onClose();
  }

  return (
    <div
      className="absolute inset-0 bg-black/50 grid place-items-center z-[60]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose ${label} tile`}
        tabIndex={-1}
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[16px] px-4 py-3 max-w-[420px] w-[92vw] max-h-[80vh] overflow-y-auto shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[16px] text-on-panel-dim">
            Choose {label} tile
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-on-panel-dim text-xl leading-none hover:text-on-panel"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-on-panel-dim text-[13px] text-center py-6">
            No {label} tiles unlocked yet. Visit the Tiles Wiki to research or
            buy new variants.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rows.map(({ tile, tileCat }: UnlockedRow) => {
              const isActive = active[tileCat] === tile.id;
              const chain = tile.baseResource ? (UPGRADE_THRESHOLDS as Record<string, number | undefined>)[tile.baseResource] : undefined;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => pick({ tile, tileCat })}
                  aria-pressed={isActive}
                  aria-label={`${tile.displayName}${isActive ? " (active)" : ""}`}
                  className="flex items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors"
                  style={{
                    background: isActive ? "#fffaf1" : "#dbcfb6",
                    color: "#2b2218",
                    border: isActive ? "3px solid #91bf24" : "3px solid #8c7656",
                  }}
                >
                  <span className="grid place-items-center shrink-0" style={{ width: 40, height: 40 }}>
                    <TileIcon tileId={tile.id} size={40} />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[13px] leading-tight">{tile.displayName}</span>
                      {(tile.tier ?? 0) > 0 && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-[#8c7656]/30 text-on-panel border border-[#8c7656]/45">
                          Tier {tile.tier}
                        </span>
                      )}
                      {chain != null && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-[#8c7656]/30 text-on-panel border border-[#8c7656]/45">
                          Chain: {chain}
                        </span>
                      )}
                      {isActive && (
                        <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold text-[#2a5010]">
                          ● Active
                        </span>
                      )}
                    </span>
                    {tile.description && (
                      <span className="text-[11px] text-on-panel-dim leading-snug">
                        {tile.description}
                      </span>
                    )}
                    <AbilitySummary abilities={tile.abilities} effects={tile.effects} empty={null} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface StartFarmingModalProps {
  state: GameState;
  dispatch: Dispatch;
  onClose?: () => void;
}

export default function StartFarmingModal({ state, dispatch, onClose }: StartFarmingModalProps) {
  const zoneId = state.activeZone ?? DEFAULT_ZONE;
  const zone = ZONES[zoneId];
  const cats: string[] = useMemo(() => zoneCategories(zoneId), [zoneId]);

  // When zone exposes <= 8 categories every slot is auto-selected and
  // locked. When it exposes more, the player picks 8.
  const mustPick = cats.length > MAX_SLOTS;
  const [selected, setSelected] = useState<Set<string>>(() =>
    mustPick ? new Set<string>(cats.slice(0, MAX_SLOTS)) : new Set<string>(cats),
  );

  const [useFertilizer, setUseFertilizer] = useState<boolean>(false);
  const [chooserCat, setChooserCat] = useState<string | null>(null);

  if (!zone) return null;

  // `Tools` mixes numeric charge counts and boolean upgrade flags; fertilizer
  // is always numeric, but the index sig forces a narrowing read here.
  const fertilizerStock: number = Number(state.tools?.fertilizer ?? 0) || 0;
  const fertilizerAvailable = fertilizerStock > 0;
  const cost = zone.entryCost?.coins ?? 50;
  const canAfford = (state.coins ?? 0) >= cost;
  const baseTurns = zoneBaseTurns(zone);
  const buildingTurns = turnBudgetAdditiveBonusForZone(state, zoneId);
  const turns = turnBudgetForZone(state, zoneId, { useFertilizer });
  const hazards = settlementHazards(state, zoneId);
  const okTileCount =
    !mustPick || selected.size === MAX_SLOTS;
  const canStart = canAfford && okTileCount;

  function toggleCategory(cat: string) {
    if (!mustPick) {
      // Locked slots — clicking the slot opens the chooser instead of
      // toggling. Skip it when there's only a single discovered variant:
      // there's nothing to swap to, so the picker would be a dead end.
      if (unlockedRowsForZoneCategory(state, cat).length > 1) {
        setChooserCat(cat);
      }
      return;
    }
    setSelected((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        if (next.size >= MAX_SLOTS) return prev;
        next.add(cat);
      }
      return next;
    });
  }

  function handleStart() {
    if (!canStart) return;
    dispatch({
      type: "FARM/ENTER",
      payload: {
        selectedTiles: cats.filter((c: string) => selected.has(c)),
        useFertilizer,
      },
    });
    onClose?.();
  }

  return (
    <ParchmentDialog open onClose={onClose} size="lg" ariaLabel={`Start Farming — ${zone.name}`} backdropClassName="animate-fadein">
      <ParchmentDialog.Body className="relative !px-5 !py-4">
        <h2 className="font-bold text-[20px] text-on-panel-dim text-center mb-1">
          Start Farming — {zone.name}
        </h2>
        <p className="text-on-panel-faint text-[12px] text-center mb-2.5 leading-snug">
          {mustPick
            ? `Pick ${MAX_SLOTS} tile types to bring to the field. Tap ✎ to swap a variant.`
            : `These ${cats.length} tile types will be on the field. Tap a slot to pick a variant.`}
          {hazards.length > 0 && " Red cards are dangers — always active, not editable."}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-2.5">
          {cats.map((cat: string) => (
            <TileSlot
              key={cat}
              category={cat}
              selected={selected.has(cat)}
              locked={!mustPick}
              activeTileId={activeTileForZoneCategory(state, cat)}
              variantCount={unlockedRowsForZoneCategory(state, cat).length}
              onToggle={() => toggleCategory(cat)}
              onChoose={() => setChooserCat(cat)}
            />
          ))}
          {hazards.map((h: string) => (
            <DangerCard key={`hz-${h}`} hazard={h} />
          ))}
        </div>

        {/* Turns + cost, merged into one compact card */}
        <div className="hl-card mb-3 !p-2.5 gap-2">
          <div>
            <div className="flex items-center justify-between text-[13px] text-on-panel">
              <span className="font-bold">Turns this session</span>
              <span className="font-mono font-bold text-[16px]">{turns}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-on-panel-faint">
              Base {baseTurns}{buildingTurns > 0 ? ` + buildings ${buildingTurns}` : ""}{useFertilizer ? " × fertilizer" : ""}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-on-panel">
            <input
              type="checkbox"
              checked={useFertilizer}
              disabled={!fertilizerAvailable}
              onChange={(e) => setUseFertilizer(e.target.checked)}
            />
            <span>
              Use Fertilizer {fertilizerAvailable ? `(${fertilizerStock} on hand)` : "(none on hand)"} — doubles turns
            </span>
          </label>
          <div className="h-px bg-[#8c7656]/30" />
          <div className="flex items-center justify-between text-[13px] gap-2">
            <span className="text-on-panel font-bold">Cost to start</span>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-bold text-[15px] ${canAfford ? "text-[#2a5010]" : "text-[#a02020]"}`}
              >
                {cost}◉
              </span>
              <ZoneEntryCostInfo zoneId={zoneId} state={state} infoOnly />
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-2">
          <Button
            tone="iron"
            size="lg"
            onClick={onClose}
            className="flex-1 !rounded-2xl"
          >
            Cancel
          </Button>
          <Button
            tone="moss"
            size="lg"
            onClick={handleStart}
            disabled={!canStart}
            className="flex-[2] !rounded-2xl shadow-lg"
          >
            {canAfford ? `Start (${cost}◉)` : "Not enough coin"}
          </Button>
        </div>

        {chooserCat && (
          <TileChooserPopup
            zoneCategory={chooserCat}
            state={state}
            dispatch={dispatch}
            onClose={() => setChooserCat(null)}
          />
        )}
      </ParchmentDialog.Body>
    </ParchmentDialog>
  );
}
