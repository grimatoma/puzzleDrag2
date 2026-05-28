import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function ChapelIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-68 -120 136 136" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="38" ry="5" fill="rgba(0,0,0,.34)" />
      {/* foundation */}
      <rect x="-32" y="-6" width="64" height="6" fill={PAL.stoneShade} />
      {/* main NAVE walls — pale stone */}
      <rect x="-30" y="-46" width="60" height="40" fill="#dad0bc" />
      <rect x="-30" y="-46" width="12" height="40" fill="#a89262" />
      {/* coursed stone */}
      <g stroke="#a89262" strokeWidth=".4" fill="none" opacity=".6">
        <line x1="-30" y1="-38" x2="30" y2="-38" />
        <line x1="-30" y1="-28" x2="30" y2="-28" />
        <line x1="-30" y1="-18" x2="30" y2="-18" />
        <line x1="-30" y1="-10" x2="30" y2="-10" />
      </g>
      {/* corner buttresses */}
      <rect x="-32" y="-26" width="4" height="20" fill="#a89262" />
      <rect x="28" y="-26" width="4" height="20" fill="#a89262" />
      {/* STEEP SLATE ROOF */}
      <polygon points="-34,-46 0,-72 34,-46" fill="#3a4654" />
      <polygon points="-34,-46 0,-72 -10,-46" fill="rgba(0,0,0,.34)" />
      <g stroke="#2a3548" strokeWidth=".4" opacity=".5" fill="none">
        <path d="M-26,-50 L26,-50" /><path d="M-18,-56 L18,-56" /><path d="M-10,-62 L10,-62" />
      </g>
      <rect x="-34" y="-46" width="68" height="3" fill="#1a1410" />
      {/* STEEPLE — tall narrow tower on top */}
      <g>
        {/* base block (mini room) */}
        <rect x="-5" y="-80" width="10" height="10" fill="#dad0bc" />
        <rect x="-5" y="-80" width="3" height="10" fill="#a89262" />
        {/* arched bell opening showing bell */}
        <path d="M-3,-72 L-3,-77 a3,3 0 0 1 6,0 L3,-72 Z" fill="#1a1410" />
        {/* bell inside (signature — swings) */}
        <g transform="translate(0 -78)">
          <g style={detail !== 'low' ? { animation: 'bell 4s ease-in-out infinite', transformOrigin: '0 -2px' } : undefined}>
            <line x1="-2" y1="-2" x2="2" y2="-2" stroke="#3a2715" strokeWidth=".6" />
            <path d="M-1.6,-1 L-2,3 L2,3 L1.6,-1 Q.8,-2 0,-2 Q-.8,-2 -1.6,-1 Z" fill="#e0a83a" stroke="#a87825" strokeWidth=".3" />
            <ellipse cx="0" cy="3" rx="2" ry=".4" fill="#a87825" />
            <line x1="0" y1="0" x2="0" y2="3.5" stroke="#5a3a1f" strokeWidth=".3" />
            <circle cx="0" cy="3.5" r=".4" fill="#5a3a1f" />
          </g>
        </g>
        {/* steeple pointy roof */}
        <polygon points="-7,-80 0,-100 7,-80" fill="#3a4654" />
        <polygon points="-7,-80 0,-100 -2,-80" fill="rgba(0,0,0,.34)" />
        <rect x="-7" y="-80" width="14" height="2" fill="#1a1410" />
        {/* CROSS finial */}
        <line x1="0" y1="-100" x2="0" y2="-112" stroke="#3a3530" strokeWidth="1.4" />
        <line x1="-3" y1="-108" x2="3" y2="-108" stroke="#3a3530" strokeWidth="1.4" />
      </g>
      {/* ROSE / STAINED GLASS WINDOW (signature) */}
      <g transform="translate(0 -32)">
        {/* outer stone surround */}
        <circle r="10" fill="#a89262" />
        <circle r="9" fill="#3a2715" />
        {/* tracery */}
        <circle r="8" fill="#5a8a72" />
        <g fill="#3a2715">
          {/* petal segments */}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <ellipse key={i} cx={Math.cos(a) * 4} cy={Math.sin(a) * 4} rx="2" ry="3"
              transform={`rotate(${(i / 8) * 360})`} fill={i % 4 === 0 ? '#c96442' : i % 4 === 1 ? '#5a3a92' : i % 4 === 2 ? '#e0a83a' : '#3a7088'} opacity=".95" />;
          })}
        </g>
        <circle r="2" fill="#fff8c2" />
        <circle r="8" fill="none" stroke="#3a2715" strokeWidth=".5" />
        {/* warm glow halo */}
        <circle r="11" fill="#fff8c2" opacity=".18"
          style={{ animation: 'flicker 3.4s ease-in-out infinite', transformOrigin: '0 0' }} />
        {/* mullion cross */}
        <line x1="-9" y1="0" x2="9" y2="0" stroke="#3a2715" strokeWidth=".5" />
        <line x1="0" y1="-9" x2="0" y2="9" stroke="#3a2715" strokeWidth=".5" />
      </g>
      {/* SIDE ARCH WINDOWS — narrow */}
      {[-22, 22].map((px, i) => (
        <g key={i} transform={`translate(${px} -16)`}>
          <path d="M-2,0 L-2,-10 a2,2 0 0 1 4,0 L2,0 Z" fill="#3a2715" />
          <path d="M-1.4,0 L-1.4,-10 a1.4,1.4 0 0 1 2.8,0 L1.4,0 Z" fill="#5a8a72" />
          <circle cx="0" cy="-8" r=".6" fill="#fff8c2" opacity=".7" />
        </g>
      ))}
      {/* ARCHED DOOR */}
      <g transform="translate(0 -6)">
        <path d="M-6,0 L-6,-16 a6,6 0 0 1 12,0 L6,0 Z" fill={PAL.timber} />
        <path d="M-5,0 L-5,-15 a5,5 0 0 1 10,0 L5,0 Z" fill={PAL.timberSoft} />
        {/* iron hinges */}
        <rect x="-5" y="-12" width="3" height=".8" fill="#3a3530" />
        <rect x="-5" y="-6" width="3" height=".8" fill="#3a3530" />
        <rect x="2" y="-12" width="3" height=".8" fill="#3a3530" />
        <rect x="2" y="-6" width="3" height=".8" fill="#3a3530" />
        {/* central line */}
        <line x1="0" y1="-16" x2="0" y2="0" stroke="#3a2715" strokeWidth=".5" />
        <circle cx="-2" cy="-7" r=".7" fill={PAL.brass} />
        <circle cx="2" cy="-7" r=".7" fill={PAL.brass} />
        {/* step */}
        <rect x="-8" y="0" width="16" height="2" fill="#9a8e72" />
      </g>
      {/* CANDLE GLOW in side windows */}
      {detail !== 'low' && (
        <g opacity=".5">
          <circle cx="-22" cy="-22" r="6" fill="#ffd56a"
            style={{ animation: 'flicker 3s ease-in-out infinite', transformOrigin: '-22px -22px' }} />
          <circle cx="22" cy="-22" r="6" fill="#ffd56a"
            style={{ animation: 'flicker 3.4s .5s ease-in-out infinite', transformOrigin: '22px -22px' }} />
        </g>
      )}
      {/* NOTE motes drifting (bell chime) */}
      {detail !== 'low' && (
        <g>
          {[0, 1.2, 2.4].map((d, i) => (
            <text key={i} x={6} y={-78} fontFamily="Newsreader, Georgia, serif" fontSize="4" fill="#3a3530" opacity=".7"
              style={{ '--nx': `${10 + i * 2}px`, animation: `note 3.6s ${d}s ease-out infinite`, transformOrigin: `6px -78px` }}>♪</text>
          ))}
        </g>
      )}
      {/* gravestones at side */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-36 -8)">
            <ellipse cx="0" cy="3" rx="3" ry=".6" fill="rgba(0,0,0,.3)" />
            <path d="M-2,2 L-2,-4 a2,2 0 0 1 4,0 L2,2 Z" fill="#9a8e72" />
            <line x1="-1" y1="-2" x2="1" y2="-2" stroke="#5b5346" strokeWidth=".3" />
            <line x1="0" y1="-3" x2="0" y2="-1" stroke="#5b5346" strokeWidth=".3" />
          </g>
          <g transform="translate(36 -8)">
            <ellipse cx="0" cy="3" rx="3" ry=".6" fill="rgba(0,0,0,.3)" />
            <path d="M-2,2 L-2,-3 a2,2 0 0 1 4,0 L2,2 Z" fill="#9a8e72" />
          </g>
        </g>
      )}
    </svg>
  );
}
