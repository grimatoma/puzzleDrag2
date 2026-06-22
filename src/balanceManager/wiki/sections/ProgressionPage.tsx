/**
 * ProgressionPage.tsx — the single centralized Progression & Unlocks view for
 * the `/b/` Dev Panel. Supersedes the old Direction / Timeline / Balance pages.
 *
 * Three things in one place, all read LIVE from code so nothing drifts:
 *   1. An interactive milestone spine (from PROGRESSION_TRIGGERS). Click a point.
 *   2. A CUMULATIVE state report for the selected point — every tile / building /
 *      recipe / zone unlocked so far, plus the running coins + tier-upgrade
 *      ladders paid to get there (from the cumulative engine).
 *   3. A category filter (incl. cost-only views) and a resource-obtainability
 *      report that lists any resource with no path to it.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import { StatusBadge } from "../StatusBadge.jsx";
import { AmountChips } from "../EntityVisual.jsx";
import type { ProgTrigger, Effect } from "../../../config/progression/index.js";
import {
  progressionPoints,
  cumulativeThrough,
  effectCategory,
  tilesUnlockedAtTrigger,
  type Category,
} from "../../../config/progression/cumulative.js";
import { findUnobtainableResources } from "../../../game/obtainable.js";

const CATEGORY_LABEL: Record<Category, string> = {
  zone: "Areas", tile: "Tiles", resource: "Items", building: "Buildings",
  tool: "Tools", recipe: "Recipes", worker: "Workers", effect: "Effects",
  system: "Systems", story: "Story", hazard: "Hazards",
};

// Pseudo-categories for cost-oriented filtering, shown alongside the real ones.
const COSTS_FILTER = "__costs";
const CARAVAN_FILTER = "__caravan";

// ─── Effect → ref / label ─────────────────────────────────────────────────────

function effectRef(e: Effect): { conceptId: string; key: string } | null {
  switch (e.kind) {
    case "unlockBuilding": return { conceptId: "buildings", key: e.building };
    case "unlockRecipe":   return { conceptId: "recipes",   key: e.recipe };
    case "unlockTool":     return { conceptId: "tools",     key: e.tool };
    case "unlockWorker":   return { conceptId: "workers",   key: e.worker };
    case "unlockZone":     return { conceptId: "zones",     key: e.zone };
    case "discoverTile":   return { conceptId: "tiles",     key: e.tile };
    default: return null;
  }
}

function noteLabel(e: Effect): string | null {
  if (e.kind === "note")       return e.label;
  if (e.kind === "grant")      return e.coins ? `+${e.coins} coins` : "resources";
  if (e.kind === "advanceAct") return `Act ${e.to}`;
  if (e.kind === "showBeat")   return "Story beat";
  return null;
}

function EffectChip({ effect }: { effect: Effect }) {
  const ref = effectRef(effect);
  if (ref) {
    return <ConceptRefForKey entityKey={ref.key} conceptId={ref.conceptId} variant="inline" />;
  }
  const label = noteLabel(effect);
  if (!label) return null;
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 7, background: COLORS.parchment,
      border: `1px solid ${COLORS.border}`, color: COLORS.ink, fontSize: 12,
    }}>
      {label}
    </span>
  );
}

function TileChip({ tileId }: { tileId: string }) {
  return <ConceptRefForKey entityKey={tileId} conceptId="tiles" variant="inline" />;
}

// ─── Per-node unlocks (the restored per-step "what unlocks here" detail) ───────

function NodeUnlocks({ trigger, activeFilters }: { trigger: ProgTrigger; activeFilters: Set<string> }) {
  const showAll = activeFilters.size === 0;
  const effects = trigger.effects.filter((e) => showAll || activeFilters.has(effectCategory(e)));
  const derived = showAll || activeFilters.has("tile") ? tilesUnlockedAtTrigger(trigger) : [];
  if (effects.length === 0 && derived.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginTop: 3 }}>
      <span aria-hidden style={{ color: COLORS.inkSubtle, fontSize: 12, fontWeight: 700 }}>➜</span>
      {effects.map((e, i) => <EffectChip key={`e${i}`} effect={e} />)}
      {derived.map((id) => <TileChip key={`d${id}`} tileId={id} />)}
    </div>
  );
}

// ─── Full vertical timeline (selectable) ──────────────────────────────────────

function TimelineNode({
  trigger, selected, onSelect, activeFilters,
}: {
  trigger: ProgTrigger; selected: boolean; onSelect: () => void; activeFilters: Set<string>;
}) {
  const isMilestone = !!trigger.milestone;
  return (
    <div
      style={{
        position: "relative",
        paddingLeft: 30,
        paddingBottom: 12,
        borderRadius: 10,
        border: `1px solid ${selected ? COLORS.ember : "transparent"}`,
        background: selected ? COLORS.parchment : "transparent",
      }}
    >
      {/* Node marker sitting on the rail — filled for milestones, hollow for steps. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: isMilestone ? 8 : 10,
          top: 11,
          width: isMilestone ? 14 : 10,
          height: isMilestone ? 14 : 10,
          borderRadius: 999,
          boxSizing: "border-box",
          background: isMilestone ? COLORS.ember : COLORS.parchmentDeep,
          border: `2px solid ${COLORS.ember}`,
        }}
      />
      {/* Clickable header selects this step. Only non-interactive content lives
          inside the <button>; the unlock chips (which contain links) sit below. */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Show state at ${trigger.label}`}
        aria-pressed={selected}
        style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "transparent", border: "none", padding: "4px 6px",
        }}
      >
        <span style={{ fontWeight: isMilestone ? 700 : 600, fontSize: isMilestone ? 15 : 13, color: COLORS.ink }}>
          {trigger.label}
        </span>
        {trigger.zone && (
          <span className="wiki-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>{trigger.zone}</span>
        )}
        <StatusBadge status={trigger.status} compact />
      </button>
      {isMilestone && trigger.blurb && (
        <p style={{ fontStyle: "italic", color: COLORS.inkSubtle, fontSize: 12, margin: "0 0 0 6px" }}>
          {trigger.blurb}
        </p>
      )}
      <div style={{ paddingLeft: 6 }}>
        <NodeUnlocks trigger={trigger} activeFilters={activeFilters} />
      </div>
    </div>
  );
}

function Timeline({
  selectedId, onSelect, activeFilters,
}: {
  selectedId: string; onSelect: (id: string) => void; activeFilters: Set<string>;
}) {
  const points = progressionPoints();
  return (
    <div style={{ position: "relative" }}>
      {/* Continuous vertical rail behind the node markers. */}
      <div
        aria-hidden
        style={{ position: "absolute", left: 14, top: 12, bottom: 12, width: 2, background: COLORS.border }}
      />
      {points.map((p) => (
        <TimelineNode
          key={p.id}
          trigger={p}
          selected={selectedId === p.id}
          onSelect={() => onSelect(p.id)}
          activeFilters={activeFilters}
        />
      ))}
    </div>
  );
}

// ─── Cumulative report ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: COLORS.inkSubtle,
      textTransform: "uppercase", letterSpacing: "0.04em", margin: "10px 0 4px",
    }}>
      {children}
    </div>
  );
}

function CumulativeReport({ selectedId, activeFilters }: { selectedId: string; activeFilters: Set<string> }) {
  const state = cumulativeThrough(selectedId);
  if (!state) return <p style={{ color: COLORS.inkSubtle }}>Select a milestone to see the cumulative state.</p>;

  const showAll = activeFilters.size === 0;
  const showCat = (c: Category) => showAll || activeFilters.has(c);
  const showCosts = showAll || activeFilters.has(COSTS_FILTER);
  const showCaravan = showAll || activeFilters.has(CARAVAN_FILTER);

  // Tiles bucket merges curated discoverTile effects with live building/zone-derived tiles.
  const tileBucket = state.unlocked.find((b) => b.category === "tile");
  const hasTiles = (tileBucket?.effects.length ?? 0) > 0 || state.derivedTiles.length > 0;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{state.label}</div>
      <div style={{ fontSize: 12, color: COLORS.inkSubtle }}>
        Everything unlocked through this point ({state.pointIndex + 1} of {progressionPoints().length} steps).
      </div>

      {/* Unlocks by category */}
      {state.unlocked.map((bucket) => {
        if (bucket.category === "tile") return null; // rendered specially below
        if (!showCat(bucket.category)) return null;
        return (
          <div key={bucket.category}>
            <SectionTitle>{CATEGORY_LABEL[bucket.category]}</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {bucket.effects.map((e, i) => <EffectChip key={i} effect={e} />)}
            </div>
          </div>
        );
      })}

      {showCat("tile") && hasTiles && (
        <div>
          <SectionTitle>{CATEGORY_LABEL.tile}</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(tileBucket?.effects ?? []).map((e, i) => <EffectChip key={`e${i}`} effect={e} />)}
            {state.derivedTiles.map((id) => <TileChip key={id} tileId={id} />)}
          </div>
        </div>
      )}

      {/* Costs */}
      {showCosts && (
        <div>
          <SectionTitle>Zone &amp; tier costs</SectionTitle>
          <div style={{ fontSize: 13, color: COLORS.ink, marginBottom: 4 }}>
            Running entry cost: <strong>{state.costs.runningCoins}</strong> coins
          </div>
          {state.costs.zoneEntry.map((z) => (
            <div key={z.zone} style={{ fontSize: 12, color: COLORS.inkSubtle }}>
              {z.zone}: {z.coins > 0 ? `${z.coins} coins to enter` : "free to enter"}
            </div>
          ))}
          {state.costs.tierLadders.map((ladder) => (
            <div key={ladder.zone} style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink }}>{ladder.zone} tier upgrades</div>
              {ladder.tiers.map((t, i) => {
                const uc = t.upgradeCost;
                const cost = uc ? { ...(uc.resources ?? {}), ...(uc.coins ? { coins: uc.coins } : {}) } : null;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                    <span style={{ fontSize: 12, minWidth: 110, color: COLORS.inkSubtle }}>
                      {i}. {t.name} ({t.plots} plots)
                    </span>
                    {cost && Object.keys(cost).length > 0
                      ? <AmountChips amounts={cost} />
                      : <span style={{ fontSize: 12, color: COLORS.inkSubtle }}>—</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {showCaravan && (
        <div>
          <SectionTitle>Caravan costs</SectionTitle>
          <div style={{ fontSize: 12, fontStyle: "italic", color: COLORS.inkSubtle }}>
            Caravan route costs are not modeled in code yet — only the Caravan Post building cost
            exists. Author a caravan-cost table to populate this view.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Obtainability report ─────────────────────────────────────────────────────

function ObtainabilityReport() {
  const orphans = findUnobtainableResources();
  return (
    <div style={{
      marginTop: 18, padding: 12, borderRadius: 10,
      border: `1px solid ${COLORS.border}`, background: COLORS.parchment,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>Resource obtainability check</div>
      {orphans.length === 0 ? (
        <div style={{ fontSize: 12, color: COLORS.inkSubtle, marginTop: 4 }}>
          ✓ Every defined resource is reachable — gatherable from the board or craftable from
          obtainable inputs.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: COLORS.ink, marginTop: 4 }}>
          {orphans.length} resource(s) have no path to them (cannot be gathered or crafted):
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {orphans.map((key) => (
              <ConceptRefForKey key={key} entityKey={key} conceptId="resources" variant="inline" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FILTERS: { key: string; label: string }[] = [
  { key: "zone", label: "Areas" }, { key: "tile", label: "Tiles" },
  { key: "resource", label: "Items" }, { key: "building", label: "Buildings" },
  { key: "recipe", label: "Recipes" }, { key: "tool", label: "Tools" },
  { key: "worker", label: "Workers" }, { key: "effect", label: "Effects" },
  { key: COSTS_FILTER, label: "Zone & tier costs" }, { key: CARAVAN_FILTER, label: "Caravan costs" },
];

function FilterBar({ active, toggle, clear }: {
  active: Set<string>; toggle: (k: string) => void; clear: () => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "8px 0 4px" }}>
      <span style={{ fontSize: 11, color: COLORS.inkSubtle, fontWeight: 600 }}>Filter:</span>
      <button
        type="button" onClick={clear}
        style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer",
          border: `1px solid ${active.size === 0 ? COLORS.ember : COLORS.border}`,
          background: active.size === 0 ? COLORS.ember : "transparent",
          color: active.size === 0 ? "#fff" : COLORS.inkSubtle,
        }}
      >All</button>
      {FILTERS.map((f) => {
        const on = active.has(f.key);
        return (
          <button
            key={f.key} type="button" onClick={() => toggle(f.key)}
            style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${on ? COLORS.ember : COLORS.border}`,
              background: on ? COLORS.ember : "transparent",
              color: on ? "#fff" : COLORS.inkSubtle,
            }}
          >{f.label}</button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressionPage() {
  const points = progressionPoints();
  const milestones = points.filter((p) => p.milestone);
  const [selectedId, setSelectedId] = React.useState<string>(
    milestones[0]?.id ?? points[0]?.id ?? "",
  );
  const [active, setActive] = React.useState<Set<string>>(new Set());

  const toggle = (k: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 className="wiki-concept-title" style={{ fontSize: 26 }}>Progression &amp; Unlocks</h1>
      <p style={{ color: COLORS.inkSubtle, maxWidth: 760 }}>
        The single source of truth for where the game goes and what it costs. The full timeline on the
        left lists every milestone and build step with what it unlocks; click any step to see the
        cumulative state at that moment — everything unlocked from the start, plus the running entry
        and tier-upgrade costs. Filter by category to focus a balancing pass. All numbers read live
        from the game data.
      </p>

      <FilterBar active={active} toggle={toggle} clear={() => setActive(new Set())} />

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginTop: 8 }}>
        <div style={{ flex: "1 1 480px", minWidth: 340 }}>
          <SectionTitle>Full timeline</SectionTitle>
          <Timeline selectedId={selectedId} onSelect={setSelectedId} activeFilters={active} />
        </div>
        <div style={{
          flex: "1 1 360px", minWidth: 300, position: "sticky", top: 8,
          padding: 14, borderRadius: 12,
          border: `1px solid ${COLORS.border}`, background: COLORS.parchmentDeep,
        }}>
          <SectionTitle>State at selected step</SectionTitle>
          <CumulativeReport selectedId={selectedId} activeFilters={active} />
        </div>
      </div>

      <ObtainabilityReport />
    </div>
  );
}
