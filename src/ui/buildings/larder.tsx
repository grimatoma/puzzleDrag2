import { svgState } from "./helpers.jsx";
import { PAL, RoofTiles } from "./v2kit.jsx";

export default function LarderIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-50 -88 100 104" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <RoofTiles id="larder-tiles" color={PAL.terracotta} />
        {/* stone wall pattern */}
        <pattern id="larder-stone" patternUnits="userSpaceOnUse" width="16" height="8">
          <rect width="16" height="8" fill={PAL.stone} />
          <rect x="0" y="0" width="9" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <rect x="10" y="0" width="6" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <rect x="0" y="4" width="5" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <rect x="6" y="4" width="10" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="42" ry="5" fill="rgba(0,0,0,.28)" />
      <ellipse cx="0" cy="0" rx="34" ry="3.5" fill="rgba(200,160,80,.14)" />

      {/* stone foundation */}
      <rect x="-36" y="-7" width="72" height="7" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-32" y="-5" width="8" height="2.5" />
        <rect x="-18" y="-2.5" width="7" height="2.5" />
        <rect x="-3" y="-5" width="7" height="2.5" />
        <rect x="10" y="-2.5" width="8" height="2.5" />
        <rect x="22" y="-5" width="8" height="2.5" />
        <rect x="-28" y="-2.5" width="5" height="2" />
      </g>

      {/* === MAIN WALLS (stone) === */}
      {/* back wall visible above roof eave */}
      <rect x="-34" y="-60" width="68" height="53" fill="url(#larder-stone)" />
      {/* left shadow band */}
      <rect x="-34" y="-60" width="12" height="53" fill={PAL.stoneShade} opacity=".35" />
      {/* wall top cap */}
      <rect x="-34" y="-60" width="68" height="3" fill={PAL.wallTop} />

      {/* === ROOF (low-pitched, terracotta) === */}
      <polygon points="-38,-57 0,-75 38,-57" fill="url(#larder-tiles)" />
      {/* left slope shadow */}
      <polygon points="-38,-57 0,-75 -15,-57" fill="rgba(0,0,0,.22)" />
      {/* eave beam */}
      <rect x="-38" y="-57" width="76" height="3" fill={PAL.eave} />
      {/* ridge cap */}
      <line x1="-7" y1="-75" x2="7" y2="-75" stroke={PAL.ridge} strokeWidth="2.5" />
      <rect x="-3.5" y="-76" width="7" height="2" rx=".5" fill={PAL.terracottaDark} />

      {/* === HEAVY ARCH DOOR (centre, timber with iron fittings) === */}
      {/* arch surround in stone */}
      <path d="M-11,-7 L-11,-32 a11,11 0 0 1 22,0 L11,-7 Z" fill={PAL.stoneShade} />
      {/* timber door */}
      <path d="M-9,-7 L-9,-30 a9,9 0 0 1 18,0 L9,-7 Z" fill={PAL.timber} />
      {/* door planks */}
      <g stroke="#3a2010" strokeWidth=".6" opacity=".5">
        <line x1="-9" y1="-22" x2="9" y2="-22" />
        <line x1="-9" y1="-15" x2="9" y2="-15" />
        <line x1="-9" y1="-28" x2="9" y2="-28" />
      </g>
      {/* iron strap hinges */}
      <g fill="#2a2a2a">
        <rect x="-9" y="-30" width="6" height="1.8" rx=".4" />
        <rect x="-9" y="-22" width="5" height="1.6" rx=".4" />
        <rect x="-9" y="-14" width="6" height="1.6" rx=".4" />
      </g>
      {/* iron ring handle */}
      <circle cx="6" cy="-18" r="2.2" fill="none" stroke="#2a2a2a" strokeWidth="1.2" />
      <circle cx="6" cy="-18" r=".8" fill="#3a3a3a" />
      {/* arch keystone */}
      <ellipse cx="0" cy="-30" rx="3" ry="1.8" fill={PAL.stone} />

      {/* === NARROW WINDOW (left side, shelf of jars visible) === */}
      {/* window recess */}
      <rect x="-30" y="-46" width="14" height="18" rx="1" fill="#1a1410" />
      {/* cool interior (cold store) */}
      <rect x="-29" y="-45" width="12" height="16" fill="#2a2e36" />
      {/* shelf line inside */}
      <line x1="-29" y1="-37" x2="-17" y2="-37" stroke="#3a3020" strokeWidth=".8" />
      {/* jars on shelf (faint silhouettes) */}
      <g fill="#4a5060" opacity=".75">
        <ellipse cx="-26" cy="-38.5" rx="2" ry="2.8" />
        <ellipse cx="-22" cy="-38.5" rx="1.8" ry="3.2" />
        <ellipse cx="-18.5" cy="-38.5" rx="2" ry="2.5" />
      </g>
      {/* jar lids (amber glint) */}
      {detail === 'high' && (
        <g fill={lit} opacity=".55"
           style={{ animation: 'bob 4s ease-in-out infinite', transformOrigin: '-22px -42px' }}>
          <rect x="-28" y="-41.5" width="4" height="1.2" rx=".4" />
          <rect x="-24" y="-42" width="3.5" height="1.2" rx=".4" />
          <rect x="-20.5" y="-41" width="4" height="1.2" rx=".4" />
        </g>
      )}
      {/* window cross bars */}
      <line x1="-23" y1="-45" x2="-23" y2="-29" stroke="#1a1410" strokeWidth=".7" />
      <line x1="-29" y1="-37" x2="-17" y2="-37" stroke="#1a1410" strokeWidth=".7" />
      {/* window sill */}
      <rect x="-31" y="-29" width="16" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* === HOOK BAR ABOVE DOOR (iron rod for bundles) === */}
      <rect x="-14" y="-44" width="28" height="1.4" rx=".5" fill="#2a2a2a" />
      {/* hooks */}
      <path d="M-10,-44 Q-10,-41 -8,-40 Q-6,-41 -6,-44" fill="none" stroke="#2a2a2a" strokeWidth="1.2" />
      <path d="M-1,-44 Q-1,-41 1,-40 Q3,-41 3,-44" fill="none" stroke="#2a2a2a" strokeWidth="1.2" />
      <path d="M8,-44 Q8,-41 10,-40 Q12,-41 12,-44" fill="none" stroke="#2a2a2a" strokeWidth="1.2" />

      {/* === HANGING HERB BUNDLES (sway animation) === */}
      {detail === 'high' && (
        <g>
          {/* bundle 1 — lavender */}
          <g style={{ animation: 'sway 3.6s ease-in-out infinite', transformOrigin: '-8px -40px' }}>
            <line x1="-8" y1="-40" x2="-8" y2="-27" stroke="#6a7a2a" strokeWidth=".8" />
            <g transform="translate(-8 -27)">
              <ellipse cx="0" cy="0" rx="3.5" ry="5" fill="#8a8a4a" />
              <ellipse cx="0" cy="-1" rx="2.5" ry="3.8" fill="#aab050" />
              {/* stems */}
              <line x1="-1.5" y1="4" x2="-1.5" y2="-2" stroke="#6a7a2a" strokeWidth=".6" />
              <line x1="0" y1="4" x2="0" y2="-3" stroke="#5a6a20" strokeWidth=".6" />
              <line x1="1.5" y1="4" x2="1.5" y2="-2" stroke="#6a7a2a" strokeWidth=".6" />
              {/* tiny florets */}
              <circle cx="-2" cy="-3.5" r=".9" fill="#9868b0" />
              <circle cx="0" cy="-4.5" r=".9" fill="#a070c0" />
              <circle cx="2" cy="-3" r=".8" fill="#9060a8" />
            </g>
          </g>
          {/* bundle 2 — thyme/rosemary */}
          <g style={{ animation: 'sway 4.2s 0.6s ease-in-out infinite', transformOrigin: '1px -40px' }}>
            <line x1="1" y1="-40" x2="1" y2="-26" stroke="#5a6820" strokeWidth=".8" />
            <g transform="translate(1 -26)">
              <ellipse cx="0" cy="0" rx="3" ry="4.5" fill="#607030" />
              <ellipse cx="0" cy="-0.8" rx="2.2" ry="3.5" fill="#788840" />
              <line x1="-1" y1="4" x2="-1" y2="-2" stroke="#506020" strokeWidth=".5" />
              <line x1="0.5" y1="4" x2="0.5" y2="-2.5" stroke="#405018" strokeWidth=".5" />
              <line x1="1.8" y1="3.5" x2="1.8" y2="-1.5" stroke="#506020" strokeWidth=".5" />
            </g>
          </g>
          {/* bundle 3 — dried flowers */}
          <g style={{ animation: 'sway 3.2s 1.1s ease-in-out infinite', transformOrigin: '10px -40px' }}>
            <line x1="10" y1="-40" x2="10" y2="-28" stroke="#6a5030" strokeWidth=".8" />
            <g transform="translate(10 -28)">
              <ellipse cx="0" cy="0" rx="3" ry="4" fill="#8a6838" />
              <ellipse cx="0" cy="-0.8" rx="2.2" ry="3" fill="#a07840" />
              <circle cx="-1.5" cy="-4" r="1" fill="#c08040" />
              <circle cx="0.5" cy="-5" r="1.1" fill="#b87038" />
              <circle cx="2" cy="-3.5" r=".9" fill="#c08840" />
            </g>
          </g>
        </g>
      )}

      {/* === STONE CORNER QUOINS === */}
      <g fill={PAL.stoneShade} opacity=".55">
        <rect x="-34" y="-57" width="5" height="5" /><rect x="-34" y="-50" width="4" height="4" />
        <rect x="-34" y="-43" width="5" height="4" /><rect x="-34" y="-36" width="4" height="4" />
        <rect x="29" y="-57" width="5" height="5" /><rect x="30" y="-50" width="4" height="4" />
        <rect x="29" y="-43" width="5" height="4" /><rect x="30" y="-36" width="4" height="4" />
      </g>
    </svg>
  );
}
