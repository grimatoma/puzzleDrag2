import { svgState } from "./helpers.jsx";
import { PAL, Smoke } from "./v2kit.jsx";

export default function ApothecaryIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-53 -90 106 106" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="40" ry="5" fill="rgba(0,0,0,.28)" />
      {/* foundation */}
      <rect x="-32" y="-6" width="64" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-28" y="-4" width="6" height="2" /><rect x="-14" y="-4" width="6" height="2" />
        <rect x="2" y="-4" width="6" height="2" /><rect x="18" y="-4" width="6" height="2" />
      </g>
      {/* WALLS — deep teal plaster + dark timber framing (apothecary style) */}
      <rect x="-30" y="-38" width="60" height="32" fill="#3a5a5a" />
      <rect x="-30" y="-38" width="10" height="32" fill="#1f3a3a" />
      {/* TIMBER FRAMING (Tudor-style X) */}
      <g fill={PAL.timber}>
        {/* top + bottom rails */}
        <rect x="-30" y="-38" width="60" height="2" />
        <rect x="-30" y="-8" width="60" height="2" />
        {/* corner posts */}
        <rect x="-30" y="-38" width="2.4" height="32" />
        <rect x="27.6" y="-38" width="2.4" height="32" />
        {/* center post */}
        <rect x="-1.2" y="-38" width="2.4" height="32" />
        {/* diagonals — left bay */}
      </g>
      <g stroke={PAL.timber} strokeWidth="1.4">
        <line x1="-28" y1="-36" x2="-2" y2="-10" />
        <line x1="-28" y1="-10" x2="-2" y2="-36" />
        <line x1="2" y1="-36" x2="28" y2="-10" />
        <line x1="2" y1="-10" x2="28" y2="-36" />
      </g>
      {/* steep tile roof */}
      <polygon points="-36,-38 0,-58 36,-38" fill="#5a2a18" />
      <polygon points="-36,-38 0,-58 -22,-38" fill="rgba(0,0,0,.34)" />
      <g stroke="rgba(0,0,0,.3)" strokeWidth=".5" opacity=".7">
        <path d="M-30,-42 L30,-42" /><path d="M-24,-46 L24,-46" /><path d="M-18,-50 L18,-50" />
      </g>
      <rect x="-36" y="-38" width="72" height="3" fill="#1a1410" />
      {/* small dormer with herbs hanging */}
      {detail !== 'low' && (
        <g transform="translate(-14 -50)">
          <path d="M-5,8 L0,2 L5,8 Z" fill="#5a2a18" />
          <rect x="-3" y="3" width="6" height="5" fill="#3a2715" />
          <rect x="-2.4" y="3.4" width="5" height="4" fill="#ffd98a" opacity=".7"
            style={{ animation: 'flicker 4s ease-in-out infinite', transformOrigin: '0 5px' }} />
        </g>
      )}
      {/* BAY WINDOW — protruding shelf of bottles (signature) */}
      <g transform="translate(0 -28)">
        {/* window frame */}
        <rect x="-16" y="-6" width="32" height="14" fill="#1a1410" />
        <rect x="-15" y="-5" width="30" height="12" fill="#3a2715" />
        {/* internal shelves */}
        <rect x="-15" y="0" width="30" height=".8" fill="#5a3a1f" />
        <rect x="-15" y="4" width="30" height=".8" fill="#5a3a1f" />
        {/* glowing bottle row — top */}
        <g>
          {[-12, -7, -2, 3, 8, 13].map((px, i) => {
            const colors = ['#7a1d12', '#3a7088', '#6f8a3a', '#dba7c4', '#e0a83a', '#5a3a92'];
            return (
              <g key={i} transform={`translate(${px} -.4)`}>
                {/* bottle silhouette */}
                <path d="M-1.6,0 L-1.6,-3 Q-1.6,-4.4 0,-4.4 Q1.6,-4.4 1.6,-3 L1.6,0 Z" fill={colors[i]} opacity=".9" />
                <rect x="-.6" y="-5" width="1.2" height="1.2" fill="#5a3a1f" />
                {/* internal glow */}
                <circle cx="0" cy="-1.6" r=".8" fill="#fbf7eb" opacity=".5"
                  style={{ animation: `flicker ${1.8 + i * .2}s ${i * .15}s ease-in-out infinite`, transformOrigin: `0 -1.6px` }} />
              </g>
            );
          })}
        </g>
        {/* bottle row — middle */}
        <g>
          {[-11, -6, -1, 4, 9].map((px, i) => {
            const colors = ['#5a8a72', '#c96442', '#aed3e8', '#f4d262', '#dba7c4'];
            return (
              <g key={i} transform={`translate(${px} 3.6)`}>
                <ellipse cx="0" cy="0" rx="2" ry="3" fill={colors[i]} opacity=".9" />
                <ellipse cx="0" cy="-1.4" rx=".8" ry=".4" fill="#fbf7eb" opacity=".4" />
                <rect x="-.4" y="-3.4" width=".8" height=".8" fill="#5a3a1f" />
              </g>
            );
          })}
        </g>
        {/* bottle row — bottom */}
        <g>
          {[-12, -7, -2, 3, 8, 13].map((px, i) => {
            const colors = ['#3a7088', '#e58a4f', '#7a1d12', '#7fa848', '#5a3a92', '#e0a83a'];
            return (
              <g key={i} transform={`translate(${px} 7.6)`}>
                <rect x="-1.4" y="-3" width="2.8" height="2.6" fill={colors[i]} opacity=".9" />
                <rect x="-1.4" y="-3" width="2.8" height=".4" fill="#5a3a1f" />
              </g>
            );
          })}
        </g>
        {/* bay window roof */}
        <path d="M-18,-6 L-14,-10 L14,-10 L18,-6 Z" fill="#5a2a18" />
        <path d="M-18,-6 L-14,-10 L0,-10 L-4,-6 Z" fill="rgba(0,0,0,.3)" />
        <rect x="-18" y="-6" width="36" height="1.4" fill="#1a1410" />
      </g>
      {/* DOOR — to the right */}
      <g transform="translate(20 -6)">
        <path d="M-5,0 L-5,-14 a5,5 0 0 1 10,0 L5,0 Z" fill={PAL.timber} />
        <path d="M-4,0 L-4,-13 a4,4 0 0 1 8,0 L4,0 Z" fill={PAL.timberSoft} />
        {/* small panes in door */}
        <rect x="-3" y="-12" width="6" height="5" fill="#3a2715" />
        <rect x="-2.4" y="-11.4" width="5" height="4" fill="#aed3e8" opacity=".7" />
        <line x1="-2.4" y1="-9.4" x2="2.6" y2="-9.4" stroke="#3a2715" strokeWidth=".3" />
        <line x1="0" y1="-11.4" x2="0" y2="-7.4" stroke="#3a2715" strokeWidth=".3" />
        <circle cx="3" cy="-5" r=".8" fill={PAL.brass} />
        {/* welcome step */}
        <rect x="-7" y="0" width="14" height="2" fill="#7a716a" />
      </g>
      {/* HANGING SHOP SIGN — mortar/pestle (signature) */}
      {detail !== 'low' && (
        <g transform="translate(-20 -28)">
          {/* bracket arm from wall */}
          <rect x="0" y="-2" width="10" height="1.4" fill="#3a2715" />
          <line x1="0" y1="-2" x2="6" y2="-6" stroke="#3a2715" strokeWidth=".6" />
          {/* hanging chain */}
          <line x1="6" y1="0" x2="6" y2="3" stroke="#3a2715" strokeWidth=".5" />
          {/* sign panel — rocks in wind */}
          <g style={{ animation: 'sway 5s ease-in-out infinite', transformOrigin: '6px 3px' }}>
            <rect x="-2" y="3" width="16" height="12" rx="1.4" fill="#fbf7eb" stroke="#5a3a1f" strokeWidth=".6" />
            {/* painted mortar */}
            <path d="M2,11 Q3,7 6,7 Q9,7 10,11 Z" fill="#5a8a72" />
            <ellipse cx="6" cy="7" rx="4" ry="1" fill="#3a5a5a" />
            {/* pestle */}
            <line x1="6" y1="7" x2="10" y2="3.5" stroke="#5a3a1f" strokeWidth="1.4" strokeLinecap="round" />
            {/* bubbles rising from mortar */}
            <circle cx="6" cy="5" r=".5" fill="#7fa848"
              style={{ animation: 'ember 2s ease-out infinite', transformOrigin: '6px 7px', '--sx': '0px' }} />
            <circle cx="6" cy="5" r=".4" fill="#7fa848"
              style={{ animation: 'ember 2.4s .6s ease-out infinite', transformOrigin: '6px 7px', '--sx': '2px' }} />
          </g>
        </g>
      )}
      {/* HERB GARDEN PLANTERS */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-40 -2)">
            <rect x="-5" y="-3" width="10" height="3" fill="#7a5c34" />
            <ellipse cx="0" cy="-3" rx="5" ry="1" fill="#5a3a1f" />
            {/* sprig of leaves */}
            <path d="M-3,-3 L-3,-7 Q-2,-9 -1,-6" stroke="#4d6b25" strokeWidth=".6" fill="none" />
            <ellipse cx="-3" cy="-8" rx="1.2" ry="2" fill="#6b8a4a" />
            <path d="M0,-3 L0,-9" stroke="#4d6b25" strokeWidth=".6" />
            <ellipse cx="0" cy="-9" rx="1" ry="1.8" fill="#7fa848" />
            <path d="M3,-3 L3,-7" stroke="#4d6b25" strokeWidth=".6" />
            <ellipse cx="3" cy="-7" rx="1.2" ry="1.6" fill="#dba7c4" />
          </g>
          {/* SLEEPING CAT on window sill */}
          <g transform="translate(36 -8)">
            <ellipse cx="0" cy="-1" rx="3.6" ry="1.2" fill="#a55a3a" />
            <circle cx="-2.4" cy="-2" r="1.2" fill="#a55a3a" />
            <path d="M-3,-3 L-2.6,-2 L-2,-3 Z" fill="#a55a3a" />
            <path d="M-3.2,-2.4 L-1.6,-2.4" stroke="#3a2715" strokeWidth=".3" />
          </g>
        </g>
      )}
      {/* faint magical mist around */}
      {detail !== 'low' && (
        <g opacity=".4">
          <Smoke x={-26} y={-50} scale={0.6} color="#aed3e8" count={2} dur={5} />
        </g>
      )}
    </svg>
  );
}
