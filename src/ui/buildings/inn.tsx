import { svgState } from "./helpers.jsx";
import { PAL, Smoke, RoofTiles } from "./v2kit.jsx";

export default function InnIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, glow, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-60 -108 120 124" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <RoofTiles id="inn-tiles" color={PAL.terracotta} />
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="54" ry="6.5" fill="rgba(0,0,0,.32)" />
      <ellipse cx="0" cy="0" rx="44" ry="4" fill="rgba(255,180,80,.12)" />

      {/* stone foundation */}
      <rect x="-50" y="-8" width="100" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-46" y="-6" width="10" height="3" /><rect x="-28" y="-3" width="9" height="3" />
        <rect x="-8" y="-6" width="8" height="3" /><rect x="10" y="-3" width="9" height="3" />
        <rect x="28" y="-6" width="10" height="3" /><rect x="-42" y="-3" width="6" height="2" />
        <rect x="18" y="-6" width="6" height="2" />
      </g>

      {/* --- CHIMNEY (rear-right, behind roof) --- */}
      <rect x="26" y="-96" width="13" height="46" fill={PAL.brick} />
      <g stroke={PAL.brickDark} strokeWidth=".5" opacity=".65">
        {[-90, -84, -78, -72, -66, -60, -54].map((y) => (
          <line key={y} x1="26" y1={y} x2="39" y2={y} />
        ))}
        <line x1="32.5" y1="-96" x2="32.5" y2="-50" />
      </g>
      <rect x="24" y="-98" width="17" height="4" fill={PAL.brickDark} />

      {/* --- SECOND FLOOR WALLS (timber-frame plaster) --- */}
      <rect x="-48" y="-72" width="96" height="40" fill={PAL.wallLight} />
      {/* shadow strip — left */}
      <rect x="-48" y="-72" width="16" height="40" fill={PAL.wallShadow} opacity=".45" />
      {/* timber-frame verticals */}
      <g stroke={PAL.timber} strokeWidth="1.6" opacity=".7">
        <line x1="-48" y1="-72" x2="-48" y2="-32" />
        <line x1="-24" y1="-72" x2="-24" y2="-32" />
        <line x1="0" y1="-72" x2="0" y2="-32" />
        <line x1="24" y1="-72" x2="24" y2="-32" />
        <line x1="48" y1="-72" x2="48" y2="-32" />
      </g>
      {/* timber-frame horizontals */}
      <g stroke={PAL.timber} strokeWidth="1.4" opacity=".6">
        <line x1="-48" y1="-52" x2="48" y2="-52" />
        <line x1="-48" y1="-72" x2="48" y2="-72" />
      </g>
      {/* diagonal braces on second floor panels */}
      <g stroke={PAL.timber} strokeWidth=".9" opacity=".28">
        <line x1="-48" y1="-72" x2="-24" y2="-32" />
        <line x1="-24" y1="-72" x2="-48" y2="-32" />
        <line x1="24" y1="-72" x2="48" y2="-32" />
        <line x1="48" y1="-72" x2="24" y2="-32" />
      </g>
      {/* wall top beam */}
      <rect x="-48" y="-72" width="96" height="3.5" fill={PAL.wallTop} />

      {/* --- ROOF (pitched, terracotta) --- */}
      <polygon points="-54,-72 0,-100 54,-72" fill="url(#inn-tiles)" />
      {/* left slope shadow */}
      <polygon points="-54,-72 0,-100 -22,-72" fill="rgba(0,0,0,.22)" />
      {/* eave beam */}
      <rect x="-54" y="-72" width="108" height="3.5" fill={PAL.eave} />
      {/* ridge cap */}
      <line x1="-10" y1="-100" x2="10" y2="-100" stroke={PAL.ridge} strokeWidth="2.5" />
      <rect x="-5" y="-101" width="10" height="2" rx=".5" fill={PAL.terracottaDark} />

      {/* --- UPPER-FLOOR WINDOWS (second floor, three) --- */}
      {([-32, 0, 32] as number[]).map((cx) => (
        <g key={cx}>
          <rect x={cx - 9} y="-66" width="18" height="12" rx="1.5" fill="#1a1008" />
          <rect x={cx - 8} y="-65" width="16" height="10" fill={lit}
            style={{ animation: `flicker 3.2s ${cx * 0.04}s ease-in-out infinite`, transformOrigin: `${cx}px -60px` }} />
          <line x1={cx} y1="-65" x2={cx} y2="-55" stroke="#1a1008" strokeWidth=".8" />
          <line x1={cx - 8} y1="-60" x2={cx + 8} y2="-60" stroke="#1a1008" strokeWidth=".8" />
          <rect x={cx - 10} y="-55" width="20" height="2.5" rx=".5" fill={PAL.timberSoft} />
        </g>
      ))}

      {/* --- GROUND FLOOR WALLS (heavy timber / stone) --- */}
      <rect x="-48" y="-32" width="96" height="32" fill="#c4a87a" />
      {/* shadow strip */}
      <rect x="-48" y="-32" width="18" height="32" fill="rgba(0,0,0,.18)" />
      {/* floor-divider beam */}
      <rect x="-50" y="-32" width="100" height="4" fill={PAL.wallTop} />
      {/* heavy timber uprights on ground floor */}
      <g stroke={PAL.timber} strokeWidth="2.2" opacity=".75">
        <line x1="-48" y1="-32" x2="-48" y2="0" />
        <line x1="48" y1="-32" x2="48" y2="0" />
      </g>

      {/* --- GROUND FLOOR WINDOWS (two flanking the entrance) --- */}
      <rect x="-42" y="-26" width="16" height="14" rx="1.5" fill="#1a1008" />
      <rect x="-41" y="-25" width="14" height="12" fill={lit}
        style={{ animation: 'flicker 2.8s 0.2s ease-in-out infinite', transformOrigin: '-34px -19px' }} />
      <line x1="-34" y1="-25" x2="-34" y2="-13" stroke="#1a1008" strokeWidth=".8" />
      <line x1="-41" y1="-19" x2="-27" y2="-19" stroke="#1a1008" strokeWidth=".8" />
      <rect x="-43" y="-13" width="18" height="2.5" rx=".5" fill={PAL.timberSoft} />

      <rect x="26" y="-26" width="16" height="14" rx="1.5" fill="#1a1008" />
      <rect x="27" y="-25" width="14" height="12" fill={lit}
        style={{ animation: 'flicker 3.6s 0.6s ease-in-out infinite', transformOrigin: '34px -19px' }} />
      <line x1="34" y1="-25" x2="34" y2="-13" stroke="#1a1008" strokeWidth=".8" />
      <line x1="27" y1="-19" x2="41" y2="-19" stroke="#1a1008" strokeWidth=".8" />
      <rect x="25" y="-13" width="18" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* --- WIDE ARCH ENTRANCE (double door) --- */}
      {/* arch surround */}
      <path d="M-18,-8 L-18,-28 a18,18 0 0 1 36,0 L18,-8 Z" fill={PAL.wallTop} />
      {/* arch interior */}
      <path d="M-16,-8 L-16,-27 a16,16 0 0 1 32,0 L16,-8 Z" fill="#2a1a0a" />
      {/* warm interior glow */}
      <ellipse cx="0" cy="-14" rx="14" ry="8" fill={glow} opacity=".3"
        style={{ animation: 'flicker 3s ease-in-out infinite', transformOrigin: '0px -14px' }} />
      {/* double doors */}
      <rect x="-16" y="-28" width="15" height="20" fill="#4a2e14" />
      <rect x="1" y="-28" width="15" height="20" fill="#3a2010" />
      <line x1="0" y1="-28" x2="0" y2="-8" stroke={PAL.wallTop} strokeWidth="1.2" />
      {/* door handles */}
      <circle cx="-2.5" cy="-17" r="1.4" fill={PAL.brass} />
      <circle cx="2.5" cy="-17" r="1.4" fill={PAL.brass} />
      {/* door panels */}
      <rect x="-14" y="-26" width="11" height="7" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".7" opacity=".6" />
      <rect x="-14" y="-17" width="11" height="7" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".7" opacity=".6" />
      <rect x="3" y="-26" width="11" height="7" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".7" opacity=".6" />
      <rect x="3" y="-17" width="11" height="7" rx=".8" fill="none" stroke="#6a4a28" strokeWidth=".7" opacity=".6" />
      {/* arch keystone */}
      <ellipse cx="0" cy="-28" rx="4" ry="2.5" fill={PAL.stone} />

      {/* --- SMOKE from chimney --- */}
      {detail !== 'low' && (
        <g>
          <Smoke x={32.5} y={-98} scale={1.0} count={4} dur={4.2} color="#d4c8a8" />
          <Smoke x={30} y={-98} scale={0.75} count={3} dur={3.6} color="#b8ac8c" />
        </g>
      )}

      {/* --- HANGING SIGN (right of entrance, swaying) --- */}
      {detail === 'high' && (
        <g transform="translate(26 -40)">
          <rect x="0" y="-2" width="10" height="1.8" fill={PAL.timber} />
          <rect x="0" y="-2" width="1.8" height="10" fill={PAL.timber} />
          <g style={{ animation: 'sway 3.2s ease-in-out infinite', transformOrigin: '11px 0px' }}>
            <line x1="10" y1="0" x2="10" y2="3" stroke={PAL.timber} strokeWidth=".8" />
            <rect x="5" y="3" width="16" height="10" rx="1.2" fill="#f0e0b0" />
            <rect x="5" y="3" width="16" height="10" rx="1.2" fill="none" stroke={PAL.timber} strokeWidth=".8" />
            {/* mug icon on sign */}
            <rect x="9" y="5.5" width="5" height="5" rx=".5" fill="#c87840" />
            <path d="M14,7 Q16,7 16,9 Q16,11 14,11" fill="none" stroke="#c87840" strokeWidth=".8" />
            <path d="M9,8 Q10,6.5 12.5,6.5 Q15,6.5 14,8" fill="rgba(255,255,255,.5)" />
          </g>
        </g>
      )}

      {/* --- STEP STOOP at entrance --- */}
      {detail === 'high' && (
        <g>
          <rect x="-22" y="-3" width="44" height="3" rx=".5" fill={PAL.stone} />
          <rect x="-20" y="-1" width="40" height="1" fill={PAL.stoneShade} opacity=".3" />
        </g>
      )}
    </svg>
  );
}
