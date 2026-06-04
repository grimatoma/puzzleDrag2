// Icons viewer tab — renders every entry in ICON_REGISTRY on a card so
// designers can browse, search, filter by usage, and copy icon keys.

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  memo,
  useCallback,
  type RefObject,
} from "react";
import { ICON_REGISTRY } from "../../textures/iconRegistry.js";
import { ICON_DESIGN_BOX } from "../../textures/paintIcon.js";
import { getUsedIconKeys } from "../iconUsage.js";
import { iconAnimation } from "../../textures/iconAnimations.js";
import { iconAnimationTicker } from "../iconAnimationTicker.js";
import { seasonalTileDraw, seasonalTileAnim, hasSeasonalTile } from "../../textures/seasonal/seasonalTiles.js";
import type { SeasonName } from "../../textures/seasonal/types.js";
import { COLORS, FilterBar, SearchBar, SegmentedFilter } from "../shared.jsx";

// Derive category buckets from key prefixes (e.g. "ui_lock" → "ui").
// When an archived/legacy canvas entry has `replacedBy`, use that key's
// category instead so the legacy entry sorts next to its active sibling.
function categoryOf(key: string, replacedBy: string | null | undefined): string {
  const effective = replacedBy || key;
  const idx = effective.indexOf("_");
  return idx === -1 ? "other" : effective.slice(0, idx);
}

const USED_KEYS = getUsedIconKeys();

interface CanvasEntryRaw {
  label?: string;
  color?: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
  archive?: boolean;
  replacedBy?: string;
}

const ALL_ENTRIES = Object.entries(ICON_REGISTRY as unknown as Record<string, CanvasEntryRaw>).map(
  ([key, entry]) => ({
    key,
    label: entry.label ?? key,
    color: entry.color ?? "#888",
    draw: entry.draw,
    archive: entry.archive === true,
    replacedBy: entry.replacedBy ?? null,
    category: categoryOf(key, entry.replacedBy),
    inUse: USED_KEYS.has(key),
    animFn: iconAnimation(key),
  }),
);

type IconEntry = (typeof ALL_ENTRIES)[number];

const ALL_CATEGORIES = ["all", ...Array.from(new Set(ALL_ENTRIES.map((e) => e.category))).sort()];
const CATEGORY_OPTIONS = ALL_CATEGORIES.map((id) => ({ id, label: id }));
const STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "in-use", label: "In Use" },
  { id: "unused", label: "Unused" },
  { id: "legacy", label: "Legacy" },
  { id: "animated", label: "Animated" },
];

const ANIMATE_OPTIONS = [
  { id: "off", label: "Off" },
  { id: "on", label: "Play" },
];

const SEASON_OPTIONS = [
  { id: "none", label: "None" },
  { id: "Spring", label: "Spring" },
  { id: "Summer", label: "Summer" },
  { id: "Autumn", label: "Autumn" },
  { id: "Winter", label: "Winter" },
];

const TAGS_EXPANDED_KEY = "hearth.balance.iconsTagsExpanded";

