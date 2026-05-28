import { svgState } from "./helpers.jsx";
import { PAL, Smoke, Steam, RoofTiles } from "./v2kit.jsx";

export default function BakeryIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, glow, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-54 -90 108 106" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="46" ry="5.5" fill="rgba(0,0,0,.28)" />
      <ellipse cx="0" cy="0" rx="38" ry="4" fill="rgba(255,190,100,.16)" />

      {/* stone foundation */}
      <rect x="-40" y="-7" width="80" height="7" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-36" y="-5" width="8" height="2.5" /><rect x="-20" y="-2.5" width="7" height="2.5" />
        <rect x="-5" y="-5" width="7" height="2.5" /><rect x="10" y="-2.5" width="8" height="2.5" />
        <rect x="22" y="-5" width="8" height="2.5" /><rect x="-34" y="-2.5" width="5" height="2" />
      </g>

      {/* --- CHIMNEY (rear-left) --- */}
      <rect x="-22" y="-76" width="12" height="30" fill={PAL.terracotta} />
      {/* chimney plaster band */}
      <rect x="-22" y="-60" width="12" height="14" fill="#c8987a" />
      {/* chimney cap */}
      <rect x="-24" y="-78" width="16" height="4" fill={PAL.terracottaDark} />
      {/* chimney course lines */}
      <g stroke={PAL.terracottaDark} strokeWidth=".5" opacity=".55">
        {[-72, -66, -60, -54, -50].map((y) => (
          <line key={y} x1="-22" y1={y} x2="-10" y2={y} />
        ))}
        <line x1="-16" y1="-76" x2="-16" y2="-60" />
      </g>

      {/* --- REAR WALL (visible above roof line on left) --- */}
      <rect x="-38" y="-46" width="76" height="39" fill={PAL.wallLight} />

      {/* wall shadow strip left side */}
      <rect x="-38" y="-46" width="14" height="39" fill={PAL.wallShadow} opacity=".55" />

      {/* horizontal plaster joints */}
      <g stroke={PAL.wallShadow} strokeWidth=".5" opacity=".28">
        {[-38, -28, -18].map((y) => (
          <line key={y} x1="-38" y1={y} x2="38" y2={y} />
        ))}
      </g>

      {/* wall top beam */}
      <rect x="-38" y="-46" width="76" height="3" fill={PAL.wallTop} />

      {/* --- ROOF (pitched, terracotta tiles) --- */}
      <defs><RoofTiles id="bakery-tiles" color={PAL.terracotta} /></defs>
      <polygon points="-44,-46 0,-72 44,-46" fill="url(#bakery-tiles)" />
      {/* left slope shadow */}
      <polygon points="-44,-46 0,-72 -18,-46" fill="rgba(0,0,0,.24)" />
      {/* eave beam */}
      <rect x="-44" y="-46" width="88" height="3.5" fill={PAL.eave} />
      {/* ridge cap */}
      <line x1="-8" y1="-72" x2="8" y2="-72" stroke={PAL.ridge} strokeWidth="2.5" />
      <rect x="-4" y="-73" width="8" height="2" rx=".5" fill={PAL.terracottaDark} />

      {/* --- WINDOW (left, warm light) --- */}
      <rect x="-30" y="-38" width="15" height="11" rx="1.5" fill="#1a1008" />
      <rect x="-29" y="-37" width="13" height="9" fill={lit}
        style={{ animation: 'flicker 3.4s ease-in-out infinite', transformOrigin: '-22px -32px' }} />
      {/* window cross */}
      <line x1="-22" y1="-37" x2="-22" y2="-28" stroke="#1a1008" strokeWidth=".8" />
      <line x1="-29" y1="-32" x2="-16" y2="-32" stroke="#1a1008" strokeWidth=".8" />
      {/* window sill */}
      <rect x="-31" y="-28" width="17" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* --- OVEN ARCH (front face, centre-right) --- */}
      {/* arch surround in terracotta */}
      <path d="M2,-7 L2,-28 a14,14 0 0 1 28,0 L30,-7 Z" fill={PAL.terracottaDark} />
      {/* oven interior */}
      <path d="M5,-7 L5,-26 a11,11 0 0 1 22,0 L27,-7 Z" fill="#1a0800" />
      {/* oven glow */}
      <ellipse cx="16" cy="-12" rx="10" ry="7" fill={glow} opacity=".65"
        style={{ animation: 'flicker 2.4s ease-in-out infinite', transformOrigin: '16px -12px' }} />
      {/* fire shape */}
      <g style={{ animation: 'flicker 1.8s ease-in-out infinite', transformOrigin: '16px -16px' }}>
        <path d="M8,-7 Q12,-18 16,-12 Q20,-18 24,-7 Z" fill="#c96030" />
      </g>
      <g style={{ animation: 'flicker 1.2s 0.3s ease-in-out infinite', transformOrigin: '16px -18px' }}>
        <path d="M11,-7 Q14,-16 16,-12 Q18,-16 21,-7 Z" fill="#ffb040" />
      </g>
      {/* arch keystone */}
      <path d="M2,-28 a14,14 0 0 1 28,0" fill="none" stroke={PAL.terracottaDark} strokeWidth="2.5" />
      <ellipse cx="16" cy="-28" rx="3.5" ry="2.2" fill={PAL.stone} />

      {/* --- DOOR (left side) --- */}
      <path d="M-14,-7 L-14,-24 a8,8 0 0 1 16,0 L2,-7 Z" fill={PAL.timber} />
      <path d="M-12,-7 L-12,-22 a6,6 0 0 1 12,0 L0,-7 Z" fill="#3a2010" />
      {/* door handle */}
      <circle cx="-2" cy="-15" r="1.4" fill={PAL.brass} />

      {/* --- STEAM from oven --- */}
      {detail !== 'low' && (
        <g>
          <Steam x={10} y={-32} scale={0.7} count={3} />
          <Steam x={18} y={-32} scale={0.6} count={2} />
          {/* chimney smoke */}
          <Smoke x={-16} y={-78} scale={1.0} count={4} dur={4.6} color="#e4d8c0" />
          <Smoke x={-14} y={-78} scale={0.75} count={3} dur={3.8} color="#c8b898" />
        </g>
      )}

      {/* --- BREAD LOAVES on sill --- */}
      {detail === 'high' && (
        <g>
          {/* sill ledge */}
          <rect x="-2" y="-10" width="36" height="3" rx=".5" fill={PAL.timberSoft} />
          {/* loaf 1 */}
          <g transform="translate(4 -12)">
            <ellipse cx="0" cy="0" rx="4.5" ry="2.5" fill="#c87840" />
            <ellipse cx="0" cy="-1" rx="3.5" ry="1.6" fill="#e8a050" />
            <path d="M-2,-2 Q0,-4 2,-2" fill="none" stroke="#c87840" strokeWidth=".6" />
          </g>
          {/* loaf 2 */}
          <g transform="translate(14 -12)">
            <ellipse cx="0" cy="0" rx="4" ry="2.2" fill="#ba6c30" />
            <ellipse cx="0" cy="-0.8" rx="3" ry="1.4" fill="#d8944a" />
            <path d="M-1.5,-1.5 Q0,-3.5 1.5,-1.5" fill="none" stroke="#ba6c30" strokeWidth=".5" />
          </g>
          {/* loaf 3 — small bun */}
          <g transform="translate(23 -11)">
            <ellipse cx="0" cy="0" rx="3" ry="2" fill="#c07030" />
            <ellipse cx="0" cy="-0.6" rx="2.2" ry="1.3" fill="#d8904a" />
          </g>
          {/* flour dust on sill */}
          <g fill="#f8f4ea" opacity=".6">
            <circle cx="8" cy="-8" r=".7" /><circle cx="12" cy="-7.5" r=".5" />
            <circle cx="19" cy="-8" r=".6" /><circle cx="27" cy="-7.5" r=".5" />
          </g>
        </g>
      )}

      {/* --- HANGING SIGN --- */}
      {detail === 'high' && (
        <g transform="translate(-38 -35)">
          {/* sign arm */}
          <rect x="0" y="-2" width="9" height="1.5" fill={PAL.timber} />
          <rect x="0" y="-2" width="1.5" height="8" fill={PAL.timber} />
          {/* sign board */}
          <rect x="4" y="0" width="14" height="9" rx="1" fill="#f5e8c0" />
          <rect x="4" y="0" width="14" height="9" rx="1" fill="none" stroke={PAL.timber} strokeWidth=".8" />
          {/* pretzel icon on sign */}
          <path d="M9,5 Q8,2 11,2 Q14,2 13,5 Q12,7 11,6 Q10,5 11,4 Q12,3 13,5" fill="none" stroke="#8a4a18" strokeWidth="1" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
