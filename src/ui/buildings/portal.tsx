import { svgState } from "./helpers.jsx";

export default function PortalIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";

  // Purple-grey stone palette for the portal pillars
  const pillarStone = "#4a3a6a";
  const pillarShade = "#2e2248";
  const pillarLight = "#6a5a8a";
  const runeGlow = isBuilt ? "#c080ff" : "#3a2a5a";
  const portalInner = isBuilt ? "#7030c8" : "#1a1030";
  const runeColor = isBuilt ? "#e0b0ff" : "#4a3a6a";

  return (
    <svg viewBox="-52 -108 104 120" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="46" ry="5.5" fill="rgba(0,0,0,.36)" />
      <ellipse cx="0" cy="0" rx="30" ry="3" fill="rgba(80,30,140,.18)" />

      {/* === STONE BASE BLOCKS (left and right pillar bases) === */}
      {/* left base */}
      <rect x="-38" y="-12" width="18" height="12" fill={pillarStone} />
      <g fill={pillarShade} opacity=".5">
        <rect x="-36" y="-10" width="8" height="3" />
        <rect x="-30" y="-6" width="7" height="3" />
        <rect x="-36" y="-3" width="5" height="2" />
      </g>
      <rect x="-40" y="-14" width="22" height="4" rx=".5" fill={pillarLight} opacity=".7" />

      {/* right base */}
      <rect x="20" y="-12" width="18" height="12" fill={pillarStone} />
      <g fill={pillarShade} opacity=".5">
        <rect x="22" y="-10" width="8" height="3" />
        <rect x="23" y="-6" width="7" height="3" />
        <rect x="28" y="-3" width="5" height="2" />
      </g>
      <rect x="18" y="-14" width="22" height="4" rx=".5" fill={pillarLight} opacity=".7" />

      {/* === STONE PILLARS (two tall, purple-grey) === */}
      {/* left pillar */}
      <rect x="-36" y="-96" width="16" height="84" fill={pillarStone} />
      {/* left pillar inner shadow */}
      <rect x="-36" y="-96" width="5" height="84" fill={pillarShade} opacity=".45" />
      {/* left pillar highlight */}
      <rect x="-22" y="-96" width="2" height="84" fill={pillarLight} opacity=".3" />
      {/* left pillar cap */}
      <rect x="-38" y="-98" width="20" height="5" rx=".5" fill={pillarLight} />
      {/* rune carving on left pillar */}
      <g stroke={runeColor} strokeWidth=".8" opacity=".55">
        <line x1="-28" y1="-80" x2="-28" y2="-60" />
        <line x1="-32" y1="-74" x2="-24" y2="-74" />
        <circle cx="-28" cy="-70" r="4" fill="none" />
        <line x1="-31" y1="-77" x2="-25" y2="-63" />
        <line x1="-25" y1="-77" x2="-31" y2="-63" />
      </g>
      {/* second rune carvings lower on left */}
      <g stroke={runeColor} strokeWidth=".7" opacity=".4">
        <line x1="-28" y1="-52" x2="-28" y2="-40" />
        <line x1="-32" y1="-48" x2="-24" y2="-44" />
        <line x1="-24" y1="-48" x2="-32" y2="-44" />
      </g>

      {/* right pillar */}
      <rect x="20" y="-96" width="16" height="84" fill={pillarStone} />
      {/* right pillar inner shadow */}
      <rect x="20" y="-96" width="5" height="84" fill={pillarShade} opacity=".45" />
      {/* right pillar highlight */}
      <rect x="34" y="-96" width="2" height="84" fill={pillarLight} opacity=".3" />
      {/* right pillar cap */}
      <rect x="18" y="-98" width="20" height="5" rx=".5" fill={pillarLight} />
      {/* rune carving on right pillar */}
      <g stroke={runeColor} strokeWidth=".8" opacity=".55">
        <line x1="28" y1="-80" x2="28" y2="-60" />
        <line x1="24" y1="-74" x2="32" y2="-74" />
        <circle cx="28" cy="-70" r="4" fill="none" />
        <line x1="25" y1="-77" x2="31" y2="-63" />
        <line x1="31" y1="-77" x2="25" y2="-63" />
      </g>
      {/* second rune carvings lower on right */}
      <g stroke={runeColor} strokeWidth=".7" opacity=".4">
        <line x1="28" y1="-52" x2="28" y2="-40" />
        <line x1="24" y1="-48" x2="32" y2="-44" />
        <line x1="32" y1="-48" x2="24" y2="-44" />
      </g>

      {/* === STONE ARCH spanning the pillars === */}
      {/* arch outer (thick stone) */}
      <path d="M-36,-96 Q-36,-108 0,-108 Q36,-108 36,-96"
            fill="none" stroke={pillarStone} strokeWidth="14" strokeLinecap="round" />
      {/* arch inner shadow edge */}
      <path d="M-30,-96 Q-30,-102 0,-102 Q30,-102 30,-96"
            fill="none" stroke={pillarShade} strokeWidth="5" strokeLinecap="round" opacity=".5" />
      {/* arch highlight top */}
      <path d="M-36,-96 Q-36,-108 0,-108 Q36,-108 36,-96"
            fill="none" stroke={pillarLight} strokeWidth="2" strokeLinecap="round" opacity=".4" />
      {/* arch keystone block */}
      <ellipse cx="0" cy="-107" rx="7" ry="4" fill={pillarLight} opacity=".7" />
      <circle cx="0" cy="-107" r="2.5" fill={runeGlow} opacity=".7" />

      {/* === PORTAL INNER FACE (deep purple glowing oval) === */}
      {/* dark portal background */}
      <ellipse cx="0" cy="-52" rx="28" ry="44" fill={portalInner} />
      {/* portal depth layers */}
      <ellipse cx="0" cy="-52" rx="24" ry="38" fill={isBuilt ? "#5020a0" : "#0e0820"} />
      <ellipse cx="0" cy="-52" rx="18" ry="30" fill={isBuilt ? "#8040d8" : "#160e28"} opacity=".8" />
      {/* bright center core */}
      <ellipse cx="0" cy="-52" rx="10" ry="18" fill={isBuilt ? "#c080ff" : "#1e1438"} opacity=".75" />
      <ellipse cx="0" cy="-52" rx="4" ry="8" fill={isBuilt ? "#f0d8ff" : "#281e48"} opacity=".85" />

      {/* portal glow halo — v2pulse */}
      {detail !== 'low' && (
        <ellipse cx="0" cy="-52" rx="30" ry="46" fill="none"
          stroke={runeGlow} strokeWidth="2.5" opacity=".45"
          style={{ animation: 'v2pulse 2.4s ease-in-out infinite', transformOrigin: '0px -52px' }} />
      )}

      {/* === SPINNING RUNE RING (v2spin) === */}
      {detail !== 'low' && (
        <g style={{ animation: 'v2spin 8s linear infinite', transformOrigin: '0px -52px' }}>
          {/* outer rune circle */}
          <circle cx="0" cy="-52" r="33" fill="none" stroke={runeColor} strokeWidth="1" opacity=".6" />
          {/* rune tick marks around circle */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const r1 = 31;
            const r2 = 33;
            return (
              <line
                key={i}
                x1={cos * r1}
                y1={-52 + sin * r1}
                x2={cos * r2}
                y2={-52 + sin * r2}
                stroke={runeColor}
                strokeWidth={i % 6 === 0 ? "1.8" : "0.8"}
                opacity={i % 6 === 0 ? ".9" : ".5"}
              />
            );
          })}
          {/* inner rune circle */}
          <circle cx="0" cy="-52" r="22" fill="none" stroke={runeColor} strokeWidth=".7" opacity=".4" />
          {/* rune symbols at cardinal points */}
          <g stroke={runeColor} strokeWidth="1.1" opacity=".7" fill="none">
            {/* top */}
            <line x1="-3" y1="-83" x2="3" y2="-83" />
            <line x1="0" y1="-85" x2="0" y2="-81" />
            {/* right */}
            <line x1="31" y1="-55" x2="31" y2="-49" />
            <line x1="29" y1="-52" x2="33" y2="-52" />
            {/* bottom */}
            <line x1="-3" y1="-21" x2="3" y2="-21" />
            <line x1="0" y1="-23" x2="0" y2="-19" />
            {/* left */}
            <line x1="-31" y1="-55" x2="-31" y2="-49" />
            <line x1="-33" y1="-52" x2="-29" y2="-52" />
          </g>
        </g>
      )}

      {/* === FLOATING STAR MOTES (pollen animation) === */}
      {detail !== 'low' && (
        <g>
          {([
            { cx: -20, cy: -85, dur: 3.2, delay: 0.0, r: 1.4 },
            { cx:  18, cy: -90, dur: 2.8, delay: 0.4, r: 1.0 },
            { cx: -32, cy: -72, dur: 3.6, delay: 0.8, r: 1.2 },
            { cx:  36, cy: -68, dur: 2.6, delay: 1.2, r: 0.9 },
            { cx: -14, cy: -96, dur: 3.1, delay: 0.3, r: 1.5 },
            { cx:  10, cy: -100, dur: 2.4, delay: 0.9, r: 1.0 },
            { cx: -40, cy: -55, dur: 3.4, delay: 1.6, r: 0.8 },
            { cx:  40, cy: -48, dur: 2.9, delay: 0.6, r: 1.1 },
            { cx: -8,  cy: -105, dur: 3.8, delay: 1.1, r: 0.7 },
            { cx:  24, cy: -80, dur: 3.0, delay: 1.9, r: 1.3 },
            { cx: -26, cy: -40, dur: 2.7, delay: 0.2, r: 0.9 },
            { cx:  8,  cy: -34, dur: 3.3, delay: 1.4, r: 0.8 },
          ]).map(({ cx, cy, dur, delay, r }, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={runeGlow}
              opacity={0.72}
              style={{
                animation: `pollen ${dur}s ${delay}s ease-in-out infinite`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />
          ))}
        </g>
      )}

      {/* === PILLAR EDGE OVERLAP (draw pillar front over portal) === */}
      {/* left pillar front edge strip to cover portal overlap */}
      <rect x="-38" y="-96" width="2" height="84" fill={pillarShade} opacity=".8" />
      {/* right pillar front edge strip */}
      <rect x="36" y="-96" width="2" height="84" fill={pillarShade} opacity=".8" />

      {/* === GROUND-LEVEL GLOW UNDER PORTAL === */}
      {detail === 'high' && (
        <ellipse cx="0" cy="-3" rx="22" ry="3.5" fill={runeGlow} opacity=".2"
          style={{ animation: 'v2pulse 3.0s 0.5s ease-in-out infinite', transformOrigin: '0px -3px' }} />
      )}
    </svg>
  );
}
