import { BOARD_ANIMATIONS } from "../../config/boardAnimations.js";
import { TOOL_POWERS } from "../../config/toolPowers.js";
import { COLORS, Card, Pill } from "../shared.jsx";

function BoardPresetTiming({ animName }: { animName: string | null | undefined }) {
  const entry = animName ? (BOARD_ANIMATIONS as Record<string, unknown>)[animName] : null;
  if (!entry) return null;
  const e = entry as Record<string, number | string | undefined>;
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>
        Preset <span className="font-mono">{animName}</span> ({String(e.kind)})
      </span>
      {Number.isFinite(e.duration) && <Pill>duration: {e.duration}ms</Pill>}
      {Number.isFinite(e.staggerMs) && <Pill>stagger: {e.staggerMs}ms</Pill>}
      {e.ease && <Pill>ease: {e.ease}</Pill>}
    </div>
  );
}

function DefaultBoardAnimBlock({ anim }: { anim: { anim: string; ms: number } | null | undefined }) {
  if (!anim) {
    return (
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        No default board animation (state-only or deferred VFX).
      </div>
    );
  }
  return (
    <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>
      <span className="font-mono" style={{ color: COLORS.ink }}>{anim.anim}</span>
      {" "}· {anim.ms}ms
      <BoardPresetTiming animName={anim.anim} />
      <div className="text-[10px] italic mt-1">
        Starting point for new tools — override per item on the Inventory tab.
      </div>
    </div>
  );
}

export default function ToolPowersReferenceTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
          Catalog from <code>src/config/toolPowers.js</code>. Each power defines a{" "}
          <strong>default</strong> board <code>anim</code> / <code>ms</code>; individual tools can override
          on the Inventory tab when they share the same power (e.g. bird cage <code>cage</code> vs scythe{" "}
          <code>sweep</code>, both clearing tiles).
        </div>
      </Card>

      {TOOL_POWERS.map((power) => (
        <Card key={power.id}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-[14px] font-bold" style={{ color: COLORS.ember }}>
                {power.name}
              </div>
              <div className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>
                {power.id}
              </div>
            </div>
          </div>

          <div className="text-[12px] italic mb-2" style={{ color: COLORS.inkSubtle }}>{power.desc}</div>
          {power.note && (
            <div
              className="text-[11px] mb-2 px-2 py-1 rounded border"
              style={{ borderColor: COLORS.border, color: COLORS.inkSubtle, background: COLORS.parchmentDeep }}
            >
              {power.note}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Config options</div>
              {(power.params?.length ?? 0) === 0 ? (
                <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>No params.</div>
              ) : (
                <ul className="text-[11px] list-disc pl-4" style={{ color: COLORS.inkSubtle }}>
                  {power.params.map((p) => {
                    const pp = p as { key: string; label: string; type: string; default?: unknown };
                    return (
                      <li key={pp.key}>
                        <span className="font-mono" style={{ color: COLORS.ink }}>{pp.key}</span>
                        {" "}({pp.type}) — {pp.label}
                        {pp.default !== undefined && (
                          <>; default: <span className="font-mono">{String(pp.default)}</span></>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>
                Default board animation
              </div>
              <DefaultBoardAnimBlock anim={power.defaultBoardAnim} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
