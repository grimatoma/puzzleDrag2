import Pill from "./Pill.jsx";

const LAYOUT_WRAP = {
  side:          "flex flex-col items-stretch gap-1.5 bg-bg-dark/90 border border-gold rounded-xl px-3 py-2",
  "overlay-top": "flex flex-col items-center gap-1.5 bg-bg-darkest/85 border border-gold rounded-xl px-4 py-2 shadow-lg",
  inline:        "flex flex-col items-center gap-1 px-2 py-1",
};

function ChipRow({ children, layout }) {
  const justify = layout === "side" ? "justify-center" : "justify-center";
  return <div className={`flex flex-wrap items-center gap-1.5 ${justify}`}>{children}</div>;
}

export default function ChainBadge({ layout = "side", chainInfo, className = "" }) {
  if (!chainInfo) return null;
  const { count = 0, doubled = false, upgrades = 0, nextTileProgress } = chainInfo;

  const wrapCls = [LAYOUT_WRAP[layout] || LAYOUT_WRAP.side, "tabular-nums", className].filter(Boolean).join(" ");

  return (
    <div className={wrapCls} aria-live="polite">
      <ChipRow layout={layout}>
        <Pill tone="gold" variant="solid" size="sm">
          <span className="font-bold">chain</span>
          <span className="ml-1 font-bold">{count}</span>
        </Pill>
        {doubled && (
          <Pill tone="ember" variant="solid" size="sm">
            <span className="font-bold">x2</span>
          </Pill>
        )}
        {upgrades > 0 && (
          <Pill tone="moss" variant="solid" size="sm">
            <span className="font-bold">+{upgrades}*</span>
          </Pill>
        )}
      </ChipRow>
      {nextTileProgress && nextTileProgress.threshold > 0 && (
        <div className="text-micro text-cream text-center tabular-nums">
          {nextTileProgress.current}/{nextTileProgress.threshold} {nextTileProgress.targetLabel}
        </div>
      )}
    </div>
  );
}
