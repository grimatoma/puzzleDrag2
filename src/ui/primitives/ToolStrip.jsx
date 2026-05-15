import { useRef, useState, useEffect } from "react";
import Icon from "./Icon.jsx";

const TAP_MAX_MS = 400;
const LONG_PRESS_MS = 500;
const HOVER_DWELL_MS = 1200;

function CancelGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CountBadge({ count }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-pill bg-bg-darker text-cream text-[11px] leading-none font-semibold tabular-nums border border-cream-soft pointer-events-none"
    >
      {count}
    </span>
  );
}

function ToolCard({ tool, armed, dimmed, onUse, onInspect }) {
  const tapStart = useRef(0);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const hoverTimer = useRef(null);
  const [tipOpen, setTipOpen] = useState(false);

  const isDisabled = (!armed && tool.disabled) || (!armed && tool.count === 0);

  useEffect(
    () => () => {
      clearTimeout(longPressTimer.current);
      clearTimeout(hoverTimer.current);
    },
    []
  );

  const beginPress = () => {
    tapStart.current = Date.now();
    longPressFired.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onInspect ? onInspect(tool.key) : setTipOpen(true);
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    clearTimeout(longPressTimer.current);
    const elapsed = Date.now() - tapStart.current;
    if (longPressFired.current) return;
    if (elapsed < TAP_MAX_MS) onUse?.(tool.key);
  };
  const cancelPress = () => {
    clearTimeout(longPressTimer.current);
    longPressFired.current = false;
  };

  const onContextMenu = (e) => {
    if (!onInspect) return;
    e.preventDefault();
    onInspect(tool.key);
  };

  const onMouseEnter = () => {
    if (onInspect) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setTipOpen(true), HOVER_DWELL_MS);
  };
  const onMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    setTipOpen(false);
  };

  const stateCls = armed
    ? "ring-2 ring-gold-bright bg-bg-frame border-cream-soft"
    : isDisabled
    ? "opacity-40 cursor-not-allowed border-iron/60 bg-bg-frame"
    : "border-cream-soft/60 bg-bg-frame hover:bg-bg-warm";

  const dimCls = dimmed && !armed ? "opacity-60" : "";

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-label={armed ? `Cancel ${tool.label}` : `Use ${tool.label}`}
      aria-pressed={armed}
      onMouseDown={beginPress}
      onMouseUp={endPress}
      onMouseLeave={(e) => {
        cancelPress();
        onMouseLeave(e);
      }}
      onMouseEnter={onMouseEnter}
      onTouchStart={beginPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      onTouchMove={cancelPress}
      onContextMenu={onContextMenu}
      className={`relative w-full min-h-tap rounded-md border-2 px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-colors text-cream ${stateCls} ${dimCls}`}
    >
      <Icon iconKey={tool.iconKey} size={28} />
      <span className="text-micro font-semibold leading-none text-center truncate w-full">
        {tool.label}
      </span>
      {typeof tool.count === "number" && tool.count > 0 && <CountBadge count={tool.count} />}
      {tipOpen && !onInspect && tool.def?.desc && (
        <span
          role="tooltip"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-40 bg-bg-darkest text-cream text-caption rounded-md px-2 py-1.5 shadow-lg pointer-events-none border border-cream-soft/40"
        >
          <span className="block font-semibold mb-0.5">{tool.label}</span>
          <span className="block text-cream/80 leading-snug">{tool.def.desc}</span>
        </span>
      )}
    </button>
  );
}

function CancelStrip({ armedTool, onCancel }) {
  if (!armedTool) return null;
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 mb-2 bg-bg-frame border border-gold-bright rounded-md">
      <span className="text-caption text-cream font-semibold truncate">
        Armed: {armedTool.label}
      </span>
      <button
        type="button"
        onClick={onCancel}
        aria-label={`Cancel ${armedTool.label}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg-darker text-cream text-caption font-semibold hover:bg-bg-darkest border border-cream-soft/50"
      >
        Cancel <CancelGlyph />
      </button>
    </div>
  );
}

export default function ToolStrip({
  layout = "grid",
  tools = [],
  armedKey = null,
  onUse,
  onInspect,
  grouped = false,
  className = "",
}) {
  const armedTool = armedKey ? tools.find((t) => t.key === armedKey) : null;
  const anyArmed = !!armedTool;

  const renderCard = (tool) => (
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
  } else if (grouped && layout !== "rail") {
    const byCat = new Map();
    for (const t of tools) {
      const cat = t.category || "general";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(t);
    }
    body = (
      <div className="flex flex-col gap-2.5">
        {Array.from(byCat.entries()).map(([cat, list]) => (
          <div key={cat}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-cream/70 mb-1 px-0.5">
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
      <CancelStrip armedTool={armedTool} onCancel={() => onUse?.(armedKey)} />
      {body}
    </div>
  );
}
