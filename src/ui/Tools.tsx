import { useEffect, useState } from "react";
import IconCanvas from "./IconCanvas.jsx";
import ToolStrip from "./primitives/ToolStrip.jsx";
import BottomSheet from "./primitives/BottomSheet.jsx";
import { TOOL_CATALOG, TOOL_BY_KEY, visibleTools, isTapTargetTool } from "./toolRegistry.js";
import { isFillBiasArmed } from "../state/fillBias.js";

export const TOOL_DEFS = TOOL_CATALOG;

function buildToolList(toolsState, { toolPending, fillBiasArmed }) {
  const tools = toolsState || {};
  return visibleTools(tools).map((def) => {
    const count = tools[def.key] || 0;
    const armed =
      toolPending === def.key ||
      (def.key === "fertilizer" && !!fillBiasArmed);
    return {
      key: def.key,
      iconKey: def.iconKey,
      label: def.name,
      count,
      category: def.category,
      def,
      disabled: count === 0 && !armed,
      armed,
    };
  });
}

function ToolInspectSheet({ tool, count, onClose, onUse }) {
  if (!tool) return null;
  const canUse = typeof count === "number" && count > 0;
  return (
    <BottomSheet
      open={!!tool}
      onClose={onClose}
      snapPoints={[0.4, 0.7]}
      initialSnap={0.4}
      title={tool.name}
      dismissible
    >
      <div className="flex flex-col items-center gap-3 pt-2">
        <div style={{ width: 64, height: 64 }}>
          <IconCanvas iconKey={tool.iconKey} size={64} />
        </div>
        <div className="text-body-lg text-ink text-center leading-relaxed">
          {tool.desc}
        </div>
        {isTapTargetTool(tool.key) && (
          <div className="text-caption font-bold text-ink-soft text-center">
            Tap a tile on the board to apply.
          </div>
        )}
        <button
          type="button"
          disabled={!canUse}
          onClick={() => { onUse?.(tool.key); onClose(); }}
          className={`mt-2 w-full font-bold py-2 rounded-md border text-body ${canUse ? "bg-ember hover:bg-ember-hot text-white border-ember-hot" : "bg-parchment-dim text-ink/40 border-iron/60 opacity-50 cursor-not-allowed"}`}
        >
          {canUse ? `Use (${count} left)` : "None left"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-transparent hover:bg-parchment-dim text-ink/70 font-semibold py-1.5 rounded-md border border-iron/40 text-caption"
        >
          Close
        </button>
      </div>
    </BottomSheet>
  );
}

// Mirrors the disarm rule in puzzleBoard.jsx: only one tool can be "selected"
// (armed or used) at a time. Picking up a different tool implicitly cancels
// whatever was previously armed. See disarmOtherTools there for the full
// rationale; fillBiasArmed is its own flag so re-dispatching USE_TOOL
// fertilizer is the disarm + refund path for it.
function disarmOtherTools(dispatch, key, state) {
  if (state?.toolPending && state.toolPending !== key) {
    dispatch({ type: "CANCEL_TOOL" });
  }
  if (state?.fillBiasArmed && key !== "fertilizer") {
    dispatch({ type: "USE_TOOL", key: "fertilizer" });
  }
}

function dispatchUseTool(dispatch, key, state) {
  const isPending = state.toolPending === key;
  if (isPending) {
    dispatch({ type: "CANCEL_TOOL" });
    return;
  }
  disarmOtherTools(dispatch, key, state);
  const def = TOOL_BY_KEY[key];
  if (def?.category === "magic") {
    dispatch({ type: "USE_TOOL", payload: { id: key } });
  } else {
    dispatch({ type: "USE_TOOL", key });
  }
  if (key === "shuffle") {
    dispatch({ type: "USE_TOOL", payload: { id: "shuffle" } });
    return;
  }
}

export function ToolsGrid({ tools, toolPending, fillBiasArmed, onUse, onInspectChange }) {
  const [inspectKey, setInspectKey] = useState(null);
  const list = buildToolList(tools, { toolPending, fillBiasArmed });
  const inspectTool = inspectKey ? TOOL_BY_KEY[inspectKey] : null;
  const inspectCount = inspectKey != null ? (tools?.[inspectKey] ?? 0) : 0;
  useEffect(() => {
    onInspectChange?.(inspectTool);
  }, [inspectTool, onInspectChange]);
  return (
    <>
      <ToolStrip
        layout="grid"
        tools={list}
        armedKey={toolPending}
        onUse={onUse}
        onInspect={(key) => setInspectKey(key)}
        grouped
      />
      <ToolInspectSheet
        tool={inspectTool}
        count={inspectCount}
        onClose={() => setInspectKey(null)}
        onUse={onUse}
      />
    </>
  );
}

export function MobileDock({ state, dispatch, onInspectChange }) {
  const [sheet, setSheet] = useState(null);
  const [inspectKey, setInspectKey] = useState(null);

  useEffect(() => {
    if (state.view === "board") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: clear local sheet + inspect state when leaving board view
    setSheet(null);
    setInspectKey(null);
  }, [state.view]);

  const totalTools = Object.entries(state.tools || {})
    .filter(([k, v]) => typeof v === "number" && v > 0 && TOOL_BY_KEY[k])
    .reduce((s, [, v]) => s + v, 0);
  const closeSheet = () => setSheet(null);
  const list = buildToolList(state.tools, {
    toolPending: state.toolPending,
    fillBiasArmed: isFillBiasArmed(state),
  });
  const inspectTool = inspectKey ? TOOL_BY_KEY[inspectKey] : null;
  const inspectCount = inspectKey != null ? (state.tools?.[inspectKey] ?? 0) : 0;
  useEffect(() => {
    onInspectChange?.(inspectTool);
  }, [inspectTool, onInspectChange]);

  return (
    <>
      <div className="flex border-t-2 border-iron bg-paper">
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative text-ink"
          onClick={() => setSheet(sheet === "tools" ? null : "tools")}
        >
          {totalTools > 0 && (
            <div className="absolute top-1.5 right-[calc(50%-14px)] bg-ember text-cream text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {totalTools}
            </div>
          )}
          <div style={{ width: 32, height: 32 }}>
            <IconCanvas iconKey="player_clear" size={32} />
          </div>
          <span className="text-[9px] font-bold">Tools</span>
        </button>
      </div>

      <BottomSheet
        open={sheet === "tools"}
        onClose={closeSheet}
        snapPoints={[0.5, 0.9]}
        initialSnap={0.5}
        title="Tools"
        dismissible
      >
        <ToolStrip
          layout="sheet"
          tools={list}
          armedKey={state.toolPending}
          onUse={(key) => {
            const willCancel = state.toolPending === key;
            dispatchUseTool(dispatch, key, state);
            if (!willCancel) closeSheet();
          }}
          onInspect={(key) => setInspectKey(key)}
          grouped
        />
      </BottomSheet>

      <ToolInspectSheet
        tool={inspectTool}
        count={inspectCount}
        onClose={() => setInspectKey(null)}
        onUse={(key) => {
          const willCancel = state.toolPending === key;
          dispatchUseTool(dispatch, key, state);
          if (!willCancel) closeSheet();
        }}
      />
    </>
  );
}
