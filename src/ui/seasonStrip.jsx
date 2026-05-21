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

const SEASON_PALETTES = [
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
export function seasonTurnRanges(turnBudget) {
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
  const ref = useRef(null);
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
  return [ref, width];
}

// ─── Per-season decorations ──────────────────────────────────────────────
// Each Deco gets the segment's measured width and renders elements scaled
// to fill the available space. Tiny segments only show their "anchor"
// element; wider segments add filler so they never look empty.

function evenSpaced(count, width, leftPad = 8, rightPad = 8) {
  if (count <= 0) return [];
  if (count === 1) return [width / 2];
  const usable = Math.max(0, width - leftPad - rightPad);
  return Array.from({ length: count }, (_, i) => leftPad + (usable * i) / (count - 1));
}

function SpringDeco({ width }) {
  if (width <= 0) return null;
  // Anchor: a single butterfly that always appears (idle flutter).
  // Filler: flowers along the bottom, ~1 per 18px of width.
  const flowerCount = Math.max(2, Math.round(width / 18));
  const flowerXs = evenSpaced(flowerCount, width, 8, 10);
  const palette = ["#f06292", "#ffb74d", "#ba68c8", "#f06292", "#ffb74d"];
  const showSecondButterfly = width >= 170;
  const showGrassTufts = width >= 110;

  return (
    <g aria-hidden="true">
      {showGrassTufts && (
        <g stroke="#3a7a2a" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.7">
          {evenSpaced(Math.max(2, Math.round(width / 60)), width, 4, 4).map((x, i) => (
            <g key={i} transform={`translate(${x},44)`}>
              <line x1="-2" y1="0" x2="-1" y2="-3" />
              <line x1="0" y1="0" x2="0" y2="-4" />
              <line x1="2" y1="0" x2="1" y2="-3" />
            </g>
          ))}
        </g>
      )}
      {flowerXs.map((x, i) => {
        const color = palette[i % palette.length];
        return (
          <g key={`f${i}`} transform={`translate(${x},44)`}>
            <line x1="0" y1="0" x2="0" y2="-6" stroke="#3a7a2a" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="0" cy="-7.5" r="2" fill={color} stroke="#9a3358" strokeWidth="0.3" />
            <circle cx="0" cy="-7.5" r="0.7" fill="#fff4a8" />
          </g>
        );
      })}
      <g
        transform={`translate(${Math.min(28, width / 3)},14)`}
        className="hwv-anim"
        style={{
          transformOrigin: `${Math.min(28, width / 3)}px 14px`,
          animation: "hwv-spring-sway 1500ms ease-in-out infinite",
        }}
      >
        <path d="M0 0 C -2 -1.5, -3.5 -0.5, -2.5 1 C -3.5 1.5, -2 2.5, 0 1.5 Z" fill="#9c66c8" stroke="#5a2e7a" strokeWidth="0.3" />
        <path d="M0 0 C  2 -1.5,  3.5 -0.5,  2.5 1 C  3.5 1.5,  2 2.5, 0 1.5 Z" fill="#9c66c8" stroke="#5a2e7a" strokeWidth="0.3" />
      </g>
      {showSecondButterfly && (
        <g
          transform={`translate(${width - 22},20)`}
          className="hwv-anim"
          style={{
            transformOrigin: `${width - 22}px 20px`,
            animation: "hwv-spring-sway 1900ms ease-in-out infinite",
            animationDelay: "300ms",
          }}
        >
          <path d="M0 0 C -1.6 -1.2, -2.8 -0.4, -2 0.8 C -2.8 1.2, -1.6 2, 0 1.2 Z" fill="#f06292" stroke="#9a3358" strokeWidth="0.3" />
          <path d="M0 0 C  1.6 -1.2,  2.8 -0.4,  2 0.8 C  2.8 1.2,  1.6 2, 0 1.2 Z" fill="#f06292" stroke="#9a3358" strokeWidth="0.3" />
        </g>
      )}
    </g>
  );
}

function SummerDeco({ width }) {
  if (width <= 0) return null;
  // Anchor: sun in upper-left. Filler: clouds across, scaling with width.
  const cloudCount = Math.max(1, Math.round((width - 32) / 80));
  const cloudXs = evenSpaced(cloudCount, width - 30, 36, 8);
  const showBee = width >= 140;
  const showWheatTufts = width >= 100;

  return (
    <g aria-hidden="true">
      {/* sun rays */}
      <g
        className="hwv-anim"
        style={{ animation: "hwv-summer-pulse 2200ms ease-in-out infinite" }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={16 + 7 * Math.cos(a)}
              y1={14 + 7 * Math.sin(a)}
              x2={16 + 11 * Math.cos(a)}
              y2={14 + 11 * Math.sin(a)}
              stroke="#f0c14b"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx="16" cy="14" r="5.5" fill="#f6c342" stroke="#a87832" strokeWidth="0.6" />
      <circle cx="14" cy="12" r="1.2" fill="#fff2c6" opacity="0.85" />
      {/* clouds */}
      {cloudXs.map((x, i) => (
        <g key={i} transform={`translate(${x},${10 + (i % 2) * 4})`} opacity="0.85">
          <ellipse cx="0" cy="0" rx="7" ry="2.8" fill="#fff9e8" stroke="#c79a48" strokeWidth="0.4" />
          <ellipse cx="-3" cy="-1.2" rx="3" ry="2.4" fill="#fff9e8" stroke="#c79a48" strokeWidth="0.4" />
          <ellipse cx="2.5" cy="-1.6" rx="3.5" ry="2.8" fill="#fff9e8" stroke="#c79a48" strokeWidth="0.4" />
        </g>
      ))}
      {/* wheat tufts along the bottom */}
      {showWheatTufts && (
        <g>
          {evenSpaced(Math.max(2, Math.round(width / 40)), width, 32, 10).map((x, i) => (
            <g key={i} transform={`translate(${x},44)`}>
              <line x1="0" y1="0" x2="0" y2="-5" stroke="#a87832" strokeWidth="0.6" />
              <ellipse cx="-1" cy="-5" rx="0.8" ry="1.4" fill="#f0c14b" stroke="#a87832" strokeWidth="0.3" />
              <ellipse cx="1"  cy="-5" rx="0.8" ry="1.4" fill="#f0c14b" stroke="#a87832" strokeWidth="0.3" />
              <ellipse cx="0"  cy="-6.5" rx="0.8" ry="1.4" fill="#f0c14b" stroke="#a87832" strokeWidth="0.3" />
            </g>
          ))}
        </g>
      )}
      {/* bee silhouette */}
      {showBee && (
        <g
          transform={`translate(${width - 26},20)`}
          className="hwv-anim"
          style={{
            transformOrigin: `${width - 26}px 20px`,
            animation: "hwv-spring-sway 900ms ease-in-out infinite",
          }}
        >
          <ellipse cx="0" cy="0" rx="2" ry="1.3" fill="#f0c14b" stroke="#3a2412" strokeWidth="0.3" />
          <rect x="-1.4" y="-1.3" width="0.8" height="2.6" fill="#3a2412" />
          <rect x="0.4"  y="-1.3" width="0.8" height="2.6" fill="#3a2412" />
          <ellipse cx="-1.2" cy="-1.4" rx="1.4" ry="0.7" fill="#fff9e8" opacity="0.6" />
          <ellipse cx="1.2"  cy="-1.4" rx="1.4" ry="0.7" fill="#fff9e8" opacity="0.6" />
        </g>
      )}
    </g>
  );
}

function AutumnDeco({ width }) {
  if (width <= 0) return null;
  // Anchor: tree on the left + leaf pile at its trunk base.
  // Filler: falling leaves at staggered x's, plus a pumpkin if there's room.
  const fallingLeafCount = Math.max(1, Math.round((width - 50) / 35));
  const fallingXs = evenSpaced(fallingLeafCount, width - 36, 44, 10);
  const showPumpkin = width >= 170;
  const showAcorns = width >= 130;

  return (
    <g aria-hidden="true">
      {/* trunk */}
      <rect x="14" y="22" width="4" height="16" fill="#6b3a1a" rx="0.8" />
      {/* canopy backdrop */}
      <ellipse cx="16" cy="18" rx="13" ry="11" fill="#8a4a1e" opacity="0.55" />
      {/* canopy leaves */}
      {[
        { x: 9, y: 12, color: "#e07a3a", rot: -25 },
        { x: 22, y: 14, color: "#d04a28", rot: 20 },
        { x: 16, y: 9, color: "#f0a838", rot: 0 },
        { x: 11, y: 22, color: "#f0a838", rot: -10 },
        { x: 21, y: 22, color: "#d04a28", rot: 15 },
      ].map((l, i) => (
        <g key={i} transform={`translate(${l.x},${l.y}) rotate(${l.rot})`}>
          <path d="M 0 -2.6 Q 2.2 0 0 2.6 Q -2.2 0 0 -2.6 Z" fill={l.color} stroke="#7a3a14" strokeWidth="0.3" />
          <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#7a3a14" strokeWidth="0.25" />
        </g>
      ))}
      {/* leaf pile at trunk base */}
      <ellipse cx="22" cy="40" rx="9" ry="1.6" fill="#a85822" opacity="0.55" />
      <circle cx="18" cy="39" r="1.2" fill="#d04a28" opacity="0.85" />
      <circle cx="22" cy="40" r="1.2" fill="#f0a838" opacity="0.85" />
      <circle cx="26" cy="39" r="1.1" fill="#e07a3a" opacity="0.85" />
      {/* falling leaves filler */}
      {fallingXs.map((x, i) => (
        <g
          key={i}
          transform={`translate(${x},6)`}
          className="hwv-anim"
          style={{
            transformOrigin: `${x}px 6px`,
            animation: "hwv-autumn-fall 3800ms ease-in infinite",
            animationDelay: `${(i * 700) % 3800}ms`,
          }}
        >
          <path d="M 0 -2.4 Q 2 0 0 2.4 Q -2 0 0 -2.4 Z" fill={["#e07a3a", "#d04a28", "#f0a838"][i % 3]} stroke="#7a3a14" strokeWidth="0.3" />
        </g>
      ))}
      {/* ground pumpkin */}
      {showPumpkin && (
        <g transform={`translate(${width - 22},38)`}>
          <ellipse cx="0" cy="0" rx="4" ry="3" fill="#e07a3a" stroke="#7a3a14" strokeWidth="0.4" />
          <line x1="-2" y1="-2.4" x2="-2" y2="2.4" stroke="#a8521c" strokeWidth="0.5" />
          <line x1="0"  y1="-3"   x2="0"  y2="3"   stroke="#a8521c" strokeWidth="0.5" />
          <line x1="2"  y1="-2.4" x2="2"  y2="2.4" stroke="#a8521c" strokeWidth="0.5" />
          <line x1="0"  y1="-3"   x2="0"  y2="-4.2" stroke="#3a7a2a" strokeWidth="0.7" strokeLinecap="round" />
        </g>
      )}
      {/* acorns on the ground */}
      {showAcorns && (
        <g transform={`translate(${width / 2 + 8},40)`}>
          <ellipse cx="0" cy="0" rx="1.4" ry="1.7" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
          <ellipse cx="0" cy="-1.4" rx="1.5" ry="0.7" fill="#6b3a1a" stroke="#3a2412" strokeWidth="0.3" />
          <ellipse cx="3" cy="0" rx="1.3" ry="1.5" fill="#a85822" stroke="#3a2412" strokeWidth="0.3" />
          <ellipse cx="3" cy="-1.2" rx="1.4" ry="0.6" fill="#6b3a1a" stroke="#3a2412" strokeWidth="0.3" />
        </g>
      )}
    </g>
  );
}

function WinterDeco({ width }) {
  if (width <= 0) return null;
  // Anchor: snow-dusted evergreen on the left.
  // Filler: drifting snowflakes across the sky, plus a snow drift or a
  // second evergreen for wider segments.
  const flakeCount = Math.max(2, Math.round(width / 24));
  const flakeXs = evenSpaced(flakeCount, width - 30, 34, 8);
  const showSecondTree = width >= 180;
  const showSnowdrift = width >= 110;

  return (
    <g aria-hidden="true">
      {/* evergreen — anchor */}
      <rect x="14" y="34" width="3" height="6" fill="#6b3a1a" rx="0.4" />
      <path d="M 15.5 6 L 23 22 L 8 22 Z" fill="#2a6a4a" />
      <path d="M 15.5 14 L 25 32 L 6 32 Z" fill="#2a6a4a" />
      {/* snow on the branches */}
      <ellipse cx="15.5" cy="22" rx="7" ry="0.9" fill="#f8fbff" />
      <ellipse cx="15.5" cy="32" rx="9" ry="0.9" fill="#f8fbff" />
      {/* drifting snowflakes */}
      {flakeXs.map((x, i) => {
        const y = 8 + (i % 4) * 7;
        const size = 0.9 + (i % 3) * 0.4;
        return (
          <g
            key={i}
            transform={`translate(${x},${y})`}
            className="hwv-anim"
            style={{
              transformOrigin: `${x}px ${y}px`,
              animation: "hwv-winter-drift 2600ms ease-in-out infinite",
              animationDelay: `${(i * 350) % 2600}ms`,
            }}
          >
            <circle cx="0" cy="0" r={size} fill="#ffffff" stroke="#7aa9c6" strokeWidth="0.3" />
          </g>
        );
      })}
      {/* snowdrift in the middle-foreground */}
      {showSnowdrift && (
        <path
          d={`M ${width / 2 - 14} 44 Q ${width / 2} 38 ${width / 2 + 14} 44 Z`}
          fill="#ffffff"
          stroke="#bcd0e0"
          strokeWidth="0.5"
        />
      )}
      {/* small evergreen on the right */}
      {showSecondTree && (
        <g transform={`translate(${width - 24},0)`}>
          <rect x="-1" y="36" width="2" height="4" fill="#6b3a1a" rx="0.3" />
          <path d="M 0 14 L 6 26 L -6 26 Z" fill="#2a6a4a" />
          <path d="M 0 20 L 7 36 L -7 36 Z" fill="#2a6a4a" />
          <ellipse cx="0" cy="26" rx="5" ry="0.7" fill="#f8fbff" />
          <ellipse cx="0" cy="36" rx="6.5" ry="0.7" fill="#f8fbff" />
        </g>
      )}
    </g>
  );
}

const DECO_BY_SEASON = [SpringDeco, SummerDeco, AutumnDeco, WinterDeco];

// ─── A single season segment ─────────────────────────────────────────────

function Segment({ idx, palette, turnsInSeason, flex, isActive, busy }) {
  const [ref, width] = useMeasuredWidth();
  const Deco = busy ? DECO_BY_SEASON[idx] : null;

  // Tick marks at the top of the segment, one per turn boundary inside the
  // segment (turnsInSeason - 1 ticks for turnsInSeason turns).
  const ticks = [];
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

      {/* per-season decorative SVG layer (busy mode only) */}
      {Deco && width > 0 && (
        <svg
          width={width}
          height={STRIP_HEIGHT - 2}
          viewBox={`0 0 ${width} ${STRIP_HEIGHT - 2}`}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <Deco width={width} />
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

function Wagon({ progress, cargoSeason }) {
  const Cargo = CARGO_BY_SEASON[cargoSeason] ?? CargoFlowers;
  const leftPct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div
      className="hwv-wagon"
      style={{
        position: "absolute",
        left: `calc(${leftPct}% - 18px)`,
        bottom: 2,
        width: 36,
        height: 32,
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
          animation: "hwv-wagon-bob 1700ms ease-in-out infinite",
        }}
      >
        <svg width="36" height="32" viewBox="-18 -24 36 32" aria-hidden="true">
          <Cargo />
          {/* wagon bed (rounded trapezoid) */}
          <path
            d="M -11 -8 L 11 -8 L 13 -2 L -13 -2 Z"
            fill="#a8742e"
            stroke="#3a2412"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* bed planks */}
          <line x1="-9" y1="-7" x2="-9" y2="-3" stroke="#6b3a1a" strokeWidth="0.4" />
          <line x1="-3" y1="-7" x2="-3" y2="-3" stroke="#6b3a1a" strokeWidth="0.4" />
          <line x1="3"  y1="-7" x2="3"  y2="-3" stroke="#6b3a1a" strokeWidth="0.4" />
          <line x1="9"  y1="-7" x2="9"  y2="-3" stroke="#6b3a1a" strokeWidth="0.4" />
          {/* axle */}
          <line x1="-9" y1="-1" x2="9" y2="-1" stroke="#3a2412" strokeWidth="0.6" />
          {/* wheels — spin */}
          <g
            transform="translate(-8 2)"
            className="hwv-anim"
            style={{ transformOrigin: "-8px 2px", animation: "hwv-wagon-wheel 4000ms linear infinite" }}
          >
            <circle cx="0" cy="0" r="3.2" fill="#3a2412" />
            <circle cx="0" cy="0" r="2.2" fill="#6b3a1a" />
            <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#3a2412" strokeWidth="0.4" />
            <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#3a2412" strokeWidth="0.4" />
            <line x1="-1.6" y1="-1.6" x2="1.6" y2="1.6" stroke="#3a2412" strokeWidth="0.4" />
            <line x1="-1.6" y1="1.6"  x2="1.6" y2="-1.6" stroke="#3a2412" strokeWidth="0.4" />
            <circle cx="0" cy="0" r="0.6" fill="#3a2412" />
          </g>
          <g
            transform="translate(8 2)"
            className="hwv-anim"
            style={{ transformOrigin: "8px 2px", animation: "hwv-wagon-wheel 4000ms linear infinite" }}
          >
            <circle cx="0" cy="0" r="3.2" fill="#3a2412" />
            <circle cx="0" cy="0" r="2.2" fill="#6b3a1a" />
            <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#3a2412" strokeWidth="0.4" />
            <line x1="0" y1="-2.2" x2="0" y2="2.2" stroke="#3a2412" strokeWidth="0.4" />
            <line x1="-1.6" y1="-1.6" x2="1.6" y2="1.6" stroke="#3a2412" strokeWidth="0.4" />
            <line x1="-1.6" y1="1.6"  x2="1.6" y2="-1.6" stroke="#3a2412" strokeWidth="0.4" />
            <circle cx="0" cy="0" r="0.6" fill="#3a2412" />
          </g>
        </svg>
      </div>
    </div>
  );
}

// ─── Numeral panel ───────────────────────────────────────────────────────

function NumeralPanel({ remaining, palette }) {
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

export function SeasonStrip({
  turnsUsed,
  turnBudget,
  turnsRemaining,
  seasonIdx,
  seasonName,
  busy,
}) {
  const total = Math.max(1, turnBudget | 0);
  const used = Math.max(0, Math.min(total, turnsUsed | 0));
  const remaining = Number.isFinite(turnsRemaining) ? Math.max(0, turnsRemaining) : total - used;
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
        @keyframes hwv-wagon-wheel {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
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
