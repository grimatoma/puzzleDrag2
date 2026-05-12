// ─── TownGround ─────────────────────────────────────────────────────────────
// The town's *plan* layer: a paved ground over the hills, the street network, a
// central plaza with a well, faint pads under each building lot, and a little
// street furniture (lampposts, a cart, a signpost, planters). Rendered as an
// SVG in the same 1100×600 design space as the rest of the Town view, sitting
// between the hills/decor backdrop and the building illustrations so the town
// reads as a planned settlement in a valley rather than scattered buildings.

// Floor / pavement colours per biome family (the streets themselves use the
// theme's `road` / `roadLine` so they tie into the existing palette).
function groundPalette(biomeVariant) {
  if (biomeVariant === "mine") {
    return { floor: "#6f6a62", floorEdge: "#5a564f", pave: "#8a857c", paveEdge: "#6a655d", grass: "#5e6450", shadow: "rgba(20,18,14,0.30)" };
  }
  return { floor: "#9a8c5e", floorEdge: "#7e7148", pave: "#b6aa80", paveEdge: "#8e8258", grass: "#6f9a44", shadow: "rgba(30,24,12,0.28)" };
}

function Well({ x, y, pal }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 10} rx={22} ry={9} fill={pal.shadow} />
      <ellipse cx={x} cy={y} rx={18} ry={9} fill="#7a6a4a" stroke="#5a4a30" strokeWidth="2.5" />
      <ellipse cx={x} cy={y} rx={12} ry={6} fill="#23323a" />
      <rect x={x - 16} y={y - 2} width="3.5" height="22" fill="#5a4a30" />
      <rect x={x + 12.5} y={y - 2} width="3.5" height="22" fill="#5a4a30" />
      <rect x={x - 19} y={y - 18} width="38" height="6" rx="2" fill="#6a4a26" />
      <polygon points={`${x - 22},${y - 16} ${x},${y - 30} ${x + 22},${y - 16}`} fill="#7a3a1c" />
      <polygon points={`${x - 22},${y - 16} ${x},${y - 30} ${x + 22},${y - 16}`} fill="none" stroke="#5a2810" strokeWidth="1.5" />
    </g>
  );
}

function Lamppost({ x, y, pal }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={7} ry={3} fill={pal.shadow} />
      <rect x={x - 1.5} y={y - 38} width="3" height="40" fill="#3a3630" />
      <rect x={x - 5} y={y - 44} width="10" height="9" rx="2" fill="#46423a" />
      <ellipse cx={x} cy={y - 39.5} rx="4.5" ry="3.5" fill="#ffe79a" opacity="0.92" />
      <ellipse cx={x} cy={y - 39.5} rx="9" ry="7" fill="#ffe79a" opacity="0.2" />
    </g>
  );
}

function Signpost({ x, y, pal }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={9} ry={3} fill={pal.shadow} />
      <rect x={x - 2} y={y - 30} width="4" height="32" fill="#6a4a26" />
      <rect x={x - 16} y={y - 30} width="22" height="9" rx="1.5" fill="#8a6a3a" stroke="#5a3a18" strokeWidth="1" />
      <rect x={x - 2} y={y - 18} width="20" height="8" rx="1.5" fill="#8a6a3a" stroke="#5a3a18" strokeWidth="1" />
    </g>
  );
}

function Cart({ x, y, pal }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 8} rx={26} ry={6} fill={pal.shadow} />
      <rect x={x - 22} y={y - 16} width="44" height="16" rx="2" fill="#7a5a32" stroke="#5a3e1e" strokeWidth="1.5" />
      <rect x={x - 22} y={y - 24} width="44" height="9" rx="2" fill="#9a7a44" opacity="0.85" />
      <circle cx={x - 13} cy={y + 2} r="7" fill="#3a2c18" stroke="#5a4426" strokeWidth="2" />
      <circle cx={x + 13} cy={y + 2} r="7" fill="#3a2c18" stroke="#5a4426" strokeWidth="2" />
      <rect x={x + 20} y={y - 12} width="14" height="3" rx="1.5" fill="#6a4a26" />
    </g>
  );
}

