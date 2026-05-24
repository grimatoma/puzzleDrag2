import { TOOL_POWERS } from "../../config/toolPowers.js";
import { COLORS, Card } from "../shared.jsx";

export default function ToolPowersReferenceTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
          Catalog of all tool powers from <code>src/config/toolPowers.js</code>. Tool powers are the active effects
          players trigger by spending a tool item (e.g. <code>clear_all</code>, <code>water_pump</code>).
          Contrast with Attributes, which are passive modifiers always active while their source is present.
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

          <div>
            <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Config options</div>
            {(power.params?.length ?? 0) === 0 ? (
              <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>No params.</div>
            ) : (
              <ul className="text-[11px] list-disc pl-4" style={{ color: COLORS.inkSubtle }}>
                {power.params.map((p) => (
                  <li key={p.key}>
                    <span className="font-mono" style={{ color: COLORS.ink }}>{p.key}</span>
                    {" "}({p.type}) — {p.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
