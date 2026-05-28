import { svgState } from "./helpers.jsx";
import { PAL, RoofTiles } from "./v2kit.jsx";

export default function GranaryIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-50 -96 100 112" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <RoofTiles id="granary-tiles" color={PAL.terracotta} />
        <pattern id="granary-stone-band" patternUnits="userSpaceOnUse" width="16" height="8">
          <rect width="16" height="8" fill={PAL.stone} />
          <rect x="0" y="0" width="8" height="4" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".55" />
          <rect x="8" y="4" width="8" height="4" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".55" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="42" ry="5.5" fill="rgba(0,0,0,.30)" />

      {/* stone foundation ring */}
      <ellipse cx="0" cy="0" rx="36" ry="10" fill={PAL.stoneShade} />
      <rect x="-36" y="-8" width="72" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-30" y="-6" width="8" height="3" /><rect x="-14" y="-3" width="7" height="3" />
        <rect x="2" y="-6" width="8" height="3" /><rect x="18" y="-3" width="8" height="3" />
        <rect x="-28" y="-3" width="5" height="2" />
      </g>

      {/* --- TOWER BODY (round, stone-banded) --- */}
      {/* main cylinder — left shadow half */}
      <ellipse cx="0" cy="-44" rx="34" ry="44" fill={PAL.wallShadow} />
      {/* lit face covers full diameter; left shadow strip re-darkens the left edge below */}
      <rect x="-34" y="-88" width="68" height="80" fill={PAL.wallLight} />
      <ellipse cx="0" cy="-44" rx="34" ry="44" fill="none" stroke={PAL.stone} strokeWidth=".4" opacity=".4" />

      {/* horizontal stone banding (every 12 units up the tower) */}
      {([-8, -20, -32, -44, -56, -68, -80] as number[]).map((y) => (
        <rect key={y} x="-34" y={y} width="68" height="3" fill="url(#granary-stone-band)" opacity=".7" />
      ))}
      {/* mortar joint highlight on lit side */}
      <g stroke="rgba(255,255,255,.12)" strokeWidth=".8">
        {([-8, -20, -32, -44, -56, -68, -80] as number[]).map((y) => (
          <line key={y} x1="0" y1={y} x2="34" y2={y} />
        ))}
      </g>

      {/* curved silhouette edges (left-shadow strip) */}
      <rect x="-34" y="-88" width="12" height="80" fill={PAL.wallShadow} opacity=".55" />

      {/* --- CONICAL ROOF --- */}
      {/* conical tiles */}
      <polygon points="-36,-88 0,-96 36,-88" fill="url(#granary-tiles)" />
      {/* left slope shadow */}
      <polygon points="-36,-88 0,-96 -14,-88" fill="rgba(0,0,0,.24)" />
      {/* tile course lines on roof */}
      <g stroke={PAL.terracottaDark} strokeWidth=".6" opacity=".5">
        {([-96, -93, -90] as number[]).map((ry) => {
          const frac = (-ry - 88) / 8;
          const hw = frac * 36;
          return <line key={ry} x1={-hw} y1={ry} x2={hw} y2={ry} />;
        })}
      </g>
      {/* eave ring */}
      <rect x="-38" y="-88" width="76" height="3.5" fill={PAL.eave} />
      {/* peak finial */}
      <ellipse cx="0" cy="-96" rx="3" ry="2" fill={PAL.timberSoft} />
      <line x1="0" y1="-98" x2="0" y2="-96" stroke={PAL.brass} strokeWidth="1.4" />

      {/* --- ARCHED DOOR --- */}
      <path d="M-11,-8 L-11,-24 a11,11 0 0 1 22,0 L11,-8 Z" fill={PAL.timberSoft} />
      <path d="M-9,-8 L-9,-22 a9,9 0 0 1 18,0 L9,-8 Z" fill="#2a1a0a" />
      <path d="M-11,-24 a11,11 0 0 1 22,0" fill="none" stroke={PAL.wallTop} strokeWidth="2" />
      <ellipse cx="0" cy="-24" rx="3.5" ry="2" fill={PAL.stone} />
      <circle cx="6" cy="-15" r="1.4" fill={PAL.brass} />

      {/* --- GRAIN DUST / PARTICLES falling --- */}
      {detail !== 'low' && (
        <g>
          {([
            { cx: -8, dur: 2.6, delay: 0 },
            { cx: 2, dur: 3.1, delay: 0.5 },
            { cx: 12, dur: 2.4, delay: 1.1 },
            { cx: -2, dur: 3.6, delay: 1.8 },
            { cx: 8, dur: 2.9, delay: 0.8 },
            { cx: -14, dur: 3.3, delay: 0.3 },
          ]).map(({ cx, dur, delay }, i) => (
            <circle
              key={i}
              cx={cx}
              cy={-52}
              r={i % 3 === 0 ? 1.2 : 0.8}
              fill="#e8d090"
              style={{
                animation: `grainfall ${dur}s ${delay}s ease-in infinite`,
                transformOrigin: `${cx}px -52px`,
                opacity: 0.75,
              }}
            />
          ))}
        </g>
      )}

      {/* --- GRAIN SACKS stacked outside (right side) --- */}
      {detail === 'high' && (
        <g transform="translate(34 -2)">
          <ellipse cx="4" cy="0" rx="10" ry="1.8" fill="rgba(0,0,0,.25)" />
          {/* bottom sack */}
          <ellipse cx="0" cy="-5" rx="9" ry="5.5" fill="#c8a050" />
          <ellipse cx="0" cy="-5" rx="7" ry="4" fill="#d8b060" />
          <line x1="-4" y1="-7" x2="-2" y2="-3" stroke="#9a7030" strokeWidth=".8" opacity=".6" />
          <line x1="2" y1="-7" x2="4" y2="-3" stroke="#9a7030" strokeWidth=".8" opacity=".6" />
          {/* top sack (smaller, stacked) */}
          <ellipse cx="2" cy="-12" rx="7" ry="4.5" fill="#b89040" />
          <ellipse cx="2" cy="-12" rx="5.5" ry="3.2" fill="#c8a050" />
          <line x1="-1" y1="-14" x2="1" y2="-10" stroke="#9a7030" strokeWidth=".7" opacity=".6" />
          {/* sack tie knot */}
          <ellipse cx="2" cy="-16" rx="2.5" ry="1.2" fill="#9a7030" />
        </g>
      )}

      {/* --- SMALLER SACK left side --- */}
      {detail === 'high' && (
        <g transform="translate(-38 -2)">
          <ellipse cx="0" cy="0" rx="7" ry="1.5" fill="rgba(0,0,0,.22)" />
          <ellipse cx="0" cy="-4" rx="7" ry="4.5" fill="#b89040" />
          <ellipse cx="0" cy="-4" rx="5.5" ry="3.2" fill="#c8a050" />
          <ellipse cx="0" cy="-7.5" rx="2" ry="1" fill="#9a7030" />
        </g>
      )}
    </svg>
  );
}
