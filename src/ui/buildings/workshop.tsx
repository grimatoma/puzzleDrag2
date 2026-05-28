import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function WorkshopIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-60 -96 120 112" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <pattern id="workshop-plank" patternUnits="userSpaceOnUse" width="10" height="28">
          <rect width="10" height="28" fill={PAL.wallLight} />
          <rect x="0" y="0" width="9" height="13" fill="rgba(0,0,0,.04)" />
          <rect x="0" y="14" width="9" height="13" fill="rgba(255,255,255,.05)" />
          <line x1="0" y1="0" x2="0" y2="28" stroke={PAL.wallShadow} strokeWidth=".4" opacity=".4" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="52" ry="6" fill="rgba(0,0,0,.30)" />

      {/* stone foundation */}
      <rect x="-46" y="-8" width="92" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-42" y="-6" width="9" height="3" /><rect x="-26" y="-3" width="8" height="3" />
        <rect x="-8" y="-6" width="8" height="3" /><rect x="10" y="-3" width="8" height="3" />
        <rect x="26" y="-6" width="9" height="3" /><rect x="-36" y="-3" width="5" height="2" />
      </g>

      {/* --- MAIN WALLS --- */}
      {/* back wall planks */}
      <rect x="-44" y="-64" width="88" height="56" fill="url(#workshop-plank)" />
      {/* shadow strip left */}
      <rect x="-44" y="-64" width="14" height="56" fill={PAL.wallShadow} opacity=".45" />
      {/* wall top beam */}
      <rect x="-44" y="-64" width="88" height="3.5" fill={PAL.timber} />

      {/* --- EXPOSED TIMBER FRAME --- */}
      {/* vertical corner posts */}
      <rect x="-46" y="-64" width="5" height="56" fill={PAL.timber} />
      <rect x="41" y="-64" width="5" height="56" fill={PAL.timber} />
      {/* horizontal mid-rail */}
      <rect x="-46" y="-38" width="92" height="4" fill={PAL.timberSoft} />
      {/* diagonal knee brace left */}
      <line x1="-41" y1="-64" x2="-20" y2="-38" stroke={PAL.timber} strokeWidth="3.5" strokeLinecap="round" />
      {/* diagonal knee brace right */}
      <line x1="41" y1="-64" x2="20" y2="-38" stroke={PAL.timber} strokeWidth="3.5" strokeLinecap="round" />

      {/* --- OPEN FRONT / WIDE DOUBLE DOORS --- */}
      {/* left door (open, angled back) */}
      <path d="M-24,-8 L-24,-38 L-8,-38 L-8,-8 Z" fill={PAL.timber} />
      <path d="M-24,-8 L-24,-38 L-8,-38 L-8,-8 Z" fill="none" stroke={PAL.eave} strokeWidth=".8" />
      {/* door panel detail left */}
      <rect x="-22" y="-35" width="12" height="11" rx=".5" fill="#3a2010" opacity=".6" />
      <rect x="-22" y="-22" width="12" height="11" rx=".5" fill="#3a2010" opacity=".6" />
      {/* right door */}
      <path d="M8,-8 L8,-38 L24,-38 L24,-8 Z" fill={PAL.timber} />
      <path d="M8,-8 L8,-38 L24,-38 L24,-8 Z" fill="none" stroke={PAL.eave} strokeWidth=".8" />
      {/* door panel detail right */}
      <rect x="10" y="-35" width="12" height="11" rx=".5" fill="#3a2010" opacity=".6" />
      <rect x="10" y="-22" width="12" height="11" rx=".5" fill="#3a2010" opacity=".6" />
      {/* door knobs */}
      <circle cx="-10" cy="-22" r="1.4" fill={PAL.brass} />
      <circle cx="10" cy="-22" r="1.4" fill={PAL.brass} />
      {/* workshop interior glimpse */}
      <rect x="-8" y="-38" width="16" height="30" fill="#1a1008" opacity=".7" />

      {/* --- WINDOWS (flanking the doors) --- */}
      {/* left window */}
      <rect x="-38" y="-56" width="12" height="10" rx="1" fill="#1a1208" />
      <rect x="-37" y="-55" width="10" height="8" fill={lit}
        style={{ animation: 'flicker 3.2s ease-in-out infinite', transformOrigin: '-32px -51px' }} />
      <line x1="-32" y1="-55" x2="-32" y2="-47" stroke="#1a1208" strokeWidth=".7" />
      <line x1="-37" y1="-51" x2="-27" y2="-51" stroke="#1a1208" strokeWidth=".7" />
      <rect x="-39" y="-47" width="14" height="2" rx=".5" fill={PAL.timberSoft} />
      {/* right window */}
      <rect x="26" y="-56" width="12" height="10" rx="1" fill="#1a1208" />
      <rect x="27" y="-55" width="10" height="8" fill={lit}
        style={{ animation: 'flicker 2.8s 0.4s ease-in-out infinite', transformOrigin: '32px -51px' }} />
      <line x1="32" y1="-55" x2="32" y2="-47" stroke="#1a1208" strokeWidth=".7" />
      <line x1="27" y1="-51" x2="37" y2="-51" stroke="#1a1208" strokeWidth=".7" />
      <rect x="25" y="-47" width="14" height="2" rx=".5" fill={PAL.timberSoft} />

      {/* --- ROOF (shallow lean-to over open front) --- */}
      {/* overhang fascia */}
      <polygon points="-50,-64 0,-80 50,-64" fill={PAL.timberSoft} />
      {/* left slope shadow */}
      <polygon points="-50,-64 0,-80 -22,-64" fill="rgba(0,0,0,.26)" />
      {/* eave beam */}
      <rect x="-50" y="-64" width="100" height="3.5" fill={PAL.eave} />
      {/* rafter ends visible on front */}
      {([-38, -20, 0, 20, 38] as number[]).map((x) => (
        <rect key={x} x={x - 1.5} y="-64" width="3" height="6" fill={PAL.timber} />
      ))}
      {/* ridge beam */}
      <rect x="-6" y="-81" width="12" height="3" rx=".5" fill={PAL.ridge} />

      {/* --- TOOL WALL (left interior wall, hanging tools) --- */}
      {/* horizontal wall rack */}
      <rect x="-44" y="-52" width="4" height="1.5" fill={PAL.timberSoft} />
      {/* axe hanging on left wall */}
      {detail !== 'low' && (
        <g transform="translate(-48 -55)"
           style={{ animation: 'wiggle 2.8s ease-in-out infinite', transformOrigin: '-48px -42px' }}>
          {/* handle */}
          <rect x="3" y="0" width="2" height="14" rx=".5" fill={PAL.timberSoft} />
          {/* axe head */}
          <path d="M1,-2 L5,-2 L7,4 L5,6 L1,4 Z" fill={PAL.stoneShade} />
          <path d="M1,-2 L5,-2 L5,4 L1,4 Z" fill="#7a7a7a" />
          <line x1="1" y1="-2" x2="7" y2="4" stroke="rgba(255,255,255,.2)" strokeWidth=".4" />
        </g>
      )}

      {/* saw hanging on right part of left wall */}
      {detail !== 'low' && (
        <g transform="translate(-34 -58)"
           style={{ animation: 'wiggle 3.4s 0.7s ease-in-out infinite', transformOrigin: '-34px -50px' }}>
          {/* saw handle */}
          <path d="M0,0 L2,-12" stroke={PAL.timberSoft} strokeWidth="1.8" strokeLinecap="round" />
          {/* blade */}
          <path d="M-1,-12 L7,-12 L7,-10 L-1,-10 Z" fill="#9a9a9a" />
          {/* teeth */}
          {([0,1,2,3,4,5,6] as number[]).map((i) => (
            <path key={i} d={`M${-1+i},-10 L${-0.5+i},-8 L${i},-10`}
              fill="#7a7a7a" />
          ))}
        </g>
      )}

      {/* --- SAWDUST / POLLEN PARTICLES in workshop air --- */}
      {detail !== 'low' && (
        <g>
          {([
            { cx: -28, cy: -30, dur: 3.2, delay: 0, px: 18 },
            { cx: -10, cy: -22, dur: 2.8, delay: 0.6, px: 24 },
            { cx: 4,  cy: -28, dur: 3.6, delay: 1.1, px: -16 },
            { cx: 16, cy: -18, dur: 2.5, delay: 0.3, px: 20 },
            { cx: -18, cy: -16, dur: 3.1, delay: 1.5, px: 28 },
            { cx: 28, cy: -26, dur: 2.9, delay: 0.9, px: -22 },
            { cx: 6,  cy: -34, dur: 3.4, delay: 1.8, px: 14 },
            { cx: -4, cy: -12, dur: 2.6, delay: 0.4, px: -18 },
          ]).map(({ cx, cy, dur, delay, px }, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i % 3 === 0 ? 1.1 : 0.7}
              fill="#e8d090"
              style={{
                "--px": `${px}px`,
                animation: `pollen ${dur}s ${delay}s ease-out infinite`,
                transformOrigin: `${cx}px ${cy}px`,
                opacity: 0.7,
              }}
            />
          ))}
        </g>
      )}

      {/* --- WORKBENCH (detail prop, front left) --- */}
      {detail === 'high' && (
        <g transform="translate(-44 -2)">
          <ellipse cx="8" cy="0" rx="12" ry="1.8" fill="rgba(0,0,0,.25)" />
          {/* legs */}
          <rect x="2" y="-10" width="2" height="10" fill={PAL.timber} />
          <rect x="12" y="-10" width="2" height="10" fill={PAL.timber} />
          {/* bench top */}
          <rect x="0" y="-12" width="16" height="3" rx=".5" fill={PAL.timberSoft} />
          {/* plank grain lines */}
          <line x1="4" y1="-12" x2="4" y2="-9" stroke={PAL.timber} strokeWidth=".4" opacity=".5" />
          <line x1="8" y1="-12" x2="8" y2="-9" stroke={PAL.timber} strokeWidth=".4" opacity=".5" />
          <line x1="12" y1="-12" x2="12" y2="-9" stroke={PAL.timber} strokeWidth=".4" opacity=".5" />
          {/* wood block on bench */}
          <rect x="4" y="-16" width="5" height="4" rx=".4" fill={PAL.wallShadow} />
          <rect x="4" y="-17" width="5" height="1.5" rx=".3" fill={PAL.wallLight} />
        </g>
      )}

      {/* --- WOOD SHAVINGS pile (front right) --- */}
      {detail === 'high' && (
        <g transform="translate(36 -1)">
          <ellipse cx="0" cy="0" rx="9" ry="2.2" fill="rgba(0,0,0,.22)" />
          {/* curly shavings */}
          <path d="M-7,0 Q-4,-4 0,-2 Q4,-6 7,-1" fill="none" stroke="#c8a060" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M-5,0 Q-2,-3 2,-1 Q5,-4 8,0" fill="none" stroke="#d4ae70" strokeWidth="1" strokeLinecap="round" opacity=".8" />
          <path d="M-6,-1 Q-3,-2 0,0 Q3,-3 6,-1" fill="none" stroke="#b89050" strokeWidth=".9" strokeLinecap="round" opacity=".7" />
        </g>
      )}
    </svg>
  );
}
