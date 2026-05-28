import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function BarnIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-64 -108 128 124" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <pattern id="barn-board" patternUnits="userSpaceOnUse" width="12" height="36">
          <rect width="12" height="36" fill={PAL.terracotta} />
          <rect x="0" y="0" width="11" height="17" fill="rgba(0,0,0,.06)" />
          <line x1="0" y1="0" x2="0" y2="36" stroke={PAL.terracottaDark} strokeWidth=".6" opacity=".45" />
          <line x1="6" y1="17" x2="6" y2="19" stroke={PAL.terracottaDark} strokeWidth=".4" opacity=".3" />
        </pattern>
        <pattern id="barn-roof-shingle" patternUnits="userSpaceOnUse" width="14" height="7">
          <rect width="14" height="7" fill={PAL.terracottaDark} />
          <path d="M0,6.5 Q3.5,4 7,6.5 T14,6.5" fill="none" stroke="rgba(0,0,0,.2)" strokeWidth="1.2" />
          <ellipse cx="3.5" cy="2.8" rx="4.2" ry="1.3" fill="rgba(255,255,255,.07)" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="58" ry="7" fill="rgba(0,0,0,.33)" />

      {/* stone foundation */}
      <rect x="-52" y="-8" width="104" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".52">
        <rect x="-48" y="-6" width="10" height="3" /><rect x="-30" y="-3" width="9" height="3" />
        <rect x="-10" y="-6" width="8" height="3" /><rect x="12"  y="-3" width="9" height="3" />
        <rect x="30"  y="-6" width="10" height="3" /><rect x="-42" y="-3" width="6" height="2" />
        <rect x="20"  y="-6" width="6" height="2" />
      </g>

      {/* === MAIN WALLS — wide red board-and-batten === */}
      <rect x="-50" y="-72" width="100" height="64" fill="url(#barn-board)" />
      {/* left shadow strip */}
      <rect x="-50" y="-72" width="16" height="64" fill={PAL.terracottaDark} opacity=".45" />
      {/* right light strip */}
      <rect x="38" y="-72" width="12" height="64" fill="rgba(255,255,255,.07)" />
      {/* wall top plate */}
      <rect x="-50" y="-72" width="100" height="4" fill={PAL.eave} />

      {/* === GAMBREL ROOF (two-slope hip) === */}
      {/* lower steep slopes — wide, nearly vertical */}
      {/* left lower slope */}
      <polygon points="-58,-72 -30,-88 -30,-72" fill="url(#barn-roof-shingle)" />
      <polygon points="-58,-72 -30,-88 -30,-72" fill="rgba(0,0,0,.32)" />
      {/* right lower slope */}
      <polygon points="58,-72 30,-88 30,-72" fill="url(#barn-roof-shingle)" />
      {/* upper shallower slopes */}
      {/* left upper slope */}
      <polygon points="-30,-88 0,-100 30,-88" fill="url(#barn-roof-shingle)" />
      {/* left upper slope shadow */}
      <polygon points="-30,-88 0,-100 -8,-88" fill="rgba(0,0,0,.26)" />
      {/* right upper slope */}
      <polygon points="30,-88 0,-100 30,-88" fill="url(#barn-roof-shingle)" />
      {/* eave beam across full width */}
      <rect x="-58" y="-72" width="116" height="4" fill={PAL.eave} />
      {/* break line between lower and upper slopes */}
      <line x1="-30" y1="-88" x2="30" y2="-88" stroke={PAL.eave} strokeWidth="3" />
      {/* ridge cap */}
      <rect x="-8" y="-101" width="16" height="3.5" rx=".8" fill={PAL.ridge} />
      {/* shadow line at ridge */}
      <line x1="-8" y1="-99.5" x2="8" y2="-99.5" stroke="rgba(0,0,0,.2)" strokeWidth="1.2" />

      {/* === VERTICAL BATTEN STRIPS === */}
      <g stroke={PAL.terracottaDark} strokeWidth="1.4" opacity=".55">
        {([-38, -26, -14, 14, 26, 38] as number[]).map((x) => (
          <line key={x} x1={x} y1="-72" x2={x} y2="-8" />
        ))}
      </g>
      {/* horizontal rail lines */}
      <g stroke={PAL.terracottaDark} strokeWidth=".7" opacity=".35">
        <line x1="-50" y1="-52" x2="50" y2="-52" />
        <line x1="-50" y1="-34" x2="50" y2="-34" />
      </g>

      {/* === WIDE X-BRACE DOUBLE DOORS (front center) === */}
      {/* door recess / shadow */}
      <rect x="-24" y="-68" width="48" height="60" fill={PAL.terracottaDark} opacity=".6" />
      {/* left door panel */}
      <rect x="-23" y="-67" width="22" height="59" rx=".5" fill="#5a2818" />
      {/* right door panel */}
      <rect x="1"  y="-67" width="22" height="59" rx=".5" fill="#5a2818" />
      {/* door border frames */}
      <rect x="-23" y="-67" width="22" height="59" fill="none" stroke={PAL.terracottaDark} strokeWidth="1.2" />
      <rect x="1"   y="-67" width="22" height="59" fill="none" stroke={PAL.terracottaDark} strokeWidth="1.2" />
      {/* X-brace on left door */}
      <line x1="-22" y1="-66" x2="-2" y2="-9"  stroke={PAL.eave} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
      <line x1="-2"  y1="-66" x2="-22" y2="-9" stroke={PAL.eave} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
      {/* X-brace on right door */}
      <line x1="2"   y1="-66" x2="22"  y2="-9"  stroke={PAL.eave} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
      <line x1="22"  y1="-66" x2="2"   y2="-9"  stroke={PAL.eave} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
      {/* center vertical divider */}
      <rect x="-1.5" y="-68" width="3" height="60" fill={PAL.eave} opacity=".9" />
      {/* door hinges */}
      <g fill={PAL.stoneShade}>
        <rect x="-23" y="-62" width="4" height="3" rx=".5" />
        <rect x="-23" y="-28" width="4" height="3" rx=".5" />
        <rect x="19" y="-62" width="4" height="3" rx=".5" />
        <rect x="19" y="-28" width="4" height="3" rx=".5" />
      </g>
      {/* door handles / barn door pull */}
      <rect x="-6" y="-42" width="4" height="8" rx="1.2" fill={PAL.stone} opacity=".9" />
      <rect x="2"  y="-42" width="4" height="8" rx="1.2" fill={PAL.stone} opacity=".9" />

      {/* === SMALL LOFT WINDOW above doors === */}
      <rect x="-9" y="-72" width="18" height="10" rx="1" fill="#13100a" />
      <rect x="-8" y="-71" width="16" height="8" fill="#2a2015" opacity=".8" />
      <line x1="0"  y1="-71" x2="0"  y2="-63" stroke="#13100a" strokeWidth=".8" />
      <line x1="-8" y1="-67" x2="8"  y2="-67" stroke="#13100a" strokeWidth=".8" />
      {/* loft window sill */}
      <rect x="-10" y="-63" width="20" height="2.5" rx=".5" fill={PAL.eave} />

      {/* === HAY BALE outside (right side) === */}
      {detail === 'high' && (
        <g transform="translate(44 -2)">
          <ellipse cx="3" cy="0" rx="14" ry="2.2" fill="rgba(0,0,0,.27)" />
          {/* bale body — rounded rect */}
          <rect x="-8" y="-12" width="20" height="12" rx="4" fill="#c8a040" />
          {/* bale face highlight */}
          <rect x="-6" y="-11" width="16" height="9" rx="3" fill="#d8b050" opacity=".6" />
          {/* twine bands */}
          <line x1="-4" y1="-12" x2="-4" y2="0" stroke="#8a7020" strokeWidth="1.4" opacity=".7" />
          <line x1="4"  y1="-12" x2="4"  y2="0" stroke="#8a7020" strokeWidth="1.4" opacity=".7" />
          {/* straw texture wisps */}
          <g stroke="#e8c058" strokeWidth=".7" opacity=".6">
            <line x1="-6" y1="-10" x2="-2" y2="-6" />
            <line x1="0"  y1="-11" x2="3"  y2="-8" />
            <line x1="5"  y1="-10" x2="8"  y2="-7" />
            <line x1="-3" y1="-7"  x2="0"  y2="-4" />
          </g>
        </g>
      )}

      {/* === HAY DUST MOTES near hay bale === */}
      {detail !== 'low' && (
        <g>
          {([
            { cx: 36, cy: -14, dur: 2.8, delay: 0   },
            { cx: 50, cy: -18, dur: 3.3, delay: 0.6 },
            { cx: 44, cy: -22, dur: 2.5, delay: 1.1 },
            { cx: 56, cy: -10, dur: 3.1, delay: 0.4 },
            { cx: 40, cy: -8,  dur: 2.9, delay: 1.5 },
            { cx: 52, cy: -26, dur: 3.5, delay: 0.9 },
          ]).map(({ cx, cy, dur, delay }, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i % 3 === 0 ? 1.1 : 0.7}
              fill="#e8c858"
              style={{
                animation: `bob ${dur}s ${delay}s ease-in-out infinite`,
                transformOrigin: `${cx}px ${cy}px`,
                opacity: 0.65,
              }}
            />
          ))}
        </g>
      )}

      {/* === SMALL FENCE POSTS on left side === */}
      {detail === 'high' && (
        <g>
          <rect x="-58" y="-18" width="3.5" height="18" rx=".7" fill={PAL.timberSoft} />
          <rect x="-58" y="-18.5" width="3.5" height="3" rx=".5" fill={PAL.timber} />
          <rect x="-52" y="-16" width="3.5" height="16" rx=".7" fill={PAL.timberSoft} />
          <rect x="-52" y="-16.5" width="3.5" height="3" rx=".5" fill={PAL.timber} />
          {/* top rail connecting them */}
          <rect x="-58" y="-16" width="9.5" height="2" rx=".5" fill={PAL.wallShadow} opacity=".8" />
          {/* bottom rail */}
          <rect x="-58" y="-10" width="9.5" height="2" rx=".5" fill={PAL.wallShadow} opacity=".7" />
        </g>
      )}
    </svg>
  );
}
