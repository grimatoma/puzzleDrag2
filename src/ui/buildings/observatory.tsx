import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function ObservatoryIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-62 -108 124 124" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="36" ry="5" fill="rgba(0,0,0,.34)" />
      {/* night sky tint backdrop just above building (subtle) */}
      {detail !== 'low' && (
        <g>
          {/* stars twinkling above */}
          {[
            [-30, -76], [-20, -90], [-8, -82], [6, -94], [18, -78], [28, -88], [-12, -100], [14, -100],
          ].map(([sx, sy], i) => (
            <g key={i} transform={`translate(${sx} ${sy})`}>
              <circle r=".8" fill="#fff8c2"
                style={{ animation: `pulse2 ${2 + i * .2}s ${i * .3}s ease-in-out infinite`, transformOrigin: '0 0' }} />
            </g>
          ))}
          {/* one shooting star */}
          <g transform="translate(-26 -94)" style={{ animation: 'walk 6s linear infinite', '--end': '60px' }}>
            <line x1="0" y1="0" x2="6" y2="2" stroke="#fff8c2" strokeWidth=".6" strokeLinecap="round" opacity=".8" />
            <circle cx="6" cy="2" r=".6" fill="#fff8c2" />
          </g>
        </g>
      )}
      {/* stone foundation */}
      <rect x="-30" y="-12" width="60" height="12" fill={PAL.stone} />
      {/* curved BASE — drum with stone */}
      <ellipse cx="0" cy="-12" rx="28" ry="6" fill={PAL.stoneShade} />
      <rect x="-26" y="-46" width="52" height="34" fill="#cfc6b2" />
      <rect x="-26" y="-46" width="11" height="34" fill="#8a7c5a" />
      {/* coursed stones */}
      <g stroke="#8a7c5a" strokeWidth=".5" opacity=".55" fill="none">
        <line x1="-26" y1="-36" x2="26" y2="-36" />
        <line x1="-26" y1="-26" x2="26" y2="-26" />
        <line x1="-26" y1="-18" x2="26" y2="-18" />
      </g>
      {/* corner blocks */}
      <g fill="#8a7c5a">
        {[-40, -30, -20].map((py) => (
          <g key={py}><rect x="-26" y={py} width="3" height="5" /><rect x="23" y={py} width="3" height="5" /></g>
        ))}
      </g>
      {/* door */}
      <g transform="translate(0 -12)">
        <path d="M-6,0 L-6,-16 a6,6 0 0 1 12,0 L6,0 Z" fill={PAL.timber} />
        <path d="M-5,0 L-5,-15 a5,5 0 0 1 10,0 L5,0 Z" fill={PAL.timberSoft} />
        {/* astronomical symbol */}
        <circle cx="0" cy="-9" r="2" fill="#1a1410" />
        <path d="M0,-11 a2,2 0 0 0 0,4" fill="#fff8c2" />
        <circle cx="3" cy="-7" r=".8" fill={PAL.brass} />
        {/* step */}
        <rect x="-8" y="0" width="16" height="2" fill="#7a716a" />
      </g>
      {/* arched windows on either side */}
      {[-18, 18].map((px, i) => (
        <g key={i} transform={`translate(${px} -24)`}>
          <path d="M-3,0 L-3,-8 a3,3 0 0 1 6,0 L3,0 Z" fill="#3a2715" />
          <path d="M-2,0 L-2,-8 a2,2 0 0 1 4,0 L2,0 Z" fill="#fff8c2" opacity=".7"
            style={{ animation: `flicker ${3 + i}s ease-in-out infinite`, transformOrigin: `0 -4px` }} />
          <line x1="-2" y1="-4" x2="2" y2="-4" stroke="#3a2715" strokeWidth=".3" />
        </g>
      ))}
      {/* RING — base for the dome */}
      <rect x="-28" y="-50" width="56" height="4" fill="#5b5346" />
      <rect x="-28" y="-46" width="56" height="1.4" fill="#3a3530" />
      {/* DOME — split into two halves with vertical slit (signature) */}
      {/* left half (slightly behind) */}
      <path d="M-26,-50 Q-26,-72 -3,-72 L-3,-50 Z" fill="#7c858d" />
      <path d="M-26,-50 Q-26,-72 -16,-72 L-16,-50 Z" fill="#5b5346" />
      {/* metal seams */}
      <g stroke="#5b5346" strokeWidth=".5" opacity=".55" fill="none">
        <path d="M-23,-50 Q-23,-66 -5,-68" />
        <path d="M-20,-50 Q-20,-62 -7,-64" />
        <path d="M-15,-50 Q-15,-58 -8,-58" />
      </g>
      {/* right half */}
      <path d="M26,-50 Q26,-72 3,-72 L3,-50 Z" fill="#9aa3aa" />
      <g stroke="#7c858d" strokeWidth=".5" opacity=".55" fill="none">
        <path d="M23,-50 Q23,-66 5,-68" />
        <path d="M20,-50 Q20,-62 7,-64" />
        <path d="M15,-50 Q15,-58 8,-58" />
      </g>
      {/* SLIT — dark gap between dome halves */}
      <path d="M-3,-72 L3,-72 L3,-50 L-3,-50 Z" fill="#1a1410" />
      {/* TELESCOPE poking up through the slit (signature) */}
      <g transform="translate(0 -60) rotate(-22)">
        {/* tube */}
        <rect x="-2.4" y="-22" width="4.8" height="22" rx="1" fill="#3a3530" />
        <rect x="-2.4" y="-22" width="1.4" height="22" fill="#1a1410" />
        {/* mount rings */}
        <rect x="-2.8" y="-18" width="5.6" height="1.2" fill="#7c858d" />
        <rect x="-2.8" y="-10" width="5.6" height="1.2" fill="#7c858d" />
        <rect x="-2.8" y="-2" width="5.6" height="1.2" fill="#7c858d" />
        {/* objective lens at top */}
        <ellipse cx="0" cy="-22" rx="2.4" ry=".8" fill="#aed3e8" />
        <ellipse cx="0" cy="-22" rx="2.4" ry=".8" fill="none" stroke="#fbf7eb" strokeWidth=".3" />
        {/* eyepiece at bottom */}
        <rect x="-1.2" y="0" width="2.4" height="3" fill="#3a3530" />
        {/* counterweight arm */}
        <line x1="-2.4" y1="-10" x2="-6" y2="-7" stroke="#3a3530" strokeWidth="1.4" />
        <circle cx="-7" cy="-6" r="1.6" fill="#3a3530" />
      </g>
      {/* orbital line / Saturn-with-ring as decorative */}
      {detail !== 'low' && (
        <g transform="translate(22 -86)" style={{ animation: 'sway 8s ease-in-out infinite', transformOrigin: '0 0' }}>
          <circle r="2.4" fill="#e0a83a" />
          <ellipse rx="4" ry=".8" fill="none" stroke="#fbf7eb" strokeWidth=".4" opacity=".7" transform="rotate(-15)" />
        </g>
      )}
      {/* astronomer figure leaning on door — small */}
      {detail === 'high' && (
        <g transform="translate(-22 -12)">
          <ellipse cx="0" cy="0" rx="2" ry=".5" fill="rgba(0,0,0,.3)" />
          {/* robe */}
          <path d="M-2,-1 L-2.4,-6 L2.4,-6 L2,-1 Z" fill="#5a3a92" />
          <circle cx="0" cy="-7.6" r="1.6" fill="#e8c39a" />
          {/* pointy hat */}
          <path d="M-2,-8 L0,-12 L2,-8 Z" fill="#5a3a92" />
          <circle cx="0" cy="-12" r=".5" fill="#fff8c2" />
          {/* staff */}
          <line x1="2" y1="-7" x2="3" y2="-1" stroke="#5a3a1f" strokeWidth=".5" />
          <circle cx="2" cy="-7.6" r=".7" fill="#fff8c2" opacity=".7"
            style={{ animation: 'pulse2 2s ease-in-out infinite', transformOrigin: '2px -7.6px' }} />
        </g>
      )}
      {/* scroll lying on bench */}
      {detail === 'high' && (
        <g transform="translate(28 -6)">
          <ellipse cx="0" cy="0" rx="5" ry=".7" fill="rgba(0,0,0,.3)" />
          <rect x="-4" y="-3" width="8" height="2" fill="#7a5c34" />
          {/* scroll */}
          <rect x="-3" y="-4" width="6" height="1.4" fill="#fbf7eb" />
          <circle cx="-3" cy="-3.3" r=".7" fill="#fbf7eb" stroke="#7a5c34" strokeWidth=".3" />
          <circle cx="3" cy="-3.3" r=".7" fill="#fbf7eb" stroke="#7a5c34" strokeWidth=".3" />
          <line x1="-2" y1="-3.4" x2="2" y2="-3.4" stroke="#7a5c34" strokeWidth=".25" />
        </g>
      )}
    </svg>
  );
}
