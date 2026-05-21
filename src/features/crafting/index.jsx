import { useEffect, useRef, useState } from "react";
import { RECIPES, ITEMS, recipeCraftMs } from "../../constants.js";
import { DECORATIONS } from "../decorations/data.js";
import { effectiveRecipeInputs } from "./slice.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { locBuilt } from "../../locBuilt.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  CostGrid,
  DetailActionButton,
  DetailPane,
} from "../../ui/primitives/BrowserDetail.jsx";

export const viewKey = "crafting";

function LockGlyph({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const STATION_META = {
  bakery:   { label: "Bakery",   iconKey: "station_bakery",   bg: "#8a4a26" },
  forge:    { label: "Forge",    iconKey: "station_forge",    bg: "#5a6973" },
  larder:   { label: "Larder",   iconKey: "station_larder",   bg: "#4f6b3a" },
  workshop: { label: "Workshop", iconKey: "station_workshop", bg: "#6a5a3a" },
  decor:    { label: "Decor",    iconKey: "station_decor",    bg: "#7a3a8a" },
};

// Ordered list of all stations (decor appended)
const STATION_ORDER = ["bakery", "larder", "forge", "workshop", "decor"];

function stationBuilt(built, station) {
  return !!(built && built[station]);
}

function canCraft(recipe, inputs, inventory, built, level) {
  if (recipe.tier === 2 && level < 3) return false;
  if (!stationBuilt(built, recipe.station)) return false;
  for (const [res, need] of Object.entries(inputs)) {
    if ((inventory[res] || 0) < need) return false;
  }
  return true;
}

function RecipeBrowserItem({ recipeKey, recipe, selected, inventory, built, level, craftedTotals, state, onSelect }) {
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const craftable = canCraft(recipe, inputs, inventory, built, level);
  const stationOk = stationBuilt(built, recipe.station);
  const levelOk = !(recipe.tier === 2 && level < 3);
  const timesBuilt = (craftedTotals || {})[recipeKey] || 0;

  const itemDef = ITEMS[recipe.item] || {};
  const itemName = itemDef.label || recipe.item;

  return (
    <BrowserItemButton
      selected={selected}
      muted={!craftable}
      icon={<Icon iconKey={recipe.item} size={36} />}
      title={itemName}
      subtitle={!levelOk ? "Level 3" : !stationOk ? "No station" : craftable ? "Ready" : "Missing inputs"}
      count={timesBuilt > 0 ? `x${timesBuilt}` : null}
      onClick={onSelect}
      aria-label={`View recipe ${itemName}`}
    />
  );
}

function RecipeDetail({ recipeKey, recipe, inventory, built, level, state, dispatch }) {
  if (!recipe) return <DetailPane empty="Select a recipe to inspect it." />;
  const inputs = effectiveRecipeInputs(state, recipeKey, recipe.inputs);
  const craftable = canCraft(recipe, inputs, inventory, built, level);
  const stationOk = stationBuilt(built, recipe.station);
  const levelOk = !(recipe.tier === 2 && level < 3);
  const itemDef = ITEMS[recipe.item] || {};
  const itemName = itemDef.label || recipe.item;
  const entries = Object.entries(inputs).map(([res, need]) => ({
    key: res,
    label: ITEMS[res]?.label || res,
    amount: need,
    have: (inventory || {})[res] || 0,
    showHave: true,
    check: true,
    ok: ((inventory || {})[res] || 0) >= need,
  }));
  const rawChanged = Object.entries(inputs).some(([res, need]) => need !== recipe.inputs[res]);

  return (
    <DetailPane
      eyebrow={STATION_META[recipe.station]?.label ?? recipe.station}
      title={itemName}
      status={!levelOk ? "Requires level 3" : !stationOk ? "Station not built" : craftable ? "Ready to craft" : "Missing inputs"}
      description={recipe.desc || itemDef.desc}
      icon={<Icon iconKey={recipe.item} size={64} />}
      actions={
        <>
          <DetailActionButton
            tone="moss"
            disabled={!craftable}
            onClick={() => dispatch({ type: "CRAFTING/CRAFT_RECIPE", payload: { key: recipeKey }, recipeKey })}
          >
            Craft
          </DetailActionButton>
          <DetailActionButton
            tone="iron"
            variant="soft"
            disabled={!craftable}
            title={`Queue — ready in ${fmtDuration(recipeCraftMs(recipeKey))} (or skip with a gem)`}
            onClick={() => dispatch({ type: "CRAFTING/QUEUE_RECIPE", payload: { key: recipeKey }, recipeKey })}
          >
            Queue {fmtDuration(recipeCraftMs(recipeKey))}
          </DetailActionButton>
        </>
      }
    >
      <CostGrid entries={entries} title={rawChanged ? "Inputs after worker bonuses" : "Inputs"} />
      {itemDef.value != null && itemDef.kind !== "tool" && (
        <div className="hl-well">
          <div className="hl-section-label">Sell value</div>
          <div className="hl-heading">+{itemDef.value} coins</div>
        </div>
      )}
      {itemDef.kind === "tool" && (
        <div className="hl-well">
          <div className="hl-section-label">Output</div>
          <div className="hl-text-dim">Adds one {itemName} to your tools.</div>
        </div>
      )}
    </DetailPane>
  );
}

// Phase 5 — sequential crafting queue panel shown atop the crafting screen.
// Visual model: the queue's HEAD is the actively-crafting item (big card with
// animated progress, claim/skip buttons). Subsequent entries are "up next" —
// muted, with a relative "starts in" countdown.
function fmtDuration(ms) {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${m}m`;
  return `${s}s`;
}

function ActiveCraftCard({ entry, recipe, now, gems, dispatch }) {
  const itemDef = ITEMS[recipe?.item] || {};
  const itemName = itemDef.label ?? recipe?.item ?? entry.key;
  const start = entry.startAt ?? entry.queuedAt ?? now;
  const ready = entry.readyAt ?? start;
  const duration = entry.durationMs ?? Math.max(1, ready - start);
  const elapsed = Math.max(0, Math.min(duration, now - start));
  const remaining = Math.max(0, ready - now);
  const pct = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;
  const isReady = remaining <= 0;

  return (
    <div
      className={`relative rounded-xl border bg-[var(--card-bg)] px-3 py-2.5 ${isReady ? "craft-ready-card" : "craft-active-card"}`}
      style={{ borderColor: isReady ? "rgba(143,199,64,0.7)" : "var(--card-border)" }}
      aria-label={`Now crafting ${itemName}, ${isReady ? "ready to claim" : `${fmtDuration(remaining)} remaining`}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0 grid place-items-center" style={{ width: 52, height: 52 }}>
          <Icon iconKey={recipe?.item ?? entry.key} size={48} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] uppercase tracking-wide font-bold text-on-panel-faint">Now crafting</span>
              <span className="text-[13px] font-bold text-on-panel truncate">{itemName}</span>
            </div>
            {isReady ? (
              <span className="craft-ready-badge text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#5e8c1e", color: "#fff" }}>
                READY
              </span>
            ) : (
              <span className="text-[10px] tabular-nums font-bold text-on-panel-faint">
                <span className="text-on-panel">{fmtDuration(remaining)}</span>
                <span className="opacity-60"> / {fmtDuration(duration)}</span>
              </span>
            )}
          </div>
          <div className="craft-progress mt-1.5">
            <div
              className={`craft-progress-fill ${isReady ? "craft-progress-fill--ready" : ""}`}
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
            {!isReady && <div className="craft-progress-shine" aria-hidden />}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <button
              disabled={!isReady}
              onClick={() => dispatch({ type: "CRAFTING/CLAIM_CRAFT", payload: { idx: 0 } })}
              className="hl-btn hl-btn--sm hl-btn--go flex-1"
              aria-label={`Claim ${itemName}`}
            >Claim</button>
            {!isReady && (
              <button
                disabled={(gems ?? 0) < 1}
                onClick={() => dispatch({ type: "CRAFTING/SKIP_CRAFT", payload: { idx: 0 } })}
                title={(gems ?? 0) < 1 ? "Need a gem to skip" : "Spend a gem to finish now"}
                className="hl-btn hl-btn--sm hl-btn--ghost"
                aria-label={`Skip ${itemName} with a gem`}
              >
                <span className="inline-flex items-center gap-1">Skip <DesignIcon iconKey="design.currency.gem" size={10} /></span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueuedCraftRow({ entry, now, position }) {
  const recipe = RECIPES[entry.key];
  const itemDef = ITEMS[recipe?.item] || {};
  const itemName = itemDef.label ?? recipe?.item ?? entry.key;
  const start = entry.startAt ?? now;
  const duration = entry.durationMs ?? Math.max(1, (entry.readyAt ?? start) - start);
  const startsIn = Math.max(0, start - now);
  return (
    <div
      className="craft-queue-row flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5"
      style={{ opacity: 0.78 }}
      aria-label={`Queued ${itemName}, starts in ${fmtDuration(startsIn)}, takes ${fmtDuration(duration)}`}
    >
      <span className="text-[10px] font-bold text-on-panel-faint w-4 text-center tabular-nums">{position}</span>
      <Icon iconKey={recipe?.item ?? entry.key} size={24} />
      <span className="text-[12px] font-bold text-on-panel flex-1 min-w-0 truncate">{itemName}</span>
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[9px] uppercase tracking-wide text-on-panel-faint">Starts in</span>
        <span className="text-[10px] font-bold tabular-nums text-on-panel">{fmtDuration(startsIn)}</span>
      </div>
      <span className="text-[9px] text-on-panel-faint tabular-nums w-12 text-right">{fmtDuration(duration)}</span>
    </div>
  );
}

function CraftQueuePanel({ queue, gems, dispatch }) {
  // 1s tick drives the countdown text + lets the CSS `transition: width 1s linear`
  // on the progress bar fill smoothly between updates. We pause when the queue
  // is empty to avoid a phantom timer.
  const [now, setNow] = useState(() => Date.now());
  const hasQueue = !!(queue && queue.length > 0);
  useEffect(() => {
    if (!hasQueue) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasQueue]);

  if (!hasQueue) return null;

  const head = queue[0];
  const tail = queue.slice(1);
  const headRecipe = RECIPES[head.key];
  const totalRemaining = Math.max(0, (queue[queue.length - 1].readyAt ?? now) - now);

  return (
    <div className="bg-[var(--panel-toolbar)] border-b border-[var(--panel-divider)] px-3 py-2.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="hl-section-label flex items-center gap-1.5">
          <IconCanvas iconKey="station_workshop" size={14} />
          <span>Workshop · {queue.length} {queue.length === 1 ? "item" : "items"}</span>
        </div>
        <div className="text-[10px] text-on-panel-faint tabular-nums">
          Total: <span className="font-bold text-on-panel">{fmtDuration(totalRemaining)}</span>
        </div>
      </div>

      <ActiveCraftCard
        entry={head}
        recipe={headRecipe}
        now={now}
        gems={gems}
        dispatch={dispatch}
      />

      {tail.length > 0 && (
        <>
          <div className="hl-section-label mt-2 mb-1">Up next</div>
          <div className="flex flex-col gap-1">
            {tail.map((entry, i) => (
              <QueuedCraftRow
                key={`${entry.key}-${entry.queuedAt}-${i}`}
                entry={entry}
                now={now}
                position={i + 2}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function canAffordDecor(decor, state) {
  const { cost } = decor;
  if ((state.coins ?? 0) < (cost.coins ?? 0)) return false;
  const inv = state.inventory ?? {};
  for (const [k, v] of Object.entries(cost)) {
    if (k === "coins") continue;
    if ((inv[k] ?? 0) < v) return false;
  }
  return true;
}

function DecorIcon({ decor, size = 42 }) {
  const decorIconKey = `decor_${decor.id}`;
  if (hasIcon(decorIconKey)) {
    return <IconCanvas iconKey={decorIconKey} size={size} />;
  }
  return (
    <span className="text-lg font-bold" aria-hidden="true">
      {decor.name.slice(0, 1)}
    </span>
  );
}

function decorCostEntries(decor, state) {
  const inv = state.inventory ?? {};
  return Object.entries(decor.cost ?? {}).map(([key, amount]) => ({
    key,
    label: key === "coins" ? "Coins" : ITEMS[key]?.label || key,
    amount,
    have: key === "coins" ? (state.coins ?? 0) : (inv[key] ?? 0),
    showHave: true,
    check: true,
    ok: key === "coins" ? (state.coins ?? 0) >= amount : (inv[key] ?? 0) >= amount,
  }));
}

function DecorationBrowserItem({ decor, state, selected, onSelect }) {
  const affordable = canAffordDecor(decor, state);
  const count = locBuilt(state).decorations?.[decor.id] ?? 0;
  return (
    <BrowserItemButton
      selected={selected}
      muted={!affordable}
      icon={<DecorIcon decor={decor} size={38} />}
      title={decor.name}
      subtitle={affordable ? `+${decor.influence} influence` : "Missing cost"}
      count={count > 0 ? `x${count}` : null}
      onClick={onSelect}
      aria-label={`View decor ${decor.name}`}
    />
  );
}

function DecorationDetail({ decor, state, dispatch }) {
  if (!decor) return <DetailPane empty="Select decor to inspect it." />;
  const affordable = canAffordDecor(decor, state);
  const count = locBuilt(state).decorations?.[decor.id] ?? 0;

  return (
    <DetailPane
      eyebrow="Decor"
      title={decor.name}
      status={affordable ? "Ready to build" : "Missing cost"}
      description="Build this decoration at the current settlement to raise influence."
      icon={<DecorIcon decor={decor} size={64} />}
      actions={
        <DetailActionButton
          tone="moss"
          disabled={!affordable}
          onClick={() => dispatch({ type: "BUILD_DECORATION", payload: { id: decor.id } })}
        >
          Build
        </DetailActionButton>
      }
    >
      <div className="hl-well">
        <div className="hl-section-label">Owned here</div>
        <div className="hl-heading tabular-nums">{count}</div>
      </div>
      <div className="hl-well">
        <div className="hl-section-label">Influence</div>
        <div className="hl-heading">+{decor.influence}</div>
      </div>
      <CostGrid entries={decorCostEntries(decor, state)} title="Cost" />
    </DetailPane>
  );
}

export default function CraftingScreen({ state, dispatch }) {
  const { inventory = {}, level = 1, craftedTotals = {}, craftingTab } = state;
  const built = locBuilt(state);

  // Stations that exist (built or not) — always show all three tabs, but indicate built status
  const builtStations = STATION_ORDER.filter((s) => stationBuilt(built, s));

  // Active tab is URL-driven via state.craftingTab (the router projects it
  // onto `#/crafting/<station>`). When unset (first visit), default to the
  // first built station and back-fill craftingTab so the URL reflects it.
  const activeTab = (craftingTab && STATION_ORDER.includes(craftingTab))
    ? craftingTab
    : (builtStations[0] || STATION_ORDER[0]);

  const dispatchedDefaultRef = useRef(false);
  useEffect(() => {
    if (dispatchedDefaultRef.current) return;
    if (craftingTab && STATION_ORDER.includes(craftingTab)) return;
    dispatchedDefaultRef.current = true;
    dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: activeTab });
  }, [craftingTab, activeTab, dispatch]);

  const setActiveTab = (s) => dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: s });
  // RECIPES contains each recipe under multiple keys (canonical `rec_*` plus
  // legacy item-name aliases like `axe` for `rec_axe`). Insertion order puts
  // canonical keys first, so deduping by recipe identity keeps the `rec_*` key.
  const seenRecipes = new Set();
  const stationRecipes = Object.entries(RECIPES).filter(([, r]) => {
    if (!r || typeof r !== "object" || r.station !== activeTab) return false;
    if (seenRecipes.has(r)) return false;
    seenRecipes.add(r);
    return true;
  });
  const meta = STATION_META[activeTab];
  const [selectedRecipeKey, setSelectedRecipeKey] = useState(null);
  const [selectedDecorId, setSelectedDecorId] = useState(null);
  const selectedRecipeEntry = stationRecipes.find(([key]) => key === selectedRecipeKey) ?? stationRecipes[0] ?? null;
  const decorations = Object.values(DECORATIONS);
  const selectedDecor = decorations.find((decor) => decor.id === selectedDecorId) ?? decorations[0] ?? null;

  return (
    <FeaturePanel>
      {/* Phase 5 — sequential real-time craft queue panel */}
      <CraftQueuePanel queue={state.craftQueue} gems={state.gems} dispatch={dispatch} />

      {/* Station tabs */}
      <FeaturePanel.Tabs className="!flex-nowrap overflow-x-auto">
        {STATION_ORDER.map((s) => {
          const m = STATION_META[s];
          const isActive = activeTab === s;
          const isBuilt = s === "decor" ? true : stationBuilt(built, s);
          return (
            <FeaturePanel.Tab
              key={s}
              onClick={() => setActiveTab(s)}
              active={isActive}
              className="flex-shrink-0"
              style={isActive ? { backgroundColor: m.bg, borderColor: "rgba(255,255,255,0.2)" } : {}}
            >
              <span style={{ width: 22, height: 22, display: "inline-grid", placeItems: "center" }}>
                <IconCanvas iconKey={m.iconKey} size={22} />
              </span>
              <span>{m.label}</span>
              {!isBuilt && <span className="opacity-60"><LockGlyph size={10} /></span>}
            </FeaturePanel.Tab>
          );
        })}
      </FeaturePanel.Tabs>

      {/* Content for active tab */}
      {activeTab === "decor" ? (
        <FeaturePanel.Body>
          <BrowserDetailLayout
            browser={
              <BrowserGrid min={170}>
                {decorations.map((decor) => (
                  <DecorationBrowserItem
                    key={decor.id}
                    decor={decor}
                    state={state}
                    selected={selectedDecor?.id === decor.id}
                    onSelect={() => setSelectedDecorId(decor.id)}
                  />
                ))}
              </BrowserGrid>
            }
            detail={<DecorationDetail decor={selectedDecor} state={state} dispatch={dispatch} />}
          />
        </FeaturePanel.Body>
      ) : !stationBuilt(built, activeTab) ? (
        <div className="flex-1 grid place-items-center px-4">
          <p className="hl-empty">
            Build the {meta.label} in town to unlock these recipes.
          </p>
        </div>
      ) : (
        <FeaturePanel.Body>
          <BrowserDetailLayout
            browser={
              stationRecipes.length === 0 ? (
                <div className="hl-empty">No recipes at this station.</div>
              ) : (
                <BrowserGrid min={170}>
                  {stationRecipes.map(([key, recipe]) => (
                    <RecipeBrowserItem
                      key={key}
                      recipeKey={key}
                      recipe={recipe}
                      selected={selectedRecipeEntry?.[0] === key}
                      inventory={inventory}
                      built={built}
                      level={level}
                      craftedTotals={craftedTotals}
                      state={state}
                      onSelect={() => setSelectedRecipeKey(key)}
                    />
                  ))}
                </BrowserGrid>
              )
            }
            detail={
              <RecipeDetail
                recipeKey={selectedRecipeEntry?.[0]}
                recipe={selectedRecipeEntry?.[1]}
                inventory={inventory}
                built={built}
                level={level}
                state={state}
                dispatch={dispatch}
              />
            }
          />
        </FeaturePanel.Body>
      )}
    </FeaturePanel>
  );
}
