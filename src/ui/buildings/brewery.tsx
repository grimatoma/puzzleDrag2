import { svgState } from "./helpers.jsx";
import { PAL, Smoke, RoofTiles } from "./v2kit.jsx";

export default function BreweryIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-56 -96 112 112" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="46" ry="5" fill="rgba(0,0,0,.28)" />
      {/* puddle of spilled beer */}
      <ellipse cx="36" cy="-1" rx="6" ry="1.5" fill="rgba(220,180,60,.4)" />
      {/* foundation */}
      <rect x="-36" y="-6" width="72" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-32" y="-4" width="6" height="2" /><rect x="-18" y="-4" width="6" height="2" />
        <rect x="-2" y="-4" width="6" height="2" /><rect x="14" y="-4" width="6" height="2" />
        <rect x="28" y="-4" width="4" height="2" />
      </g>
      {/* TUDOR walls — cream plaster with dark timber */}
      <rect x="-34" y="-40" width="68" height="34" fill="#f0d8a8" />
      <rect x="-34" y="-40" width="12" height="34" fill="#b8a060" />
      <g fill={PAL.timber}>
        <rect x="-34" y="-40" width="68" height="2" />
        <rect x="-34" y="-8" width="68" height="2" />
        <rect x="-34" y="-40" width="2" height="34" />
        <rect x="32" y="-40" width="2" height="34" />
        <rect x="-1" y="-40" width="2" height="34" />
      </g>
      {/* diagonal timber */}
      <g stroke={PAL.timber} strokeWidth="1.4">
        <line x1="-32" y1="-38" x2="-2" y2="-8" />
        <line x1="2" y1="-38" x2="32" y2="-8" />
      </g>
      {/* tile roof */}
      <defs><RoofTiles id="brewery-tiles" color="#7a3d24" /></defs>
      <polygon points="-40,-40 0,-60 40,-40" fill="url(#brewery-tiles)" />
      <polygon points="-40,-40 0,-60 -22,-40" fill="rgba(0,0,0,.3)" />
      <rect x="-40" y="-40" width="80" height="3" fill="#3a160a" />
      <rect x="-2" y="-61" width="4" height="2.4" fill="#3a160a" />
      {/* CHIMNEY with steam */}
      <rect x="-18" y="-58" width="6" height="18" fill="#5a2a18" />
      <rect x="-19" y="-60" width="8" height="3" fill="#3a160a" />
      {detail !== 'low' && <Smoke x={-15} y={-60} scale={0.8} count={3} color="#e8dcc2" />}
      {/* OPEN FRONT — big arched opening showing brewery interior */}
      <path d="M-22,-6 L-22,-26 a8,8 0 0 1 16,0 L-6,-6 Z" fill="#3a160a" />
      <path d="M-21,-6 L-21,-26 a7,7 0 0 1 14,0 L-7,-6 Z" fill="#5a3a1f" />
      {/* COPPER KETTLE inside (signature) */}
      <g transform="translate(-14 -12)">
        {/* fire base */}
        <rect x="-5" y="0" width="10" height="2" fill="#1a1410" />
        <g style={{ animation: 'flicker 1.4s ease-in-out infinite', transformOrigin: '0 -1px' }}>
          <path d="M-4,-1 Q-2,-4 0,-2 Q2,-4 4,-1 Z" fill="#ffb14a" />
        </g>
        {/* kettle body — copper */}
        <ellipse cx="0" cy="-2" rx="6" ry="1.4" fill="#5a3a1f" />
        <path d="M-6,-2 Q-7,-6 -5,-9 L5,-9 Q7,-6 6,-2 Z" fill="#c96442" />
        <ellipse cx="0" cy="-9" rx="5" ry="1.2" fill="#7a3d24" />
        <ellipse cx="0" cy="-9" rx="4" ry=".8" fill="#1a1410" />
        {/* copper highlight */}
        <path d="M-4,-7 Q-5,-4 -3,-2" stroke="#ffd56a" strokeWidth=".6" fill="none" opacity=".7" />
        {/* steam pouring out */}
      </g>
      {detail !== 'low' && (
        <g transform="translate(-14 -22)">
          {Array.from({ length: 4 }, (_, i) => (
            <circle key={i} cx="0" cy="0" r={2.4 + (i % 2) * 1.2} fill="#fbf7eb"
              style={{ '--sx': `${(i % 2 ? 6 : -6)}px`, animation: `steam 2.4s ${i * 0.4}s ease-out infinite`, transformOrigin: '0 0', opacity: 0.85 }} />
          ))}
        </g>
      )}
      {/* DOOR */}
      <g transform="translate(16 -6)">
        <path d="M-6,0 L-6,-16 a6,6 0 0 1 12,0 L6,0 Z" fill={PAL.timber} />
        <path d="M-5,0 L-5,-15 a5,5 0 0 1 10,0 L5,0 Z" fill={PAL.timberSoft} />
        <rect x="-4" y="-12" width="8" height="5" fill="#3a2715" />
        <rect x="-3.4" y="-11.4" width="7" height="4" fill="#aed3e8" opacity=".7" />
        <circle cx="3" cy="-6" r=".8" fill={PAL.brass} />
      </g>
      {/* HOPS VINE climbing up wall (signature) */}
      {detail !== 'low' && (
        <g>
          {/* twisting vine */}
          <path d="M28,-6 Q26,-16 30,-24 Q34,-32 30,-38" fill="none" stroke="#4d6b25" strokeWidth="1" />
          {/* leaves */}
          {[[28, -10], [26, -16], [29, -22], [32, -28], [31, -34]].map(([px, py], i) => (
            <g key={i} transform={`translate(${px} ${py})`}>
              <path d="M0,0 L-3,-1.4 L-2,1 Z" fill="#7fa848" />
              <path d="M0,0 L3,-1.4 L2,1 Z" fill="#7fa848" />
            </g>
          ))}
          {/* hop cones */}
          {[[27, -12], [30, -20], [28, -30]].map(([px, py], i) => (
            <g key={i} transform={`translate(${px} ${py})`}>
              <ellipse cx="0" cy="0" rx="1.4" ry="2.4" fill="#7fc94a" />
              <path d="M0,-2 L-1,0 L0,1 L1,0 Z" fill="#a8d96a" />
              <path d="M-1,1 L0,2 L1,1" stroke="#4d6b25" strokeWidth=".3" fill="none" />
            </g>
          ))}
        </g>
      )}
      {/* STACKED BARRELS outside (signature) */}
      {detail !== 'low' && (
        <g transform="translate(-40 -6)">
          <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="rgba(0,0,0,.34)" />
          {/* bottom row */}
          <g>
            {/* barrel 1 */}
            <path d="M-6,-1 Q-7,-6 -6,-11 L-2,-11 Q-1,-6 -2,-1 Z" fill="#7a4a26" />
            <g stroke="#5a3a1f" strokeWidth=".4" opacity=".7">
              <line x1="-4.5" y1="-1" x2="-4.8" y2="-11" />
              <line x1="-3.5" y1="-1" x2="-3.5" y2="-11" />
            </g>
            <ellipse cx="-4" cy="-11" rx="2" ry=".7" fill="#3a3530" />
            {/* hoop */}
            <path d="M-6.6,-7 L-1.4,-7 L-1.4,-6.4 L-6.4,-6.4 Z" fill="#3a3530" />
            {/* barrel 2 */}
            <path d="M2,-1 Q1,-6 2,-11 L6,-11 Q7,-6 6,-1 Z" fill="#7a4a26" />
            <g stroke="#5a3a1f" strokeWidth=".4" opacity=".7">
              <line x1="3.5" y1="-1" x2="3.2" y2="-11" />
              <line x1="4.5" y1="-1" x2="4.5" y2="-11" />
            </g>
            <ellipse cx="4" cy="-11" rx="2" ry=".7" fill="#3a3530" />
            <path d="M1.4,-7 L6.6,-7 L6.6,-6.4 L1.6,-6.4 Z" fill="#3a3530" />
          </g>
          {/* top barrel — laid horizontal */}
          <g transform="translate(0 -16)">
            <ellipse cx="-4" cy="0" rx="2" ry="4" fill="#7a4a26" />
            <ellipse cx="-4" cy="0" rx="1.4" ry="3.2" fill="#5a3a1f" />
            <ellipse cx="4" cy="0" rx="2" ry="4" fill="#7a4a26" />
            <rect x="-4" y="-4" width="8" height="8" fill="#7a4a26" />
            {/* iron hoops */}
            <rect x="-4" y="-3" width="8" height=".6" fill="#3a3530" />
            <rect x="-4" y="-1" width="8" height=".6" fill="#3a3530" />
            <rect x="-4" y="2" width="8" height=".6" fill="#3a3530" />
            {/* TAP with foam dripping (signature) */}
            <g transform="translate(0 0)">
              <rect x="-1" y="-3" width="2" height=".8" fill="#7c858d" />
              <rect x="-.4" y="-3" width=".8" height="3" fill="#7c858d" />
              {/* foam drop */}
              <ellipse cx="0" cy=".4" rx=".7" ry=".3" fill="#fbf7eb"
                style={{ animation: 'drip2 1.4s ease-in infinite', transformOrigin: '0 0' }} />
            </g>
          </g>
        </g>
      )}
      {/* HANGING TANKARD SIGN */}
      {detail !== 'low' && (
        <g transform="translate(30 -36)">
          <rect x="-6" y="0" width="6" height="1" fill="#3a2715" />
          <line x1="-3" y1="1" x2="-3" y2="3" stroke="#3a2715" strokeWidth=".5" />
          <g style={{ animation: 'sway 4s ease-in-out infinite', transformOrigin: '-3px 3px' }}>
            <rect x="-8" y="3" width="10" height="10" rx="1" fill="#fbf7eb" stroke="#5a3a1f" strokeWidth=".5" />
            {/* tankard icon */}
            <g transform="translate(-3 8)">
              <rect x="-2.4" y="-3" width="4" height="5" fill="#bda268" stroke="#7a5c34" strokeWidth=".3" />
              <path d="M1.6,-2 a2,2 0 0 1 0,4" fill="none" stroke="#7a5c34" strokeWidth=".5" />
              <rect x="-2.4" y="-3.4" width="4" height="1" fill="#fbf7eb" />
              <circle cx="-1.4" cy="-3.4" r=".3" fill="#fbf7eb" />
              <circle cx="0" cy="-3.6" r=".3" fill="#fbf7eb" />
              <circle cx="1.2" cy="-3.4" r=".3" fill="#fbf7eb" />
            </g>
          </g>
        </g>
      )}
      {/* malt sacks */}
      {detail === 'high' && (
        <g transform="translate(36 -2)">
          <ellipse cx="0" cy="0" rx="5" ry="1.2" fill="rgba(0,0,0,.3)" />
          <path d="M-5,0 L-6,-7 Q-4,-10 0,-10 Q4,-10 6,-7 L5,0 Z" fill="#bda268" stroke="#7a5c34" strokeWidth=".5" />
          <text x="0" y="-4" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="4" fontWeight="700" fill="#7a5c34" opacity=".6">M</text>
        </g>
      )}
    </svg>
  );
}
