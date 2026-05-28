import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function ClockTowerIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-69 -122 138 138" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="34" ry="5" fill="rgba(0,0,0,.34)" />
      {/* stone base — wider plinth */}
      <rect x="-26" y="-12" width="52" height="12" fill={PAL.stone} />
      <g stroke={PAL.stoneShade} strokeWidth=".6" opacity=".6" fill="none">
        <line x1="-26" y1="-6" x2="26" y2="-6" />
        <line x1="-13" y1="-12" x2="-13" y2="-6" />
        <line x1="0" y1="-6" x2="0" y2="0" />
        <line x1="13" y1="-12" x2="13" y2="-6" />
      </g>
      {/* base shadow */}
      <rect x="-26" y="-12" width="6" height="12" fill={PAL.stoneShade} opacity=".7" />
      {/* arched ground-floor door */}
      <path d="M-6,-12 L-6,-2 a6,6 0 0 1 12,0 L6,-12 Z M-6,0 L6,0 L6,-12 L-6,-12 Z" fill={PAL.timber} />
      <path d="M-4,-12 L-4,-3 a4,4 0 0 1 8,0 L4,-12 Z" fill={PAL.timberSoft} />
      <line x1="0" y1="-12" x2="0" y2="-3" stroke={PAL.timber} strokeWidth=".6" />
      <circle cx="2" cy="-7" r=".8" fill={PAL.brass} />
      {/* TOWER SHAFT — tall, narrow, light cream stone */}
      <rect x="-18" y="-78" width="36" height="66" fill="#e0d4b0" />
      <rect x="-18" y="-78" width="9" height="66" fill="#b8a778" />
      {/* coursed stone bands */}
      <g stroke={PAL.timberSoft} strokeWidth=".7" opacity=".4" fill="none">
        <line x1="-18" y1="-28" x2="18" y2="-28" />
        <line x1="-18" y1="-46" x2="18" y2="-46" />
        <line x1="-18" y1="-64" x2="18" y2="-64" />
      </g>
      {/* corner quoins */}
      <g fill="#a89262">
        {[-78, -70, -62, -54, -46, -38, -30, -22, -14].map((py, i) => i % 2 === 0 && (
          <g key={py}><rect x="-18" y={py} width="4" height="6" /><rect x="14" y={py} width="4" height="6" /></g>
        ))}
      </g>
      {/* narrow slot windows on lower shaft */}
      <rect x="-2" y="-30" width="4" height="10" fill="#3a2715" />
      <rect x="-1.5" y="-29" width="3" height="8" fill="#ffd98a"
        style={{ animation: 'flicker 4s ease-in-out infinite', transformOrigin: '0 -25px', opacity: .8 }} />
      {/* CLOCK FACE (signature) */}
      <g transform="translate(0 -58)">
        {/* outer stone surround */}
        <circle r="15" fill="#9a8e72" />
        <circle r="13.5" fill="#3a2715" />
        <circle r="12" fill="#fbf7eb" />
        <circle r="12" fill="none" stroke="#3a2715" strokeWidth=".8" />
        {/* hour ticks */}
        <g stroke="#3a2715" strokeWidth="1" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = Math.cos(a) * 10, y1 = Math.sin(a) * 10;
            const x2 = Math.cos(a) * 11.5, y2 = Math.sin(a) * 11.5;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        {/* Roman numerals — 12, 3, 6, 9 */}
        <g fontFamily="Newsreader, Georgia, serif" fontSize="3" fontWeight="700" fill="#3a2715" textAnchor="middle">
          <text x="0" y="-7">XII</text>
          <text x="8.4" y="1">III</text>
          <text x="0" y="9.6">VI</text>
          <text x="-8.4" y="1">IX</text>
        </g>
        {/* HOUR HAND — slow rotation (60s per full sweep for visual punch) */}
        <g style={detail !== 'low' ? { animation: 'windmill 60s linear infinite', transformOrigin: '0 0' } : undefined}>
          <path d="M-.7,1 L-.7,-7 L0,-8 L.7,-7 L.7,1 Z" fill="#3a2715" />
        </g>
        {/* MINUTE HAND — faster */}
        <g style={detail !== 'low' ? { animation: 'windmill 12s linear infinite', transformOrigin: '0 0' } : undefined}>
          <path d="M-.5,1 L-.5,-10.5 L0,-11.2 L.5,-10.5 L.5,1 Z" fill="#3a2715" />
        </g>
        {/* center pin */}
        <circle r="1.4" fill="#7a1d12" />
        <circle r=".6" fill="#fbf7eb" />
      </g>
      {/* BELFRY — open archway above clock */}
      <rect x="-18" y="-78" width="36" height="3" fill="#7a5c34" />
      <g transform="translate(0 -86)">
        {/* arches */}
        <path d="M-14,8 L-14,-2 a4,4 0 0 1 8,0 L-6,8 Z" fill="#1a1410" />
        <path d="M-3,8 L-3,-2 a3,3 0 0 1 6,0 L3,8 Z" fill="#1a1410" />
        <path d="M6,8 L6,-2 a4,4 0 0 1 8,0 L14,8 Z" fill="#1a1410" />
        {/* BELL inside center arch (signature) */}
        <g transform="translate(0 1)">
          <g style={detail !== 'low' ? { animation: 'bell 3s ease-in-out infinite', transformOrigin: '0 -4px' } : undefined}>
            {/* yoke */}
            <line x1="-3.5" y1="-4" x2="3.5" y2="-4" stroke="#3a2715" strokeWidth=".8" />
            {/* bell body */}
            <path d="M-2.4,-3 L-3,2 L3,2 L2.4,-3 Q1.6,-4 0,-4 Q-1.6,-4 -2.4,-3 Z" fill="#e0a83a" stroke="#a87825" strokeWidth=".4" />
            <ellipse cx="0" cy="2" rx="3" ry=".5" fill="#a87825" />
            {/* clapper */}
            <line x1="0" y1="-1" x2="0" y2="3" stroke="#5a3a1f" strokeWidth=".5" />
            <circle cx="0" cy="3" r=".6" fill="#5a3a1f" />
          </g>
        </g>
        {/* columns between arches */}
        <rect x="-5" y="-2" width="2" height="10" fill="#a89262" />
        <rect x="3" y="-2" width="2" height="10" fill="#a89262" />
      </g>
      {/* PYRAMID ROOF + spire + weathervane */}
      <polygon points="-22,-78 0,-100 22,-78" fill="#3a4654" />
      <polygon points="-22,-78 0,-100 -8,-78" fill="rgba(0,0,0,.35)" />
      {/* slate seams */}
      <g stroke="#2a3548" strokeWidth=".4" opacity=".5" fill="none">
        <path d="M-18,-82 L18,-82" /><path d="M-13,-88 L13,-88" /><path d="M-7,-94 L7,-94" />
      </g>
      <rect x="-22" y="-78" width="44" height="2.4" fill="#1a1410" />
      {/* finial */}
      <line x1="0" y1="-100" x2="0" y2="-110" stroke="#3a3530" strokeWidth="1.4" />
      <circle cx="0" cy="-110" r="1.4" fill={PAL.brass} />
      {/* weathervane rooster (small) */}
      {detail !== 'low' && (
        <g transform="translate(0 -112)" style={{ animation: 'sway 9s ease-in-out infinite', transformOrigin: '0 2px' }}>
          <path d="M-3,0 L0,-2 L3,0 L2,1 L-2,1 Z" fill="#3a3530" />
          <line x1="-4" y1="2" x2="4" y2="2" stroke="#3a3530" strokeWidth=".4" />
          <text x="0" y="4" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="3" fontWeight="700" fill="#3a3530">N</text>
        </g>
      )}
      {/* DOVES on the belfry */}
      {detail !== 'low' && (
        <g>
          <g transform="translate(-22 -78)">
            <ellipse cx="0" cy="0" rx="1.8" ry=".8" fill="#dde2e7" />
            <circle cx="-1" cy="-.8" r=".7" fill="#dde2e7" />
          </g>
          <g transform="translate(22 -78)">
            <ellipse cx="0" cy="0" rx="1.8" ry=".8" fill="#dde2e7" />
            <circle cx="1" cy="-.8" r=".7" fill="#dde2e7" />
          </g>
        </g>
      )}
      {/* benches at base */}
      {detail === 'high' && (
        <g transform="translate(-34 -2)">
          <rect x="-5" y="-3" width="10" height="2" fill="#5a3a1f" />
          <rect x="-4" y="-1" width="1" height="2" fill="#5a3a1f" />
          <rect x="3" y="-1" width="1" height="2" fill="#5a3a1f" />
        </g>
      )}
      {/* fountain or marker stone */}
      {detail === 'high' && (
        <g transform="translate(34 -2)">
          <ellipse cx="0" cy="0" rx="6" ry="1.4" fill="rgba(0,0,0,.3)" />
          <ellipse cx="0" cy="-1" rx="6" ry="2" fill="#7a716a" />
          <ellipse cx="0" cy="-2" rx="6" ry="1.4" fill="#a89262" />
          <ellipse cx="0" cy="-2.2" rx="4" ry=".9" fill="#5aa0bd" />
          <circle cx="0" cy="-3" r=".7" fill="#cfe4ee"
            style={{ animation: 'v2pulse 2s ease-in-out infinite', transformOrigin: '0 -3px' }} />
        </g>
      )}
    </svg>
  );
}
