import { BOARD_ANIMATIONS } from "../../config/boardAnimations.js";
import { TOOL_POWERS, itemsWithToolPower } from "../../config/toolPowers.js";
import { COLORS, Card, Pill, hexToCss } from "../shared.jsx";

function TintSwatch({ tint }) {
  const empty = tint == null;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 9999,
        border: `1px solid ${COLORS.border}`,
        background: empty
          ? `repeating-linear-gradient(45deg, ${COLORS.parchmentDeep} 0 2px, ${COLORS.parchment} 2px 4px)`
          : hexToCss(tint),
        verticalAlign: "middle",
      }}
    />
  );
}

function BoardPresetTiming({ preset }) {
  const entry = preset ? BOARD_ANIMATIONS[preset] : null;
  if (!entry) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap mb-1">
      <span className="font-mono text-[11px]" style={{ color: COLORS.ink }}>
        {preset}
      </span>
      <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>
        ({entry.kind})
      </span>
      {Number.isFinite(entry.duration) && <Pill>duration: {entry.duration}ms</Pill>}
      {Number.isFinite(entry.staggerMs) && <Pill>stagger: {entry.staggerMs}ms</Pill>}
      {Number.isFinite(entry.settleMs) && <Pill>settle: {entry.settleMs}ms</Pill>}
      {Number.isFinite(entry.rotationHalfDeg) && (
        <Pill>rotation: ±{entry.rotationHalfDeg}°</Pill>
      )}
      {entry.ease && <Pill>ease: {entry.ease}</Pill>}
    </div>
  );
}

function wiredLabel(wired) {
  if (wired === "phaser") return "Phaser";
  if (wired === "reducer") return "Reducer";
  if (wired === "flag") return "Flag";
  return wired ?? "—";
}

function formatPowerParams(params) {
  if (!params || typeof params !== "object") return "—";
  const parts = Object.entries(params).map(([k, v]) => {
    const val = Array.isArray(v) ? `[${v.join(", ")}]` : String(v);
    return `${k}: ${val}`;
  });
  return parts.length ? parts.join(" · ") : "—";
}

function ItemAnimOverrides({ powerId }) {
  const items = itemsWithToolPower(powerId);
  if (!items.length) {
    return (
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        No tools declare <code className="font-mono">power.id="{powerId}"</code> in{" "}
        <code>ITEMS</code>.
      </div>
    );
  }
  return (
    <table className="w-full text-[11px] border-collapse" style={{ color: COLORS.inkSubtle }}>
      <thead>
        <tr style={{ color: COLORS.ink }}>
          <th className="text-left font-bold pb-1 pr-2">Item</th>
          <th className="text-left font-bold pb-1 pr-2">power.params</th>
          <th className="text-left font-bold pb-1 pr-2">anim</th>
          <th className="text-left font-bold pb-1">ms</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.key}>
            <td className="py-0.5 pr-2">
              <span style={{ color: COLORS.ember }}>{item.label}</span>
              <div className="font-mono text-[10px]">{item.key}</div>
            </td>
            <td className="py-0.5 pr-2 text-[10px]">{formatPowerParams(item.powerParams)}</td>
            <td className="py-0.5 pr-2 font-mono">{item.anim ?? "—"}</td>
            <td className="py-0.5 font-mono">{item.ms ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ToolPowersReferenceTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
          Catalog from <code>src/config/toolPowers.js</code> +{" "}
          <code>src/config/toolPowerBoardAnimation.js</code>. Board timing presets live in{" "}
          <code>src/config/boardAnimations.js</code> (preview on the Board animations tab). Per-item{" "}
          <code>anim</code> / <code>ms</code> on tool rows in <code>constants.js</code> are read-only on
          Inventory cards and listed below per power.
        </div>
      </Card>

      {TOOL_POWERS.map((power) => {
        const anim = power.animation;
        return (
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
                <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>
                  Config options
                </div>
                {(power.params?.length ?? 0) === 0 ? (
                  <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>No params.</div>
                ) : (
                  <ul className="text-[11px] list-disc pl-4" style={{ color: COLORS.inkSubtle }}>
                    {power.params.map((p) => (
                      <li key={p.key}>
                        <span className="font-mono" style={{ color: COLORS.ink }}>{p.key}</span>
                        {" "}({p.type}) — {p.label}
                        {p.default !== undefined && (
                          <>; default: <span className="font-mono">{String(p.default)}</span></>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>
                  Board animation
                </div>
                {anim?.summary ? (
                  <div className="text-[11px] mb-2" style={{ color: COLORS.inkSubtle }}>
                    {anim.summary}
                  </div>
                ) : (
                  <div className="text-[11px] italic mb-2" style={{ color: COLORS.inkSubtle }}>
                    No animation metadata.
                  </div>
                )}
                {anim?.boardPreset && (
                  <div className="mb-2">
                    <div className="text-[10px] uppercase mb-0.5" style={{ color: COLORS.ink }}>
                      Default preset
                    </div>
                    <BoardPresetTiming preset={anim.boardPreset} />
                  </div>
                )}
                {(anim?.variants?.length ?? 0) > 0 && (
                  <ul className="text-[11px] list-none pl-0 flex flex-col gap-2" style={{ color: COLORS.inkSubtle }}>
                    {anim.variants.map((v) => (
                      <li
                        key={v.label}
                        className="rounded border p-2"
                        style={{ borderColor: COLORS.border, background: COLORS.parchmentDeep }}
                      >
                        <div className="font-medium" style={{ color: COLORS.ink }}>
                          {v.label}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Pill>{wiredLabel(v.wired)}</Pill>
                          {v.boardPreset && (
                            <span className="font-mono text-[10px]">preset: {v.boardPreset}</span>
                          )}
                          {v.tint != null && (
                            <span className="inline-flex items-center gap-1 text-[10px]">
                              <TintSwatch tint={v.tint} />
                              tint 0x{v.tint.toString(16)}
                            </span>
                          )}
                        </div>
                        {v.boardPreset && v.boardPreset !== anim.boardPreset && (
                          <div className="mt-1">
                            <BoardPresetTiming preset={v.boardPreset} />
                          </div>
                        )}
                        {v.handler && (
                          <div className="font-mono text-[10px] mt-1">{v.handler}</div>
                        )}
                        {v.notes && <div className="text-[10px] mt-1 italic">{v.notes}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t" style={{ borderColor: COLORS.border }}>
              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>
                Tools using this power
              </div>
              <ItemAnimOverrides powerId={power.id} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
