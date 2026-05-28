import { svgState } from "./helpers.jsx";
import { PAL, RoofTiles } from "./v2kit.jsx";

export default function MillIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-70 -124 140 140" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="44" ry="6" fill="rgba(0,0,0,.3)" />
      <ellipse cx="0" cy="-1" rx="58" ry="4" fill="rgba(255,236,194,.18)" />
      {/* stone base */}
      <rect x="-26" y="-8" width="52" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".55">
        <rect x="-22" y="-6" width="6" height="3" /><rect x="-10" y="-3" width="7" height="3" />
        <rect x="6" y="-6" width="6" height="3" /><rect x="18" y="-3" width="5" height="3" />
      </g>
      {/* TOWER body — slight taper */}
      <path d="M-24,-8 L-22,-72 L22,-72 L24,-8 Z" fill={PAL.wallLight} />
      <path d="M-24,-8 L-22,-72 L-8,-72 L-12,-8 Z" fill={PAL.wallShadow} />
      {/* stone bands */}
      <g stroke={PAL.timberSoft} strokeWidth="1" opacity=".4" fill="none">
        <path d="M-23.5,-22 L23.5,-22" /><path d="M-23,-36 L23,-36" />
        <path d="M-22.5,-50 L22.5,-50" /><path d="M-22.2,-64 L22.2,-64" />
      </g>
      {/* arched door */}
      <path d="M-7,-8 L-7,-22 a7,7 0 0 1 14,0 L7,-8 Z" fill={PAL.timber} />
      <path d="M-5,-8 L-5,-20 a5,5 0 0 1 10,0 L5,-8 Z" fill={PAL.timberSoft} />
      <circle cx="3" cy="-13" r="1.2" fill={PAL.brass} />
      {/* lit windows */}
      <rect x="-5" y="-36" width="10" height="9" fill="#3a2715" />
      <rect x="-4" y="-35" width="8" height="7" fill="#ffd98a"
        style={{ animation: 'flicker 3s ease-in-out infinite', transformOrigin: '0 -31px' }} />
      <line x1="0" y1="-35" x2="0" y2="-28" stroke="#3a2715" strokeWidth=".6" />
      <line x1="-4" y1="-31" x2="4" y2="-31" stroke="#3a2715" strokeWidth=".6" />
      <rect x="-3" y="-56" width="6" height="6" fill="#3a2715" />
      <rect x="-2.5" y="-55.5" width="5" height="5" fill="#ffd98a" />
      {/* BALCONY — sits between tower top and cap (FIX) */}
      {detail !== 'low' && (
        <g>
          <rect x="-28" y="-74" width="56" height="2" fill="#5a3a1f" />
          <rect x="-28" y="-72" width="56" height="1" fill="#3a2715" opacity=".6" />
          <g stroke="#5a3a1f" strokeWidth=".7">
            {[-24, -16, -8, 0, 8, 16, 24].map((px) => <line key={px} x1={px} y1="-72" x2={px} y2="-68" />)}
          </g>
          <line x1="-28" y1="-68" x2="28" y2="-68" stroke="#5a3a1f" strokeWidth=".7" />
        </g>
      )}
      {/* CONICAL CAP — taller, with finial */}
      <defs><RoofTiles id="mill2-tiles" color="#7c4a2e" /></defs>
      <polygon points="-26,-74 0,-100 26,-74" fill="url(#mill2-tiles)" />
      <polygon points="-26,-74 0,-100 -10,-74" fill="rgba(0,0,0,.32)" />
      <rect x="-26" y="-74" width="52" height="3" fill="#3a160a" />
      {/* finial spike on cap */}
      <line x1="0" y1="-100" x2="0" y2="-108" stroke="#3a3530" strokeWidth="1.4" />
      <circle cx="0" cy="-108" r="1.6" fill="#bda268" />
      {/* axle + sails */}
      <g transform="translate(0 -82)">
        <circle cx="0" cy="0" r="3.5" fill="#3a2715" />
        <circle cx="0" cy="0" r="1.4" fill="#bda268" />
        <g style={detail !== 'low' ? { animation: 'windmill 14s linear infinite', transformOrigin: '0 0' } : undefined}>
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg})`}>
              <rect x="-1" y="0" width="2" height="34" fill="#3a2715" />
              <path d="M-7,4 L-7,32 L0,30 L0,4 Z" fill="#f5ecd6" stroke="#3a2715" strokeWidth=".7" />
              <line x1="-4" y1="4" x2="-4" y2="32" stroke="#a99262" strokeWidth=".5" />
              <line x1="-7" y1="14" x2="0" y2="14" stroke="#a99262" strokeWidth=".5" />
              <line x1="-7" y1="22" x2="0" y2="22" stroke="#a99262" strokeWidth=".5" />
            </g>
          ))}
        </g>
      </g>
      {/* PROPER FLOUR SACKS (FIX) */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-40 -3)">
            <ellipse cx="0" cy="0" rx="7" ry="1.4" fill="rgba(0,0,0,.3)" />
            <path d="M-7,0 L-8,-10 Q-7,-13 -4,-13 L-2,-13 L-1,-15 L1,-15 L2,-13 L4,-13 Q7,-13 8,-10 L7,0 Z" fill="#fbf7eb" stroke="#a99262" strokeWidth=".7" />
            {/* tied neck shadow */}
            <path d="M-2,-13 Q0,-12 2,-13" stroke="#a99262" strokeWidth=".7" fill="none" />
            {/* "W" stamp on sack */}
            <path d="M-3,-7 L-2,-4 L-1,-6 L0,-4 L1,-7" stroke="#7a5c34" strokeWidth=".5" fill="none" />
            {/* spilled flour */}
            <g fill="#fbf7eb" opacity=".7">
              {[-44, -40, -36].map((px, i) => <circle key={i} cx={px} cy="0" r=".8" />)}
            </g>
          </g>
          <g transform="translate(36 -2)">
            <ellipse cx="0" cy="0" rx="6" ry="1.2" fill="rgba(0,0,0,.3)" />
            <path d="M-6,0 L-7,-9 Q-6,-11 -3,-11 L-1,-11 L0,-12 L1,-11 L3,-11 Q6,-11 7,-9 L6,0 Z" fill="#fbf7eb" stroke="#a99262" strokeWidth=".7" />
            <path d="M-2,-11 Q0,-10 2,-11" stroke="#a99262" strokeWidth=".7" fill="none" />
          </g>
        </g>
      )}
      {/* flour dust */}
      {detail !== 'low' && (
        <g>
          {[0, .6, 1.2, 1.8].map((d, i) => (
            <circle key={i} cx={-12 + i * 8} cy={-78} r="1" fill="#fbf7eb"
              style={{ '--px': `${(i % 2 ? 20 : -20)}px`, animation: `pollen ${5 + i}s ${d}s ease-in-out infinite`, transformOrigin: `${-12 + i * 8}px -78px` }} />
          ))}
        </g>
      )}
    </svg>
  );
}
