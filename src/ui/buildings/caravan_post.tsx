import { svgState } from "./helpers.jsx";
import { PAL, RoofTiles } from "./v2kit.jsx";

export default function CaravanPostIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, glow, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-60 -100 120 116" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <RoofTiles id="caravan-tiles" color={PAL.terracotta} />
        {/* awning stripe pattern */}
        <pattern id="caravan-awning" patternUnits="userSpaceOnUse" width="12" height="40">
          <rect width="12" height="40" fill="#b03818" />
          <rect x="0" y="0" width="6" height="40" fill="#8a2810" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="54" ry="6" fill="rgba(0,0,0,.3)" />
      <ellipse cx="0" cy="0" rx="46" ry="4" fill="rgba(200,130,60,.14)" />

      {/* stone foundation */}
      <rect x="-48" y="-8" width="96" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-44" y="-6" width="10" height="3" />
        <rect x="-26" y="-3" width="9" height="3" />
        <rect x="-6" y="-6" width="8" height="3" />
        <rect x="10" y="-3" width="9" height="3" />
        <rect x="28" y="-6" width="10" height="3" />
        <rect x="-40" y="-3" width="6" height="2" />
        <rect x="16" y="-6" width="6" height="2" />
      </g>

      {/* === FLAG POLE (rear-left) === */}
      <rect x="-44" y="-95" width="2.5" height="58" fill={PAL.timber} />
      {/* pole cap */}
      <circle cx="-42.75" cy="-95" r="2" fill={PAL.brass} />
      {/* rope line */}
      <line x1="-42" y1="-93" x2="-42" y2="-40" stroke={PAL.timberSoft} strokeWidth=".5" opacity=".6" />

      {/* FLAG (waving animation) */}
      {detail !== 'low' && (
        <g style={{ animation: 'wave 2.6s ease-in-out infinite', transformOrigin: '-42px -92px' }}>
          <path d="M-42,-92 Q-28,-96 -20,-90 Q-28,-85 -42,-88 Z" fill="#c03020" />
          <line x1="-42" y1="-92" x2="-42" y2="-88" stroke="#900010" strokeWidth=".5" />
          {/* flag stripe highlight */}
          <path d="M-42,-92 Q-34,-95 -26,-91" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth=".8" />
        </g>
      )}

      {/* === MAIN BUILDING WALLS === */}
      {/* back wall */}
      <rect x="-46" y="-68" width="92" height="60" fill={PAL.wallLight} />
      {/* left shadow strip */}
      <rect x="-46" y="-68" width="16" height="60" fill={PAL.wallShadow} opacity=".45" />
      {/* horizontal plaster bands */}
      <g stroke={PAL.wallShadow} strokeWidth=".5" opacity=".3">
        <line x1="-46" y1="-50" x2="46" y2="-50" />
        <line x1="-46" y1="-35" x2="46" y2="-35" />
      </g>
      {/* wall top beam */}
      <rect x="-46" y="-68" width="92" height="3.5" fill={PAL.wallTop} />

      {/* === ROOF (pitched) === */}
      <polygon points="-50,-68 0,-90 50,-68" fill="url(#caravan-tiles)" />
      {/* left slope shadow */}
      <polygon points="-50,-68 0,-90 -20,-68" fill="rgba(0,0,0,.22)" />
      {/* eave beam */}
      <rect x="-50" y="-68" width="100" height="3.5" fill={PAL.eave} />
      {/* ridge cap */}
      <line x1="-8" y1="-90" x2="8" y2="-90" stroke={PAL.ridge} strokeWidth="2.5" />
      <rect x="-4" y="-91" width="8" height="2" rx=".5" fill={PAL.terracottaDark} />

      {/* === WIDE OVERHANGING AWNING === */}
      {/* awning frame: bracket arms */}
      <g stroke={PAL.timber} strokeWidth="1.8" opacity=".85">
        <line x1="-36" y1="-40" x2="-36" y2="-52" />
        <line x1="-36" y1="-52" x2="-50" y2="-52" />
        <line x1="0" y1="-40" x2="0" y2="-56" />
        <line x1="0" y1="-56" x2="-2" y2="-56" />
        <line x1="34" y1="-40" x2="34" y2="-52" />
        <line x1="34" y1="-52" x2="50" y2="-52" />
      </g>
      {/* awning canopy — trapezoid with stripes */}
      <path d="M-52,-52 L52,-52 L48,-40 L-48,-40 Z" fill="url(#caravan-awning)" />
      {/* awning shadow on wall */}
      <path d="M-48,-40 L48,-40 L46,-36 L-46,-36 Z" fill="rgba(0,0,0,.18)" />
      {/* awning valance (scalloped hem) */}
      <path d="M-48,-40 Q-44,-44 -40,-40 Q-36,-44 -32,-40 Q-28,-44 -24,-40 Q-20,-44 -16,-40 Q-12,-44 -8,-40 Q-4,-44 0,-40 Q4,-44 8,-40 Q12,-44 16,-40 Q20,-44 24,-40 Q28,-44 32,-40 Q36,-44 40,-40 Q44,-44 48,-40"
            fill="none" stroke="#8a2810" strokeWidth="1.5" />
      {/* awning front face */}
      <rect x="-50" y="-53" width="102" height="2" fill={PAL.eave} opacity=".7" />

      {/* === SHOP WINDOW (left of door) === */}
      <rect x="-38" y="-36" width="22" height="16" rx="1.5" fill="#1a1008" />
      <rect x="-37" y="-35" width="20" height="14" fill={lit}
        style={{ animation: 'flicker 3.8s ease-in-out infinite', transformOrigin: '-27px -28px' }} />
      <line x1="-27" y1="-35" x2="-27" y2="-21" stroke="#1a1008" strokeWidth=".8" />
      <line x1="-37" y1="-28" x2="-17" y2="-28" stroke="#1a1008" strokeWidth=".8" />
      <rect x="-39" y="-21" width="24" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* === DOOR (right of centre) === */}
      <rect x="8" y="-7" width="20" height="7" fill={PAL.stone} />
      <path d="M8,-7 L8,-32 a10,10 0 0 1 20,0 L28,-7 Z" fill={PAL.wallTop} />
      <path d="M10,-7 L10,-30 a8,8 0 0 1 16,0 L26,-7 Z" fill={PAL.timber} />
      {/* door panels */}
      <rect x="11" y="-28" width="6" height="10" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".8" opacity=".6" />
      <rect x="19" y="-28" width="6" height="10" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".8" opacity=".6" />
      <rect x="11" y="-16" width="6" height="7" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".8" opacity=".6" />
      <rect x="19" y="-16" width="6" height="7" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".8" opacity=".6" />
      {/* door handle */}
      <circle cx="11" cy="-18" r="1.4" fill={PAL.brass} />
      {/* arch keystone */}
      <ellipse cx="18" cy="-30" rx="3" ry="2" fill={PAL.stone} />

      {/* === MERCHANDISE CRATES stacked outside (right wall) === */}
      {detail !== 'low' && (
        <g>
          {/* bottom crate */}
          <rect x="33" y="-14" width="16" height="14" rx="1" fill="#8a6040" />
          <rect x="33" y="-14" width="16" height="14" rx="1" fill="none" stroke={PAL.timberSoft} strokeWidth=".8" />
          <line x1="41" y1="-14" x2="41" y2="0" stroke={PAL.timberSoft} strokeWidth=".7" opacity=".6" />
          <line x1="33" y1="-7" x2="49" y2="-7" stroke={PAL.timberSoft} strokeWidth=".7" opacity=".6" />
          {/* iron band */}
          <line x1="33" y1="-12" x2="49" y2="-12" stroke="#3a3a3a" strokeWidth=".6" opacity=".5" />
          {/* middle crate (offset) */}
          <rect x="35" y="-27" width="14" height="13" rx="1" fill="#9a6a46" />
          <rect x="35" y="-27" width="14" height="13" rx="1" fill="none" stroke={PAL.timberSoft} strokeWidth=".8" />
          <line x1="42" y1="-27" x2="42" y2="-14" stroke={PAL.timberSoft} strokeWidth=".7" opacity=".6" />
          <line x1="35" y1="-21" x2="49" y2="-21" stroke={PAL.timberSoft} strokeWidth=".7" opacity=".6" />
          {/* small box on top */}
          <rect x="38" y="-35" width="9" height="8" rx=".8" fill="#a07050" />
          <rect x="38" y="-35" width="9" height="8" rx=".8" fill="none" stroke={PAL.timberSoft} strokeWidth=".7" />
          <line x1="42.5" y1="-35" x2="42.5" y2="-27" stroke={PAL.timberSoft} strokeWidth=".6" opacity=".5" />
        </g>
      )}

      {/* === WAGON WHEEL (leaning against right wall) === */}
      {detail !== 'low' && (
        <g transform="translate(48 -8) rotate(10)">
          <circle cx="0" cy="0" r="13" fill="none" stroke={PAL.timber} strokeWidth="2" />
          <circle cx="0" cy="0" r="10.5" fill="none" stroke={PAL.timberSoft} strokeWidth=".7" opacity=".4" />
          <circle cx="0" cy="0" r="3.5" fill={PAL.timberSoft} />
          <circle cx="0" cy="0" r="3.5" fill="none" stroke={PAL.timber} strokeWidth=".8" />
          {/* spokes */}
          <g stroke={PAL.timber} strokeWidth="1.3">
            <line x1="0" y1="-3.5" x2="0" y2="-13" />
            <line x1="0" y1="3.5" x2="0" y2="13" />
            <line x1="-3.5" y1="0" x2="-13" y2="0" />
            <line x1="3.5" y1="0" x2="13" y2="0" />
            <line x1="-2.5" y1="-2.5" x2="-9.2" y2="-9.2" />
            <line x1="2.5" y1="-2.5" x2="9.2" y2="-9.2" />
            <line x1="-2.5" y1="2.5" x2="-9.2" y2="9.2" />
            <line x1="2.5" y1="2.5" x2="9.2" y2="9.2" />
          </g>
          {/* iron rim detail */}
          <circle cx="0" cy="0" r="13" fill="none" stroke="#2a2a2a" strokeWidth=".8" opacity=".4" />
        </g>
      )}

      {/* === HANGING LANTERN from awning edge (sway) === */}
      {detail === 'high' && (
        <g transform="translate(-8 -40)">
          {/* lantern chain */}
          <line x1="0" y1="0" x2="0" y2="3" stroke="#3a3a3a" strokeWidth=".8" />
          <g style={{ animation: 'sway 3.8s 0.3s ease-in-out infinite', transformOrigin: '0px 3px' }}>
            {/* lantern body */}
            <rect x="-4" y="3" width="8" height="10" rx="1.2" fill="#2a1808" />
            <rect x="-3" y="4" width="6" height="8" fill={glow} opacity=".6"
              style={{ animation: 'flicker 2.8s ease-in-out infinite', transformOrigin: '0px 8px' }} />
            {/* lantern frame bars */}
            <line x1="0" y1="3" x2="0" y2="13" stroke="#3a2010" strokeWidth=".6" />
            <line x1="-4" y1="8" x2="4" y2="8" stroke="#3a2010" strokeWidth=".6" />
            {/* lantern cap and hook */}
            <rect x="-5" y="2" width="10" height="2" rx=".5" fill={PAL.timberSoft} />
            <rect x="-5" y="13" width="10" height="2" rx=".5" fill={PAL.timberSoft} />
            {/* warm glow halo */}
            <ellipse cx="0" cy="10" rx="7" ry="5" fill={glow} opacity=".18" />
          </g>
        </g>
      )}
    </svg>
  );
}
