/**
 * RewardBundle — the quest reward display.
 *
 * A quest reward is a small (≤5) heterogeneous bundle: coins, almanac XP, tools,
 * resource items, runes, a structural perk, and/or a building/tile unlock. This
 * module flattens any reward object into an ordered list of rows and renders two
 * surfaces from it:
 *
 *   <RewardHeadlineChip>  — one chip for the single most prominent reward
 *                           (an unlock if present, else a perk/rune, else coins),
 *                           shown top-right on the quest card where the old
 *                           coins+✦ token sat.
 *   <RewardManifest>      — the full list (icon + name + optional ×N / value),
 *                           shown under the progress bar. Unlock rows are framed.
 *
 * Names and icons come straight from the live catalogs (BUILDINGS, ITEMS) and the
 * icon registry — no new strings to author. Where an icon key has no registered
 * draw (e.g. almanac XP), we fall back to a styled glyph. This replaces the old
 * coins-only token AND the icon-less `rewardLabel()` text serializer.
 */
import type { CSSProperties } from "react";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { BUILDINGS, ITEMS } from "../../constants.js";

/** Loose reward shape covering both quest systems and the almanac tiers. */
export interface RewardLike {
  coins?: number;
  xp?: number;
  almanacXp?: number;
  tools?: Record<string, number>;
  items?: Record<string, number>;
  runes?: number;
  structural?: string;
  unlockTile?: string;
  unlockBuilding?: string;
  /** Legacy single-tool shape. */
  tool?: string;
  amt?: number;
  [k: string]: unknown;
}

type RewardKind = "coin" | "xp" | "rune" | "tool" | "item" | "structural" | "tile" | "building";

interface RewardRow {
  kind: RewardKind;
  iconKey: string;
  glyph: string;
  name: string;
  /** Currencies: the signed amount shown to the right (e.g. +250). */
  value?: number;
  /** Counted goods: a ×N badge, only rendered when >1. */
  qty?: number;
  /** Unlock/perk rows: a short type pill ("Building" / "Tile" / "Perk"). */
  tag?: string;
  /** Headline-class rewards (building/tile/structural/rune) lead the bundle. */
  headline: boolean;
  /** Extra row modifier class (framed unlock rows). */
  rowClass?: string;
}

const STRUCTURAL_LABELS: Record<string, string> = {
  startingExtraScythe: "Extra Scythe",
  extraBlueprintSlot: "Extra Blueprint Slot",
  extraTurn: "Extra Turn token",
  goldSeal: "Golden Seal",
};

/** Turn a camelCase / snake_case id into spaced, capitalised words
 * ("extraTurn" → "Extra Turn") so an unmapped key still reads as English. */
function prettifyKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : key;
}

/** Player-facing label for a structural perk: the authored map first, then a
 * prettified fallback so a brand-new perk id never leaks raw camelCase. */
function structuralLabel(key: string): string {
  return STRUCTURAL_LABELS[key] ?? prettifyKey(key);
}

function catalogLabel(key: string): string {
  const entry = (ITEMS as Record<string, { label?: string }>)[key];
  return entry?.label ?? key;
}

function buildingName(id: string): string {
  return (BUILDINGS as ReadonlyArray<{ id: string; name: string }>).find((b) => b.id === id)?.name ?? id;
}

/**
 * Flatten a reward object into an ordered row list (taxonomy order: coins, XP,
 * tools, items, runes, structural, tile unlock, building unlock). Order is stable
 * so the manifest reads the same every render.
 */
