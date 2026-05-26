/**
 * Full-width seasonal progress strip for the puzzle-board HUD.
 *
 * Four side-by-side segments (one per season) sized proportionally to each
 * season's turn count. A small wagon rolls left-to-right at progress
 * `turnsUsed / turnBudget`, carrying season-themed cargo that swaps as it
 * crosses each segment. A numeral panel on the right shows total turns
 * remaining in the whole run.
 *
 * Two density modes via the `busy` prop:
 *   - compact: just season backgrounds, name labels, tick marks, the wagon,
 *              and minimal per-season anchor decorations (tree / sun / etc.)
 *   - busy:    fills each segment with width-proportional decoration
 *              (more flowers / clouds / leaves / snowflakes as the segment
 *              grows wider) so larger segments never look empty
 *
 * Used by SeasonIndicator in puzzleBoard.jsx. All art is inline SVG; no
 * external assets. Idle animations honour prefers-reduced-motion via inline
 * CSS media queries.
 */

import { useEffect, useRef, useState } from "react";

const STRIP_HEIGHT = 52;
const STRIP_MAX_WIDTH = 760;
const STRIP_MIN_WIDTH = 220;
const NUMERAL_WIDTH = 56;

interface SeasonPalette {
  name: string;
  bgTop: string;
  bgBot: string;
  groundFill: string;
  groundStroke: string;
  panelBg: string;
  panelStroke: string;
  numColor: string;
  labelColor: string;
  labelShadow: string;
}

const SEASON_PALETTES: SeasonPalette[] = [
  {
    name: "Spring",
    bgTop: "#fde7f0",
    bgBot: "#bfe3b3",
    groundFill: "#7cba4c",
    groundStroke: "#5da636",
    panelBg: "#fff6f9",
    panelStroke: "#c45888",
    numColor: "#9a3358",
    labelColor: "#9a3358",
    labelShadow: "#fff4f8",
  },
  {
    name: "Summer",
    bgTop: "#ffe9a8",
    bgBot: "#f3b850",
    groundFill: "#e9c87a",
    groundStroke: "#c79a48",
    panelBg: "#fff7e0",
    panelStroke: "#c79a48",
    numColor: "#7a5320",
    labelColor: "#7a5320",
    labelShadow: "#fff7e0",
  },
  {
    name: "Autumn",
    bgTop: "#ffd9a8",
    bgBot: "#cd864a",
    groundFill: "#a86b30",
    groundStroke: "#7a4a1c",
    panelBg: "#fff1dc",
    panelStroke: "#a85822",
    numColor: "#8a3a14",
    labelColor: "#8a3a14",
    labelShadow: "#fff1dc",
  },
  {
    name: "Winter",
    bgTop: "#e5f0fa",
    bgBot: "#90b0c6",
    groundFill: "#f8fbff",
    groundStroke: "#bcd0e0",
    panelBg: "#eaf5ff",
    panelStroke: "#4a7aa0",
    numColor: "#1f3a5a",
    labelColor: "#1f3a5a",
    labelShadow: "#eaf5ff",
  },
];

/**
 * Divide a turn budget across 4 seasons using floor math so the segments
 * sum to exactly the budget — matches `seasonIndexInSession` in zones/data.
 */
export function seasonTurnRanges(turnBudget: number) {
  const S = Math.max(1, turnBudget | 0);
  const ends = [
    Math.floor(S / 4),
    Math.floor((2 * S) / 4),
    Math.floor((3 * S) / 4),
    S,
  ];
  return ends.map((end, i) => ({
    start: i === 0 ? 0 : ends[i - 1],
    end,
    count: end - (i === 0 ? 0 : ends[i - 1]),
  }));
}

