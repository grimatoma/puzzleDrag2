import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function FishmongerIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-58 -100 116 116" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="44" ry="5" fill="rgba(0,0,0,.28)" />
      <ellipse cx="-4" cy="-1" rx="36" ry="3" fill="rgba(80,150,180,.18)" />
      <rect x="-34" y="-6" width="68" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-30" y="-4" width="6" height="2" /><rect x="-12" y="-4" width="6" height="2" />
        <rect x="6" y="-4" width="6" height="2" /><rect x="22" y="-4" width="6" height="2" />
      </g>
      {/* back wall */}
      <rect x="-32" y="-36" width="64" height="30" fill="#a8c4cf" />
      <rect x="-32" y="-36" width="10" height="30" fill="#5a8294" />
      <g stroke="#5a8294" strokeWidth=".5" opacity=".7">
        {[-24, -16, -8, 0, 8, 16, 24].map(px => <line key={px} x1={px} y1="-36" x2={px} y2="-6" />)}
      </g>
      <rect x="-32" y="-36" width="64" height="2" fill="#3a4654" />
      {/* roof */}
      <polygon points="-38,-36 0,-52 38,-36" fill="#5a3a1f" />
      <polygon points="-38,-36 0,-52 -22,-36" fill="rgba(0,0,0,.26)" />
      <g stroke="rgba(0,0,0,.3)" strokeWidth=".7" fill="none">
        <path d="M-30,-42 L30,-42" />
      </g>
      <rect x="-38" y="-36" width="76" height="3" fill="#2a1a0c" />
      <rect x="-2" y="-53" width="4" height="2.4" fill="#3a160a" />
      {/* RAFTERS for hanging fish (UNDER the awning, behind the awning visually) (FIX) */}
      {detail !== 'low' && (
        <g>
          {/* rafter bar */}
          <rect x="-30" y="-34" width="60" height="1.4" fill="#3a2715" />
          {[-22, -10, 2, 14, 26].map((px, i) => (
            <g key={i} transform={`translate(${px} -32.6)`}>
              <line x1="0" y1="0" x2="0" y2="2.5" stroke="#3a2715" strokeWidth=".5" />
              <g transform="translate(0 6)" style={{ animation: `sway ${3 + i * .3}s ${i * .2}s ease-in-out infinite`, transformOrigin: '0 -3px' }}>
                {/* fish hanging by tail */}
                <ellipse cx="0" cy="0" rx="4.5" ry="1.6" fill="#c89570" stroke="#7a4a26" strokeWidth=".4" />
                <ellipse cx="0" cy="-.4" rx="4.5" ry="1" fill="#e8c39a" />
                <path d="M0,-1.6 L0,1.6 L-2.4,2.6 L-2.4,-2.6 Z" fill="#a87a5a" />
                <circle cx="3" cy="-.5" r=".4" fill="#1a1410" />
                <path d="M-1,-.6 Q-1.5,0 -1,.6" stroke="#7a4a26" strokeWidth=".3" fill="none" />
              </g>
            </g>
          ))}
        </g>
      )}
      {/* STRIPED AWNING — drawn AFTER fish so it visually sits in front */}
      {detail !== 'low' && (
        <g transform="translate(0 -36)">
          <rect x="-36" y="-2" width="72" height="2" fill="#3a4654" />
          <g>
            {Array.from({ length: 18 }, (_, i) => (
              <path key={i} d={`M${-36 + i * 4},0 L${-32 + i * 4},0 L${-30 + i * 4},10 L${-34 + i * 4},10 Z`}
                fill={i % 2 ? '#3a7088' : '#fbf7eb'} />
            ))}
          </g>
          <g>
            {Array.from({ length: 18 }, (_, i) => (
              <path key={i} d={`M${-34 + i * 4},10 a2,2 0 0 0 4,0`} fill={i % 2 ? '#3a7088' : '#fbf7eb'} />
            ))}
          </g>
          <g stroke="#3a4654" strokeWidth="1.4">
            <line x1="-34" y1="0" x2="-34" y2="30" /><line x1="34" y1="0" x2="34" y2="30" />
          </g>
        </g>
      )}
      {/* DISPLAY COUNTER */}
      <g transform="translate(0 -8)">
        <rect x="-30" y="-10" width="60" height="10" fill="#7a5c34" />
        <rect x="-30" y="-10" width="60" height="2" fill="#3a2715" />
        <rect x="-28" y="-12" width="56" height="4" fill="#cfe4ee" />
        <rect x="-28" y="-12" width="56" height="1.2" fill="#fbf7eb" />
        {/* ice glints */}
        <g fill="#fbf7eb" opacity=".9">
          <circle cx="-20" cy="-11" r=".4" /><circle cx="-8" cy="-11" r=".4" />
          <circle cx="6" cy="-11" r=".4" /><circle cx="20" cy="-11" r=".4" />
        </g>
        {/* fish — bigger, eyes, fins */}
        <g transform="translate(-18 -14)">
          <ellipse cx="0" cy="0" rx="9" ry="2.4" fill="#7c858d" />
          <ellipse cx="0" cy="-.6" rx="9" ry="1.4" fill="#bcc4c8" />
          <path d="M9,0 L13,-3 L13,3 Z" fill="#7c858d" />
          <path d="M0,-2 L2,-3.4 L4,-2 Z" fill="#5a6268" />
          <circle cx="-6" cy="-.6" r=".8" fill="#fbf7eb" />
          <circle cx="-6" cy="-.6" r=".5" fill="#1a1410" />
          <path d="M-3,-1.5 q-1,1.5 0,3" stroke="#5b5346" strokeWidth=".4" fill="none" />
        </g>
        <g transform="translate(0 -14)">
          <ellipse cx="0" cy="0" rx="8" ry="2" fill="#c89570" />
          <ellipse cx="0" cy="-.5" rx="8" ry="1.2" fill="#e8c39a" />
          <path d="M8,0 L11,-2.4 L11,2.4 Z" fill="#c89570" />
          <path d="M0,-1.6 L2,-2.6 L4,-1.6 Z" fill="#a87a5a" />
          <circle cx="-5" cy="-.6" r=".7" fill="#fbf7eb" />
          <circle cx="-5" cy="-.6" r=".4" fill="#1a1410" />
        </g>
        <g transform="translate(18 -14)">
          <ellipse cx="0" cy="0" rx="7" ry="2" fill="#7c858d" />
          <ellipse cx="0" cy="-.5" rx="7" ry="1.2" fill="#bcc4c8" />
          <path d="M7,0 L10,-2.4 L10,2.4 Z" fill="#7c858d" />
          <path d="M0,-1.4 L2,-2.4 L4,-1.4 Z" fill="#5a6268" />
          <circle cx="-4" cy="-.6" r=".7" fill="#fbf7eb" />
          <circle cx="-4" cy="-.6" r=".4" fill="#1a1410" />
        </g>
        <circle cx="-9" cy="-13" r="1" fill="#f4d262" />
        <circle cx="9" cy="-13" r="1" fill="#f4d262" />
      </g>
      {/* scale */}
      {detail !== 'low' && (
        <g transform="translate(28 -22)">
          <rect x="-.6" y="0" width="1.2" height="8" fill="#3a2715" />
          <line x1="0" y1="0" x2="0" y2="-4" stroke="#3a2715" strokeWidth=".8" />
          <g style={{ animation: 'scaleTip 3s ease-in-out infinite', transformOrigin: '0 -4px' }}>
            <line x1="-7" y1="-4" x2="7" y2="-4" stroke="#3a2715" strokeWidth=".8" />
            <line x1="-7" y1="-4" x2="-7" y2="0" stroke="#3a2715" strokeWidth=".5" />
            <line x1="7" y1="-4" x2="7" y2="0" stroke="#3a2715" strokeWidth=".5" />
            <path d="M-10,0 L-4,0 L-5,2 L-9,2 Z" fill="#bcc4c8" stroke="#3a3530" strokeWidth=".4" />
            <path d="M4,0 L10,0 L9,2 L5,2 Z" fill="#bcc4c8" stroke="#3a3530" strokeWidth=".4" />
          </g>
        </g>
      )}
      {/* price board */}
      {detail !== 'low' && (
        <g transform="translate(-40 -22)">
          <rect x="-1" y="0" width="2" height="22" fill="#5a3a1f" />
          <rect x="-9" y="-12" width="18" height="14" fill="#3a2715" />
          <rect x="-8" y="-11" width="16" height="12" fill="#5a3a1f" />
          <text x="0" y="-7" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="3.2" fontWeight="700" fill="#fbf7eb">CATCH</text>
          <text x="0" y="-3" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="3" fill="#fbf7eb">Cod · 3</text>
          <text x="0" y="0" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="3" fill="#fbf7eb">Bass · 5</text>
          <g transform="translate(0 -10)">
            <ellipse cx="0" cy="0" rx="2.4" ry=".7" fill="#cfe4ee" />
            <path d="M2.4,0 L3.4,-.6 L3.4,.6 Z" fill="#cfe4ee" />
          </g>
        </g>
      )}
      {/* bucket + lobster pot */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-44 -3)">
            <path d="M-5,0 L-6,-7 L6,-7 L5,0 Z" fill="#3a3d44" />
            <ellipse cx="0" cy="-7" rx="6" ry="1.4" fill="#7c858d" />
            <path d="M-2,-9 L-3,-13 L-1,-13 Z" fill="#bcc4c8" />
            <path d="M2,-9 L3,-13 L1,-13 Z" fill="#bcc4c8" />
          </g>
          <g transform="translate(40 -3)">
            <path d="M-6,0 L-7,-7 L7,-7 L6,0 Z" fill="#a98a5a" />
            <g stroke="#7a5c34" strokeWidth=".4" fill="none">
              <path d="M-7,-5 L7,-5" /><path d="M-7,-3 L7,-3" /><path d="M-7,-1 L7,-1" />
            </g>
            <ellipse cx="0" cy="-7" rx="7" ry="1.4" fill="#7a5c34" />
          </g>
        </g>
      )}
    </svg>
  );
}
