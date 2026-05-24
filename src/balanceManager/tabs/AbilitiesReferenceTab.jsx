import { ABILITIES } from "../../config/abilities.js";
import { COLORS, Card } from "../shared.jsx";

function scopeLabel(scope = []) {
  return scope.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ");
}

function defaultValueLabel(param) {
  if (param.default === undefined) return "none";
  return String(param.default);
}

function techExplanation(ability) {
  return `Aggregated into channel \`${ability.channel}\` at trigger \`${ability.trigger}\` via \`applyAbilityToChannels\` using ability id \`${ability.id}\`.`;
}

export default function AbilitiesReferenceTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
          Catalog of all attributes from <code>src/config/abilities.js</code>. Use this as a reference for names, config fields,
          runtime trigger/channel behavior, and example instance payloads.
        </div>
      </Card>

      {ABILITIES.map((ability) => (
        <Card key={ability.id}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-[14px] font-bold" style={{ color: COLORS.ember }}>
                {ability.iconKey ? "🧩" : ""} {ability.name}
              </div>
              <div className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>
                {ability.id}
              </div>
            </div>
            <div className="text-[10px] px-2 py-1 rounded border" style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}>
              {scopeLabel(ability.scope)}
            </div>
          </div>

          <div className="text-[12px] italic mb-2" style={{ color: COLORS.inkSubtle }}>{ability.desc}</div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Config options</div>
              {(ability.params?.length ?? 0) === 0 ? (
                <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>No params.</div>
              ) : (
                <ul className="text-[11px] list-disc pl-4" style={{ color: COLORS.inkSubtle }}>
                  {ability.params.map((p) => (
                    <li key={p.key}>
                      <span className="font-mono" style={{ color: COLORS.ink }}>{p.key}</span>
                      {" "}({p.type}) — {p.label}; default: <span className="font-mono">{defaultValueLabel(p)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Technical (code)</div>
              <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>
                {techExplanation(ability)}
              </div>
              <div className="text-[11px] mt-1" style={{ color: COLORS.inkSubtle }}>
                Scope: <code>{scopeLabel(ability.scope)}</code> · Trigger: <code>{ability.trigger}</code>
              </div>
            </div>
          </div>

        </Card>
      ))}
    </div>
  );
}