/**
 * Observe the rendered width of an element so children can adapt their
 * decoration density. Returns 0 until the first layout settles.
 */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof ResizeObserver === "undefined") {
      // SSR / older browser fallback — read offsetWidth once.
      setWidth(el.offsetWidth || 0);
      return undefined;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setWidth(el.offsetWidth || 0);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// ─── Per-season decorations ──────────────────────────────────────────────
// Each Deco gets the segment's measured width and renders elements scaled
// to fill the available space. Tiny segments only show their "anchor"
// element; wider segments add filler so they never look empty.

function evenSpaced(count: number, width: number, leftPad = 8, rightPad = 8): number[] {
  if (count <= 0) return [];
  if (count === 1) return [width / 2];
  const usable = Math.max(0, width - leftPad - rightPad);
  return Array.from({ length: count }, (_, i) => leftPad + (usable * i) / (count - 1));
}

interface DecoProps { width: number; busy?: boolean }

function SpringDeco({ width, busy }: DecoProps) {
  if (width <= 0) return null;
  // 4-petal pansies stand along a clear grass strip. Hero art (flowers +
  // grass strip + lead butterfly) always renders; `busy` adds extra
  // butterflies, extra flowers, and grass tufts.
  const spacing = busy ? 18 : 28;
  const flowerCount = Math.max(3, Math.min(11, Math.round(width / spacing)));
  const flowerXs = evenSpaced(flowerCount, width, 10, 10);
  const flowerColors = ["#f06292", "#ffb74d", "#ba68c8", "#f06292", "#ffb74d", "#ba68c8", "#f06292", "#ffb74d", "#ba68c8", "#f06292", "#ffb74d"];
  const showSecondButterfly = width >= 150;
  const showThirdButterfly = busy && width >= 230;
  const showGrassTufts = busy && width >= 90;

  return (
    <g aria-hidden="true">
      {/* grass strip */}
      <rect x="0" y="42" width={width} height="8" fill="#7cba4c" />
      <rect x="0" y="42" width={width} height="1.5" fill="#5da636" />

      {/* grass tufts between flowers */}
      {showGrassTufts && (
        <g stroke="#3a7a2a" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.75">
          {evenSpaced(Math.max(2, Math.round(width / 45)), width, 5, 5).map((x, i) => (
            <g key={i} transform={`translate(${x},42)`}>
              <line x1="-2" y1="0" x2="-1.4" y2="-3.5" />
              <line x1="0"  y1="0" x2="0"    y2="-4.2" />
              <line x1="2"  y1="0" x2="1.4"  y2="-3.5" />
            </g>
          ))}
        </g>
      )}

      {/* 4-petal pansies */}
      {flowerXs.map((x, i) => {
        const color = flowerColors[i % flowerColors.length];
        return (
          <g key={`f${i}`} transform={`translate(${x},0)`}>
            {/* stem */}
            <line x1="0" y1="42" x2="0" y2="26" stroke="#3a7a2a" strokeWidth="1.3" strokeLinecap="round" />
            {/* a small leaf on the stem */}
            <path d={`M 0 33 Q 3 31 4 33 Q 2 34 0 33 Z`} fill="#5da636" stroke="#3a7a2a" strokeWidth="0.3" />
            {/* 4 petals around a yellow center */}
            <ellipse cx="0"    cy="22" rx="2.8" ry="1.9" fill={color} stroke="#9a3358" strokeWidth="0.3" />
            <ellipse cx="0"    cy="28" rx="2.8" ry="1.9" fill={color} stroke="#9a3358" strokeWidth="0.3" />
            <ellipse cx="-2.8" cy="25" rx="1.9" ry="2.8" fill={color} stroke="#9a3358" strokeWidth="0.3" />
            <ellipse cx="2.8"  cy="25" rx="1.9" ry="2.8" fill={color} stroke="#9a3358" strokeWidth="0.3" />
            <circle cx="0" cy="25" r="1.3" fill="#fff4a8" stroke="#c79a48" strokeWidth="0.2" />
          </g>
        );
      })}

      {/* butterflies */}
      {[
        { x: Math.min(width * 0.28, 30), y: 12, color: "#9c66c8", stroke: "#5a2e7a", delay: 0,   period: 1500 },
        ...(showSecondButterfly
          ? [{ x: Math.min(width * 0.62, width - 26), y: 18, color: "#f06292", stroke: "#9a3358", delay: 350, period: 1750 }]
          : []),
        ...(showThirdButterfly
          ? [{ x: width - 22, y: 10, color: "#ffb74d", stroke: "#9a3358", delay: 200, period: 1300 }]
          : []),
      ].map((b, i) => (
        <g
          key={`bfly${i}`}
          transform={`translate(${b.x},${b.y})`}
          className="hwv-anim"
          style={{
            transformOrigin: `${b.x}px ${b.y}px`,
            animation: `hwv-spring-sway ${b.period}ms cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            animationDelay: `${b.delay}ms`,
          }}
        >
          <path d="M0 0 C -3 -2.2, -4.6 -0.6, -3.6 1.4 C -4.6 2, -3 3.6, 0 1.8 Z" fill={b.color} stroke={b.stroke} strokeWidth="0.4" />
          <path d="M0 0 C  3 -2.2,  4.6 -0.6,  3.6 1.4 C  4.6 2,  3 3.6, 0 1.8 Z" fill={b.color} stroke={b.stroke} strokeWidth="0.4" />
          <line x1="0" y1="-0.6" x2="0" y2="3" stroke="#3a2412" strokeWidth="0.5" />
        </g>
      ))}
    </g>
  );
}

function SummerDeco({ width, busy }: DecoProps) {
  if (width <= 0) return null;
  // Hero: big sun with face + 8 rays, sandy bottom with a shell. Always on.
  // `busy` adds extra clouds, a bee, wheat tufts, and a second shell.
  const cloudCount = busy
    ? Math.max(1, Math.min(4, Math.round((width - 50) / 65)))
    : Math.max(1, Math.min(2, Math.round((width - 50) / 110)));
  const cloudXs = evenSpaced(cloudCount, width - 36, 50, 8);
  const showBee = busy && width >= 130;
  const showWheatTufts = busy && width >= 110;
  const showSecondShell = width >= 160;

  return (
    <g aria-hidden="true">
      {/* sandy strip at bottom */}
      <rect x="0" y="42" width={width} height="8" fill="#e9c87a" />
      <rect x="0" y="42" width={width} height="1.5" fill="#c79a48" />
      {/* shell on the sand */}
      <g transform={`translate(${width * 0.55}, 47)`}>
        <path d="M -3 0 Q 0 -4 3 0 L 1.5 1.5 L -1.5 1.5 Z" fill="#fff2d6" stroke="#a87832" strokeWidth="0.5" />
        <line x1="0" y1="-3.5" x2="0" y2="0" stroke="#a87832" strokeWidth="0.4" />
        <line x1="-1.5" y1="-2" x2="-0.5" y2="0" stroke="#a87832" strokeWidth="0.3" />
        <line x1="1.5"  y1="-2" x2="0.5"  y2="0" stroke="#a87832" strokeWidth="0.3" />
      </g>
      {showSecondShell && (
        <g transform={`translate(${width - 18}, 47)`}>
          <path d="M -2.4 0 Q 0 -3 2.4 0 L 1.2 1.2 L -1.2 1.2 Z" fill="#ffe4c4" stroke="#a87832" strokeWidth="0.4" />
          <line x1="0" y1="-2.5" x2="0" y2="0" stroke="#a87832" strokeWidth="0.3" />
        </g>
      )}

      {/* big sun with 8 rays */}
      <g
        className="hwv-anim"
        style={{ animation: "hwv-summer-pulse 2200ms cubic-bezier(0.4, 0, 0.2, 1) infinite" }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={18 + 8.5 * Math.cos(a)}
              y1={16 + 8.5 * Math.sin(a)}
              x2={18 + 13 * Math.cos(a)}
              y2={16 + 13 * Math.sin(a)}
              stroke="#f0c14b"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx="18" cy="16" r="7" fill="#f6c342" stroke="#a87832" strokeWidth="0.8" />
      {/* sun face / highlight */}
      <circle cx="15.5" cy="13.5" r="1.4" fill="#fff2c6" opacity="0.85" />
      <circle cx="15.5" cy="15.5" r="0.6" fill="#3a2412" />
      <circle cx="20.5" cy="15.5" r="0.6" fill="#3a2412" />
      <path d="M 16 18.5 Q 18 20 20 18.5" stroke="#3a2412" strokeWidth="0.6" fill="none" strokeLinecap="round" />

      {/* clouds drifting across the sky */}
      {cloudXs.map((x, i) => (
        <g key={i} transform={`translate(${x},${8 + (i % 2) * 5})`} opacity="0.92">
          <ellipse cx="0"  cy="0"    rx="8" ry="3"  fill="#fff9e8" stroke="#c79a48" strokeWidth="0.5" />
          <ellipse cx="-4" cy="-1.4" rx="3.5" ry="2.6" fill="#fff9e8" stroke="#c79a48" strokeWidth="0.5" />
          <ellipse cx="3"  cy="-1.8" rx="4" ry="3" fill="#fff9e8" stroke="#c79a48" strokeWidth="0.5" />
        </g>
      ))}

      {/* wheat tufts along the bottom strip */}
      {showWheatTufts && (
        <g>
          {evenSpaced(Math.max(2, Math.round(width / 50)), width, 38, 14).map((x, i) => (
            <g key={i} transform={`translate(${x},44)`}>
              <line x1="0" y1="0" x2="0" y2="-6" stroke="#a87832" strokeWidth="0.7" />
              <ellipse cx="-1" cy="-5"   rx="0.9" ry="1.5" fill="#f0c14b" stroke="#a87832" strokeWidth="0.3" />
              <ellipse cx="1"  cy="-5"   rx="0.9" ry="1.5" fill="#f0c14b" stroke="#a87832" strokeWidth="0.3" />
              <ellipse cx="0"  cy="-6.8" rx="0.9" ry="1.5" fill="#f0c14b" stroke="#a87832" strokeWidth="0.3" />
            </g>
          ))}
        </g>
      )}

      {/* bee bobbing near the sun */}
      {showBee && (
        <g
          transform={`translate(${Math.min(width - 22, 36)}, 28)`}
          className="hwv-anim"
          style={{
            transformOrigin: `${Math.min(width - 22, 36)}px 28px`,
            animation: "hwv-spring-sway 900ms cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        >
          <ellipse cx="0" cy="0" rx="2.4" ry="1.5" fill="#f0c14b" stroke="#3a2412" strokeWidth="0.3" />
          <rect x="-1.6" y="-1.5" width="0.9" height="3" fill="#3a2412" />
          <rect x="0.7"  y="-1.5" width="0.9" height="3" fill="#3a2412" />
          <ellipse cx="-1.5" cy="-1.6" rx="1.6" ry="0.8" fill="#fff9e8" opacity="0.7" />
          <ellipse cx="1.5"  cy="-1.6" rx="1.6" ry="0.8" fill="#fff9e8" opacity="0.7" />
        </g>
      )}
    </g>
  );
}

function AutumnDeco({ width, busy }: DecoProps) {
  if (width <= 0) return null;
  // Hero: full tree with a leafy canopy + leaf pile + pumpkin always render.
  // `busy` adds more falling leaves drifting across, plus acorns.
  const fallingLeafCount = busy
    ? Math.max(1, Math.min(5, Math.round((width - 50) / 32)))
    : Math.max(1, Math.min(2, Math.round((width - 50) / 70)));
  const fallingXs = evenSpaced(fallingLeafCount, width - 50, 56, 10);
  const showPumpkin = width >= 150;
  const showAcorns = busy && width >= 120;

  return (
    <g aria-hidden="true">
      {/* ground strip */}
      <rect x="0" y="42" width={width} height="8" fill="#a86b30" />
      <rect x="0" y="42" width={width} height="1.5" fill="#7a4a1c" />

      {/* trunk */}
      <rect x="16" y="22" width="5" height="20" fill="#6b3a1a" rx="0.8" />
      <line x1="17.5" y1="24" x2="17.5" y2="40" stroke="#3a2412" strokeWidth="0.4" />
      {/* canopy backdrop */}
      <ellipse cx="18.5" cy="16" rx="15" ry="12" fill="#8a4a1e" opacity="0.55" />
      {/* canopy leaves — clustered around the canopy backdrop */}
      {[
        { x: 12, y: 10, color: "#e07a3a", rot: -25, scale: 1.1 },
        { x: 25, y: 11, color: "#d04a28", rot: 20,  scale: 1.0 },
        { x: 18, y: 6,  color: "#f0a838", rot: 0,   scale: 1.2 },
        { x: 11, y: 18, color: "#f0a838", rot: -15, scale: 0.95 },
        { x: 26, y: 19, color: "#d04a28", rot: 15,  scale: 1.05 },
        { x: 19, y: 22, color: "#e07a3a", rot: 5,   scale: 1.0 },
        { x: 7,  y: 14, color: "#f0a838", rot: -35, scale: 0.85 },
        { x: 30, y: 15, color: "#e07a3a", rot: 30,  scale: 0.9 },
      ].map((l, i) => (
        <g key={i} transform={`translate(${l.x},${l.y}) rotate(${l.rot}) scale(${l.scale})`}>
          <path d="M 0 -3 Q 2.5 0 0 3 Q -2.5 0 0 -3 Z" fill={l.color} stroke="#7a3a14" strokeWidth="0.3" />
          <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#7a3a14" strokeWidth="0.3" />
          <line x1="0" y1="-1" x2="1.4" y2="0.4" stroke="#7a3a14" strokeWidth="0.25" />
          <line x1="0" y1="-1" x2="-1.4" y2="0.4" stroke="#7a3a14" strokeWidth="0.25" />
        </g>
      ))}

      {/* fallen-leaf pile — a generous mound around the trunk base */}
      <ellipse cx="22" cy="41.5" rx="14" ry="2" fill="#a85822" opacity="0.7" />
      <circle cx="14" cy="40.5" r="1.4" fill="#d04a28" opacity="0.9" />
      <circle cx="18" cy="40"   r="1.5" fill="#f0a838" opacity="0.9" />
      <circle cx="22" cy="40.5" r="1.4" fill="#e07a3a" opacity="0.9" />
      <circle cx="26" cy="40"   r="1.4" fill="#d04a28" opacity="0.9" />
      <circle cx="30" cy="40.8" r="1.3" fill="#f0a838" opacity="0.9" />
      <circle cx="20" cy="38.5" r="1.2" fill="#e07a3a" opacity="0.85" />
      <circle cx="24" cy="38.5" r="1.2" fill="#d04a28" opacity="0.85" />

      {/* falling leaves above the tree */}
      {fallingXs.map((x, i) => (
        <g
          key={i}
          transform={`translate(${x},6)`}
          className="hwv-anim"
          style={{
            transformOrigin: `${x}px 6px`,
            animation: "hwv-autumn-fall 3800ms cubic-bezier(0.4, 0, 0.2, 1) infinite",
            animationDelay: `${(i * 700) % 3800}ms`,
          }}
        >
          <path d="M 0 -2.6 Q 2.2 0 0 2.6 Q -2.2 0 0 -2.6 Z" fill={["#e07a3a", "#d04a28", "#f0a838"][i % 3]} stroke="#7a3a14" strokeWidth="0.3" />
          <line x1="0" y1="-2.3" x2="0" y2="2.3" stroke="#7a3a14" strokeWidth="0.25" />
        </g>
      ))}

      {/* ground pumpkin — bigger and with proper segments */}
      {showPumpkin && (
        <g transform={`translate(${width - 24}, 38)`}>
          <ellipse cx="0" cy="0" rx="5" ry="3.6" fill="#e07a3a" stroke="#7a3a14" strokeWidth="0.5" />
          <ellipse cx="-2.4" cy="0" rx="1.4" ry="3.4" fill="#d04a28" stroke="#7a3a14" strokeWidth="0.4" />
          <ellipse cx="2.4"  cy="0" rx="1.4" ry="3.4" fill="#d04a28" stroke="#7a3a14" strokeWidth="0.4" />
          <line x1="-3.4" y1="-2.4" x2="-3.4" y2="2.4" stroke="#a8521c" strokeWidth="0.4" />
          <line x1="0"   y1="-3.6" x2="0"    y2="3.6" stroke="#a8521c" strokeWidth="0.4" />
          <line x1="3.4" y1="-2.4" x2="3.4"  y2="2.4" stroke="#a8521c" strokeWidth="0.4" />
          {/* stem + leaf */}
          <rect x="-0.5" y="-4.6" width="1" height="1.4" fill="#3a7a2a" />
          <path d="M 0.5 -4 Q 3 -5 4 -3 Q 2.5 -3 0.5 -3 Z" fill="#5da636" stroke="#3a7a2a" strokeWidth="0.3" />
        </g>
      )}

      {/* acorns near the leaf pile */}
      {showAcorns && (
        <g transform={`translate(${Math.min(width / 2 + 14, width - 50)},40)`}>
          <ellipse cx="0" cy="0" rx="1.6" ry="2" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
          <ellipse cx="0" cy="-1.6" rx="1.7" ry="0.8" fill="#6b3a1a" stroke="#3a2412" strokeWidth="0.3" />
          <line x1="0" y1="-2.4" x2="0" y2="-3" stroke="#3a2412" strokeWidth="0.4" />
          <ellipse cx="3.4" cy="0" rx="1.4" ry="1.7" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
          <ellipse cx="3.4" cy="-1.4" rx="1.5" ry="0.7" fill="#6b3a1a" stroke="#3a2412" strokeWidth="0.3" />
        </g>
      )}
    </g>
  );
}

function WinterDeco({ width, busy }: DecoProps) {
  if (width <= 0) return null;
  // Hero: full 3-tier snowman in the middle + snow-dusted evergreen on the
  // left + snow drift always render. `busy` adds more drifting snowflakes
  // across the sky.
  const flakeCount = busy
    ? Math.max(4, Math.min(12, Math.round(width / 18)))
    : Math.max(2, Math.min(5, Math.round(width / 45)));
  const flakeXs = evenSpaced(flakeCount, width, 8, 8);
  const showSecondTree = width >= 200;
  const snowmanCx = Math.max(54, Math.min(width / 2 + 10, width - 24));

  return (
    <g aria-hidden="true">
      {/* snowy ground strip */}
      <rect x="0" y="42" width={width} height="8" fill="#f8fbff" />
      <rect x="0" y="42" width={width} height="1.2" fill="#bcd0e0" />

      {/* evergreen anchor on the left */}
      <rect x="13" y="34" width="3" height="6" fill="#6b3a1a" rx="0.4" />
      <path d="M 14.5 6 L 22 22 L 7 22 Z"  fill="#2a6a4a" />
      <path d="M 14.5 14 L 24 32 L 5 32 Z" fill="#2a6a4a" />
      <ellipse cx="14.5" cy="22" rx="7"   ry="1" fill="#f8fbff" />
      <ellipse cx="14.5" cy="32" rx="9.5" ry="1" fill="#f8fbff" />

      {/* drifting snowflakes scattered across the sky */}
      {flakeXs.map((x, i) => {
        const y = 6 + (i % 5) * 6;
        const size = 0.9 + (i % 3) * 0.4;
        return (
          <g
            key={i}
            transform={`translate(${x},${y})`}
            className="hwv-anim"
            style={{
              transformOrigin: `${x}px ${y}px`,
              animation: "hwv-winter-drift 2600ms cubic-bezier(0.4, 0, 0.2, 1) infinite",
              animationDelay: `${(i * 320) % 2600}ms`,
            }}
          >
            {/* 6-spoke snowflake — like the previous bespoke scene */}
            {[0, 60, 120].map((deg) => {
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
                  stroke="#ffffff"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
              );
            })}
            {[0, 60, 120].map((deg) => {
              const a = (deg * Math.PI) / 180;
              const dx = Math.cos(a) * size;
              const dy = Math.sin(a) * size;
              return (
                <line
                  key={`m${deg}`}
                  x1={-dx}
                  y1={-dy}
                  x2={dx}
                  y2={dy}
                  stroke="#7aa9c6"
                  strokeWidth="0.25"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        );
      })}

      {/* snow drift in the foreground */}
      <path
        d={`M ${snowmanCx - 22} 44 Q ${snowmanCx - 12} 39 ${snowmanCx} 41 Q ${snowmanCx + 12} 39 ${snowmanCx + 22} 44 Z`}
        fill="#ffffff"
        stroke="#bcd0e0"
        strokeWidth="0.5"
        opacity="0.85"
      />

      {/* 3-tier snowman — the centerpiece */}
      <g transform={`translate(${snowmanCx}, 0)`}>
        {/* bottom snowball */}
        <circle cx="0" cy="38" r="8.5" fill="#ffffff" stroke="#4a6a86" strokeWidth="0.8" />
        {/* middle snowball */}
        <circle cx="0" cy="26" r="6.5" fill="#ffffff" stroke="#4a6a86" strokeWidth="0.8" />
        {/* head */}
        <circle cx="0" cy="16" r="5"   fill="#ffffff" stroke="#4a6a86" strokeWidth="0.8" />
        {/* twig arms */}
        <line x1="-5" y1="26" x2="-12" y2="22" stroke="#5a3a1c" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="5"  y1="26" x2="12"  y2="22" stroke="#5a3a1c" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="-10" y1="23.5" x2="-9.5" y2="20.5" stroke="#5a3a1c" strokeWidth="1" strokeLinecap="round" />
        <line x1="-11" y1="22.5" x2="-12" y2="20" stroke="#5a3a1c" strokeWidth="1" strokeLinecap="round" />
        <line x1="10"  y1="23.5" x2="10.5" y2="20.5" stroke="#5a3a1c" strokeWidth="1" strokeLinecap="round" />
        <line x1="11"  y1="22.5" x2="12" y2="20" stroke="#5a3a1c" strokeWidth="1" strokeLinecap="round" />
        {/* coal buttons on the middle snowball */}
        <circle cx="0" cy="23" r="0.7" fill="#2a3950" />
        <circle cx="0" cy="26" r="0.7" fill="#2a3950" />
        <circle cx="0" cy="29" r="0.7" fill="#2a3950" />
        {/* scarf */}
        <rect x="-5.5" y="20" width="11" height="2" fill="#d04a28" />
        <rect x="-2.5" y="20" width="1"  height="3.5" fill="#d04a28" />
        <rect x="1.5"  y="20" width="1"  height="3.5" fill="#d04a28" />
        {/* face — eyes, carrot nose, mouth */}
        <circle cx="-1.6" cy="15" r="0.7" fill="#2a3950" />
        <circle cx="1.6"  cy="15" r="0.7" fill="#2a3950" />
        <path d="M -0.4 16.5 L 3 17.3 L -0.4 18 Z" fill="#e07a3a" stroke="#a8521c" strokeWidth="0.3" />
        <circle cx="-1.6" cy="18.5" r="0.4" fill="#2a3950" />
        <circle cx="0"    cy="18.7" r="0.4" fill="#2a3950" />
        <circle cx="1.6"  cy="18.5" r="0.4" fill="#2a3950" />
        {/* top hat */}
        <rect x="-4.5" y="11.5" width="9" height="1.6" fill="#2a3950" />
        <rect x="-3"   y="7.5"  width="6" height="4.5" fill="#2a3950" />
        <rect x="-3"   y="9"    width="6" height="0.8" fill="#d04a28" />
      </g>

      {/* small evergreen on the right for wider segments */}
      {showSecondTree && (
        <g transform={`translate(${width - 18},0)`}>
          <rect x="-1" y="36" width="2" height="4" fill="#6b3a1a" rx="0.3" />
          <path d="M 0 14 L 5.5 26 L -5.5 26 Z" fill="#2a6a4a" />
          <path d="M 0 20 L 7   36 L -7   36 Z" fill="#2a6a4a" />
          <ellipse cx="0" cy="26" rx="4.5" ry="0.7" fill="#f8fbff" />
          <ellipse cx="0" cy="36" rx="6.5" ry="0.7" fill="#f8fbff" />
        </g>
      )}
    </g>
  );
}

const DECO_BY_SEASON = [SpringDeco, SummerDeco, AutumnDeco, WinterDeco];

// ─── A single season segment ─────────────────────────────────────────────

interface SegmentProps {
  idx: number;
  palette: SeasonPalette;
  turnsInSeason: number;
  flex: number;
  isActive: boolean;
  busy?: boolean;
}

function Segment({ idx, palette, turnsInSeason, flex, isActive, busy }: SegmentProps) {
  const [ref, width] = useMeasuredWidth();
  // Per-season hero art always renders so the strip never looks empty.
  // `busy` controls extra filler density (more butterflies, more snowflakes,
  // etc.) inside each Deco.
  const Deco = DECO_BY_SEASON[idx];

  // Tick marks at the top of the segment, one per turn boundary inside the
  // segment (turnsInSeason - 1 ticks for turnsInSeason turns).
  const ticks: JSX.Element[] = [];
  for (let t = 1; t < turnsInSeason; t += 1) {
    const pct = (t / turnsInSeason) * 100;
    ticks.push(<span key={t} className="hwv-tick" style={{ left: `${pct}%` }} />);
  }

  return (
    <div
      ref={ref}
      className="hwv-strip-segment"
      style={{
        flex: `${flex} ${flex} 0`,
        position: "relative",
        background: `linear-gradient(180deg, ${palette.bgTop} 0%, ${palette.bgBot} 100%)`,
        borderRight: idx < 3 ? "1.5px solid rgba(58, 36, 18, 0.55)" : "none",
        overflow: "hidden",
      }}
    >
      {/* tick marks across the top edge */}
      {ticks.length > 0 && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5 }}>
          {ticks.map((node) => node)}
        </div>
      )}

      {/* per-season decorative SVG layer — always renders, density scales
          with `busy` and segment width inside each Deco. */}
      {Deco && width > 0 && (
        <svg
          width={width}
          height={STRIP_HEIGHT - 2}
          viewBox={`0 0 ${width} ${STRIP_HEIGHT - 2}`}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <Deco width={width} busy={busy} />
        </svg>
      )}

      {/* season name label — small, low-key, at the bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 1,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.6px",
          color: palette.labelColor,
          textShadow: `0 1px 0 ${palette.labelShadow}`,
          opacity: isActive ? 1 : 0.65,
          textTransform: "uppercase",
          pointerEvents: "none",
          overflow: "hidden",
          textOverflow: "clip",
          whiteSpace: "nowrap",
        }}
      >
        {palette.name}
      </div>
    </div>
  );
}

// ─── The wagon ───────────────────────────────────────────────────────────

function CargoFlowers() {
  return (
    <g>
      <line x1="-3" y1="0" x2="-3" y2="-4" stroke="#3a7a2a" strokeWidth="0.7" />
      <line x1="0"  y1="0" x2="0"  y2="-5" stroke="#3a7a2a" strokeWidth="0.7" />
      <line x1="3"  y1="0" x2="3"  y2="-4" stroke="#3a7a2a" strokeWidth="0.7" />
      <circle cx="-3" cy="-5" r="1.6" fill="#f06292" stroke="#9a3358" strokeWidth="0.3" />
      <circle cx="0"  cy="-6" r="1.8" fill="#ffb74d" stroke="#9a3358" strokeWidth="0.3" />
      <circle cx="3"  cy="-5" r="1.6" fill="#ba68c8" stroke="#9a3358" strokeWidth="0.3" />
    </g>
  );
}

function CargoWheat() {
  return (
    <g>
      <ellipse cx="0" cy="-3" rx="4.5" ry="3.5" fill="#f0c14b" stroke="#7a5320" strokeWidth="0.4" />
      <line x1="-2" y1="-5.5" x2="-2" y2="-1" stroke="#7a5320" strokeWidth="0.4" />
      <line x1="0"  y1="-6"   x2="0"  y2="-0.5" stroke="#7a5320" strokeWidth="0.4" />
      <line x1="2"  y1="-5.5" x2="2"  y2="-1" stroke="#7a5320" strokeWidth="0.4" />
      <rect x="-2.2" y="-1.6" width="4.4" height="1.4" fill="#7a4a1c" stroke="#3a2412" strokeWidth="0.3" />
    </g>
  );
}

function CargoPumpkins() {
  return (
    <g>
      <ellipse cx="-3.2" cy="-2.5" rx="2.4" ry="2" fill="#e07a3a" stroke="#7a3a14" strokeWidth="0.4" />
      <ellipse cx="0"    cy="-3"   rx="2.8" ry="2.4" fill="#f0a838" stroke="#7a3a14" strokeWidth="0.4" />
      <ellipse cx="3.2"  cy="-2.5" rx="2.4" ry="2" fill="#e07a3a" stroke="#7a3a14" strokeWidth="0.4" />
      <line x1="-3.2" y1="-4.5" x2="-3.2" y2="-5.5" stroke="#3a7a2a" strokeWidth="0.6" />
      <line x1="0"    y1="-5.5" x2="0"    y2="-6.5" stroke="#3a7a2a" strokeWidth="0.6" />
      <line x1="3.2"  y1="-4.5" x2="3.2"  y2="-5.5" stroke="#3a7a2a" strokeWidth="0.6" />
    </g>
  );
}

function CargoFirewood() {
  return (
    <g>
      <ellipse cx="-3" cy="-1.5" rx="1.4" ry="1.2" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
      <ellipse cx="0"  cy="-1.5" rx="1.4" ry="1.2" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
      <ellipse cx="3"  cy="-1.5" rx="1.4" ry="1.2" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
      <ellipse cx="-1.5" cy="-3.5" rx="1.4" ry="1.2" fill="#7a4a1c" stroke="#3a2412" strokeWidth="0.3" />
      <ellipse cx="1.5"  cy="-3.5" rx="1.4" ry="1.2" fill="#7a4a1c" stroke="#3a2412" strokeWidth="0.3" />
      <ellipse cx="0"    cy="-5.5" rx="1.4" ry="1.2" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
      <circle cx="-3" cy="-1.5" r="0.5" fill="none" stroke="#5a3010" strokeWidth="0.2" />
      <circle cx="0"  cy="-1.5" r="0.5" fill="none" stroke="#5a3010" strokeWidth="0.2" />
      <circle cx="3"  cy="-1.5" r="0.5" fill="none" stroke="#5a3010" strokeWidth="0.2" />
    </g>
  );
}

const CARGO_BY_SEASON = [CargoFlowers, CargoWheat, CargoPumpkins, CargoFirewood];

function Wagon({ progress, cargoSeason }: { progress: number; cargoSeason: number }) {
  const Cargo = CARGO_BY_SEASON[cargoSeason] ?? CargoFlowers;
  const leftPct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div
      className="hwv-wagon"
      style={{
        position: "absolute",
        left: `calc(${leftPct}% - 22px)`,
        bottom: 2,
        width: 44,
        height: 34,
        transition: "left 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      <div
        className="hwv-anim"
        style={{
          width: "100%",
          height: "100%",
          animation: "hwv-wagon-bob 1700ms cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      >
        <svg width="44" height="34" viewBox="-22 -26 44 34" aria-hidden="true">
          <defs>
            <radialGradient id="hwv-wheel-grad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#a8742e" />
              <stop offset="55%" stopColor="#6b3a1a" />
              <stop offset="100%" stopColor="#2a1810" />
            </radialGradient>
            <linearGradient id="hwv-bed-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c08840" />
              <stop offset="100%" stopColor="#7a4a1c" />
            </linearGradient>
          </defs>

          {/* cargo on the wagon bed */}
          <Cargo />

          {/* back wall / cargo retainer plate */}
          <rect x="-14" y="-13" width="2" height="6" fill="#5a3010" rx="0.3" />
          <rect x="12"  y="-13" width="2" height="6" fill="#5a3010" rx="0.3" />

          {/* wagon bed (rounded trapezoid with gradient) */}
          <path
            d="M -13 -8 L 13 -8 L 15 -2 L -15 -2 Z"
            fill="url(#hwv-bed-grad)"
            stroke="#3a2412"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          {/* bed planks */}
          <line x1="-10.5" y1="-7" x2="-10.5" y2="-3" stroke="#5a3010" strokeWidth="0.45" />
          <line x1="-5.5"  y1="-7" x2="-5.5"  y2="-3" stroke="#5a3010" strokeWidth="0.45" />
          <line x1="0"     y1="-7" x2="0"     y2="-3" stroke="#5a3010" strokeWidth="0.45" />
          <line x1="5.5"   y1="-7" x2="5.5"   y2="-3" stroke="#5a3010" strokeWidth="0.45" />
          <line x1="10.5"  y1="-7" x2="10.5"  y2="-3" stroke="#5a3010" strokeWidth="0.45" />
          {/* iron-banding on the bed top edge */}
          <line x1="-13" y1="-8" x2="13" y2="-8" stroke="#3a2412" strokeWidth="0.5" />

          {/* driver / farmer seated on the front bench */}
          <g transform="translate(-9, -10)">
            {/* body */}
            <path d="M -2 0 L 2 0 L 2.6 5 L -2.6 5 Z" fill="#7a4a1c" stroke="#3a2412" strokeWidth="0.3" />
            <rect x="-1.4" y="-2.5" width="2.8" height="2.6" fill="#d6b078" stroke="#3a2412" strokeWidth="0.3" rx="0.4" />
            {/* hat — wide brim */}
            <ellipse cx="0" cy="-3.4" rx="3" ry="0.7" fill="#5a3010" />
            <rect x="-1.4" y="-5.2" width="2.8" height="2" fill="#5a3010" rx="0.4" />
          </g>

          {/* axle */}
          <line x1="-11" y1="-1" x2="11" y2="-1" stroke="#3a2412" strokeWidth="0.7" />

          {/* wheels — radial-gradient hub with highlight, 6 spokes */}
          {[-11, 11].map((cx) => (
            <g key={cx} transform={`translate(${cx} 2)`}>
              {/* outer tire */}
              <circle cx="0" cy="0" r="4.8" fill="#1a0e08" />
              {/* tire highlight (top-left) */}
              <path d="M -3.4 -3 A 4.8 4.8 0 0 1 0 -4.8" fill="none" stroke="#5a3010" strokeWidth="0.5" />
              {/* hub fill */}
              <circle cx="0" cy="0" r="3.7" fill="url(#hwv-wheel-grad)" />
              {/* 6 spokes evenly spaced */}
              {[0, 30, 60, 90, 120, 150].map((deg) => {
                const a = (deg * Math.PI) / 180;
                const r = 3.4;
                return (
                  <line
                    key={deg}
                    x1={-Math.cos(a) * r}
                    y1={-Math.sin(a) * r}
                    x2={Math.cos(a) * r}
                    y2={Math.sin(a) * r}
                    stroke="#1a0e08"
                    strokeWidth="0.6"
                  />
                );
              })}
              {/* hub cap */}
              <circle cx="0" cy="0" r="1.2" fill="#1a0e08" />
              <circle cx="0" cy="0" r="0.5" fill="#c08840" />
              {/* tiny shadow on the ground */}
              <ellipse cx="0" cy="5.2" rx="4.6" ry="0.5" fill="#000000" opacity="0.25" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Numeral panel ───────────────────────────────────────────────────────

function NumeralPanel({ remaining, palette }: { remaining: number; palette: SeasonPalette }) {
  return (
    <div
      style={{
        flex: `0 0 ${NUMERAL_WIDTH}px`,
        position: "relative",
        background: palette.panelBg,
        borderLeft: `1.5px solid ${palette.panelStroke}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        color: palette.numColor,
      }}
    >
      <span
        data-testid="turns-left"
        style={{
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          lineHeight: 1,
        }}
      >
        {remaining}
      </span>
      <span
        style={{
          fontSize: 7,
          fontWeight: 800,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        turns left
      </span>
    </div>
  );
}

// ─── The strip ───────────────────────────────────────────────────────────

interface SeasonStripProps {
  turnsUsed: number;
  turnBudget: number;
  turnsRemaining?: number;
  seasonIdx: number;
  seasonName: string;
  busy?: boolean;
}

export function SeasonStrip({
  turnsUsed,
  turnBudget,
  turnsRemaining,
  seasonIdx,
  seasonName,
  busy,
}: SeasonStripProps) {
  const total = Math.max(1, turnBudget | 0);
  const used = Math.max(0, Math.min(total, turnsUsed | 0));
  const remaining = (turnsRemaining != null && Number.isFinite(turnsRemaining)) ? Math.max(0, turnsRemaining) : total - used;
  const progress = used / total;
  const ranges = seasonTurnRanges(total);
  const currentPalette = SEASON_PALETTES[seasonIdx] ?? SEASON_PALETTES[0];

  return (
    <div
      role="status"
      aria-label={`${seasonName} — ${remaining} turn${remaining === 1 ? "" : "s"} left`}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        maxWidth: STRIP_MAX_WIDTH,
        minWidth: STRIP_MIN_WIDTH,
        height: STRIP_HEIGHT,
        borderRadius: 8,
        overflow: "hidden",
        border: "1.5px solid #3a2412",
        boxShadow: "0 1px 0 rgba(0,0,0,0.25) inset",
      }}
    >
      <style>{`
        .hwv-tick {
          position: absolute;
          top: 0;
          width: 1px;
          height: 5px;
          background: rgba(58, 36, 18, 0.45);
          pointer-events: none;
        }
        @keyframes hwv-wagon-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        @keyframes hwv-spring-sway {
          0%, 100% { transform: rotate(-4deg); }
          50%      { transform: rotate(4deg); }
        }
        @keyframes hwv-summer-pulse {
          0%, 100% { opacity: 0.78; }
          50%      { opacity: 1; }
        }
        @keyframes hwv-autumn-fall {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(2px, 34px) rotate(140deg); opacity: 0; }
        }
        @keyframes hwv-winter-drift {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hwv-wagon, .hwv-anim { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div style={{ flex: "1 1 auto", display: "flex", position: "relative" }}>
        {ranges.map((r, i) => (
          <Segment
            key={i}
            idx={i}
            palette={SEASON_PALETTES[i]}
            turnsInSeason={r.count}
            flex={r.count / total}
            isActive={i === seasonIdx}
            busy={busy}
          />
        ))}
        <Wagon progress={progress} cargoSeason={seasonIdx} />
      </div>

      <NumeralPanel remaining={remaining} palette={currentPalette} />
    </div>
  );
}
