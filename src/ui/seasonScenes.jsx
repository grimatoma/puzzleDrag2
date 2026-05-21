/**
 * Bespoke per-season indicator scenes for the puzzle-board HUD.
 *
 * Each season has its own small SVG mini-scene (Spring garden, Summer sun,
 * Autumn tree, Winter snowman) that visualizes remaining turns with themed
 * art and a dominant numeral. Used by SeasonIndicator in puzzleBoard.jsx
 * when the `bespokeSeasonWidget` setting is on.
 *
 * Shared layout: 140×52 viewBox — ~88px art zone on the left, ~52px
 * numeral panel on the right. Each scene is a pure function of
 * { remaining, name }. Idle and reaction animations honour
 * prefers-reduced-motion via inline CSS media queries.
 */

import { useEffect, useState } from "react";

const SCENE_W = 140;
const SCENE_H = 52;
const VIEWBOX = `0 0 ${SCENE_W} ${SCENE_H}`;

/**
 * When `remaining` decreases, expose the just-spent slot index for a short
 * window so the matching art element can play a reaction animation.
 * Returns -1 when no reaction is active.
 *
 * Uses the React-recommended "store previous value in state, update during
 * render on change" pattern — see
 * https://react.dev/reference/react/useState#storing-information-from-previous-renders
 */
function useJustSpent(remaining) {
  const [prev, setPrev] = useState(remaining);
  const [justSpent, setJustSpent] = useState(-1);

  if (prev !== remaining) {
    // Guarded setState during render is allowed and idempotent here.
    setPrev(remaining);
    setJustSpent(prev > remaining ? remaining : -1);
  }

  useEffect(() => {
    if (justSpent < 0) return undefined;
    const t = setTimeout(() => setJustSpent(-1), 700);
    return () => clearTimeout(t);
  }, [justSpent]);

  return justSpent;
}

