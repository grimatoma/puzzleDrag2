import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function WatchtowerIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-61 -106 122 122" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="32" ry="5" fill="rgba(0,0,0,.36)" />
      {/* low curtain wall stub on either side */}
      <rect x="-40" y="-12" width="14" height="12" fill={PAL.stone} />
      <rect x="26" y="-12" width="14" height="12" fill={PAL.stone} />
      {/* crenellations on stub walls */}
      <g fill={PAL.stone}>
        <rect x="-40" y="-15" width="3" height="3" /><rect x="-34" y="-15" width="3" height="3" />
        <rect x="-28" y="-15" width="2" height="3" />
        <rect x="29" y="-15" width="3" height="3" /><rect x="35" y="-15" width="3" height="3" />
        <rect x="26" y="-15" width="2" height="3" />
      </g>
      {/* stone block lines on stub walls */}
      <g stroke={PAL.stoneShade} strokeWidth=".5" opacity=".5">
        <line x1="-40" y1="-7" x2="-26" y2="-7" /><line x1="-33" y1="-12" x2="-33" y2="-7" />
        <line x1="26" y1="-7" x2="40" y2="-7" /><line x1="33" y1="-12" x2="33" y2="-7" />
      </g>
      {/* MAIN TOWER body — round, in front */}
      <ellipse cx="0" cy="-4" rx="22" ry="6" fill={PAL.stoneShade} />
      <path d="M-22,-4 L-20,-66 L20,-66 L22,-4 Z" fill={PAL.stone} />
      <path d="M-22,-4 L-20,-66 L-8,-66 L-12,-4 Z" fill={PAL.stoneShade} />
      {/* coursed stone bands */}
      <g stroke={PAL.stoneShade} strokeWidth=".6" fill="none" opacity=".55">
        <path d="M-21.5,-18 L21.5,-18" /><path d="M-21,-32 L21,-32" />
        <path d="M-20.5,-46 L20.5,-46" /><path d="M-20.2,-60 L20.2,-60" />
      </g>
      {/* HEAVY ARCHED DOOR (raised) */}
      <path d="M-6,-4 L-6,-18 a6,6 0 0 1 12,0 L6,-4 Z" fill="#1a1410" />
      <path d="M-5,-4 L-5,-18 a5,5 0 0 1 10,0 L5,-4 Z" fill="#3a2715" />
      {/* portcullis bars */}
      <g stroke="#7c858d" strokeWidth=".4">
        <line x1="-3.5" y1="-4" x2="-3.5" y2="-15" />
        <line x1="0" y1="-4" x2="0" y2="-17" />
        <line x1="3.5" y1="-4" x2="3.5" y2="-15" />
        <line x1="-4" y1="-7" x2="4" y2="-7" />
        <line x1="-4" y1="-11" x2="4" y2="-11" />
      </g>
      {/* arrow slit windows up the tower */}
      {[-38, -52].map(yy => (
        <g key={yy}>
          <rect x="-1.4" y={yy - 4} width="2.8" height="8" fill="#1a1410" />
          <rect x="-1.4" y={yy} width="2.8" height="2" fill="#1a1410" />
          <rect x="-3" y={yy} width="6" height="2" fill="#1a1410" />
          {/* inner glow */}
          <rect x="-1" y={yy - 2} width="2" height="2" fill="#ffd98a" opacity=".7"
            style={{ animation: 'flicker 4s ease-in-out infinite', transformOrigin: `0 ${yy - 1}px` }} />
        </g>
      ))}
      {/* MACHICOLATIONS — corbelled brackets under battlements */}
      <g fill={PAL.stoneShade}>
        {[-20, -14, -8, -2, 4, 10, 16].map((px, i) => (
          <path key={i} d={`M${px},-66 L${px + 4},-66 L${px + 3},-68 L${px + 1},-68 Z`} />
        ))}
      </g>
      {/* BATTLEMENT TOP — crown with crenels (signature) */}
      <rect x="-23" y="-72" width="46" height="6" fill={PAL.stone} />
      <rect x="-23" y="-72" width="46" height="1.4" fill={PAL.stoneShade} />
      <g fill={PAL.stone}>
        {[-22, -16, -10, -4, 2, 8, 14, 20].map((px, i) => (
          <rect key={i} x={px} y="-78" width="4" height="6" />
        ))}
      </g>
      {/* inside of battlement is darker */}
      <rect x="-19" y="-72" width="38" height="3" fill="rgba(0,0,0,.3)" />
      {/* PATROLLING GUARD silhouette (signature) */}
      {detail !== 'low' && (
        <g style={{ animation: 'walk 8s ease-in-out infinite alternate', transformOrigin: '0 -72px', '--end': '20px' }}>
          <g transform="translate(-10 -72)">
            {/* spear */}
            <line x1="2" y1="-12" x2="2" y2="2" stroke="#3a2715" strokeWidth=".8" />
            <path d="M1,-13 L3,-13 L2,-15 Z" fill="#7c858d" />
            {/* body */}
            <rect x="-1.4" y="-8" width="3.4" height="6" fill="#3a3530" />
            {/* head with helmet */}
            <circle cx=".3" cy="-9" r="1.4" fill="#7c858d" />
            <rect x="-1.2" y="-10.4" width="3" height="1.4" fill="#3a3530" />
            {/* legs */}
            <rect x="-1.4" y="-2" width="1.4" height="3" fill="#3a2715" />
            <rect x=".6" y="-2" width="1.4" height="3" fill="#3a2715" />
          </g>
        </g>
      )}
      {/* FLAG on tall pole — snaps in wind (signature) */}
      <line x1="14" y1="-78" x2="14" y2="-96" stroke="#3a2715" strokeWidth="1" />
      <circle cx="14" cy="-96" r="1" fill={PAL.brass} />
      {detail !== 'low' && (
        <g style={{ animation: 'sway 2.4s ease-in-out infinite', transformOrigin: '14px -94px' }}>
          <path d="M14,-94 L24,-92 L22,-90 L24,-88 L14,-86 Z" fill="#7a1d12" />
          <path d="M16,-93 L20,-92 L20,-87 L16,-88 Z" fill="#fbf7eb" opacity=".4" />
          {/* small icon — sword */}
          <line x1="17" y1="-91.5" x2="20" y2="-89.5" stroke="#fbf7eb" strokeWidth=".6" />
          <line x1="16.5" y1="-90.5" x2="17.5" y2="-90.5" stroke="#fbf7eb" strokeWidth=".6" />
        </g>
      )}
      {/* TORCH brackets on tower wall */}
      {detail !== 'low' && (
        <g>
          <g transform="translate(-16 -20)">
            <rect x="0" y="-1" width="2" height="2" fill="#3a3530" />
            <rect x=".4" y="-3" width="1.2" height="3" fill="#3a2715" />
            <g style={{ animation: 'flicker 1.2s ease-in-out infinite', transformOrigin: '1px -3px' }}>
              <path d="M-.6,-3 Q1,-7 2.6,-3 Q1,-5 -.6,-3 Z" fill="#ffb14a" />
            </g>
          </g>
          <g transform="translate(14 -20)">
            <rect x="-2" y="-1" width="2" height="2" fill="#3a3530" />
            <rect x="-1.6" y="-3" width="1.2" height="3" fill="#3a2715" />
            <g style={{ animation: 'flicker 1.3s .3s ease-in-out infinite', transformOrigin: '-1px -3px' }}>
              <path d="M-2.6,-3 Q-1,-7 .6,-3 Q-1,-5 -2.6,-3 Z" fill="#ffb14a" />
            </g>
          </g>
        </g>
      )}
      {/* lookout brazier on battlement */}
      {detail === 'high' && (
        <g transform="translate(16 -72)">
          <rect x="-2" y="-4" width="4" height="4" fill="#3a3530" />
          <line x1="-2" y1="0" x2="-3" y2="2" stroke="#3a3530" strokeWidth=".5" />
          <line x1="2" y1="0" x2="3" y2="2" stroke="#3a3530" strokeWidth=".5" />
          <g style={{ animation: 'flicker 1.4s ease-in-out infinite', transformOrigin: '0 -4px' }}>
            <path d="M-2,-4 Q0,-9 2,-4 Z" fill="#ffb14a" />
            <path d="M-1,-4 Q0,-7 1,-4 Z" fill="#fff8c2" />
          </g>
          {/* embers rising */}
          {[0, 1].map((d, i) => (
            <circle key={i} cx="0" cy="-4" r=".4" fill="#ffb14a"
              style={{ '--sx': `${(i % 2 ? 3 : -3)}px`, animation: `ember 2.4s ${d}s ease-out infinite`, transformOrigin: '0 -4px' }} />
          ))}
        </g>
      )}
      {/* small CROW perched on flag pole */}
      {detail === 'high' && (
        <g transform="translate(14 -82)" style={{ animation: 'bob 2.4s ease-in-out infinite' }}>
          <ellipse cx="0" cy="0" rx="1.6" ry=".8" fill="#1a1410" />
          <circle cx="-.8" cy="-1" r=".7" fill="#1a1410" />
          <path d="M-1.4,-1 L-2.2,-.6 L-1.4,-.4 Z" fill="#1a1410" />
          <circle cx="-1" cy="-1.1" r=".15" fill="#e0a83a" />
        </g>
      )}
    </svg>
  );
}
