import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function ApiaryIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-44 -72 88 88" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="42" ry="5" fill="rgba(0,0,0,.28)" />
      {/* clover patch at base */}
      {detail !== 'low' && (
        <g>
          {[-36, -28, 26, 32, 38].map((px, i) => (
            <g key={i} transform={`translate(${px} -1)`}>
              <ellipse cx="0" cy="0" rx="2" ry=".7" fill="rgba(0,0,0,.2)" />
              <circle cx="-1" cy="-1.4" r=".8" fill="#7fa848" />
              <circle cx="1" cy="-1.4" r=".8" fill="#7fa848" />
              <circle cx="0" cy="-2" r=".8" fill="#7fa848" />
              <circle cx="0" cy="-2.6" r=".5" fill="#fbf7eb" />
            </g>
          ))}
        </g>
      )}
      {/* foundation */}
      <rect x="-26" y="-6" width="52" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-22" y="-4" width="6" height="2" /><rect x="-8" y="-4" width="6" height="2" />
        <rect x="8" y="-4" width="6" height="2" />
      </g>
      {/* WALLS — whitewashed */}
      <rect x="-24" y="-32" width="48" height="26" fill="#f6f0e0" />
      <rect x="-24" y="-32" width="10" height="26" fill="#c9b993" />
      <rect x="-24" y="-32" width="48" height="2" fill="#7a5c34" />
      {/* steep cedar shingle roof */}
      <polygon points="-30,-32 0,-52 30,-32" fill="#6b8a4a" />
      <polygon points="-30,-32 0,-52 -16,-32" fill="rgba(0,0,0,.3)" />
      <g stroke="rgba(0,0,0,.3)" strokeWidth=".5" opacity=".5">
        <path d="M-24,-38 L24,-38" /><path d="M-18,-44 L18,-44" />
      </g>
      <rect x="-30" y="-32" width="60" height="2.4" fill="#3a4a25" />
      {/* DOOR with bee carved into it */}
      <g transform="translate(0 -6)">
        <path d="M-5,0 L-5,-14 a5,5 0 0 1 10,0 L5,0 Z" fill={PAL.timber} />
        <path d="M-4,0 L-4,-13 a4,4 0 0 1 8,0 L4,0 Z" fill={PAL.timberSoft} />
        {/* bee carving */}
        <ellipse cx="0" cy="-8" rx="1.6" ry="1" fill="#e0a83a" />
        <ellipse cx="0" cy="-8" rx="1.6" ry="1" fill="none" stroke="#3a2715" strokeWidth=".4" />
        <line x1="-1" y1="-8.5" x2="-1" y2="-7.5" stroke="#3a2715" strokeWidth=".4" />
        <line x1="1" y1="-8.5" x2="1" y2="-7.5" stroke="#3a2715" strokeWidth=".4" />
        <circle cx="3" cy="-5" r=".8" fill={PAL.brass} />
      </g>
      {/* small high window */}
      <rect x="-15" y="-26" width="6" height="6" fill="#3a2715" />
      <rect x="-14.4" y="-25.4" width="5" height="5" fill="#ffd98a"
        style={{ animation: 'flicker 4s ease-in-out infinite', transformOrigin: '-12px -23px' }} />
      {/* beekeeper hat on the wall (with veil) */}
      {detail !== 'low' && (
        <g transform="translate(12 -22)">
          <rect x="-3" y="-3" width="6" height="2" fill="#5a3a1f" />
          <ellipse cx="0" cy="-2" rx="3.4" ry="1" fill="#5a3a1f" />
          <rect x="-2.4" y="-2" width="4.8" height="5" fill="#fbf7eb" opacity=".8" />
          <ellipse cx="0" cy="3" rx="2.4" ry=".6" fill="#fbf7eb" opacity=".7" />
          <g stroke="#a89262" strokeWidth=".3" opacity=".7">
            <line x1="-2" y1="-1" x2="-2" y2="3" /><line x1="0" y1="-1" x2="0" y2="3" />
            <line x1="2" y1="-1" x2="2" y2="3" />
            <line x1="-2.4" y1="0" x2="2.4" y2="0" /><line x1="-2.4" y1="2" x2="2.4" y2="2" />
          </g>
        </g>
      )}
      {/* THREE BEEHIVE BOXES out front (signature) */}
      {[-18, 0, 18].map((bx, i) => (
        <g key={i} transform={`translate(${bx} -8)`}>
          <ellipse cx="0" cy="2" rx="7" ry="1.2" fill="rgba(0,0,0,.32)" />
          {/* hive box — stacked supers */}
          <rect x="-6" y="-2" width="12" height="4" fill="#e8c266" stroke="#a98a4a" strokeWidth=".4" />
          <rect x="-6" y="-6" width="12" height="4" fill="#f4d262" stroke="#a98a4a" strokeWidth=".4" />
          <rect x="-6" y="-10" width="12" height="4" fill="#e8c266" stroke="#a98a4a" strokeWidth=".4" />
          {/* angled gabled roof */}
          <path d="M-7,-10 L0,-14 L7,-10 Z" fill="#7a5c34" />
          <path d="M-7,-10 L0,-14 L-3,-10 Z" fill="rgba(0,0,0,.3)" />
          {/* entrance landing */}
          <rect x="-3" y="-1" width="6" height="1" fill="#3a2715" />
          {/* small slit entrance */}
          <rect x="-2" y="-1.6" width="4" height=".7" fill="#1a1410" />
        </g>
      ))}
      {/* BEES (signature) — streams flying out of hives + foraging */}
      {detail !== 'low' && (
        <g>
          {[-18, 0, 18].map((hx, hi) => (
            <g key={hi}>
              {[0, 0.8, 1.6, 2.4].map((d, i) => (
                <g key={i} transform={`translate(${hx} -9)`}
                  style={{ '--px': `${(i % 2 ? 24 : -24) + (hx * 0.3)}px`, animation: `pollen ${4 + i * 0.5}s ${d + hi * 0.4}s ease-in-out infinite`, transformOrigin: '0 0' }}>
                  {/* tiny bee */}
                  <ellipse cx="0" cy="0" rx=".8" ry=".5" fill="#f4d262" />
                  <line x1="-.6" y1="0" x2=".6" y2="0" stroke="#1a1410" strokeWidth=".3" />
                  {/* wing blur */}
                  <ellipse cx="0" cy="-.6" rx=".7" ry=".3" fill="#fbf7eb" opacity=".6" />
                </g>
              ))}
            </g>
          ))}
        </g>
      )}
      {/* honey jar on porch */}
      {detail === 'high' && (
        <g transform="translate(-30 -6)">
          <ellipse cx="0" cy="0" rx="3" ry=".6" fill="rgba(0,0,0,.3)" />
          <path d="M-2.4,0 L-2.4,-4 Q-2.4,-5 -1.4,-5 L1.4,-5 Q2.4,-5 2.4,-4 L2.4,0 Z" fill="#e0a83a" />
          <rect x="-2" y="-5" width="4" height="1" fill="#fbf7eb" />
          <rect x="-1.4" y="-3" width="2.8" height="1.6" fill="#fbf7eb" />
          <text x="0" y="-1.7" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="1.4" fontWeight="700" fill="#3a2715">HONEY</text>
        </g>
      )}
      {/* sunflower (bees love it) */}
      {detail === 'high' && (
        <g transform="translate(32 -6)">
          <line x1="0" y1="0" x2="0" y2="-14" stroke="#4d6b25" strokeWidth=".8" />
          <ellipse cx="-2" cy="-8" rx="1.4" ry=".7" fill="#7fa848" transform="rotate(-30 -2 -8)" />
          {/* petal disc */}
          <g transform="translate(0 -14)">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <ellipse key={i} cx={Math.cos(a) * 2.4} cy={Math.sin(a) * 2.4} rx="1.4" ry=".7"
                transform={`rotate(${(i / 12) * 360})`} fill="#f4d262" />;
            })}
            <circle r="2" fill="#7a5c34" />
            <g fill="#5a3a1f">
              <circle cx=".7" cy=".7" r=".3" /><circle cx="-.7" cy=".7" r=".3" />
              <circle cx="0" cy="-.7" r=".3" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