export function rewardRows(reward: RewardLike | null | undefined): RewardRow[] {
  if (!reward) return [];
  const rows: RewardRow[] = [];

  if (reward.coins) {
    rows.push({ kind: "coin", iconKey: "tile_coin_golden", glyph: "◉", name: "Coins", value: reward.coins, headline: false });
  }
  const xp = reward.almanacXp ?? reward.xp ?? 0;
  if (xp > 0) {
    rows.push({ kind: "xp", iconKey: "", glyph: "✦", name: "Almanac XP", value: xp, headline: false });
  }
  if (reward.tools) {
    for (const [id, n] of Object.entries(reward.tools)) {
      if (!n) continue;
      rows.push({ kind: "tool", iconKey: id, glyph: "⚒", name: catalogLabel(id), qty: n, headline: false });
    }
  }
  if (reward.items) {
    for (const [key, n] of Object.entries(reward.items)) {
      if (!n) continue;
      rows.push({ kind: "item", iconKey: key, glyph: "▣", name: catalogLabel(key), qty: n, headline: false });
    }
  }
  if (reward.runes) {
    rows.push({ kind: "rune", iconKey: "rune_stone", glyph: "◈", name: "Rune", value: reward.runes, headline: true });
  }
  if (reward.structural) {
    rows.push({
      kind: "structural",
      iconKey: "",
      glyph: "⬡",
      name: structuralLabel(reward.structural),
      tag: "Perk",
      headline: true,
      rowClass: "qm-row--perk",
    });
  }
  if (reward.unlockTile) {
    rows.push({
      kind: "tile",
      iconKey: reward.unlockTile,
      glyph: "🟩",
      name: catalogLabel(reward.unlockTile),
      tag: "Tile",
      headline: true,
      rowClass: "qm-row--unlock-tile",
    });
  }
  if (reward.unlockBuilding) {
    rows.push({
      kind: "building",
      iconKey: `bld_${reward.unlockBuilding}`,
      glyph: "🏚",
      name: buildingName(reward.unlockBuilding),
      tag: "Building",
      headline: true,
      rowClass: "qm-row--unlock-bld",
    });
  }
  // Legacy `tool` + `amt` single-tool shape.
  if (reward.tool) {
    rows.push({ kind: "tool", iconKey: reward.tool, glyph: "⚒", name: catalogLabel(reward.tool), qty: reward.amt ?? 1, headline: false });
  }
  return rows;
}

const HEADLINE_ORDER: RewardKind[] = ["building", "tile", "structural", "rune", "coin", "xp", "tool", "item"];

/** The single most prominent reward — drives the headline chip. */
export function pickHeadline(rows: RewardRow[]): RewardRow | null {
  for (const kind of HEADLINE_ORDER) {
    const found = rows.find((r) => r.kind === kind);
    if (found) return found;
  }
  return rows[0] ?? null;
}

/**
 * Manifest ordering: the headline rewards (the building/tile unlock, rune, or
 * perk) float to the top in prominence order, then the baseline coins / XP /
 * goods follow in stable taxonomy order. This is what makes the prize *read* as
 * the prize instead of sitting last under the coins. Uses the per-row `headline`
 * flag from {@link rewardRows} and the shared {@link HEADLINE_ORDER}.
 */
export function manifestRows(reward: RewardLike | null | undefined): RewardRow[] {
  const rows = rewardRows(reward);
  // Headline rows rank by their HEADLINE_ORDER priority (building first);
  // baseline rows all share the lowest rank and keep their taxonomy order.
  const rank = (r: RewardRow): number =>
    r.headline ? HEADLINE_ORDER.indexOf(r.kind) : HEADLINE_ORDER.length;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.i - b.i)
    .map((x) => x.row);
}

/** Render a row's icon: the registry draw when available, else a styled glyph. */
function RewardIcon({ row, size, cls }: { row: RewardRow; size: number; cls: string }) {
  if (row.iconKey && hasIcon(row.iconKey)) {
    return <IconCanvas iconKey={row.iconKey} size={size} background={null} rounded={false} title={row.name} />;
  }
  return <span className={`${cls} qm-glyph--${row.kind}`} aria-hidden="true">{row.glyph}</span>;
}

/** A signed amount string for currency rows (+250, +20). */
function signed(n: number): string {
  return `+${n}`;
}

/**
 * The headline chip — the most prominent reward, shown where the old coins token
 * sat. Building/tile/rune get their own premium palette via a modifier class.
 */
