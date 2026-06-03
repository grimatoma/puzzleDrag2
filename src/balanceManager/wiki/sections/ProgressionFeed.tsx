/**
 * ProgressionFeed.tsx — Wiki "Progression" feed view for the `/b/` Dev Panel.
 *
 * Reads the canonical `PROGRESSION_TRIGGERS` config and renders a two-tier
 * milestone-spine feed: milestone cards form the top-level spine, with non-
 * milestone triggers that `requires` a milestone shown as children beneath it.
 *
 * Each card shows:
 *   - The milestone/trigger label + zone tag + StatusBadge
 *   - An optional flavour blurb
 *   - An "➜ unlocked:" row of effect chips. Effects that carry a live catalog
 *     key (unlockBuilding, unlockRecipe, discoverTile, unlockWorker, unlockZone)
 *     render via ConceptRefForKey; note/grant/advanceAct effects render as plain
 *     text chips.
 *
 * Mirror of ProgressionTimeline.tsx for style conventions. React Compiler is
 * on — no manual useMemo/useCallback.
 *
 * Exported:
 *   ProgressionFeedContent — the inner content, used by render tests.
 *   ProgressionFeed (default) — full page wrapper with heading.
 */

import React from "react";
import { COLORS } from "../../shared.jsx";
import { ConceptRefForKey } from "../refs.js";
import { StatusBadge } from "../StatusBadge.jsx";
import { PROGRESSION_TRIGGERS } from "../../../config/progression/index.js";
import type { ProgTrigger, Effect } from "../../../config/progression/index.js";

// ─── Effect → ConceptRef mapping ─────────────────────────────────────────────

/**
 * Map an unlock effect to (conceptId, key) for ConceptRefForKey.
 * Returns null for effects that have no live catalog key to link.
 */
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

/**
 * Human-readable label for effects that don't carry a catalog key.
 * Returns null for effects rendered by effectRef (unlockBuilding, etc.).
 */
function noteLabel(e: Effect): string | null {
  if (e.kind === "note")       return e.label;
  if (e.kind === "grant")      return e.coins ? `+${e.coins} coins` : "resources";
  if (e.kind === "advanceAct") return `Act ${e.to}`;
  if (e.kind === "showBeat")   return "Story beat";
  // unlockBuilding/unlockRecipe/unlockTool/unlockWorker/unlockZone/discoverTile
  // are handled by effectRef, not here.
  return null;
}

// ─── Spine helpers ───────────────────────────────────────────────────────────

function spineItems(): ProgTrigger[] {
  return PROGRESSION_TRIGGERS.filter((t) => t.milestone);
}

function childrenOf(id: string): ProgTrigger[] {
  return PROGRESSION_TRIGGERS.filter(
    (t) => !t.milestone && (t.requires ?? []).includes(id),
  );
}

// ─── Effect row ──────────────────────────────────────────────────────────────

function EffectRow({ effect }: { effect: Effect }) {
  const ref = effectRef(effect);
  if (ref) {
    return (
      <ConceptRefForKey
        entityKey={ref.key}
        conceptId={ref.conceptId}
        variant="inline"
      />
    );
  }
  const label = noteLabel(effect);
  if (!label) return null;
  return (
    <span
      style={{
        padding: "2px 9px",
        borderRadius: 7,
        background: COLORS.parchment,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.ink,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
}

// ─── Unlock rows ─────────────────────────────────────────────────────────────

function UnlockRows({ trigger }: { trigger: ProgTrigger }) {
  if (trigger.effects.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "4px 0" }}>
      <span style={{ color: COLORS.inkSubtle, fontSize: 12 }}>➜ unlocked:</span>
      {trigger.effects.map((e, i) => (
        <EffectRow key={i} effect={e} />
      ))}
    </div>
  );
}

// ─── Milestone card ───────────────────────────────────────────────────────────

function MilestoneCard({ trigger }: { trigger: ProgTrigger }) {
  const kids = childrenOf(trigger.id);
  return (
    <section style={{ borderLeft: `3px solid ${COLORS.ember}`, paddingLeft: 12 }}>
      {/* Header row: label + zone tag + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="wiki-concept-title" style={{ fontSize: 18 }}>
          {trigger.label}
        </span>
        {trigger.zone && (
          <span
            className="wiki-mono text-[11px]"
            style={{ color: COLORS.inkSubtle }}
          >
            {trigger.zone}
          </span>
        )}
        <StatusBadge status={trigger.status} compact />
      </div>

      {/* Optional flavour blurb */}
      {trigger.blurb && (
        <p style={{ fontStyle: "italic", color: COLORS.inkSubtle, margin: "4px 0" }}>
          {trigger.blurb}
        </p>
      )}

      {/* Effects for the milestone itself */}
      <UnlockRows trigger={trigger} />

      {/* Child triggers (non-milestone children that require this milestone) */}
      {kids.map((k) => (
        <div key={k.id} style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{k.label}</span>
            <StatusBadge status={k.status} compact />
          </div>
          <UnlockRows trigger={k} />
        </div>
      ))}
    </section>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

/**
 * The feed content — exported separately so tests can render it directly
 * (mirroring the ProgressionTimelineContent pattern in ProgressionTimeline.tsx).
 */
export function ProgressionFeedContent() {
  const milestones = spineItems();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {milestones.map((m) => (
        <MilestoneCard key={m.id} trigger={m} />
      ))}
    </div>
  );
}

/**
 * Full page wrapper with heading and description, lazy-loaded by WikiShell.tsx
 * at the `#/page/progression` route.
 */
export default function ProgressionFeed() {
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 className="wiki-concept-title" style={{ fontSize: 26 }}>
        Progression
      </h1>
      <p style={{ color: COLORS.inkSubtle }}>
        Every milestone and what it unlocks — read from the trigger config.
      </p>
      <ProgressionFeedContent />
    </div>
  );
}
