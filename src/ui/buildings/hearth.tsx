import { svgState } from "./helpers.jsx";
import { PAL, RoofTiles } from "./v2kit.jsx";

export default function HearthIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-50 -88 100 104" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <RoofTiles id="hearth-tiles" color={PAL.terracotta} />
        {/* stone wall pattern */}
        <pattern id="hearth-stone" patternUnits="userSpaceOnUse" width="16" height="8">
          <rect width="16" height="8" fill={PAL.stone} />
          <rect x="0" y="0" width="9" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <rect x="10" y="0" width="6" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <rect x="0" y="4" width="5" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <rect x="6" y="4" width="10" height="3.5" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="46" ry="5.5" fill="rgba(0,0,0,.32)" />
      <ellipse cx="0" cy="0" rx="38" ry="3.5" fill="rgba(220,160,70,.14)" />

      {/* stone foundation */}
      <rect x="-40" y="-8" width="80" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".52">
        <rect x="-36" y="-6" width="10" height="3" />
        <rect x="-20" y="-3" width="9" height="3" />
        <rect x="-3" y="-6" width="7" height="3" />
        <rect x="10" y="-3" width="8" height="3" />
        <rect x="24" y="-6" width="9" height="3" />
        <rect x="-30" y="-3" width="6" height="2" />
        <rect x="16" y="-6" width="5" height="2" />
      </g>

      {/* === CHIMNEY (wide, prominent — behind roof) === */}
      <rect x="14" y="-85" width="16" height="50" fill={PAL.brick} />
      {/* chimney brick courses */}
      <g stroke={PAL.brickDark} strokeWidth=".5" opacity=".6">
        {([-80, -74, -68, -62, -56, -50, -44] as number[]).map((y) => (
          <line key={y} x1="14" y1={y} x2="30" y2={y} />
        ))}
        <line x1="22" y1="-85" x2="22" y2="-35" />
      </g>
      {/* chimney cap */}
      <rect x="12" y="-87" width="20" height="4" fill={PAL.brickDark} />

      {/* === MAIN WALLS (wide, squat stone cottage) === */}
      <rect x="-38" y="-60" width="76" height="52" fill="url(#hearth-stone)" />
      {/* left shadow strip */}
      <rect x="-38" y="-60" width="12" height="52" fill={PAL.stoneShade} opacity=".30" />
      {/* wall top cap */}
      <rect x="-38" y="-60" width="76" height="3" fill={PAL.wallTop} />

      {/* === ROOF (low-pitched, terracotta, wide cottage style) === */}
      <polygon points="-44,-57 0,-78 44,-57" fill="url(#hearth-tiles)" />
      {/* left slope shadow */}
      <polygon points="-44,-57 0,-78 -17,-57" fill="rgba(0,0,0,.22)" />
      {/* eave beam */}
      <rect x="-44" y="-57" width="88" height="3.5" fill={PAL.eave} />
      {/* ridge cap */}
      <line x1="-8" y1="-78" x2="8" y2="-78" stroke={PAL.ridge} strokeWidth="2.5" />
      <rect x="-4" y="-79" width="8" height="2" rx=".5" fill={PAL.terracottaDark} />

      {/* === LARGE WARM WINDOW — LEFT === */}
      {/* window recess */}
      <rect x="-33" y="-50" width="20" height="16" rx="1.5" fill="#1a1008" />
      {/* warm interior glow */}
      <rect x="-32" y="-49" width="18" height="14" fill={lit}
        style={{ animation: 'flicker 3.2s 0.1s ease-in-out infinite', transformOrigin: '-23px -42px' }} />
      {/* window cross bars */}
      <line x1="-23" y1="-49" x2="-23" y2="-35" stroke="#1a1008" strokeWidth=".8" />
      <line x1="-32" y1="-42" x2="-14" y2="-42" stroke="#1a1008" strokeWidth=".8" />
      {/* window sill */}
      <rect x="-35" y="-35" width="24" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* === LARGE WARM WINDOW — RIGHT === */}
      <rect x="13" y="-50" width="20" height="16" rx="1.5" fill="#1a1008" />
      <rect x="14" y="-49" width="18" height="14" fill={lit}
        style={{ animation: 'flicker 2.8s 0.5s ease-in-out infinite', transformOrigin: '23px -42px' }} />
      <line x1="23" y1="-49" x2="23" y2="-35" stroke="#1a1008" strokeWidth=".8" />
      <line x1="14" y1="-42" x2="32" y2="-42" stroke="#1a1008" strokeWidth=".8" />
      <rect x="11" y="-35" width="24" height="2.5" rx=".5" fill={PAL.timberSoft} />

      {/* === ARCHED FRONT DOOR (center) === */}
      {/* arch surround in stone */}
      <path d="M-11,-8 L-11,-32 a11,11 0 0 1 22,0 L11,-8 Z" fill={PAL.stoneShade} />
      {/* heavy timber door */}
      <path d="M-9,-8 L-9,-30 a9,9 0 0 1 18,0 L9,-8 Z" fill={PAL.timber} />
      {/* door planks */}
      <g stroke="#3a2010" strokeWidth=".6" opacity=".5">
        <line x1="-9" y1="-22" x2="9" y2="-22" />
        <line x1="-9" y1="-15" x2="9" y2="-15" />
      </g>
      {/* iron ring handle */}
      <circle cx="5.5" cy="-18" r="2.2" fill="none" stroke="#2a2a2a" strokeWidth="1.2" />
      <circle cx="5.5" cy="-18" r=".8" fill="#3a3a3a" />
      {/* arch keystone */}
      <ellipse cx="0" cy="-30" rx="3" ry="1.8" fill={PAL.stone} />

      {/* === STONE CORNER QUOINS === */}
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-38" y="-57" width="5" height="5" /><rect x="-38" y="-50" width="4" height="4" />
        <rect x="-38" y="-42" width="5" height="4" /><rect x="-38" y="-34" width="4" height="4" />
        <rect x="33" y="-57" width="5" height="5" /><rect x="34" y="-50" width="4" height="4" />
        <rect x="33" y="-42" width="5" height="4" /><rect x="34" y="-34" width="4" height="4" />
      </g>

      {/* === GARDEN PATH (flagstones leading to door) === */}
      {detail === 'high' && (
        <g fill={PAL.stone} opacity=".65">
          <ellipse cx="0" cy="-1" rx="6" ry="3.5" />
          <ellipse cx="0" cy="5" rx="7" ry="3" />
          <ellipse cx="0" cy="10" rx="6" ry="2.5" />
        </g>
      )}

      {/* === GARDEN PLANTS (wiggle animation) === */}
      {detail !== 'low' && (
        <g>
          {/* plant left — round bush */}
          <g style={{ animation: 'wiggle 2.8s ease-in-out infinite', transformOrigin: '-32px -4px' }}>
            <ellipse cx="-32" cy="-8" rx="6" ry="5" fill="#5a7a28" />
            <ellipse cx="-32" cy="-9" rx="5" ry="4" fill="#7a9a38" />
            {/* small flower dots */}
            <circle cx="-34" cy="-11" r="1" fill="#f0d040" />
            <circle cx="-30" cy="-12" r=".9" fill="#f8e060" />
            <circle cx="-32" cy="-13" r="1.1" fill="#f0d040" />
          </g>

          {/* plant right — upright herbs */}
          <g style={{ animation: 'wiggle 3.2s 0.5s ease-in-out infinite', transformOrigin: '32px -4px' }}>
            <ellipse cx="32" cy="-8" rx="5.5" ry="5" fill="#4a6a20" />
            <ellipse cx="32" cy="-9" rx="4.5" ry="4" fill="#6a8a30" />
            <circle cx="30" cy="-12" r="1" fill="#e87090" />
            <circle cx="33" cy="-13" r=".9" fill="#f08090" />
            <circle cx="31" cy="-14" r="1.1" fill="#e87090" />
          </g>

          {/* small trailing plant right side of path */}
          <g style={{ animation: 'wiggle 2.5s 1.0s ease-in-out infinite', transformOrigin: '18px -2px' }}>
            <ellipse cx="18" cy="-5" rx="3.5" ry="3" fill="#5a7a28" />
            <ellipse cx="18" cy="-6" rx="3" ry="2.5" fill="#6a9a30" />
          </g>
        </g>
      )}

      {/* === DOOR STEP === */}
      {detail === 'high' && (
        <g>
          <rect x="-14" y="-3" width="28" height="3" rx=".5" fill={PAL.stone} />
          <rect x="-12" y="-1" width="24" height="1" fill={PAL.stoneShade} opacity=".3" />
        </g>
      )}
    </svg>
  );
}
