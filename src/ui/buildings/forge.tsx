import { svgState } from "./helpers.jsx";
import { PAL, Smoke } from "./v2kit.jsx";

export default function ForgeIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f, glow, lit } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-64 -100 128 116" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="52" ry="6" fill="rgba(0,0,0,.32)" />
      <ellipse cx="0" cy="-1" rx="44" ry="4" fill="rgba(255,130,40,.14)" />

      {/* stone foundation */}
      <rect x="-44" y="-8" width="88" height="8" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".55">
        <rect x="-40" y="-6" width="8" height="3" /><rect x="-24" y="-3" width="8" height="3" />
        <rect x="-6" y="-6" width="7" height="3" /><rect x="10" y="-3" width="8" height="3" />
        <rect x="26" y="-6" width="8" height="3" /><rect x="-38" y="-3" width="5" height="2" />
      </g>

      {/* --- LEFT CHIMNEY (tall) --- */}
      <rect x="-34" y="-88" width="14" height="42" fill={PAL.brick} />
      {/* brick courses on tall chimney */}
      <g stroke={PAL.brickDark} strokeWidth=".5" opacity=".7">
        {[-82, -76, -70, -64, -58, -52, -46].map((y) => (
          <line key={y} x1="-34" y1={y} x2="-20" y2={y} />
        ))}
        <line x1="-27" y1="-88" x2="-27" y2="-82" />
        <line x1="-27" y1="-76" x2="-27" y2="-70" />
        <line x1="-27" y1="-64" x2="-27" y2="-58" />
        <line x1="-27" y1="-52" x2="-27" y2="-46" />
      </g>
      {/* chimney cap */}
      <rect x="-36" y="-90" width="18" height="4" fill={PAL.brickDark} />

      {/* --- RIGHT CHIMNEY (shorter) --- */}
      <rect x="18" y="-74" width="12" height="28" fill={PAL.brick} />
      <g stroke={PAL.brickDark} strokeWidth=".5" opacity=".7">
        {[-68, -62, -56, -50].map((y) => (
          <line key={y} x1="18" y1={y} x2="30" y2={y} />
        ))}
        <line x1="24" y1="-74" x2="24" y2="-68" />
        <line x1="24" y1="-62" x2="24" y2="-56" />
      </g>
      <rect x="16" y="-76" width="16" height="3" fill={PAL.brickDark} />

      {/* --- MAIN WALLS --- */}
      {/* wide brick body */}
      <rect x="-42" y="-46" width="84" height="38" fill={PAL.brick} />
      {/* shadow side (left strip) */}
      <rect x="-42" y="-46" width="16" height="38" fill={PAL.brickDark} opacity=".55" />
      {/* brick course lines */}
      <g stroke={PAL.brickDark} strokeWidth=".6" opacity=".5">
        {[-40, -34, -28, -22, -16].map((y) => (
          <line key={y} x1="-42" y1={y} x2="42" y2={y} />
        ))}
      </g>
      {/* mortar vertical joints — odd / even rows staggered */}
      <g stroke={PAL.brickDark} strokeWidth=".4" opacity=".35">
        {[-46, -34, -22].map((rowY, ri) => (
          [-36, -24, -12, 0, 12, 24, 36].map((px) => (
            <line key={`${rowY}-${px}`} x1={px} y1={rowY} x2={px} y2={rowY + 6} />
          ))
        ))}
        {[-40, -28, -16].map((rowY) => (
          [-30, -18, -6, 6, 18, 30].map((px) => (
            <line key={`${rowY}-${px}`} x1={px} y1={rowY} x2={px} y2={rowY + 6} />
          ))
        ))}
      </g>
      {/* wall top beam */}
      <rect x="-42" y="-46" width="84" height="3" fill={PAL.wallTop} />

      {/* --- ROOF (shallow pitched) --- */}
      <defs>
        <pattern id="forge-slate" patternUnits="userSpaceOnUse" width="12" height="5">
          <rect width="12" height="5" fill="#5b5346" />
          <path d="M0,4.5 Q3,3 6,4.5 T12,4.5" fill="none" stroke="rgba(0,0,0,.22)" strokeWidth="1" />
          <ellipse cx="3" cy="2" rx="3.2" ry="1" fill="rgba(255,255,255,.06)" />
        </pattern>
      </defs>
      <polygon points="-46,-46 0,-64 46,-46" fill="url(#forge-slate)" />
      <polygon points="-46,-46 0,-64 -24,-46" fill="rgba(0,0,0,.28)" />
      {/* eave beam */}
      <rect x="-46" y="-46" width="92" height="3" fill={PAL.eave} />
      {/* ridge cap */}
      <line x1="-12" y1="-64" x2="12" y2="-64" stroke={PAL.ridge} strokeWidth="2" />

      {/* --- FURNACE ARCH (central) --- */}
      {/* arch surround */}
      <path d="M-18,-8 L-18,-32 a18,18 0 0 1 36,0 L18,-8 Z" fill={PAL.brickDark} />
      {/* furnace interior — glowing */}
      <path d="M-15,-8 L-15,-30 a15,15 0 0 1 30,0 L15,-8 Z" fill="#1a0a00" />
      {/* inner glow ellipse */}
      <ellipse cx="0" cy="-14" rx="14" ry="9" fill={glow} opacity=".7"
        style={{ animation: 'flicker 2.2s ease-in-out infinite', transformOrigin: '0px -14px' }} />
      {/* flame shapes */}
      <g style={{ animation: 'flicker 1.6s ease-in-out infinite', transformOrigin: '0px -18px' }}>
        <path d="M-10,-8 Q-6,-20 0,-14 Q6,-20 10,-8 Z" fill="#c96442" />
      </g>
      <g style={{ animation: 'flicker 1.1s 0.2s ease-in-out infinite', transformOrigin: '0px -20px' }}>
        <path d="M-6,-8 Q-3,-18 0,-14 Q3,-18 6,-8 Z" fill="#ffb14a" />
      </g>
      {/* arch keystone detail */}
      <path d="M-18,-32 a18,18 0 0 1 36,0" fill="none" stroke={PAL.brickDark} strokeWidth="2.5" />
      <ellipse cx="0" cy="-32" rx="4" ry="2.5" fill={PAL.stone} />

      {/* --- WINDOWS (left and right of furnace) --- */}
      {/* left window */}
      <rect x="-38" y="-36" width="14" height="11" rx="1" fill="#1a1410" />
      <rect x="-37" y="-35" width="12" height="9" fill={lit}
        style={{ animation: 'flicker 3s ease-in-out infinite', transformOrigin: '-31px -30px' }} />
      <line x1="-31" y1="-35" x2="-31" y2="-26" stroke="#1a1410" strokeWidth=".7" />
      <line x1="-37" y1="-30" x2="-25" y2="-30" stroke="#1a1410" strokeWidth=".7" />
      {/* right window */}
      <rect x="24" y="-36" width="14" height="11" rx="1" fill="#1a1410" />
      <rect x="25" y="-35" width="12" height="9" fill={lit}
        style={{ animation: 'flicker 2.6s 0.4s ease-in-out infinite', transformOrigin: '31px -30px' }} />
      <line x1="31" y1="-35" x2="31" y2="-26" stroke="#1a1410" strokeWidth=".7" />
      <line x1="25" y1="-30" x2="37" y2="-30" stroke="#1a1410" strokeWidth=".7" />

      {/* --- SMOKE from chimneys --- */}
      {detail !== 'low' && (
        <g>
          {/* tall left chimney */}
          <Smoke x={-27} y={-90} scale={1.1} count={4} dur={4.4} color="#c8b898" />
          <Smoke x={-25} y={-90} scale={0.8} count={3} dur={3.6} color="#a89878" />
          {/* right chimney */}
          <Smoke x={24} y={-76} scale={0.8} count={3} dur={3.8} color="#c8b898" />
          <Smoke x={22} y={-76} scale={0.6} count={2} dur={4.6} color="#a89878" />
          {/* embers from furnace arch */}
          {[0, 0.6, 1.2, 1.8, 2.4].map((d, i) => (
            <circle key={i} cx={i % 2 ? 4 : -4} cy={-32} r=".7" fill="#ffb14a"
              style={{ '--sx': `${(i % 2 ? 6 : -6)}px`, animation: `ember 2.8s ${d}s ease-out infinite`, transformOrigin: `${i % 2 ? 4 : -4}px -32px`, opacity: 0.9 } as React.CSSProperties} />
          ))}
        </g>
      )}

      {/* --- ANVIL + HAMMER PROP (right of door) --- */}
      {detail === 'high' && (
        <g transform="translate(34 -2)">
          {/* stump */}
          <ellipse cx="0" cy="0" rx="7" ry="1.8" fill="rgba(0,0,0,.3)" />
          <rect x="-5" y="-6" width="10" height="6" fill="#7a5c34" />
          <ellipse cx="0" cy="-6" rx="5" ry="1.4" fill="#5a3a1f" />
          {/* anvil body */}
          <rect x="-6" y="-14" width="12" height="6" rx=".8" fill="#5b5346" />
          {/* anvil horn */}
          <path d="M6,-11 L13,-10 Q14,-9 13,-8 L6,-8 Z" fill="#3a3530" />
          {/* anvil base flanges */}
          <rect x="-7" y="-9" width="14" height="2" rx=".4" fill="#3a3530" />
          {/* glint */}
          <line x1="-4" y1="-13.5" x2="2" y2="-13.5" stroke="#9a9a9a" strokeWidth=".6" opacity=".7" />
          {/* hammer */}
          <g transform="translate(-16 -12) rotate(-30)">
            <rect x="-1" y="0" width="2" height="10" fill="#7a5c34" />
            <rect x="-3.5" y="-4" width="7" height="4" rx=".5" fill="#5b5346" />
            <rect x="-3.5" y="-5" width="7" height="1.5" fill="#3a3530" />
          </g>
        </g>
      )}

      {/* --- TOOL RACK on left wall --- */}
      {detail === 'high' && (
        <g transform="translate(-52 -24)">
          {/* post */}
          <rect x="-1" y="-18" width="2" height="18" fill="#3a2715" />
          {/* pegs */}
          <rect x="0" y="-16" width="5" height="1.4" fill="#5a3a1f" />
          <rect x="0" y="-10" width="5" height="1.4" fill="#5a3a1f" />
          {/* tongs */}
          <g transform="translate(5 -15)">
            <line x1="0" y1="0" x2="4" y2="6" stroke="#5b5346" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="2" y1="0" x2="6" y2="6" stroke="#5b5346" strokeWidth="1.2" strokeLinecap="round" />
          </g>
          {/* poker */}
          <g transform="translate(5 -9)">
            <line x1="0" y1="0" x2="6" y2="7" stroke="#5b5346" strokeWidth="1" strokeLinecap="round" />
            <circle cx="6" cy="7" r="1" fill="#3a3530" />
          </g>
        </g>
      )}

      {/* --- WOODPILE / COAL BUCKET (left side) --- */}
      {detail === 'high' && (
        <g transform="translate(-52 -3)">
          <ellipse cx="0" cy="0" rx="8" ry="1.6" fill="rgba(0,0,0,.28)" />
          {/* bucket body */}
          <path d="M-6,0 L-5,-8 L5,-8 L6,0 Z" fill="#5b5346" />
          <ellipse cx="0" cy="-8" rx="5.5" ry="1.4" fill="#3a3530" />
          {/* handle */}
          <path d="M-5,-8 a5,5 0 0 1 10,0" fill="none" stroke="#3a3530" strokeWidth="1.2" />
          {/* coal bits */}
          <g fill="#1a1410">
            <circle cx="-2" cy="-9.5" r="1" /><circle cx="1" cy="-10" r="1.2" />
            <circle cx="3" cy="-9" r=".9" />
          </g>
        </g>
      )}
    </svg>
  );
}
