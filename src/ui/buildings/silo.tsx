import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function SiloIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-62 -108 124 124" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="32" ry="5" fill="rgba(0,0,0,.32)" />
      <rect x="-22" y="-6" width="44" height="6" fill="#a8a399" />
      <rect x="-22" y="0" width="44" height="2" fill="#7a716a" opacity=".6" />
      <ellipse cx="0" cy="-6" rx="20" ry="5" fill="#7a716a" />
      <rect x="-20" y="-78" width="40" height="72" fill="#dde2e7" />
      <rect x="-20" y="-78" width="9" height="72" fill="#a8a399" />
      <rect x="14" y="-78" width="6" height="72" fill="#f6f4ef" />
      <g stroke="#a8a399" strokeWidth=".7" opacity=".7" fill="none">
        {[-72, -64, -56, -48, -40, -32, -24, -16].map(yy => <line key={yy} x1="-20" y1={yy} x2="20" y2={yy} />)}
      </g>
      <line x1="-4" y1="-78" x2="-4" y2="-6" stroke="#a8a399" strokeWidth=".6" opacity=".7" />
      {/* dome */}
      <path d="M-20,-78 Q0,-96 20,-78 Z" fill="#7c858d" />
      <path d="M-20,-78 Q0,-96 0,-78 Z" fill="rgba(0,0,0,.24)" />
      <ellipse cx="0" cy="-78" rx="20" ry="3" fill="#3a3d44" />
      <rect x="-3" y="-96" width="6" height="3" fill="#3a3d44" />
      <line x1="0" y1="-96" x2="0" y2="-100" stroke="#3a3d44" strokeWidth="1" />
      {/* PAINTED STENCIL STRIPE (FIX — replaces white placard) */}
      {detail !== 'low' && (
        <g>
          <rect x="-20" y="-46" width="34" height="10" fill="#c96442" opacity=".85" />
          <rect x="-20" y="-46" width="34" height="1" fill="#7a1d12" />
          <rect x="-20" y="-37" width="34" height="1" fill="#7a1d12" />
          <text x="-3" y="-39" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="7.6" fontWeight="800" fill="#fbf7eb" letterSpacing="1.5">GRAIN</text>
        </g>
      )}
      {/* ladder */}
      <g stroke="#3a3d44" strokeWidth="1.4" fill="none">
        <line x1="16" y1="-78" x2="16" y2="-8" />
        <line x1="19" y1="-78" x2="19" y2="-8" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="16" y1={-72 + i * 7} x2="19" y2={-72 + i * 7} />
        ))}
        {detail !== 'low' && [-66, -52, -38, -24].map((yy, i) => (
          <path key={i} d={`M16,${yy} q3,0 3,4 q0,4 -3,4`} stroke="#3a3d44" strokeWidth=".7" />
        ))}
      </g>
      {/* inspection windows on the left side, away from the paint band */}
      <circle cx="-13" cy="-58" r="2.4" fill="#3a2715" />
      <circle cx="-13" cy="-58" r="1.8" fill="#ffd98a" opacity=".7" />
      <circle cx="-13" cy="-28" r="2.4" fill="#3a2715" />
      <circle cx="-13" cy="-28" r="1.8" fill="#ffd98a" opacity=".7" />
      {/* hatch */}
      <rect x="-12" y="-22" width="14" height="14" fill="#3a3530" />
      <rect x="-12" y="-22" width="14" height="2" fill="#1a1410" />
      <rect x="-11" y="-20" width="12" height="10" fill="#5a3a1f" />
      <circle cx="-5" cy="-15" r="1" fill={PAL.brass} />
      {/* chute + clean grain pile */}
      <g transform="translate(2 -16)">
        <path d="M0,-2 L8,2 L8,4 L0,0 Z" fill="#7c858d" />
        <path d="M0,-2 L0,0 L8,4 L8,2 Z" fill="#3a3d44" />
        {detail !== 'low' && (
          <g>
            {[0, .3, .6, .9].map((d, i) => (
              <circle key={i} cx={6 + (i % 2 ? 1 : -1)} cy="4" r=".8" fill="#dab078"
                style={{ animation: `grainfall 1.4s ${d}s linear infinite`, transformOrigin: `6px 4px` }} />
            ))}
          </g>
        )}
        {/* grain pile with shape — three rounded mounds */}
        <ellipse cx="6" cy="15" rx="8" ry="1.8" fill="rgba(0,0,0,.25)" />
        <path d="M-2,14 Q6,8 14,14 Z" fill="#dab078" />
        <path d="M0,14 Q6,10 12,14 Z" fill="#e8c39a" />
        {/* scattered grains */}
        <g fill="#a89262">
          <circle cx="-1" cy="13.5" r=".5" /><circle cx="13" cy="13.5" r=".5" />
          <circle cx="15" cy="13" r=".4" />
        </g>
      </g>
      {/* sacks */}
      {detail === 'high' && (
        <g transform="translate(-32 -2)">
          <ellipse cx="0" cy="0" rx="7" ry="1.4" fill="rgba(0,0,0,.3)" />
          <path d="M-6,0 L-7,-8 Q-5,-12 0,-12 Q5,-12 7,-8 L6,0 Z" fill="#e6d29a" stroke="#a99262" strokeWidth=".7" />
          <path d="M-3,-12 q3,-2 6,0" stroke="#a99262" strokeWidth=".8" fill="none" />
          {/* "G" stamp */}
          <text x="0" y="-4" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="5" fontWeight="700" fill="#7a5c34" opacity=".6">G</text>
        </g>
      )}
    </svg>
  );
}
