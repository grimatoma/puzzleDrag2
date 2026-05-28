import { svgState } from "./helpers.jsx";

export default function PowderStoreIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-59 -102 118 118" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="44" ry="5" fill="rgba(0,0,0,.34)" />
      {/* berm */}
      <path d="M-44,0 Q-38,-6 -30,-6 L30,-6 Q38,-6 44,0 Z" fill="#7a6038" />
      <path d="M-44,0 Q-38,-6 -30,-6 L30,-6 Q38,-6 44,0 Z" fill="none" stroke="#4d3f1f" strokeWidth=".8" opacity=".6" />
      {detail !== 'low' && (
        <g>
          {[-36, -28, 26, 36].map((px, i) => (
            <path key={i} d={`M${px - 2},-4 L${px},-7 L${px + 2},-4 Z`} fill="#6b8a4a" />
          ))}
        </g>
      )}
      {/* walls */}
      <rect x="-30" y="-26" width="60" height="20" fill="#7a716a" />
      <rect x="-30" y="-26" width="12" height="20" fill="#3a3530" />
      <g stroke="#3a3530" strokeWidth="1.4" fill="none">
        <rect x="-30" y="-26" width="15" height="10" />
        <rect x="-15" y="-26" width="15" height="10" />
        <rect x="0" y="-26" width="15" height="10" />
        <rect x="15" y="-26" width="15" height="10" />
        <rect x="-22" y="-16" width="15" height="10" />
        <rect x="-7" y="-16" width="14" height="10" />
        <rect x="7" y="-16" width="15" height="10" />
      </g>
      <g fill="#3a3530">
        <rect x="-30" y="-25" width="60" height="2" />
        <rect x="-30" y="-9" width="60" height="2" />
      </g>
      {/* vaulted roof */}
      <path d="M-34,-26 Q0,-42 34,-26 L34,-22 Q0,-38 -34,-22 Z" fill="#5b5346" />
      <path d="M-32,-25 Q0,-40 32,-25" fill="none" stroke="#9a8e72" strokeWidth=".8" opacity=".6" />
      {[-26, -14, -2, 10, 22].map((px, i) => {
        const yy = -26 - (1 - (Math.abs(px) / 30) ** 2) * 12;
        return <circle key={i} cx={px} cy={yy} r="1.4" fill="#3a3530" />;
      })}
      {/* iron door */}
      <rect x="-12" y="-26" width="24" height="20" fill="#3a2715" />
      <rect x="-12" y="-26" width="24" height="2" fill="#1a1410" />
      <rect x="-12" y="-22" width="24" height="2.5" fill="#3a3530" />
      <rect x="-12" y="-14" width="24" height="2.5" fill="#3a3530" />
      <g fill="#1a1410">
        {[-9, -4, 0, 5, 9].map((px, i) => <circle key={i} cx={px} cy="-20.5" r=".7" />)}
        {[-9, -4, 0, 5, 9].map((px, i) => <circle key={i} cx={px} cy="-12.5" r=".7" />)}
      </g>
      <g transform="translate(0 -8)">
        <rect x="-3" y="-3" width="6" height="5" rx="1" fill="#1a1410" />
        <path d="M-2,-3 L-2,-5 a2,2 0 0 1 4,0 L2,-3" fill="none" stroke="#1a1410" strokeWidth="1.2" />
        <circle cx="0" cy="0" r=".7" fill="#7c858d" />
      </g>
      {/* hazard chevron strip */}
      {detail !== 'low' && (
        <g transform="translate(0 -30)">
          <rect x="-14" y="-3" width="28" height="4" fill="#e0a83a" />
          <g fill="#1a1410">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <polygon key={i} points={`${-14 + i * 5},-3 ${-14 + i * 5 + 3},-3 ${-14 + i * 5},1 ${-14 + i * 5 - 3},1`} />
            ))}
          </g>
          <rect x="-14" y="-3" width="28" height="4" fill="none" stroke="#7a5c34" strokeWidth=".6" />
        </g>
      )}
      {/* skull plate */}
      {detail !== 'low' && (
        <g transform="translate(-22 -22)">
          <rect x="-3" y="-4" width="6" height="8" rx=".6" fill="#3a2715" />
          <circle cx="0" cy="-1" r="2" fill="#f5ecd6" />
          <rect x="-1.4" y=".6" width="2.8" height="1.5" fill="#f5ecd6" />
          <circle cx="-.6" cy="-1.3" r=".4" fill="#1a1410" />
          <circle cx=".6" cy="-1.3" r=".4" fill="#1a1410" />
        </g>
      )}
      {/* LIGHTNING ROD — with periodic spark arc (FIX) */}
      <g>
        <line x1="0" y1="-42" x2="0" y2="-54" stroke="#3a3530" strokeWidth="1.4" />
        <path d="M-1,-54 L1,-54 L0,-58 Z" fill="#bcc4c8" />
        <line x1="0" y1="-42" x2="-8" y2="-32" stroke="#3a3530" strokeWidth=".6" />
        {detail !== 'low' && (
          <g style={{ animation: 'flicker 4s ease-in-out infinite', transformOrigin: '0 -58px' }}>
            <circle cx="0" cy="-58" r="1.6" fill="#cfe4ee" opacity=".6" />
            <path d="M0,-58 L-1.4,-54 L.4,-54 L-.6,-50 L1.4,-54 L0,-54" stroke="#cfe4ee" strokeWidth=".5" fill="none" opacity=".7" />
          </g>
        )}
      </g>
      {/* slit vents */}
      <rect x="-26" y="-22" width="3" height="10" fill="#1a1410" />
      <rect x="23" y="-22" width="3" height="10" fill="#1a1410" />
      {/* PROPER BARRELS (FIX) */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-44 -2)">
            <ellipse cx="0" cy="0" rx="7" ry="1.6" fill="rgba(0,0,0,.3)" />
            {/* barrel body — slight bulge */}
            <path d="M-7,-1 Q-8,-6 -7,-11 L7,-11 Q8,-6 7,-1 Z" fill="#7a4a26" />
            {/* vertical staves */}
            <g stroke="#5a3a1f" strokeWidth=".5" opacity=".7">
              <line x1="-4" y1="-1" x2="-4.5" y2="-11" /><line x1="-1.5" y1="-1" x2="-1.5" y2="-11" />
              <line x1="1.5" y1="-1" x2="1.5" y2="-11" /><line x1="4" y1="-1" x2="4.5" y2="-11" />
            </g>
            {/* iron hoops */}
            <ellipse cx="0" cy="-11" rx="7" ry="1.6" fill="#3a3530" />
            <path d="M-7.6,-8 Q0,-7 7.6,-8 L7.4,-7 Q0,-6 -7.4,-7 Z" fill="#3a3530" />
            <path d="M-7.6,-4 Q0,-3 7.6,-4 L7.4,-3 Q0,-2 -7.4,-3 Z" fill="#3a3530" />
            {/* X warning */}
            <path d="M-3,-9 L3,-3 M3,-9 L-3,-3" stroke="#e0a83a" strokeWidth=".8" />
          </g>
          <g transform="translate(40 -1)">
            <ellipse cx="0" cy="0" rx="6" ry="1.4" fill="rgba(0,0,0,.3)" />
            <path d="M-6,-1 Q-7,-5 -6,-10 L6,-10 Q7,-5 6,-1 Z" fill="#7a4a26" />
            <g stroke="#5a3a1f" strokeWidth=".5" opacity=".7">
              <line x1="-3.4" y1="-1" x2="-3.8" y2="-10" /><line x1="-1.2" y1="-1" x2="-1.2" y2="-10" />
              <line x1="1.2" y1="-1" x2="1.2" y2="-10" /><line x1="3.4" y1="-1" x2="3.8" y2="-10" />
            </g>
            <ellipse cx="0" cy="-10" rx="6" ry="1.4" fill="#3a3530" />
            <path d="M-6.6,-7 Q0,-6 6.6,-7 L6.4,-6 Q0,-5 -6.4,-6 Z" fill="#3a3530" />
            <path d="M-2,-8 L2,-3 M2,-8 L-2,-3" stroke="#e0a83a" strokeWidth=".7" />
          </g>
          {/* no-flames sign */}
          <g transform="translate(28 -10)">
            <rect x="-.5" y="0" width="1" height="10" fill="#5a3a1f" />
            <rect x="-6" y="-6" width="12" height="6" fill="#fbf7eb" stroke="#3a2715" />
            <g transform="translate(0 -3)">
              <path d="M-2,-1 Q-1,2 0,0 Q1,2 2,-1 Q0,1 -1,-1 Q0,0 -2,-1 Z" fill="#c96442" />
              <line x1="-4" y1="2" x2="4" y2="-3" stroke="#c96442" strokeWidth="1.4" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