function Planter({ x, y, pal }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 5} rx={11} ry={3} fill={pal.shadow} />
      <rect x={x - 10} y={y - 4} width="20" height="10" rx="2" fill="#6a4a28" stroke="#4a3018" strokeWidth="1" />
      <ellipse cx={x - 4} cy={y - 6} rx="6" ry="5" fill={pal.grass} />
      <ellipse cx={x + 5} cy={y - 5} rx="5" ry="4" fill={pal.grass} />
      <circle cx={x - 5} cy={y - 8} r="2" fill="#f0c84a" />
      <circle cx={x + 4} cy={y - 8} r="2" fill="#e87878" />
    </g>
  );
}

const PROP_COMPONENTS = { well: Well, lamppost: Lamppost, signpost: Signpost, cart: Cart, planter: Planter };

export default function TownGround({ plan, theme, biomeVariant, builtLots }) {
  if (!plan) return null;
  const pal = groundPalette(biomeVariant);
  const road = theme?.road || pal.pave;
  const roadLine = theme?.roadLine || pal.paveEdge;
  const built = builtLots instanceof Set ? builtLots : new Set();

  return (
    <svg
      viewBox="0 0 1100 600"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      {/* Town floor — packed earth that the streets and buildings sit on. */}
      <path
        d={`M0,${plan.ground.top + 14} C220,${plan.ground.top - 6} 480,${plan.ground.top + 4} 700,${plan.ground.top + 10} C900,${plan.ground.top + 16} 1000,${plan.ground.top + 6} 1100,${plan.ground.top + 2} L1100,600 L0,600 Z`}
        fill={pal.floor}
      />
      <path
        d={`M0,${plan.ground.top + 14} C220,${plan.ground.top - 6} 480,${plan.ground.top + 4} 700,${plan.ground.top + 10} C900,${plan.ground.top + 16} 1000,${plan.ground.top + 6} 1100,${plan.ground.top + 2} L1100,${plan.ground.top + 30} C900,${plan.ground.top + 24} 700,${plan.ground.top + 28} 480,${plan.ground.top + 22} C220,${plan.ground.top + 12} 0,${plan.ground.top + 32} 0,${plan.ground.top + 32} Z`}
        fill={pal.floorEdge}
        opacity="0.5"
      />

      {/* Streets — paved bands with a faint centre line. */}
      {plan.streets.map((s, i) => (
        <g key={`s${i}`}>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={pal.paveEdge} strokeWidth={s.width + 5} strokeLinecap="round" opacity="0.55" />
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={road} strokeWidth={s.width} strokeLinecap="round" opacity="0.92" />
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={roadLine} strokeWidth="1.5" strokeDasharray="6 7" opacity="0.5" />
        </g>
      ))}

      {/* Central plaza — cobbled oval ringed in stone, with the well. */}
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx + 6} ry={plan.plaza.ry + 5} fill={pal.paveEdge} opacity="0.7" />
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx} ry={plan.plaza.ry} fill={pal.pave} />
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx} ry={plan.plaza.ry} fill="none" stroke={pal.paveEdge} strokeWidth="2" />
      {/* a hint of cobble rings */}
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx * 0.62} ry={plan.plaza.ry * 0.62} fill="none" stroke={pal.paveEdge} strokeWidth="1" opacity="0.4" />

      {/* Built lots get a soft shadow pad; empty lots get a faint dashed
          marker so the town reads as planned-but-not-yet-built rather than
          a field of dark patches. */}
      {plan.lots.map((l) => {
        const baseY = l.cy + l.h / 2 - 4;
        if (built.has(l.index) || l.row === "plaza") {
          return <ellipse key={`pad${l.index}`} cx={l.cx} cy={baseY} rx={l.w * 0.5} ry={Math.max(8, l.h * 0.12)} fill={pal.shadow} />;
        }
        const mw = l.w * 0.78, mh = Math.max(14, l.h * 0.22);
        return (
          <g key={`pad${l.index}`} opacity="0.55">
            <rect x={l.cx - mw / 2} y={baseY - mh} width={mw} height={mh} rx={4} fill={pal.pave} opacity="0.4" />
            <rect x={l.cx - mw / 2} y={baseY - mh} width={mw} height={mh} rx={4} fill="none" stroke={pal.paveEdge} strokeWidth="1.5" strokeDasharray="5 4" />
          </g>
        );
      })}

      {/* Street furniture. */}
      {plan.props.map((p, i) => {
        const C = PROP_COMPONENTS[p.kind];
        return C ? <C key={`p${i}`} x={p.x} y={p.y} pal={pal} /> : null;
      })}
    </svg>
  );
}
