import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function WorkshopIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-64 -104 128 120" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <pattern id="workshop-plank" patternUnits="userSpaceOnUse" width="12" height="32">
          <rect width="12" height="32" fill={PAL.wallLight} />
          <rect x="0" y="0" width="11" height="15" fill="rgba(0,0,0,.04)" />
          <rect x="0" y="16" width="11" height="15" fill="rgba(255,255,255,.05)" />
          <line x1="0" y1="0" x2="0" y2="32" stroke={PAL.wallShadow} strokeWidth=".5" opacity=".4" />
          <line x1="6" y1="14" x2="6" y2="18" stroke={PAL.wallShadow} strokeWidth=".3" opacity=".3" />
        </pattern>
        <pattern id="workshop-roof-plank" patternUnits="userSpaceOnUse" width="14" height="8">
          <rect width="14" height="8" fill={PAL.timberSoft} />
          <rect x="0" y="0" width="14" height="4" fill="rgba(0,0,0,.06)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke={PAL.timber} strokeWidth=".6" opacity=".5" />
          <line x1="7" y1="0" x2="7" y2="8" stroke={PAL.timber} strokeWidth=".3" opacity=".35" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="56" ry="6.5" fill="rgba(0,0,0,.32)" />

      {/* stone foundation */}
      <rect x="-50" y="-8" width="100" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".52">
        <rect x="-46" y="-6" width="10" height="3" /><rect x="-28" y="-3" width="9" height="3" />
        <rect x="-8"  y="-6" width="8" height="3" /><rect x="12"  y="-3" width="9" height="3" />
        <rect x="28"  y="-6" width="10" height="3" /><rect x="-40" y="-3" width="6" height="2" />
        <rect x="18"  y="-6" width="6" height="2" />
      </g>

      {/* === BACK WALL PLANKS === */}
      <rect x="-48" y="-72" width="96" height="64" fill="url(#workshop-plank)" />
      {/* left shadow strip */}
      <rect x="-48" y="-72" width="16" height="64" fill={PAL.wallShadow} opacity=".42" />
      {/* right highlight strip */}
      <rect x="36" y="-72" width="12" height="64" fill="rgba(255,255,255,.06)" />

      {/* === EXPOSED HEAVY TIMBER FRAME === */}
      {/* corner posts — left */}
      <rect x="-50" y="-72" width="6" height="64" fill={PAL.timber} />
      <line x1="-47" y1="-72" x2="-47" y2="-8" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      {/* corner posts — right */}
      <rect x="44" y="-72" width="6" height="64" fill={PAL.timber} />
      <line x1="47" y1="-72" x2="47" y2="-8" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      {/* top wall plate */}
      <rect x="-50" y="-72" width="100" height="4.5" fill={PAL.timber} />
      {/* mid rail */}
      <rect x="-50" y="-42" width="100" height="4" fill={PAL.timberSoft} />
      {/* knee brace left */}
      <line x1="-44" y1="-72" x2="-18" y2="-42" stroke={PAL.timber} strokeWidth="4" strokeLinecap="round" />
      {/* knee brace right */}
      <line x1="44" y1="-72" x2="18" y2="-42" stroke={PAL.timber} strokeWidth="4" strokeLinecap="round" />
      {/* secondary diagonal left upper */}
      <line x1="-44" y1="-42" x2="-22" y2="-72" stroke={PAL.timberSoft} strokeWidth="2" strokeLinecap="round" opacity=".65" />

      {/* === OPEN FRONT — WIDE DOUBLE DOORS === */}
      {/* door surround/jamb */}
      <rect x="-26" y="-42" width="52" height="34" fill={PAL.timber} opacity=".55" />
      {/* left door panel */}
      <rect x="-25" y="-41" width="23" height="33" fill="#3a2010" />
      <rect x="-23" y="-39" width="10" height="13" rx=".6" fill="#2a1808" opacity=".8" />
      <rect x="-23" y="-24" width="10" height="13" rx=".6" fill="#2a1808" opacity=".8" />
      {/* door rail lines on left door */}
      <line x1="-25" y1="-26" x2="-2" y2="-26" stroke={PAL.timber} strokeWidth=".8" opacity=".6" />
      {/* right door panel */}
      <rect x="2" y="-41" width="23" height="33" fill="#3a2010" />
      <rect x="4" y="-39" width="10" height="13" rx=".6" fill="#2a1808" opacity=".8" />
      <rect x="4" y="-24" width="10" height="13" rx=".6" fill="#2a1808" opacity=".8" />
      <line x1="2" y1="-26" x2="25" y2="-26" stroke={PAL.timber} strokeWidth=".8" opacity=".6" />
      {/* door knobs */}
      <circle cx="-3" cy="-24" r="1.6" fill={PAL.brass} />
      <circle cx="3" cy="-24" r="1.6" fill={PAL.brass} />
      {/* door knob glint */}
      <circle cx="-3.6" cy="-24.6" r=".5" fill="rgba(255,255,255,.55)" />
      <circle cx="2.4" cy="-24.6" r=".5" fill="rgba(255,255,255,.55)" />
      {/* workshop interior darkness visible between doors */}
      <rect x="-1" y="-41" width="2" height="33" fill="#100804" opacity=".7" />

      {/* === WINDOWS flanking the doors === */}
      {/* left window surround */}
      <rect x="-42" y="-64" width="14" height="12" rx="1.2" fill={PAL.timber} />
      <rect x="-41" y="-63" width="12" height="10" fill="#13100a" />
      <rect x="-40" y="-62" width="10" height="8" fill={lit}
        style={{ animation: 'flicker 3.2s ease-in-out infinite', transformOrigin: '-35px -58px' }} />
      <line x1="-35" y1="-62" x2="-35" y2="-54" stroke="#13100a" strokeWidth=".7" />
      <line x1="-40" y1="-58" x2="-30" y2="-58" stroke="#13100a" strokeWidth=".7" />
      {/* left sill */}
      <rect x="-43" y="-54" width="16" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* right window surround */}
      <rect x="28" y="-64" width="14" height="12" rx="1.2" fill={PAL.timber} />
      <rect x="29" y="-63" width="12" height="10" fill="#13100a" />
      <rect x="30" y="-62" width="10" height="8" fill={lit}
        style={{ animation: 'flicker 2.7s 0.5s ease-in-out infinite', transformOrigin: '35px -58px' }} />
      <line x1="35" y1="-62" x2="35" y2="-54" stroke="#13100a" strokeWidth=".7" />
      <line x1="30" y1="-58" x2="40" y2="-58" stroke="#13100a" strokeWidth=".7" />
      {/* right sill */}
      <rect x="27" y="-54" width="16" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* === PITCHED ROOF === */}
      {/* main roof surface */}
      <polygon points="-54,-72 0,-92 54,-72" fill="url(#workshop-roof-plank)" />
      {/* left slope shadow */}
      <polygon points="-54,-72 0,-92 -24,-72" fill="rgba(0,0,0,.28)" />
      {/* eave fascia */}
      <rect x="-54" y="-72" width="108" height="4" fill={PAL.eave} />
      {/* rafter tails visible at eave */}
      {([-44, -28, -10, 10, 28, 44] as number[]).map((x) => (
        <rect key={x} x={x - 2} y="-72" width="4" height="7" rx=".5" fill={PAL.timber} />
      ))}
      {/* ridge beam */}
      <rect x="-8" y="-93" width="16" height="3.5" rx=".8" fill={PAL.ridge} />
      {/* ridge cap shadow */}
      <line x1="-8" y1="-91.5" x2="8" y2="-91.5" stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />

      {/* === TOOL WALL: hanging axe (left wall area) === */}
      {/* wall peg rack */}
      <rect x="-50" y="-56" width="5" height="2" rx=".4" fill={PAL.timberSoft} />
      <rect x="-50" y="-48" width="5" height="2" rx=".4" fill={PAL.timberSoft} />

      {/* hanging axe — wiggles on peg */}
      {detail !== 'low' && (
        <g transform="translate(-54 -68)"
           style={{ animation: 'wiggle 3s ease-in-out infinite', transformOrigin: '-50px -56px' }}>
          {/* handle */}
          <rect x="2.5" y="0" width="2.5" height="16" rx=".8" fill={PAL.timberSoft} />
          {/* grain on handle */}
          <line x1="3.2" y1="2" x2="3.2" y2="14" stroke={PAL.timber} strokeWidth=".3" opacity=".5" />
          {/* axe head */}
          <path d="M0.5,-3 L5,-3 L7.5,5 L5,8 L0.5,5 Z" fill={PAL.stoneShade} />
          <path d="M0.5,-3 L5,-3 L5,5 L0.5,5 Z" fill="#828282" />
          {/* bit bevel highlight */}
          <line x1="0.5" y1="-3" x2="7.5" y2="5" stroke="rgba(255,255,255,.22)" strokeWidth=".5" />
          {/* eye hole */}
          <ellipse cx="3" cy="2" rx="1.2" ry=".8" fill="rgba(0,0,0,.5)" />
        </g>
      )}

      {/* hanging saw — wiggles on peg */}
      {detail !== 'low' && (
        <g transform="translate(-40 -66)"
           style={{ animation: 'wiggle 3.8s 0.8s ease-in-out infinite', transformOrigin: '-38px -56px' }}>
          {/* saw handle (pistol grip) */}
          <path d="M0,0 Q-1,-6 1,-13" stroke={PAL.timberSoft} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M-1,-13 Q0,-15 2,-14" stroke={PAL.timberSoft} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* blade body */}
          <rect x="-1" y="-16" width="9" height="3" rx=".4" fill="#9a9a9a" />
          <rect x="-1" y="-14" width="9" height="1" fill="#b8b8b8" opacity=".5" />
          {/* teeth along bottom edge */}
          {([0, 1, 2, 3, 4, 5, 6, 7] as number[]).map((i) => (
            <path key={i} d={`M${-1 + i},-13 L${-0.5 + i},-11 L${i},-13`} fill="#787878" />
          ))}
          {/* hang hole */}
          <circle cx="0" cy="-15" r=".8" fill="#1a1208" />
        </g>
      )}

      {/* === SAWDUST / POLLEN PARTICLES floating in workshop air === */}
      {detail !== 'low' && (
        <g>
          {([
            { cx: -30, cy: -32, dur: 3.2, delay: 0,   px:  22 },
            { cx: -12, cy: -24, dur: 2.8, delay: 0.7, px:  28 },
            { cx:   6, cy: -30, dur: 3.6, delay: 1.2, px: -18 },
            { cx:  18, cy: -20, dur: 2.5, delay: 0.4, px:  22 },
            { cx: -20, cy: -18, dur: 3.1, delay: 1.6, px:  30 },
            { cx:  30, cy: -28, dur: 2.9, delay: 1.0, px: -24 },
            { cx:   8, cy: -38, dur: 3.4, delay: 1.9, px:  16 },
            { cx:  -6, cy: -14, dur: 2.6, delay: 0.5, px: -20 },
            { cx:  22, cy: -44, dur: 3.0, delay: 2.2, px:  12 },
          ]).map(({ cx, cy, dur, delay, px }, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i % 3 === 0 ? 1.2 : 0.75}
              fill={i % 2 === 0 ? "#e8d090" : "#d4c07a"}
              style={{
                "--px": `${px}px`,
                animation: `pollen ${dur}s ${delay}s ease-out infinite`,
                transformOrigin: `${cx}px ${cy}px`,
                opacity: 0.72,
              }}
            />
          ))}
        </g>
      )}

      {/* === WORKBENCH prop (left foreground) === */}
      {detail === 'high' && (
        <g transform="translate(-50 -2)">
          <ellipse cx="9" cy="0" rx="13" ry="2" fill="rgba(0,0,0,.27)" />
          {/* legs */}
          <rect x="2" y="-12" width="2.5" height="12" fill={PAL.timber} />
          <rect x="14" y="-12" width="2.5" height="12" fill={PAL.timber} />
          {/* stretcher */}
          <rect x="2" y="-6" width="14" height="1.5" fill={PAL.timberSoft} opacity=".7" />
          {/* bench top */}
          <rect x="0" y="-14" width="18" height="3.5" rx=".6" fill={PAL.timberSoft} />
          {/* plank grain lines */}
          <line x1="5"  y1="-14" x2="5"  y2="-10.5" stroke={PAL.timber} strokeWidth=".4" opacity=".5" />
          <line x1="10" y1="-14" x2="10" y2="-10.5" stroke={PAL.timber} strokeWidth=".4" opacity=".5" />
          <line x1="15" y1="-14" x2="15" y2="-10.5" stroke={PAL.timber} strokeWidth=".4" opacity=".5" />
          {/* wood block being worked on bench */}
          <rect x="4" y="-19" width="6" height="5" rx=".5" fill={PAL.wallShadow} />
          <rect x="4" y="-20" width="6" height="2" rx=".4" fill={PAL.wallLight} />
          {/* chisel resting on block */}
          <rect x="8" y="-21" width="1.2" height="7" rx=".3" fill={PAL.stoneShade} />
          <rect x="7.5" y="-22" width="2.2" height="1.5" rx=".3" fill={PAL.stone} />
        </g>
      )}

      {/* === WOOD SHAVINGS pile (right foreground) === */}
      {detail === 'high' && (
        <g transform="translate(38 -1)">
          <ellipse cx="0" cy="0" rx="10" ry="2.4" fill="rgba(0,0,0,.22)" />
          {/* curly shavings — overlapping arcs */}
          <path d="M-8,0 Q-5,-5 0,-3 Q5,-7 8,-2" fill="none" stroke="#c8a060" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M-6,0 Q-3,-4 2,-2 Q5,-5 9,0" fill="none" stroke="#d4ae70" strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
          <path d="M-7,-1 Q-3,-3 0,0 Q4,-4 7,-1" fill="none" stroke="#b89050" strokeWidth=".9" strokeLinecap="round" opacity=".7" />
          <path d="M-4,0 Q0,-3 4,-1" fill="none" stroke="#c0983a" strokeWidth="1" strokeLinecap="round" opacity=".6" />
        </g>
      )}

      {/* === SMALL LOG STACK (right side) === */}
      {detail === 'high' && (
        <g transform="translate(44 -2)">
          <ellipse cx="4" cy="0" rx="10" ry="1.8" fill="rgba(0,0,0,.24)" />
          {/* bottom log */}
          <ellipse cx="0" cy="-3" rx="5" ry="3.5" fill={PAL.timberSoft} />
          <ellipse cx="0" cy="-3" rx="3.5" ry="2.4" fill={PAL.wallShadow} />
          <circle cx="0" cy="-3" r="1.2" fill={PAL.timber} />
          {/* top log */}
          <ellipse cx="4" cy="-7.5" rx="5" ry="3.5" fill={PAL.timberSoft} />
          <ellipse cx="4" cy="-7.5" rx="3.5" ry="2.4" fill={PAL.wallShadow} />
          <circle cx="4" cy="-7.5" r="1.2" fill={PAL.timber} />
          {/* annual rings highlight */}
          <circle cx="4" cy="-7.5" r="2.2" fill="none" stroke={PAL.wallShadow} strokeWidth=".5" opacity=".5" />
        </g>
      )}
    </svg>
  );
}
