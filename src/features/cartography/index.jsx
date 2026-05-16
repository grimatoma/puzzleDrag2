import { useState, useEffect, useMemo, useRef } from "react";
import { MAP_NODES, KIND_LABELS } from "./data.js";
import { isAdjacent } from "./slice.js";
import { loreFor, HEARTH_TOKENS } from "./lore.js";
import PhaserMap from "./PhaserMap.jsx";
import {
  isSettlementFounded,
  settlementFoundingCost,
  settlementCompleted,
  isOldCapitalUnlocked,
  hearthTokenCount,
  settlementTypeForZone,
  settlementBiome,
  settlementKeeperPath,
  keeperReadyFor,
} from "../zones/data.js";
import { keeperForType } from "../../keepers.js";
import BiomePicker from "../zones/BiomePicker.jsx";
import useFocusTrap from "../../ui/primitives/useFocusTrap.js";

export const viewKey = "cartography";

// Zone kinds that can be founded (the rest — boss, event, festival, capital
// — never get a "Found settlement" affordance).
const SETTLEABLE_KINDS = new Set(["home", "farm", "mine", "fish"]);

// ─── Helpers ───────────────────────────────────────────────────────────────

function useIsPortrait() {
  const [portrait, setPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(orientation: portrait)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    mq.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return portrait;
}

function getNodeStatus(node, visitedSet, discoveredSet, current, playerLevel, oldCapitalUnlocked) {
  if (node.requiresHearthTokens) return oldCapitalUnlocked ? "capital-ready" : "capital-locked";
  if (node.id === current) return "current";
  if (visitedSet.has(node.id)) return "visited";
  if (discoveredSet.has(node.id)) {
    if (!isAdjacent(current, node.id)) return "discovered-unreachable";
    if (node.level > playerLevel) return "discovered-locked";
    return "discovered-ready";
  }
  return "hidden";
}

// ─── Keeper encounter modal (unchanged behaviour, light style polish) ──────

function KeeperEncounterModal({ node, type, dispatch, onClose }) {
  const keeper = keeperForType(type);
  const [chosen, setChosen] = useState(null);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, !!keeper, onClose);
  if (!keeper) { onClose(); return null; }
  const pick = (path) => {
    dispatch({ type: "KEEPER/CONFRONT", payload: { zoneId: node.id, path } });
    setChosen(path);
  };
  const info = chosen ? (chosen === "coexist" ? keeper.coexist : keeper.driveout) : null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/65 grid place-items-center p-3" onClick={chosen ? onClose : undefined}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${keeper.name} encounter`}
        tabIndex={-1}
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[18px] px-5 py-4 w-[min(460px,95vw)] max-h-[90vh] overflow-y-auto shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[26px] leading-none">{keeper.icon}</span>
          <div>
            <div className="font-bold text-[17px] text-[#744d2e] leading-tight">{keeper.name}</div>
            <div className="text-[11px] italic text-[#8a6a45]">{keeper.title} · at {node.name}</div>
          </div>
        </div>
        {!chosen ? (
          <>
            <div className="flex flex-col gap-1.5 text-[12px] text-[#3a2715] leading-snug mb-3">
              {keeper.intro.map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => pick("coexist")}
                className="text-left bg-[#dfeecd] hover:bg-[#e8f3d6] border-2 border-[#6a9a3a] rounded-xl px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13px] text-[#1f3a10]">🤝 Coexist</span>
                  <span className="text-[11px] font-bold text-[#6a4f10] bg-[#f2d98a] border border-[#b09a50] rounded-full px-2 py-0.5">+{keeper.coexist.embers ?? 0} 🔥 Embers</span>
                </div>
                <div className="text-[12px] text-[#3a4a20] mt-0.5">"{keeper.coexist.label}"</div>
              </button>
              <button
                onClick={() => pick("driveout")}
                className="text-left bg-[#e4ddd0] hover:bg-[#ece6da] border-2 border-[#9a8a6a] rounded-xl px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13px] text-[#3a2715]">⚔ Trial</span>
                  <span className="text-[11px] font-bold text-[#3a3e42] bg-[#cdd1d4] border border-[#8a8f95] rounded-full px-2 py-0.5">+{keeper.driveout.coreIngots ?? 0} ▣ Core Ingots</span>
                </div>
                <div className="text-[12px] text-[#4a3a2a] mt-0.5">"{keeper.driveout.label}"</div>
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-1.5 rounded-lg border border-[#e6c49a] text-[12px] transition-colors"
            >
              Not yet
            </button>
          </>
        ) : (
          <>
            <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${chosen === "coexist" ? "text-[#3a7a1a]" : "text-[#6a5a3a]"}`}>
              {chosen === "coexist" ? "🤝 You chose to coexist" : "⚔ Keeper trial started"}
            </div>
            <div className="flex flex-col gap-1.5 text-[12px] text-[#3a2715] leading-snug mb-3">
              {(info?.pitch ?? []).map((line, i) => <p key={i}>{line}</p>)}
              <p className="font-bold text-[#5a7a1a]">
                {chosen === "coexist"
                  ? `+${keeper.coexist.embers ?? 0} Embers added to your kingdom.`
                  : `Win the trial to claim ${keeper.driveout.coreIngots ?? 0} Core Ingots.`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#91bf24] hover:bg-[#a3d028] text-white font-bold py-2 rounded-lg border-2 border-white text-[13px] transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Side card pieces ──────────────────────────────────────────────────────

const cardStyle = {
  fontFamily: "'Newsreader', 'Times New Roman', serif",
  color: "#3a2715",
};

function StatusChip({ status, target, tokenCount = 0 }) {
  let bg, fg, text;
  switch (status) {
    case "current":               bg = "#c8a868"; fg = "#3a2715"; text = "◉ You are here"; break;
    case "visited":               bg = "#dfeecd"; fg = "#1f3a10"; text = "✓ Visited · fast-travel"; break;
    case "discovered-ready":      bg = "#f5e09a"; fg = "#3a2715"; text = "★ Ready to walk"; break;
    case "discovered-locked":     bg = "#e9c0a8"; fg = "#5a2a1a"; text = `🔒 Level ${target.level} required`; break;
    case "discovered-unreachable":bg = "#dccaa8"; fg = "#5a3a20"; text = "↯ No road from here"; break;
    case "capital-locked":        bg = "#e0d2a0"; fg = "#3a2c0e"; text = `🏛 Hearth-Tokens ${tokenCount}/3`; break;
    case "capital-ready":         bg = "#f4d65a"; fg = "#3a2c0e"; text = "🏛 The Ember awaits"; break;
    case "hidden":
    default:                      bg = "#cbb892"; fg = "#3a2715"; text = "Untraveled"; break;
  }
  return (
    <div
      className="rounded-full px-3 py-1 text-center"
      style={{ background: bg, border: "1.5px solid #7c4f2c", ...cardStyle, fontSize: 11, color: fg, fontWeight: 700 }}
    >
      {text}
    </div>
  );
}

function FoundSettlementBlock({ node, visitedSet, state, dispatch }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [keeperOpen, setKeeperOpen] = useState(false);
  if (!node || !SETTLEABLE_KINDS.has(node.kind)) return null;
  if (!visitedSet.has(node.id)) return null;

  if (isSettlementFounded(state, node.id)) {
    const done = settlementCompleted(state, node.id);
    const b = settlementBiome(state, node.id);
    const type = settlementTypeForZone(node.id);
    const keeper = type && keeperForType(type);
    const path = settlementKeeperPath(state, node.id);
    const ready = keeperReadyFor(state, node.id);
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className="rounded-lg px-2 py-1.5 text-center text-[11px] font-bold"
          style={{
            ...cardStyle,
            background: done ? "#a8d4a0" : "#cbe0b8",
            border: "1.5px solid #6a9a3a",
            color: "#1f3a10",
          }}
        >
          ✓ Settled{b ? ` · ${b.icon} ${b.name}` : ""}{done ? " · Complete" : ""}
        </div>
        {path && keeper && (
          <div
            className="rounded-lg px-2 py-1 text-center text-[10px] font-bold"
            style={{
              ...cardStyle,
              background: path === "coexist" ? "#dfeecd" : "#e4ddd0",
              border: "1.5px solid #9a8a6a",
              color: "#3a2715",
            }}
          >
            {path === "coexist" ? "🤝" : "⚔"} {keeper.name} · {path === "coexist" ? "Coexisting" : "Driven out"}
          </div>
        )}
        {ready && keeper && (
          <button
            onClick={() => setKeeperOpen(true)}
            className="rounded-lg px-2 py-1.5 text-center text-[11px] font-bold"
            style={{
              ...cardStyle,
              background: "linear-gradient(to bottom, #7a3a8a, #5a2a6a)",
              border: "2px solid #4a1a5a",
              color: "white",
              cursor: "pointer",
            }}
          >
            ⚔ Face {keeper.name}
          </button>
        )}
        {keeperOpen && keeper && (
          <KeeperEncounterModal node={node} type={type} dispatch={dispatch} onClose={() => setKeeperOpen(false)} />
        )}
      </div>
    );
  }

  const type = settlementTypeForZone(node.id);
  if (!type) return null;
  const cost = settlementFoundingCost(state).coins;
  const canAfford = (state?.coins ?? 0) >= cost;
  return (
    <>
      <button
        onClick={() => canAfford && setPickerOpen(true)}
        disabled={!canAfford}
        title={canAfford ? `Found ${node.name}` : `Need ${cost}◉ to found this settlement`}
        className="rounded-lg px-2 py-1.5 text-center text-[11px] font-bold"
        style={{
          ...cardStyle,
          background: canAfford ? "linear-gradient(to bottom, #c8923a, #a06a1a)" : "#cbb98c",
          border: canAfford ? "2px solid #7a4f10" : "2px solid #a08850",
          color: canAfford ? "white" : "#7c5a3a",
          cursor: canAfford ? "pointer" : "not-allowed",
          width: "100%",
        }}
      >
        🏗 Found this hearth · {cost}◉
      </button>
      {pickerOpen && (
        <BiomePicker node={node} type={type} cost={cost} dispatch={dispatch} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}

function ActionButton({ status, node, isCurrent, canFastTravel, canUnlock, onTravel }) {
  const base = {
    ...cardStyle,
    width: "100%",
    fontSize: 12,
    padding: "8px 10px",
    borderRadius: 10,
    textAlign: "center",
    fontWeight: 700,
    letterSpacing: "0.04em",
    lineHeight: 1.2,
  };
  if (isCurrent) {
    return (
      <div style={{ ...base, background: "#c8a868", border: "2px solid #a07840", color: "#3a2715" }}>
        Your hearth
      </div>
    );
  }
  if (canFastTravel) {
    return (
      <button
        onClick={onTravel}
        style={{
          ...base,
          background: "linear-gradient(to bottom, #5a8acc, #3a6aa8)",
          border: "2px solid #2a4a78",
          color: "white",
          cursor: "pointer",
        }}
      >
        ✈ FAST TRAVEL
      </button>
    );
  }
  if (canUnlock) {
    return (
      <button
        onClick={onTravel}
        style={{
          ...base,
          background: "linear-gradient(to bottom, #7a9f2a, #5a7a18)",
          border: "2px solid #4a6a10",
          color: "white",
          cursor: "pointer",
        }}
      >
        ★ WALK THE ROAD
      </button>
    );
  }
  if (status === "discovered-locked") {
    return (
      <div style={{ ...base, background: "#d4b585", border: "2px solid #b08040", color: "#9a3a2a" }}>
        Reach Level {node.level} first
      </div>
    );
  }
  if (status === "capital-locked") {
    return (
      <div style={{ ...base, background: "#e0d2a0", border: "2px solid #b09a50", color: "#5a4a1a", fontSize: 11 }}>
        Collect all three Hearth-Tokens
      </div>
    );
  }
  if (status === "capital-ready") {
    return (
      <div style={{ ...base, background: "#e6c95a", border: "2px solid #a88a2a", color: "#3a2c0e" }}>
        🏛 The Ember awaits — finale soon
      </div>
    );
  }
  if (status === "discovered-unreachable") {
    return (
      <div style={{ ...base, background: "#d4b585", border: "2px solid #b08040", color: "#7c4f2c", fontSize: 11 }}>
        Travel through a neighbour first
      </div>
    );
  }
  return (
    <div style={{ ...base, background: "#d4b585", border: "2px solid #b08040", color: "#7c4f2c" }}>
      Not yet on any chart
    </div>
  );
}

// ─── Empty side panel (shown before the player taps anything) ─────────────

function EmptyPanel() {
  return (
    <div
      className="flex flex-col items-start gap-1.5 px-3 py-3"
      style={{ ...cardStyle, color: "#3a2715" }}
    >
      <div className="font-bold text-[14px]">The Hearthwood</div>
      <div className="text-[12px] italic" style={{ color: "#5a3a20" }}>
        Smoke rises where the line keeps faith.
      </div>
      <div className="text-[11px] mt-1" style={{ color: "#5a3a20" }}>
        Tap a hearth, a sister-hold, or a quiet mark for its name and what waits there.
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 w-full" style={{ fontSize: 10 }}>
        <Legenda dot="#bb3b2f" stroke="#2a1a0a" label="Lit hearth" />
        <Legenda dot="#f5e09a" stroke="#f5e09a" label="Walkable road" glow />
        <Legenda dot="#8a6a50" stroke="#8a6a50" label="Untraveled" muted />
      </div>
    </div>
  );
}

function Legenda({ dot, stroke, label, glow = false, muted = false }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{
          width: 10, height: 10, borderRadius: "50%",
          background: dot, opacity: muted ? 0.5 : 1,
          border: `1.5px solid ${stroke}`,
          display: "inline-block",
          boxShadow: glow ? "0 0 6px #f5e09a" : "none",
        }}
      />
      <span style={{ color: "#5a3a20" }}>{label}</span>
    </div>
  );
}

// ─── The story-flavored side panel ─────────────────────────────────────────

function NodePanel({ node, current, visited, discovered, playerLevel, dispatch, state }) {
  const visitedSet    = useMemo(() => new Set(visited),    [visited]);
  const discoveredSet = useMemo(() => new Set(discovered), [discovered]);
  const capitalUnlocked = isOldCapitalUnlocked(state);
  const tokenCount = hearthTokenCount(state);
  const status = getNodeStatus(node, visitedSet, discoveredSet, current, playerLevel, capitalUnlocked);
  const isCurrent = status === "current";
  const canFastTravel = status === "visited";
  const canUnlock = status === "discovered-ready";
  const lore = loreFor(node.id);

  function handleTravel() {
    dispatch({ type: "CARTO/TRAVEL", nodeId: node.id });
  }

  const isHidden = status === "hidden";
  const showLore = !isHidden && lore;

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 h-full overflow-y-auto"
      style={{ ...cardStyle, color: "#3a2715" }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "#7c4f2c", fontWeight: 700 }}>
          {isHidden ? "Unknown territory" : (KIND_LABELS[node.kind] || node.kind)}
        </div>
        <div className="text-[18px] font-bold leading-tight">
          {isHidden ? "? ? ?" : node.name}
        </div>
        {!isHidden && lore?.subtitle && (
          <div className="text-[11px] italic" style={{ color: "#5a3a20" }}>
            {lore.subtitle}
          </div>
        )}
      </div>

      <StatusChip status={status} target={node} tokenCount={tokenCount} />

      {showLore && lore?.epitaph && (
        <figure
          className="relative px-3 py-2 mt-0.5 rounded-lg"
          style={{
            background: "rgba(245,231,192,0.55)",
            border: "1.5px solid #b28b62",
            borderLeft: "4px solid #b28b62",
          }}
        >
          <blockquote className="text-[12px] italic leading-snug">
            "{lore.epitaph}"
          </blockquote>
          {lore.speaker && (
            <figcaption className="mt-1 text-[10px]" style={{ color: "#7c4f2c" }}>
              — {lore.speaker}
            </figcaption>
          )}
        </figure>
      )}

      {!isHidden && Array.isArray(node.activities) && node.activities.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#7c4f2c" }}>
            What waits here
          </div>
          {node.activities.map((a, i) => (
            <div key={i} className="text-[11px]" style={{ color: "#3a2715" }}>
              • {a}
            </div>
          ))}
        </div>
      )}

      <FoundSettlementBlock node={node} visitedSet={visitedSet} state={state} dispatch={dispatch} />

      <div className="mt-auto pt-2">
        <ActionButton
          status={status} node={node}
          isCurrent={isCurrent} canFastTravel={canFastTravel} canUnlock={canUnlock}
          onTravel={handleTravel}
        />
      </div>
    </div>
  );
}

// ─── Hearth-Tokens strip (top of map) ──────────────────────────────────────

function HearthTokensStrip({ state }) {
  const earned = useMemo(() => {
    const h = state?.heirlooms ?? {};
    return {
      seed:  (h.seed ?? 0) > 0,
      iron:  (h.iron ?? 0) > 0,
      pearl: (h.pearl ?? 0) > 0,
    };
  }, [state?.heirlooms]);
  return (
    <div className="flex items-center gap-2">
      {HEARTH_TOKENS.map((t) => {
        const lit = earned[t.id];
        return (
          <div
            key={t.id}
            title={`${t.name} — ${t.source}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{
              background: lit ? "rgba(232,201,138,0.95)" : "rgba(58,39,21,0.45)",
              border: lit ? "1.5px solid #b28b62" : "1.5px solid #6a4b31",
              color: lit ? "#3a2715" : "#cbb892",
            }}
          >
            <span
              className="grid place-items-center rounded-full"
              style={{
                width: 16, height: 16,
                background: lit ? t.accent : "rgba(0,0,0,0.25)",
                border: lit ? "1px solid rgba(0,0,0,0.25)" : "1px dashed rgba(255,255,255,0.25)",
                fontSize: 9,
                color: lit ? "#1a0e08" : "#cbb892",
              }}
            >
              {lit ? t.glyph : "·"}
            </span>
            <span className="text-[10px] font-bold tracking-wide">
              {t.short}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Header bar ────────────────────────────────────────────────────────────

function HeaderBar({ currentNode, visitedCount, totalCount, state, onClose }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#b28b62]/40 gap-2">
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-[14px] text-[#3a2715] truncate">
          🗺 The Hearthwood
        </span>
        {currentNode && (
          <span className="text-[10px] italic text-[#5b3b20]/85 truncate">
            your smoke rises from {currentNode.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <HearthTokensStrip state={state} />
        <span className="text-[10px] text-[#5b3b20]/80 hidden sm:inline">
          {visitedCount} / {totalCount} known
        </span>
        <button
          onClick={onClose}
          aria-label="Close map"
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Legend (bottom strip) ─────────────────────────────────────────────────

function LegendBar() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 flex-shrink-0"
      style={{ borderTop: "2px solid #b08040", background: "#e8d4a8" }}
    >
      <Legenda dot="#bb3b2f" stroke="#2a1a0a" label="Lit hearth" />
      <Legenda dot="#f5e09a" stroke="#f5e09a" label="Ready to walk" glow />
      <Legenda dot="#bb3b2f" stroke="#9a3a2a" label="Level-locked" muted />
      <div className="flex items-center gap-1">
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="22" y2="3" stroke="#6a3a18" strokeWidth="3" />
        </svg>
        <span style={{ ...cardStyle, fontSize: 10, color: "#5a3a20" }}>Traveled road</span>
      </div>
      <div className="flex items-center gap-1">
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="22" y2="3" stroke="#c87a28" strokeWidth="2" strokeDasharray="3 2" />
        </svg>
        <span style={{ ...cardStyle, fontSize: 10, color: "#5a3a20" }}>Road waiting</span>
      </div>
    </div>
  );
}

// ─── Top-level screen ──────────────────────────────────────────────────────

export default function CartographyScreen({ state, dispatch }) {
  const {
    mapCurrent    = "home",
    mapVisited,
    mapDiscovered = ["home", "meadow", "orchard"],
    level         = 1,
  } = state;

  // Save migration: older saves don't have mapVisited.
  const visited = mapVisited || mapDiscovered;

  const isPortrait = useIsPortrait();

  // The "tapped" zone (panel target) lives in viewParams.zone so each zone
  // has its own URL path (`#/cartography/<zoneId>`). Bad ids are ignored.
  const tappedFromUrl = state.viewParams?.zone ?? null;
  const tapped = tappedFromUrl && MAP_NODES.some(n => n.id === tappedFromUrl) ? tappedFromUrl : null;
  const tappedNode = tapped ? MAP_NODES.find(n => n.id === tapped) : null;
  const currentNode = MAP_NODES.find(n => n.id === mapCurrent);

  // Build the snapshot the Phaser scene reads from. Memoise so the registry
  // only repaints when something material changes.
  const payload = useMemo(() => {
    const founded = {};
    const keeperPaths = {};
    for (const node of MAP_NODES) {
      if (isSettlementFounded(state, node.id)) founded[node.id] = true;
      const p = settlementKeeperPath(state, node.id);
      if (p) keeperPaths[node.id] = p;
    }
    return {
      current: mapCurrent,
      visited,
      discovered: mapDiscovered,
      level,
      founded,
      keeperPaths,
      tokenCount: hearthTokenCount(state),
      oldCapitalUnlocked: isOldCapitalUnlocked(state),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- state.settlements / heirlooms drive founded/keeperPaths/tokenCount
  }, [mapCurrent, visited, mapDiscovered, level, state.settlements, state.heirlooms]);

  function handleNodeTap(nodeId) {
    const next = nodeId === tapped ? null : nodeId;
    dispatch({ type: "SET_VIEW_PARAMS", params: { zone: next } });
  }

  // Side panel content
  const sidePanel = tappedNode ? (
    <NodePanel
      node={tappedNode}
      current={mapCurrent}
      visited={visited}
      discovered={mapDiscovered}
      playerLevel={level}
      dispatch={dispatch}
      state={state}
    />
  ) : (
    <EmptyPanel />
  );

  return (
    <div className="hl-panel">
      <HeaderBar
        currentNode={currentNode}
        visitedCount={visited.length}
        totalCount={MAP_NODES.length}
        state={state}
        onClose={() => dispatch({ type: "SET_VIEW", view: "town" })}
      />

      <div
        className="flex-1 flex flex-col m-2 rounded-xl overflow-hidden"
        style={{ border: "2px solid #b08040", background: "#d4b585" }}
      >
        <div className={`flex-1 flex min-h-0 ${isPortrait ? "flex-col" : "flex-row"}`}>
          {/* Map area — Phaser scene takes up the remaining space. */}
          <div
            className="relative min-w-0 min-h-0 flex-1"
            style={{ background: "#e8c98a" }}
          >
            <PhaserMap payload={payload} tapped={tapped} onNodeTap={handleNodeTap} />
          </div>

          {/* Side rail (landscape) / bottom card (portrait) */}
          <div
            className="flex-shrink-0 flex flex-col"
            style={
              isPortrait
                ? { width: "100%", maxHeight: "38%", borderTop: "2px solid #b08040", background: "#f0ddb5" }
                : { width: 280, borderLeft: "2px solid #b08040", background: "#f0ddb5" }
            }
          >
            {sidePanel}
          </div>
        </div>

        <LegendBar />
      </div>
    </div>
  );
}