function SceneFrame({ ariaLabel, gradientId, gradientStops, children }) {
  return (
    <svg
      width={SCENE_W}
      height={SCENE_H}
      viewBox={VIEWBOX}
      role="img"
      aria-label={ariaLabel}
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {gradientStops.map(([offset, color], i) => (
            <stop key={i} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={SCENE_W} height={SCENE_H} rx="8" fill={`url(#${gradientId})`} />
      {children}
    </svg>
  );
}

function NumeralPanel({ x, remaining, name, bg, stroke, numColor, labelColor }) {
  // 44-wide rounded card on the right with the big numeral + small season label.
  return (
    <g transform={`translate(${x},0)`}>
      <rect x="0" y="6" width="44" height="40" rx="9" fill={bg} stroke={stroke} strokeWidth="1.5" />
      <text
        x="22"
        y="30"
        textAnchor="middle"
        fontSize="20"
        fontWeight="900"
        fill={numColor}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        data-testid="turns-left"
      >
        {remaining}
      </text>
      <text
        x="22"
        y="42"
        textAnchor="middle"
        fontSize="6"
        fontWeight="800"
        fill={labelColor}
        letterSpacing="0.6"
      >
        {name.toUpperCase()}
      </text>
    </g>
  );
}

// ─── Shared keyframes ─────────────────────────────────────────────────────

function SeasonStyles() {
  return (
    <style>{`
      @keyframes hwv-spring-flutter {
        0%, 100% { transform: scaleX(1); }
        50%      { transform: scaleX(0.55); }
      }
      @keyframes hwv-spring-sway {
        0%, 100% { transform: rotate(-3deg); }
        50%      { transform: rotate(3deg); }
      }
      @keyframes hwv-spring-petal-fall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(16px) rotate(90deg); opacity: 0; }
      }
      @keyframes hwv-spring-wilt {
        0%   { transform: rotate(0deg) scale(1); opacity: 1; }
        100% { transform: rotate(-25deg) scale(0.7); opacity: 0; }
      }
      @keyframes hwv-summer-pulse {
        0%, 100% { opacity: 0.78; }
        50%      { opacity: 1; }
      }
      @keyframes hwv-summer-fade {
        0%   { opacity: 1; transform: scaleY(1); }
        100% { opacity: 0; transform: scaleY(0); }
      }
      @keyframes hwv-autumn-sway {
        0%, 100% { transform: rotate(-6deg); }
        50%      { transform: rotate(6deg); }
      }
      @keyframes hwv-autumn-fall {
        0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
        100% { transform: translate(2px, 18px) rotate(140deg); opacity: 0; }
      }
      @keyframes hwv-winter-drift {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(4px); }
      }
      @keyframes hwv-winter-puff {
        0%   { transform: scale(1); opacity: 1; }
        50%  { transform: scale(1.4); opacity: 0.6; }
        100% { transform: scale(0); opacity: 0; }
      }
      @keyframes hwv-winter-breath {
        0%, 75%, 100% { opacity: 0; transform: translate(0, 0) scale(0.6); }
        85%           { opacity: 0.6; transform: translate(3px, -2px) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .hwv-anim-idle,
        .hwv-anim-reaction { animation: none !important; }
      }
    `}</style>
  );
}

// ─── Spring — garden bed ─────────────────────────────────────────────────

const SPRING_FLOWERS = [
  { x: 10, color: "#f06292" },
  { x: 22, color: "#ffb74d" },
  { x: 34, color: "#ba68c8" },
  { x: 48, color: "#f06292" },
  { x: 60, color: "#ffb74d" },
  { x: 72, color: "#ba68c8" },
];

function SpringFlower({ color, stemTop = 22 }) {
  // 4-petal pansy: 4 ellipses around a yellow center.
  return (
    <g>
      <ellipse cx="0" cy={stemTop - 3} rx="3.2" ry="2.2" fill={color} />
      <ellipse cx="0" cy={stemTop + 3} rx="3.2" ry="2.2" fill={color} />
      <ellipse cx="-3" cy={stemTop}     rx="2.2" ry="3.2" fill={color} />
      <ellipse cx="3"  cy={stemTop}     rx="2.2" ry="3.2" fill={color} />
      <circle cx="0" cy={stemTop} r="1.6" fill="#fff4a8" />
    </g>
  );
}

function SpringBareStem({ color }) {
  // A single fallen petal at the base of the stem.
  return (
    <ellipse cx="2" cy="40" rx="2.2" ry="1.2" fill={color} opacity="0.6" />
  );
}

function SpringWiltingFlower({ color }) {
  return (
    <g
      className="hwv-anim-reaction"
      style={{
        transformOrigin: "0px 22px",
        animation: "hwv-spring-wilt 600ms ease-in forwards",
      }}
    >
      <ellipse cx="0" cy="19" rx="3.2" ry="2.2" fill={color} />
      <ellipse cx="0" cy="25" rx="3.2" ry="2.2" fill={color} />
      <ellipse cx="-3" cy="22" rx="2.2" ry="3.2" fill={color} />
      <ellipse cx="3"  cy="22" rx="2.2" ry="3.2" fill={color} />
      <circle cx="0" cy="22" r="1.6" fill="#fff4a8" />
    </g>
  );
}

function SpringButterfly({ x, y = 14 }) {
  return (
    <g
      transform={`translate(${x},${y})`}
      className="hwv-anim-idle"
      style={{
        transformOrigin: `${x}px ${y}px`,
        animation: "hwv-spring-flutter 1200ms ease-in-out infinite",
      }}
    >
      <path d="M0 0 C -4 -3, -7 -1, -5 2 C -7 3, -4 5, 0 3 Z" fill="#9c66c8" stroke="#5a2e7a" strokeWidth="0.5" />
      <path d="M0 0 C 4 -3, 7 -1, 5 2 C 7 3, 4 5, 0 3 Z" fill="#9c66c8" stroke="#5a2e7a" strokeWidth="0.5" />
      <line x1="0" y1="-1" x2="0" y2="4" stroke="#3a2412" strokeWidth="0.8" />
    </g>
  );
}

export function SpringGarden({ remaining, name }) {
  const max = SPRING_FLOWERS.length;
  const blooming = Math.min(Math.max(0, remaining), max);
  const justSpent = useJustSpent(remaining);
  const butterflyAnchor = blooming > 0 ? SPRING_FLOWERS[0].x : 12;

  return (
    <SceneFrame
      ariaLabel={`${name} — ${remaining} turn${remaining === 1 ? "" : "s"} left`}
      gradientId="hwv-spring-sky"
      gradientStops={[
        ["0%", "#fde7f0"],
        ["100%", "#cbe6c2"],
      ]}
    >
      <SeasonStyles />
      {/* grass strip */}
      <rect x="0" y="42" width="88" height="10" fill="#7cba4c" />
      <rect x="0" y="42" width="88" height="1.5" fill="#5da636" />

      {SPRING_FLOWERS.map((p, i) => {
        const stillBlooming = i < blooming;
        const isJustSpent = i === justSpent && i < max;
        return (
          <g key={i} transform={`translate(${p.x},0)`}>
            <line
              x1="0"
              y1="42"
              x2="0"
              y2={stillBlooming ? 22 : 30}
              stroke="#3a7a2a"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {isJustSpent ? (
              <SpringWiltingFlower color={p.color} />
            ) : stillBlooming ? (
              <SpringFlower color={p.color} />
            ) : (
              <SpringBareStem color={p.color} />
            )}
            {isJustSpent && (
              <ellipse
                cx="0"
                cy="24"
                rx="2.2"
                ry="1.2"
                fill={p.color}
                opacity="0.7"
                className="hwv-anim-reaction"
                style={{
                  transformOrigin: "0px 24px",
                  animation: "hwv-spring-petal-fall 600ms ease-in 100ms forwards",
                }}
              />
            )}
          </g>
        );
      })}

      {blooming > 0 && <SpringButterfly x={butterflyAnchor} />}

      <NumeralPanel
        x={92}
        remaining={remaining}
        name={name}
        bg="#fff6f9"
        stroke="#c45888"
        numColor="#9a3358"
        labelColor="#9a3358"
      />
    </SceneFrame>
  );
}

// ─── Summer — sun over horizon ───────────────────────────────────────────

const SUMMER_MAX_RAYS = 8;

function SummerSunRay({ angleDeg, length, justSpent, idle }) {
  const a = (angleDeg * Math.PI) / 180;
  const innerR = 9;
  const outerR = innerR + length;
  const cx = 22;
  const cy = 20;
  const x1 = cx + innerR * Math.cos(a);
  const y1 = cy + innerR * Math.sin(a);
  const x2 = cx + outerR * Math.cos(a);
  const y2 = cy + outerR * Math.sin(a);
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#f0c14b"
      strokeWidth="2"
      strokeLinecap="round"
      className={justSpent ? "hwv-anim-reaction" : idle ? "hwv-anim-idle" : undefined}
      style={
        justSpent
          ? {
              transformOrigin: `${cx}px ${cy}px`,
              animation: "hwv-summer-fade 350ms ease-in forwards",
            }
          : idle
            ? {
                animation: `hwv-summer-pulse 2000ms ease-in-out infinite`,
                animationDelay: `${(angleDeg / 360) * 2000}ms`,
              }
            : undefined
      }
    />
  );
}

export function SummerSun({ remaining, name }) {
  const max = SUMMER_MAX_RAYS;
  const rays = Math.min(Math.max(0, remaining), max);
  const justSpent = useJustSpent(remaining);
  // Distribute rays evenly around the sun, starting from straight-up and going clockwise.
  const rayAngles = Array.from({ length: max }, (_, i) => -90 + (360 / max) * i);

  return (
    <SceneFrame
      ariaLabel={`${name} — ${remaining} turn${remaining === 1 ? "" : "s"} left`}
      gradientId="hwv-summer-sky"
      gradientStops={[
        ["0%", "#ffe2a0"],
        ["100%", "#f7c66a"],
      ]}
    >
      <SeasonStyles />
      {/* sand strip */}
      <rect x="0" y="44" width="88" height="8" fill="#e9c87a" />
      <rect x="0" y="44" width="88" height="1.5" fill="#c79a48" />
      {/* tiny shell */}
      <path d="M 62 48 Q 64 44 66 48 L 64 49 Z" fill="#fff2d6" stroke="#a87832" strokeWidth="0.5" />
      <line x1="64" y1="44.5" x2="64" y2="48" stroke="#a87832" strokeWidth="0.3" />

      {rayAngles.map((angle, i) => {
        const lit = i < rays;
        const isJustSpent = i === rays && justSpent === rays;
        if (!lit && !isJustSpent) return null;
        return (
          <SummerSunRay
            key={i}
            angleDeg={angle}
            length={6}
            idle={lit && !isJustSpent}
            justSpent={isJustSpent}
          />
        );
      })}

      {/* sun body */}
      <circle cx="22" cy="20" r="9" fill="#f6c342" stroke="#a87832" strokeWidth="1" />
      <circle cx="19" cy="17" r="1.5" fill="#fff2c6" opacity="0.8" />

      <NumeralPanel
        x={92}
        remaining={remaining}
        name={name}
        bg="#fff7e0"
        stroke="#c79a48"
        numColor="#7a5320"
        labelColor="#7a5320"
      />
    </SceneFrame>
  );
}

// ─── Autumn — tree shedding leaves ───────────────────────────────────────

// Leaf positions on the canopy, ordered so they read top-down / inside-out.
const AUTUMN_LEAVES = [
  { x: 34, y: 12, rot:   0, color: "#e07a3a" },
  { x: 24, y: 18, rot: -20, color: "#d04a28" },
  { x: 44, y: 16, rot:  20, color: "#f0a838" },
  { x: 18, y: 26, rot: -40, color: "#c8421e" },
  { x: 50, y: 24, rot:  35, color: "#e07a3a" },
  { x: 30, y: 28, rot: -10, color: "#f0a838" },
  { x: 40, y: 30, rot:  10, color: "#d04a28" },
];

function AutumnLeaf({ color, rotate = 0 }) {
  // Pointed-oval leaf with a centerline vein.
  return (
    <g transform={`rotate(${rotate})`}>
      <path
        d="M 0 -3 Q 3 0 0 3 Q -3 0 0 -3 Z"
        fill={color}
        stroke="#7a3a14"
        strokeWidth="0.4"
      />
      <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#7a3a14" strokeWidth="0.4" />
    </g>
  );
}

function AutumnLeafPile({ count }) {
  // Up to 7 fallen leaves piled at the trunk base.
  if (count <= 0) return null;
  const pile = Array.from({ length: Math.min(count, AUTUMN_LEAVES.length) }, (_, i) => {
    // Stagger them in a small fan at the trunk base (x=34, y=42).
    const px = 26 + ((i * 5) % 18);
    const py = 42 - Math.floor(i / 4) * 2;
    const rot = -30 + (i * 17) % 60;
    const color = AUTUMN_LEAVES[i % AUTUMN_LEAVES.length].color;
    return { px, py, rot, color, key: i };
  });
  return (
    <g>
      {pile.map(({ px, py, rot, color, key }) => (
        <g key={key} transform={`translate(${px},${py})`}>
          <AutumnLeaf color={color} rotate={rot} />
        </g>
      ))}
    </g>
  );
}

export function AutumnTree({ remaining, name }) {
  const max = AUTUMN_LEAVES.length;
  const onTree = Math.min(Math.max(0, remaining), max);
  const fallen = Math.max(0, max - onTree);
  const justSpent = useJustSpent(remaining);

  return (
    <SceneFrame
      ariaLabel={`${name} — ${remaining} turn${remaining === 1 ? "" : "s"} left`}
      gradientId="hwv-autumn-sky"
      gradientStops={[
        ["0%", "#ffd9a8"],
        ["100%", "#e0a05a"],
      ]}
    >
      <SeasonStyles />
      {/* ground */}
      <rect x="0" y="44" width="88" height="8" fill="#a86b30" />
      <rect x="0" y="44" width="88" height="1.5" fill="#7a4a1c" />

      {/* trunk */}
      <rect x="32" y="28" width="5" height="16" fill="#6b3a1a" rx="1" />
      {/* canopy backdrop */}
      <ellipse cx="34" cy="22" rx="22" ry="14" fill="#8a4a1e" opacity="0.25" />

      {AUTUMN_LEAVES.map((l, i) => {
        const stillOnTree = i < onTree;
        const isJustSpent = i === justSpent && i < max;
        if (!stillOnTree && !isJustSpent) return null;
        const swaying = i === 0 && !isJustSpent;
        return (
          <g
            key={`leaf-${i}`}
            transform={`translate(${l.x},${l.y})`}
            className={isJustSpent ? "hwv-anim-reaction" : swaying ? "hwv-anim-idle" : undefined}
            style={
              isJustSpent
                ? {
                    transformOrigin: `${l.x}px ${l.y}px`,
                    animation: "hwv-autumn-fall 550ms ease-in forwards",
                  }
                : swaying
                  ? {
                      transformOrigin: `${l.x}px ${l.y}px`,
                      animation: "hwv-autumn-sway 1600ms ease-in-out infinite",
                    }
                  : undefined
            }
          >
            <AutumnLeaf color={l.color} rotate={l.rot} />
          </g>
        );
      })}

      <AutumnLeafPile count={fallen} />

      <NumeralPanel
        x={92}
        remaining={remaining}
        name={name}
        bg="#fff1dc"
        stroke="#a85822"
        numColor="#8a3a14"
        labelColor="#8a3a14"
      />
    </SceneFrame>
  );
}

// ─── Winter — snowman with floating flakes ───────────────────────────────

// Snowflake positions floating in the sky around the snowman.
const WINTER_FLAKES = [
  { x: 10, y: 10 },
  { x: 22, y: 18 },
  { x: 14, y: 28 },
  { x: 6,  y: 22 },
  { x: 26, y: 8  },
  { x: 30, y: 30 },
];

function WinterSnowflake({ size = 3 }) {
  // 6-spoke snowflake.
  const spokes = [0, 30, 60, 90, 120, 150];
  return (
    <g>
      {spokes.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const dx = Math.cos(a) * size;
        const dy = Math.sin(a) * size;
        return (
          <line
            key={deg}
            x1={-dx}
            y1={-dy}
            x2={dx}
            y2={dy}
            stroke="#dff1ff"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="0" cy="0" r="0.8" fill="#dff1ff" />
    </g>
  );
}

function WinterSnowmanBody({ remaining }) {
  // 3-tier snowman on the right side of the art zone.
  const cx = 64;
  const meltDroop = remaining === 1 ? 1 : 0;
  return (
    <g>
      {/* bottom snowball */}
      <circle cx={cx} cy="42" r="9" fill="#f8fbff" stroke="#4a6a86" strokeWidth="1" />
      {/* middle snowball */}
      <circle cx={cx} cy="30" r="7.5" fill="#f8fbff" stroke="#4a6a86" strokeWidth="1" />
      {/* head */}
      <circle cx={cx} cy={20 + meltDroop} r="5.5" fill="#f8fbff" stroke="#4a6a86" strokeWidth="1" />
      {/* twig arms */}
      <line x1={cx - 6} y1="30" x2={cx - 12} y2="26" stroke="#5a3a1c" strokeWidth="1.1" strokeLinecap="round" />
      <line x1={cx + 6} y1="30" x2={cx + 12} y2="26" stroke="#5a3a1c" strokeWidth="1.1" strokeLinecap="round" />
      <line x1={cx - 10} y1="27" x2={cx - 9} y2="24" stroke="#5a3a1c" strokeWidth="1.1" strokeLinecap="round" />
      {/* hat */}
      <rect x={cx - 5} y={14 + meltDroop} width="10" height="2" fill="#2a3950" />
      <rect x={cx - 3.5} y={11 + meltDroop} width="7" height="4" fill="#2a3950" />
      {/* face */}
      <circle cx={cx - 1.7} cy={19 + meltDroop} r="0.6" fill="#2a3950" />
      <circle cx={cx + 1.7} cy={19 + meltDroop} r="0.6" fill="#2a3950" />
      <path
        d={`M ${cx - 0.6} ${20 + meltDroop} L ${cx + 2.5} ${21 + meltDroop} L ${cx - 0.6} ${21.5 + meltDroop} Z`}
        fill="#e07a3a"
      />
      {/* coal buttons on the middle snowball */}
      <circle cx={cx} cy="28" r="0.7" fill="#2a3950" />
      <circle cx={cx} cy="31" r="0.7" fill="#2a3950" />
      <circle cx={cx} cy="34" r="0.7" fill="#2a3950" />
    </g>
  );
}

export function WinterSnowman({ remaining, name }) {
  const max = WINTER_FLAKES.length;
  const flakes = Math.min(Math.max(0, remaining), max);
  const justSpent = useJustSpent(remaining);

  return (
    <SceneFrame
      ariaLabel={`${name} — ${remaining} turn${remaining === 1 ? "" : "s"} left`}
      gradientId="hwv-winter-sky"
      gradientStops={[
        ["0%", "#dbeaf5"],
        ["100%", "#a6c2d6"],
      ]}
    >
      <SeasonStyles />
      {/* snowy ground */}
      <rect x="0" y="46" width="88" height="6" fill="#f8fbff" />
      <rect x="0" y="46" width="88" height="1" fill="#bcd0e0" />

      {WINTER_FLAKES.map((f, i) => {
        const visible = i < flakes;
        const isJustSpent = i === justSpent && i < max;
        if (!visible && !isJustSpent) return null;
        const drift = i === 1 && !isJustSpent;
        return (
          <g
            key={i}
            transform={`translate(${f.x},${f.y})`}
            className={isJustSpent ? "hwv-anim-reaction" : drift ? "hwv-anim-idle" : undefined}
            style={
              isJustSpent
                ? {
                    transformOrigin: `${f.x}px ${f.y}px`,
                    animation: "hwv-winter-puff 350ms ease-out forwards",
                  }
                : drift
                  ? {
                      animation: "hwv-winter-drift 3000ms ease-in-out infinite",
                    }
                  : undefined
            }
          >
            <WinterSnowflake />
          </g>
        );
      })}

      <WinterSnowmanBody remaining={remaining} />

      {/* breath puff */}
      <circle
        cx="68"
        cy="20"
        r="1.4"
        fill="#ffffff"
        opacity="0"
        className="hwv-anim-idle"
        style={{ animation: "hwv-winter-breath 2200ms ease-out infinite" }}
      />

      <NumeralPanel
        x={92}
        remaining={remaining}
        name={name}
        bg="#eaf5ff"
        stroke="#4a7aa0"
        numColor="#1f3a5a"
        labelColor="#1f3a5a"
      />
    </SceneFrame>
  );
}

// ─── Dispatch ────────────────────────────────────────────────────────────

const SCENE_BY_SEASON = [SpringGarden, SummerSun, AutumnTree, WinterSnowman];

export function SeasonScene({ seasonIdx, remaining, name }) {
  const Comp = SCENE_BY_SEASON[seasonIdx] ?? SpringGarden;
  return <Comp remaining={remaining} name={name} />;
}
