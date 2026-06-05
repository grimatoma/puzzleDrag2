import { svgState } from "./helpers.jsx";
import { PAL, Smoke, Steam, RoofTiles } from "./v2kit.jsx";

export default function KitchenIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-58 -100 116 116" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="46" ry="5" fill="rgba(0,0,0,.28)" />
      <ellipse cx="0" cy="0" rx="40" ry="6" fill="rgba(255,180,90,.18)" />
      {/* foundation */}
      <rect x="-38" y="-6" width="76" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".55">
        <rect x="-34" y="-4" width="6" height="2" /><rect x="-20" y="-4" width="7" height="2" />
        <rect x="-4" y="-4" width="6" height="2" /><rect x="12" y="-4" width="7" height="2" />
        <rect x="24" y="-4" width="6" height="2" />
      </g>
      {/* walls */}
      <rect x="-36" y="-40" width="72" height="34" fill="#f0d8a8" />
      <rect x="-36" y="-40" width="14" height="34" fill="#b8a060" />
      <rect x="-36" y="-40" width="72" height="2" fill="#7a5c34" />
      {/* roof */}
      <defs><RoofTiles id="kitchen2-tiles" color="#a55a3a" /></defs>
      <polygon points="-42,-40 0,-62 42,-40" fill="url(#kitchen2-tiles)" />
      <polygon points="-42,-40 0,-62 -30,-40" fill="rgba(0,0,0,.22)" />
      <rect x="-42" y="-40" width="84" height="3" fill="#3a160a" />
      <rect x="-20" y="-63" width="40" height="2" fill="#f5ecd6" />
      {/* chimney */}
      <rect x="14" y="-62" width="14" height="22" fill="#a55a3a" />
      <rect x="13" y="-64" width="16" height="3" fill="#5a2415" />
      <g stroke="#7a3d24" strokeWidth=".5">
        <line x1="14" y1="-56" x2="28" y2="-56" /><line x1="14" y1="-50" x2="28" y2="-50" />
        <line x1="14" y1="-44" x2="28" y2="-44" />
      </g>
      {/* FIX: layered smoke that doesn't read as a moon */}
      {detail !== 'low' && (
        <g>
          <Smoke x={21} y={-64} scale={0.9} count={4} dur={4.2} color="#c9b993" />
          <Smoke x={19} y={-64} scale={0.7} count={3} dur={3.4} color="#e8dcc2" />
          {/* tiny embers rising with smoke */}
          {[0, .8, 1.6, 2.4].map((d, i) => (
            <circle key={i} cx={21} cy={-64} r=".6" fill="#ffb14a"
              style={{ '--sx': `${(i % 2 ? 4 : -4)}px`, animation: `ember 3s ${d}s ease-out infinite`, transformOrigin: '21px -64px', opacity: 0.8 }} />
          ))}
        </g>
      )}
      {/* OPEN FRONT */}
      <path d="M-26,-6 L-26,-28 a14,14 0 0 1 28,0 L2,-6 Z" fill="#3a160a" />
      <path d="M-23,-6 L-23,-28 a11,11 0 0 1 22,0 L-1,-6 Z" fill="#5a3a1f" />
      {/* warm fire light halo (FIX) */}
      <ellipse cx="-12" cy="-12" rx="14" ry="8" fill="#ffb14a" opacity=".25"
        style={{ animation: 'flicker 2s ease-in-out infinite', transformOrigin: '-12px -12px' }} />
      {/* HEARTH */}
      <g transform="translate(-12 -10)">
        <rect x="-9" y="0" width="18" height="4" fill="#1a1410" />
        <ellipse cx="0" cy="2" rx="9" ry="2" fill="#1a1410" />
        <rect x="-7" y="-1" width="14" height="2" fill="#5a3a1f" />
        <g style={{ animation: 'flicker 1.4s ease-in-out infinite', transformOrigin: '0 -2px' }}>
          <path d="M-7,-1 Q-4,-8 0,-2 Q4,-8 7,-1 Z" fill="#c96442" />
        </g>
        <g style={{ animation: 'flicker 1.1s .2s ease-in-out infinite', transformOrigin: '0 -4px' }}>
          <path d="M-4,-2 Q-2,-7 0,-3 Q2,-7 4,-2 Z" fill="#ffb14a" />
        </g>
        <line x1="-6" y1="-2" x2="-3" y2="-12" stroke="#3a3530" strokeWidth="1" />
        <line x1="6" y1="-2" x2="3" y2="-12" stroke="#3a3530" strokeWidth="1" />
        <path d="M-7,-15 Q-9,-9 0,-9 Q9,-9 7,-15 Z" fill="#6a4a32" />
        <ellipse cx="0" cy="-15" rx="7" ry="2" fill="#3a3530" />
        <ellipse cx="0" cy="-15" rx="6" ry="1.2" fill="#9a7c4a" />
        <path d="M-5,-12 Q-6,-10 -3,-9" fill="none" stroke="#bda268" strokeWidth=".6" />
      </g>
      {detail !== 'low' && (
        <g transform="translate(-12 -26)">
          <Steam x={0} y={0} scale={0.9} count={4} />
        </g>
      )}
      {/* hanging pots */}
      {detail !== 'low' && (
        <g transform="translate(20 -30)">
          <rect x="-12" y="0" width="24" height="1.4" fill="#3a2715" />
          <g transform="translate(-8 1)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#3a2715" strokeWidth=".6" />
            <path d="M-3,4 q3,5 6,0 Z" fill="#7c858d" />
            <rect x="-3" y="3" width="6" height="1" fill="#3a3530" />
          </g>
          <g transform="translate(0 1)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#3a2715" strokeWidth=".6" />
            <rect x="-3" y="3" width="6" height="4" rx=".5" fill="#bda268" />
            <line x1="3" y1="4" x2="6" y2="4" stroke="#bda268" strokeWidth="1.2" />
          </g>
          <g transform="translate(8 1)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#3a2715" strokeWidth=".6" />
            <ellipse cx="0" cy="5" rx="2.5" ry="1.5" fill="#a55a3a" />
          </g>
        </g>
      )}
      {/* HERB BUNDLES — redrawn with twine + leaves (FIX) */}
      {detail !== 'low' && (
        <g>
          {[-28, -22, -16, 22, 28, 34].map((px, i) => (
            <g key={i} transform={`translate(${px} -40)`}>
              <line x1="0" y1="0" x2="0" y2="3" stroke="#3a2715" strokeWidth=".7" />
              {/* twine knot */}
              <circle cx="0" cy="3.5" r=".7" fill="#7a5c34" />
              {/* leaf cluster */}
              <g>
                <path d={`M-2.4,4 L-1.4,10 L0,5 L1.4,10 L2.4,4 Z`} fill={i % 2 ? '#6f8a3a' : '#a98a4a'} />
                <path d={`M-1.4,5 L-.4,9 L0,5.5 Z`} fill={i % 2 ? '#4d6b25' : '#7a5c34'} opacity=".5" />
              </g>
            </g>
          ))}
        </g>
      )}
      {/* veg basket + chopping board */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-44 -2)">
            <path d="M-6,0 L-5,-5 L5,-5 L6,0 Z" fill="#7a5c34" />
            <ellipse cx="0" cy="-5" rx="6" ry="1.4" fill="#5a3a1f" />
            <circle cx="-2" cy="-6" r="1.8" fill="#c96442" />
            <circle cx="2" cy="-6" r="1.4" fill="#e0a83a" />
            <ellipse cx="0" cy="-7" rx="1.8" ry="1" fill="#7fa848" />
          </g>
          <g transform="translate(30 -2)">
            <rect x="-8" y="-3" width="16" height="3" rx=".6" fill="#bda268" stroke="#7a5c34" strokeWidth=".7" />
            <rect x="2" y="-4" width="8" height="2" fill="#bcc4c8" />
            <rect x="10" y="-4" width="3" height="2" fill="#3a2715" />
            <path d="M-6,-6 L-3,-6 L-4,-3 L-5,-3 Z" fill="#e58a4f" />
          </g>
        </g>
      )}
    </svg>
  );
}
