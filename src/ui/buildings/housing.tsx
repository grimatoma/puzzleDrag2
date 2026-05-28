import { svgState } from "./helpers.jsx";
import { PAL, Smoke } from "./v2kit.jsx";

export default function HousingIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-46 -76 92 92" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="38" ry="4" fill="rgba(0,0,0,.26)" />
      <rect x="-30" y="-6" width="60" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-26" y="-4" width="6" height="2" /><rect x="-14" y="-4" width="6" height="2" />
        <rect x="0" y="-4" width="6" height="2" /><rect x="14" y="-4" width="6" height="2" />
      </g>
      {/* walls */}
      <rect x="-28" y="-32" width="56" height="26" fill="#f4dfcd" />
      <rect x="-28" y="-32" width="10" height="26" fill="#c8a98e" />
      <rect x="-28" y="-32" width="56" height="2" fill="#7a5c34" />
      {/* THATCH roof */}
      <path d="M-34,-32 L0,-52 L34,-32 Z" fill="#c89f4f" />
      <path d="M-34,-32 L0,-52 L-12,-32 Z" fill="rgba(0,0,0,.22)" />
      <g stroke="#7a5c34" strokeWidth=".5" fill="none" opacity=".55">
        {Array.from({ length: 14 }, (_, i) => {
          const t = i / 13;
          const x1 = -34 + 68 * t;
          const peakY = -52 + Math.abs(t - .5) * 40;
          return <line key={i} x1={x1} y1={peakY + 1} x2={x1} y2={-32 + Math.sin(i) * .8} />;
        })}
      </g>
      <path d="M-34,-32 L-32,-30 L-28,-31 L-24,-29 L-20,-31 L-16,-29 L-12,-31 L-8,-29 L-4,-31 L0,-29 L4,-31 L8,-29 L12,-31 L16,-29 L20,-31 L24,-29 L28,-31 L32,-30 L34,-32 Z" fill="#c89f4f" />
      <rect x="-2" y="-53" width="4" height="3" fill="#7a5c34" />
      {/* chimney + smoke (FIX: add plume) */}
      <rect x="-16" y="-46" width="6" height="10" fill="#a55a3a" />
      <rect x="-17" y="-47" width="8" height="2.4" fill="#5a2415" />
      {detail !== 'low' && <Smoke x={-13} y={-47} scale={0.7} count={3} />}
      {/* window + flower box */}
      <g transform="translate(-12 -22)">
        <rect x="-11" y="-6" width="3" height="12" fill="#7fa848" />
        <rect x="-11" y="-6" width="3" height="2" fill="#4d6b25" />
        <rect x="8" y="-6" width="3" height="12" fill="#7fa848" />
        <rect x="8" y="-6" width="3" height="2" fill="#4d6b25" />
        <rect x="-7" y="-6" width="14" height="12" fill="#3a2715" />
        <rect x="-6" y="-5" width="12" height="10" fill="#aed3e8" />
        <line x1="0" y1="-5" x2="0" y2="5" stroke="#3a2715" strokeWidth=".6" />
        <line x1="-6" y1="0" x2="6" y2="0" stroke="#3a2715" strokeWidth=".6" />
        <path d="M-6,-5 L-5,-1 L-3,-5 Z" fill="#fbf7eb" opacity=".7" />
        <path d="M6,-5 L5,-1 L3,-5 Z" fill="#fbf7eb" opacity=".7" />
        <rect x="-8" y="6" width="16" height="3.5" fill="#7a3d24" />
        <circle cx="-5" cy="5.5" r="1.4" fill="#dba7c4" />
        <circle cx="-1" cy="5.5" r="1.4" fill="#e58a4f" />
        <circle cx="3" cy="5.5" r="1.4" fill="#f4d262" />
        <circle cx="7" cy="5.5" r="1.4" fill="#dba7c4" />
      </g>
      {/* round-top door */}
      <g transform="translate(14 -6)">
        <path d="M-7,0 L-7,-12 a7,7 0 0 1 14,0 L7,0 Z" fill={PAL.timber} />
        <path d="M-5,0 L-5,-10 a5,5 0 0 1 10,0 L5,0 Z" fill={PAL.timberSoft} />
        <line x1="0" y1="-14" x2="0" y2="0" stroke={PAL.timber} strokeWidth=".6" />
        <circle cx="3" cy="-6" r="1" fill={PAL.brass} />
        <rect x="-9" y="0" width="18" height="2" fill="#7a716a" />
      </g>
      {/* LAUNDRY LINE — clothes hang BELOW the line (FIX) */}
      {detail !== 'low' && (
        <g>
          <rect x="34" y="-32" width="1.6" height="28" fill="#5a3a1f" />
          {/* sag-curve line */}
          <path d="M-10,-36 Q12,-30 35,-32" fill="none" stroke="#3a2715" strokeWidth=".5" />
          {/* sky-blue shirt — hung below line at x=-2 */}
          <g style={{ animation: 'sway 5s ease-in-out infinite', transformOrigin: '2px -35px' }}>
            {/* pins */}
            <rect x="-3" y="-36" width="1" height="1.5" fill="#3a2715" />
            <rect x="5" y="-35" width="1" height="1.5" fill="#3a2715" />
            {/* shirt — wider at top, narrower at bottom (hangs from shoulders) */}
            <path d="M-3,-35 L5,-34 L7,-30 L4,-29 L4,-26 L-2,-27 L-2,-30 L-5,-31 Z" fill="#aed3e8" stroke="#7a9aae" strokeWidth=".3" />
          </g>
          {/* small red garment — hung at x=12 */}
          <g style={{ animation: 'sway 4s .5s ease-in-out infinite', transformOrigin: '14px -32px' }}>
            <rect x="11" y="-33" width="1" height="1.5" fill="#3a2715" />
            <rect x="17" y="-32" width="1" height="1.5" fill="#3a2715" />
            <path d="M11,-32 L17,-31 L17,-27 L11,-28 Z" fill="#e58a4f" stroke="#a55a3a" strokeWidth=".3" />
          </g>
          {/* white sheet — hung at x=26 */}
          <g style={{ animation: 'sway 6s 1s ease-in-out infinite', transformOrigin: '28px -32px' }}>
            <rect x="22" y="-33" width="1" height="1.5" fill="#3a2715" />
            <rect x="32" y="-32.5" width="1" height="1.5" fill="#3a2715" />
            <path d="M22,-32 L32,-31.5 L32,-24 L22,-24.5 Z" fill="#fbf7eb" stroke="#c9b993" strokeWidth=".3" />
            {/* wrinkles */}
            <path d="M24,-30 Q27,-27 31,-29" stroke="#e8dcc2" strokeWidth=".3" fill="none" opacity=".7" />
          </g>
        </g>
      )}
      {/* garden detail */}
      {detail === 'high' && (
        <g>
          <g transform="translate(-32 -6)">
            <ellipse cx="0" cy="0" rx="5" ry="1.4" fill="rgba(0,0,0,.2)" />
            <circle cx="-2" cy="-2" r="3" fill="#6b8a4a" />
            <circle cx="2" cy="-3" r="3.2" fill="#7fa848" />
            <circle cx="0" cy="-5" r="2" fill="#7fa848" />
            <circle cx="-2" cy="-5" r=".8" fill="#dba7c4" />
            <circle cx="2" cy="-6" r=".8" fill="#f4d262" />
          </g>
          <g transform="translate(-18 -4)" style={{ animation: 'wiggle 4s ease-in-out infinite' }}>
            <ellipse cx="0" cy="0" rx="3.6" ry="1.4" fill="#3a2715" />
            <circle cx="-2.5" cy="-2.2" r="2" fill="#3a2715" />
            <path d="M-3.5,-3.5 L-2.8,-2.4 L-2,-3.5 Z" fill="#3a2715" />
            <circle cx="-3.2" cy="-2.2" r=".25" fill="#e0a83a" />
            <path d="M3,0 q3,-3 3,-5" stroke="#3a2715" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </g>
        </g>
      )}
    </svg>
  );
}