export function RewardHeadlineChip({ reward }: { reward: RewardLike | null | undefined }) {
  const rows = rewardRows(reward);
  const head = pickHeadline(rows);
  if (!head) return null;

  const variant =
    head.kind === "building" ? "quest-reward--bld" :
    head.kind === "tile" ? "quest-reward--tile" :
    head.kind === "rune" ? "quest-reward--rune" :
    head.kind === "structural" ? "quest-reward--perk" : "";

  let label: string;
  if (head.kind === "coin" || head.kind === "rune") label = signed(head.value ?? 0);
  else if (head.kind === "xp") label = `${signed(head.value ?? 0)}✦`;
  else if (head.kind === "tool" || head.kind === "item") label = head.qty && head.qty > 1 ? `${head.name} ×${head.qty}` : head.name;
  else label = head.name; // building / tile / structural

  // A second chip for coins keeps the at-a-glance value when an unlock leads.
  const coin = head.kind !== "coin" ? rows.find((r) => r.kind === "coin") : undefined;

  return (
    <span className="quest-reward-chips" title="Reward">
      <span className={`quest-reward ${variant}`}>
        <RewardIcon row={head} size={15} cls="quest-reward-glyph" />
        <span>{label}</span>
      </span>
      {coin && (
        <span className="quest-reward quest-reward--coin-sm">
          <RewardIcon row={coin} size={14} cls="quest-reward-glyph" />
          <span>{signed(coin.value ?? 0)}</span>
        </span>
      )}
    </span>
  );
}

/**
 * A one-shot claim celebration: a radial gold flash plus every reward icon
 * bursting upward and fading out. Purely decorative and stateless (no timers of
 * its own) — the caller mounts it transiently over the quest card and unmounts
 * it when the animation window elapses. Honours `prefers-reduced-motion` via CSS.
 */
export function ClaimBurst({ reward }: { reward: RewardLike | null | undefined }) {
  const rows = manifestRows(reward);
  const n = Math.max(rows.length, 1);
  return (
    <div className="quest-claim-burst" aria-hidden="true">
      <span className="qcb-flash" />
      {rows.map((row, i) => {
        // Deterministic spread from the index (no Math.random): fan the icons
        // out across the card and stagger their launch for a popcorn feel.
        const t = n === 1 ? 0.5 : i / (n - 1);
        const dx = (t - 0.5) * 132;
        return (
          <span
            key={i}
            className={`qcb-particle qcb-particle--${row.kind}`}
            style={{ "--qcb-dx": `${dx}px`, animationDelay: `${i * 55}ms` } as CSSProperties}
          >
            <RewardIcon row={row} size={22} cls="qcb-glyph" />
          </span>
        );
      })}
    </div>
  );
}

/**
 * The full reward manifest — one row per reward (icon + name + optional ×N or
 * value). Unlock rows are framed and tagged. Capped at five rewards by authoring
 * convention, so this never scrolls or collapses.
 */
export function RewardManifest({ reward }: { reward: RewardLike | null | undefined }) {
  const rows = manifestRows(reward);
  if (rows.length === 0) return null;
  return (
    <ul className="quest-manifest">
      {rows.map((row, i) => (
        <li key={i} className={`qm-row ${row.rowClass ?? ""}`}>
          <span className="qm-ic">
            <RewardIcon row={row} size={24} cls="qm-glyph" />
          </span>
          <span className="qm-name">{row.name}</span>
          {row.tag ? (
            <span className="qm-tag">{row.tag}</span>
          ) : row.value != null ? (
            <span className={`qm-val qm-val--${row.kind}`}>
              {signed(row.value)}{row.kind === "xp" ? "✦" : ""}
            </span>
          ) : row.kind === "tool" || row.kind === "item" ? (
            // Counted goods carry a type chip ("Tool" / "Item") so a bare reward
            // (e.g. a single Lockbox) still reads as what it is — with the ×N
            // count kept alongside when more than one is granted.
            <span className="qm-goods">
              {row.qty && row.qty > 1 ? <span className="qm-qty">×{row.qty}</span> : null}
              <span className="qm-tag qm-tag--goods">{row.kind === "tool" ? "Tool" : "Item"}</span>
            </span>
          ) : row.qty && row.qty > 1 ? (
            <span className="qm-qty">×{row.qty}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
