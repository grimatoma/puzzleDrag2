import { svgState } from "./helpers.jsx";
import { PAL, Smoke } from "./v2kit.jsx";

export default function SmokehouseIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-53 -90 106 106" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="40" ry="5" fill="rgba(0,0,0,.32)" />
      <ellipse cx="0" cy="-1" rx="32" ry="3" fill="rgba(40,30,20,.4)" />
      <rect x="-30" y="-6" width="60" height="6" fill={PAL.stoneShade} />
      <g fill="#3a3530" opacity=".6">
        <rect x="-26" y="-4" width="6" height="2" /><rect x="-12" y="-4" width="6" height="2" />
        <rect x="0" y="-4" width="6" height="2" /><rect x="14" y="-4" width="6" height="2" />
      </g>
      <rect x="-28" y="-34" width="56" height="28" fill="#3a2715" />
      <rect x="-28" y="-34" width="12" height="28" fill="#1a1410" />
      <g stroke="#1a1410" strokeWidth=".6" opacity=".9">
        {[-22, -16, -10, -4, 2, 8, 14, 20].map(px => <line key={px} x1={px} y1="-34" x2={px} y2="-6" />)}
      </g>
      <g fill="#1a1410" opacity=".7">
        <path d="M-22,-34 L-22,-22 L-20,-34 Z" /><path d="M-10,-34 L-10,-18 L-8,-34 Z" />
        <path d="M4,-34 L4,-20 L6,-34 Z" /><path d="M18,-34 L18,-26 L20,-34 Z" />
      </g>
      <polygon points="-34,-34 0,-58 34,-34" fill="#4a3022" />
      <polygon points="-34,-34 0,-58 -18,-34" fill="rgba(0,0,0,.34)" />
      <rect x="-34" y="-34" width="68" height="3" fill="#1a1410" />
      {/* THREE ROOF VENTS — alternating puff timing (FIX) */}
      {[-16, 0, 16].map((vx, i) => (
        <g key={i} transform={`translate(${vx} -50)`}>
          <rect x="-4" y="0" width="8" height="6" fill="#1a1410" />
          <path d="M-6,0 L0,-6 L6,0 Z" fill="#5b5346" />
          <ellipse cx="0" cy="0" rx="6" ry="1.4" fill="#3a3530" />
          <ellipse cx="0" cy="3" rx="2.4" ry=".6" fill="#ffb14a" opacity=".7"
            style={{ animation: `flicker ${1.6 + i * .2}s ease-in-out infinite`, transformOrigin: `0 3px` }} />
        </g>
      ))}
      {/* SMOKE — staggered timing per vent + embers (FIX) */}
      {detail !== 'low' && (
        <g>
          {[-16, 0, 16].map((vx, i) => (
            <g key={i} transform={`translate(${vx} -52)`}>
              <Smoke x={0} y={0} scale={1.5} color="#5b5346" count={3} dur={3.6 + i * 0.6} />
              <Smoke x={2} y={0} scale={1.0} color="#3a3530" count={2} dur={4.2 + i * 0.3} />
              {/* embers spitting up */}
              {[0, 1.2, 2.4].map((d, k) => (
                <circle key={k} cx="0" cy="0" r=".7" fill="#ffb14a"
                  style={{ '--sx': `${(k % 2 ? 3 : -3)}px`, animation: `ember 2.4s ${d + i * 0.4}s ease-out infinite`, transformOrigin: '0 0' }} />
              ))}
            </g>
          ))}
        </g>
      )}
      {/* IRON DOOR */}
      <g transform="translate(0 -6)">
        <rect x="-9" y="-22" width="18" height="22" fill="#1a1410" />
        <rect x="-9" y="-22" width="18" height="2" fill="#000" />
        <rect x="-9" y="-18" width="18" height="2" fill="#3a3530" />
        <rect x="-9" y="-6" width="18" height="2" fill="#3a3530" />
        <g fill="#3a3530">
          {[-7, -3, 0, 3, 7].map((px, i) => <circle key={i} cx={px} cy="-17" r=".6" />)}
          {[-7, -3, 0, 3, 7].map((px, i) => <circle key={i} cx={px} cy="-5" r=".6" />)}
        </g>
        <rect x="-3" y="-14" width="6" height="3" fill="#ffb14a"
          style={{ animation: 'flicker 1.6s ease-in-out infinite', transformOrigin: '0 -12px' }} />
        <rect x="-3" y="-14" width="6" height="3" fill="none" stroke="#3a3530" strokeWidth=".6" />
        <rect x="5" y="-12" width="2" height="3" fill="#7c858d" />
      </g>
      {/* hanging meats */}
      {detail !== 'low' && (
        <g transform="translate(-36 -22)">
          <rect x="-1" y="0" width="2" height="22" fill="#3a2715" />
          <rect x="0" y="-2" width="20" height="1.6" fill="#3a2715" />
          {[3, 8, 13, 18].map((px, i) => (
            <g key={i} transform={`translate(${px} -2)`} style={{ animation: `sway ${3 + i * .3}s ${i * .15}s ease-in-out infinite`, transformOrigin: '0 0' }}>
              <line x1="0" y1="0" x2="0" y2="3" stroke="#3a2715" strokeWidth=".5" />
              {i === 0 || i === 2 ? (
                <g><ellipse cx="0" cy="8" rx="3.4" ry="5" fill="#7a3d24" stroke="#3a160a" strokeWidth=".6" /></g>
              ) : i === 1 ? (
                <g>
                  <ellipse cx="-1" cy="6" rx="1.6" ry="2.4" fill="#a55a3a" stroke="#3a160a" strokeWidth=".4" />
                  <ellipse cx="1" cy="9" rx="1.6" ry="2.4" fill="#a55a3a" stroke="#3a160a" strokeWidth=".4" />
                  <ellipse cx="-1" cy="12" rx="1.6" ry="2.4" fill="#a55a3a" stroke="#3a160a" strokeWidth=".4" />
                </g>
              ) : (
                <g>
                  <ellipse cx="0" cy="8" rx="2.4" ry="4" fill="#c89570" stroke="#3a160a" strokeWidth=".5" />
                  <path d="M0,12 L-2,15 L2,15 Z" fill="#c89570" />
                </g>
              )}
            </g>
          ))}
        </g>
      )}
      {/* woodpile */}
      {detail === 'high' && (
        <g transform="translate(36 -2)">
          <ellipse cx="0" cy="0" rx="9" ry="1.4" fill="rgba(0,0,0,.3)" />
          <rect x="-8" y="-7" width="16" height="2" fill="#7a5c34" />
          <rect x="-8" y="-5" width="16" height="2" fill="#5a3a1f" />
          <rect x="-8" y="-3" width="16" height="2" fill="#7a5c34" />
          <rect x="-8" y="-1" width="16" height="2" fill="#5a3a1f" />
          <g fill="#bda268" stroke="#3a2715" strokeWidth=".3">
            <circle cx="-8" cy="-6" r="1" /><circle cx="-8" cy="-2" r="1" />
            <circle cx="8" cy="-6" r="1" /><circle cx="8" cy="-2" r="1" />
          </g>
        </g>
      )}
      {detail !== 'low' && (
        <g opacity=".3">
          <Smoke x={-26} y={-30} scale={0.9} color="#7a716a" count={2} />
          <Smoke x={28} y={-28} scale={0.9} color="#7a716a" count={2} />
        </g>
      )}
    </svg>
  );
}
