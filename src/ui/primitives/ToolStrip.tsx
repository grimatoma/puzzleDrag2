import { useRef, useState, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Icon from "./Icon.jsx";

const TAP_MAX_MS = 400;
const LONG_PRESS_MS = 500;
const HOVER_DWELL_MS = 1200;

interface ToolEntry {
  key: string;
  iconKey: string;
  label: string;
  count: number;
  category?: string;
  def?: { desc?: string };
  disabled?: boolean;
  armed?: boolean;
}

function CountBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-pill bg-ink text-cream text-[11px] leading-none font-semibold tabular-nums border border-iron pointer-events-none"
    >
      {count}
    </span>
  );
}

interface ToolCardProps {
  tool: ToolEntry;
  armed?: boolean;
  dimmed?: boolean;
  onUse?: (key: string) => void;
  onInspect?: (key: string) => void;
}

function ToolCard({ tool, armed, dimmed, onUse, onInspect }: ToolCardProps) {
  const tapStart = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tipOpen, setTipOpen] = useState(false);

  const isDisabled = (!armed && tool.disabled) || (!armed && tool.count === 0);
  const isExhausted = !armed && tool.count === 0;

  useEffect(
    () => () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    []
  );

  const beginPress = () => {
    tapStart.current = Date.now();
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (onInspect) onInspect(tool.key); else setTipOpen(true);
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const elapsed = Date.now() - tapStart.current;
    if (longPressFired.current) return;
    if (elapsed < TAP_MAX_MS) {
      if (isExhausted) {
        if (onInspect) onInspect(tool.key); else setTipOpen(true);
      } else {
        onUse?.(tool.key);
      }
    }
  };
  const cancelPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressFired.current = false;
  };

  const onContextMenu = (e: ReactMouseEvent) => {
    if (!onInspect) return;
    e.preventDefault();
    onInspect(tool.key);
  };

  const onMouseEnter = () => {
    if (onInspect) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setTipOpen(true), HOVER_DWELL_MS);
  };
  const onMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setTipOpen(false);
  };

  const stateCls = armed
    ? "ring-2 ring-gold-bright bg-ember border-ember-hot text-white"
    : isDisabled
    ? "border-iron/30 bg-parchment-dim/40 text-ink-light hover:opacity-70"
    : "border-iron/60 bg-parchment-soft hover:bg-parchment text-ink";

  const dimCls = dimmed && !armed ? "opacity-60" : "";
  const exhaustedCls = isExhausted ? "opacity-50 grayscale" : "";

  return (
    <button
      type="button"
      aria-label={armed ? `Cancel ${tool.label}` : isExhausted ? `Inspect ${tool.label}` : `Use ${tool.label}`}
      aria-pressed={armed}
      onMouseDown={beginPress}
      onMouseUp={endPress}
      onMouseLeave={() => {
        cancelPress();
        onMouseLeave();
      }}
      onMouseEnter={onMouseEnter}
      onTouchStart={beginPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      onTouchMove={cancelPress}
      onContextMenu={onContextMenu}
      className={`relative w-full min-h-tap rounded-md border-2 px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors ${stateCls} ${dimCls} ${exhaustedCls}`}
    >
      <Icon iconKey={tool.iconKey} size={28} />
      <span className="text-micro font-semibold leading-none text-center truncate w-full">
        {tool.label}
      </span>
      {typeof tool.count === "number" && tool.count > 0 && <CountBadge count={tool.count} />}
      {tipOpen && !onInspect && tool.def?.desc && (
        <span
          role="tooltip"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-40 bg-ink text-cream text-caption rounded-md px-2 py-1.5 shadow-lg pointer-events-none border border-iron/60"
        >
          <span className="block font-semibold mb-0.5">{tool.label}</span>
          <span className="block text-cream/80 leading-snug">{tool.def.desc}</span>
        </span>
      )}
    </button>
  );
}

interface ToolStripProps {
  layout?: "grid" | "rail" | "sheet";
  tools?: ToolEntry[];
  armedKey?: string | null;
  onUse?: (key: string) => void;
  onInspect?: (key: string) => void;
  grouped?: boolean;
  className?: string;
}

export default function ToolStrip({
  layout = "grid",
  tools = [],
  armedKey = null,
  onUse,
  onInspect,
  grouped = false,
  className = "",
}: ToolStripProps) {
  const armedTool = armedKey ? tools.find((t) => t.key === armedKey) : null;
  const anyArmed = !!armedTool;

  const renderCard = (tool: ToolEntry) => (
    <ToolCard
      key={tool.key}
      tool={tool}
      armed={tool.key === armedKey || !!tool.armed}
      dimmed={anyArmed}
      onUse={onUse}
      onInspect={onInspect}
    />
  );

  let body;
  if (layout === "rail") {
    body = (
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ touchAction: "pan-x", scrollbarWidth: "thin" }}
      >
        {tools.map((tool) => (
          <div key={tool.key} className="flex-shrink-0 w-[72px]">
            {renderCard(tool)}
          </div>
        ))}
      </div>
    );
  } else if (grouped) {
    const byCat = new Map<string, ToolEntry[]>();
    for (const t of tools) {
      const cat = t.category || "general";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(t);
    }
    body = (
      <div className="flex flex-col gap-2.5">
        {Array.from(byCat.entries()).map(([cat, list]) => (
          <div key={cat}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mid mb-1 px-0.5">
              {cat}
            </div>
            <div className={layout === "sheet" ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-1.5"}>
              {list.map(renderCard)}
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    const gridCls = layout === "sheet" ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-1.5";
    body = <div className={gridCls}>{tools.map(renderCard)}</div>;
  }

  return (
    <div className={className}>
      {body}
    </div>
  );
}