function readTagsExpanded(): boolean {
  try {
    return localStorage.getItem(TAGS_EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTagsExpanded(expanded: boolean) {
  try {
    localStorage.setItem(TAGS_EXPANDED_KEY, expanded ? "1" : "0");
  } catch {
    // Ignore quota / private-mode failures in dev panel.
  }
}

const ICON_SIZE = 56; // px — canvas render size
// Outer cell dimensions (content + border-2 + gap-2) for virtual row layout.
const ICON_CELL_WIDTH = ICON_SIZE + 32 + 4;
const ICON_CELL_HEIGHT = 112;
const ICON_GRID_GAP = 8;
const VIRTUAL_OVERSCAN_ROWS = 2;

interface PaintableIconEntry {
  color: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

function paintDrawIntoCell(
  ctx: CanvasRenderingContext2D,
  color: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = color + "28";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(size / 2, size / 2);
  const scale = size / ICON_DESIGN_BOX;
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  try {
    draw(ctx);
  } catch {
    // Silently skip broken draw functions in dev viewer.
  }
  ctx.restore();
}

function paintIconForCell(ctx: CanvasRenderingContext2D, entry: PaintableIconEntry, size: number) {
  paintDrawIntoCell(ctx, entry.color, size, entry.draw);
}

interface IconCellProps {
  entry: IconEntry;
  onClick: (key: string) => void;
  selected: boolean;
  animate: boolean;
  /** Active season variant (null = base art). Affects keys with seasonal art. */
  season: SeasonName | null;
  scrollRoot: RefObject<HTMLElement | null>;
  style?: React.CSSProperties;
}

const IconCell = memo(function IconCell({
  entry,
  onClick,
  selected,
  animate,
  season,
  scrollRoot,
  style,
}: IconCellProps) {
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const tickerId = useRef(Symbol("icon-cell"));
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  // When a season is selected and this key has seasonal art, prefer the
  // seasonal variant; otherwise use the base draw/animation.
  const seasonalDraw = season ? seasonalTileDraw(entry.key, season) : null;
  const animFn = season ? seasonalTileAnim(entry.key, season) : entry.animFn;

  const playing = visible && !!animFn && (animate || hovered);

  useEffect(() => {
    const el = rootRef.current;
    const root = scrollRoot.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([observed]) => setVisible(observed?.isIntersecting ?? false),
      { root, threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    canvas.width = ICON_SIZE * dpr;
    canvas.height = ICON_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    if (!playing || !animFn) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const id = tickerId.current;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
      paintDrawIntoCell(ctx, entry.color, ICON_SIZE, (c) => animFn(c, t));
    };
    iconAnimationTicker.subscribe(id, draw);
    return () => iconAnimationTicker.unsubscribe(id);
  }, [playing, animFn, entry.color]);

  useEffect(() => {
    if (!visible || playing) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    if (seasonalDraw) paintDrawIntoCell(ctx, entry.color, ICON_SIZE, seasonalDraw);
    else paintIconForCell(ctx, entry, ICON_SIZE);
  }, [visible, playing, entry, seasonalDraw]);

  let badge = null;
  if (entry.archive) badge = { label: "Legacy", color: "#7a4a18" };
  else if (!entry.inUse) badge = { label: "Unused", color: "#6a6a72" };

  return (
    <button
      ref={rootRef}
      onClick={() => onClick(entry.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${entry.key}\n${entry.label}`}
      className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ember/50 absolute"
      style={{
        background: selected ? entry.color + "22" : COLORS.parchment,
        borderColor: selected ? entry.color : COLORS.border,
        width: ICON_SIZE + 32,
        cursor: "pointer",
        opacity: entry.archive ? 0.85 : 1.0,
        ...style,
      }}
    >
      {badge && (
        <span
          className="absolute top-1 right-1 text-[8px] font-bold px-1.5 py-[1px] rounded uppercase tracking-wide pointer-events-none"
          style={{
            background: badge.color,
            color: "#fefae0",
            letterSpacing: "0.04em",
          }}
        >
          {badge.label}
        </span>
      )}
      {animFn && (
        <span
          className="absolute top-1 left-1 text-[9px] leading-none px-1 py-[1px] rounded pointer-events-none"
          title={playing ? "Playing" : "Hover or toggle Animate to play"}
          style={{
            background: playing ? entry.color : entry.color + "33",
            color: playing ? "#fff" : entry.color,
          }}
        >
          {playing ? "▶" : "◷"}
        </span>
      )}
      {hasSeasonalTile(entry.key) && (
        <span
          className="absolute bottom-[26px] right-1 text-[9px] leading-none px-1 py-[1px] rounded pointer-events-none font-bold"
          title="Has seasonal variants — pick a Season to preview"
          style={{ background: entry.color + "33", color: entry.color }}
        >
          S
        </span>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: ICON_SIZE, height: ICON_SIZE, display: "block" }}
      />
      <div
        className="text-center leading-tight max-w-full"
        style={{ width: ICON_SIZE + 24 }}
      >
        <div
          className="text-[10px] font-bold truncate"
          style={{ color: COLORS.ink }}
          title={entry.label}
        >
          {entry.label}
        </div>
        <div
          className="text-[9px] font-mono truncate opacity-60"
          style={{ color: COLORS.inkSubtle }}
          title={entry.key}
        >
          {entry.key}
        </div>
      </div>
    </button>
  );
});

interface VirtualIconGridProps {
  entries: IconEntry[];
  scrollRef: RefObject<HTMLElement | null>;
  onClick: (key: string) => void;
  selectedKey: string | null;
  animate: boolean;
  season: SeasonName | null;
}

function VirtualIconGrid({ entries, scrollRef, onClick, selectedKey, animate, season }: VirtualIconGridProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0, scrollTop: 0 });

  const updateViewport = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewport({
      width: el.clientWidth,
      height: el.clientHeight,
      scrollTop: el.scrollTop,
    });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateViewport();
    const onScroll = () => updateViewport();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateViewport());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [scrollRef, updateViewport, entries.length]);

  const columnCount = Math.max(
    1,
    Math.floor((viewport.width + ICON_GRID_GAP) / (ICON_CELL_WIDTH + ICON_GRID_GAP)),
  );
  const rowCount = Math.ceil(entries.length / columnCount);
  const rowStride = ICON_CELL_HEIGHT + ICON_GRID_GAP;
  const totalHeight = rowCount > 0 ? rowCount * rowStride - ICON_GRID_GAP : 0;

  const startRow = Math.max(0, Math.floor(viewport.scrollTop / rowStride) - VIRTUAL_OVERSCAN_ROWS);
  const endRow = Math.min(
    Math.max(0, rowCount - 1),
    Math.ceil((viewport.scrollTop + viewport.height) / rowStride) + VIRTUAL_OVERSCAN_ROWS,
  );

  const visibleCells = useMemo(() => {
    const cells: {
      entry: IconEntry;
      row: number;
      col: number;
      key: string;
    }[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnCount; col++) {
        const index = row * columnCount + col;
        if (index >= entries.length) break;
        const entry = entries[index];
        cells.push({ entry, row, col, key: entry.key });
      }
    }
    return cells;
  }, [entries, startRow, endRow, columnCount]);

  return (
    <div className="relative pb-4" style={{ height: totalHeight, minHeight: totalHeight }}>
      {visibleCells.map(({ entry, row, col, key }) => (
        <IconCell
          key={key}
          entry={entry}
          onClick={onClick}
          selected={selectedKey === entry.key}
          animate={animate}
          season={season}
          scrollRoot={scrollRef}
          style={{
            top: row * rowStride,
            left: col * (ICON_CELL_WIDTH + ICON_GRID_GAP),
          }}
        />
      ))}
    </div>
  );
}

export default function IconsTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);
  const [season, setSeason] = useState<"none" | SeasonName>("none");
  const [tagsExpanded, setTagsExpanded] = useState(readTagsExpanded);
  const seasonName: SeasonName | null = season === "none" ? null : season;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function toggleTagsExpanded() {
    setTagsExpanded((prev) => {
      const next = !prev;
      writeTagsExpanded(next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_ENTRIES.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (status === "in-use" && (!e.inUse || e.archive)) return false;
      if (status === "unused" && (e.inUse || e.archive)) return false;
      if (status === "legacy" && !e.archive) return false;
      if (status === "animated" && !e.animFn) return false;
      if (!q) return true;
      return e.key.toLowerCase().includes(q) || e.label.toLowerCase().includes(q);
    }).sort((a, b) => {
      const rankA = a.archive ? 2 : a.inUse ? 0 : 1;
      const rankB = b.archive ? 2 : b.inUse ? 0 : 1;
      if (rankA !== rankB) return rankA - rankB;
      const groupA = a.replacedBy || a.key;
      const groupB = b.replacedBy || b.key;
      return groupA.localeCompare(groupB);
    });
  }, [search, category, status]);

  function handleClick(key: string) {
    navigator.clipboard?.writeText(key).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <FilterBar className="gap-3 flex-shrink-0">
        <div className="flex-1 min-w-[160px] max-w-[320px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search key or label…" />
        </div>
        <div
          className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg border-2"
          role="group"
          aria-label="Usage status"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wide pr-1"
            style={{ color: COLORS.inkSubtle }}
          >
            Status
          </span>
          <SegmentedFilter
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            ariaLabel="Icon usage status"
            className="[&>button]:!px-2 [&>button]:!py-0.5 [&>button]:!text-[10px] [&>button]:!rounded-md"
          />
        </div>
        <div
          className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg border-2"
          role="group"
          aria-label="Animation playback"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wide pr-1"
            style={{ color: COLORS.inkSubtle }}
          >
            Animate
          </span>
          <SegmentedFilter
            options={ANIMATE_OPTIONS}
            value={animate ? "on" : "off"}
            onChange={(v) => setAnimate(v === "on")}
            ariaLabel="Animation playback"
            className="[&>button]:!px-2 [&>button]:!py-0.5 [&>button]:!text-[10px] [&>button]:!rounded-md"
          />
        </div>
        <div
          className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg border-2"
          role="group"
          aria-label="Season variant"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wide pr-1"
            style={{ color: COLORS.inkSubtle }}
          >
            Season
          </span>
          <SegmentedFilter
            options={SEASON_OPTIONS}
            value={season}
            onChange={(v) => setSeason(v as "none" | SeasonName)}
            ariaLabel="Season variant"
            className="[&>button]:!px-2 [&>button]:!py-0.5 [&>button]:!text-[10px] [&>button]:!rounded-md"
          />
        </div>
        <div className="text-[11px] italic flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
          {filtered.length} / {ALL_ENTRIES.length} icons
        </div>
      </FilterBar>

      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={toggleTagsExpanded}
          aria-expanded={tagsExpanded}
          aria-controls="icons-category-tags"
          className="w-full flex items-center gap-2 px-2 py-1 rounded-lg border-2 text-left transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ember/50"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.ink }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
            Tags
          </span>
          <span className="text-[11px] font-mono capitalize flex-1 truncate" title={category}>
            {category}
          </span>
          <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.inkSubtle }} aria-hidden>
            {tagsExpanded ? "▲" : "▼"}
          </span>
        </button>
        {tagsExpanded && (
          <div id="icons-category-tags" className="mt-2">
            <SegmentedFilter
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
              ariaLabel="Icon category filter"
              className="[&>button]:!px-2 [&>button]:!py-1 [&>button]:!text-[10px] [&>button]:!rounded-md [&>button]:capitalize"
            />
          </div>
        )}
      </div>

      {copiedKey && (
        <div
          className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-center flex-shrink-0"
          style={{ background: COLORS.green, color: "#fff" }}
        >
          Copied <span className="font-mono">{copiedKey}</span> to clipboard
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No icons match your search.
          </div>
        ) : (
          <VirtualIconGrid
            entries={filtered}
            scrollRef={scrollRef}
            onClick={handleClick}
            selectedKey={copiedKey}
            animate={animate}
            season={seasonName}
          />
        )}
      </div>

      <div className="text-[10px] italic flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
        Click any icon to copy its key to the clipboard. <span className="font-bold">Legacy</span> entries are archived originals; <span className="font-bold">Unused</span> entries are registered but not referenced anywhere in code. Icons marked <span className="font-bold">▶</span> are animated — hover one to preview, or flip <span className="font-bold">Animate</span> to play all (filter by <span className="font-bold">Animated</span> status). Icons marked <span className="font-bold">S</span> have seasonal art — pick a <span className="font-bold">Season</span> to preview their Spring/Summer/Autumn/Winter variants.
      </div>
    </div>
  );
}
