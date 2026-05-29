import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function MiningCampIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-58 -58 116 74" className="absolute inset-0 w-full h-full"
         preserveAspectRatio="xMidYMax meet" style={f}>
      <defs>
        <pattern id="mc-rock" patternUnits="userSpaceOnUse" width="16" height="12">
          <rect width="16" height="12" fill={PAL.stone} />
          <path d="M0,4 L6,2 L11,5 L16,3" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".4" />
          <path d="M2,9 L7,7 L12,10 L16,8" fill="none" stroke={PAL.stoneShade} strokeWidth=".5" opacity=".3" />
        </pattern>
      </defs>

      {/* ground shadow */}
      <ellipse cx="0" cy="2" rx="52" ry="6" fill="rgba(0,0,0,.32)" />

      {/* === ROCKY HILL (right) the mine bores into === */}
      <polygon points="6,0 12,-30 26,-44 42,-38 52,-14 56,0" fill="url(#mc-rock)" />
      {/* hill shading */}
      <polygon points="6,0 12,-30 26,-44 26,0" fill="rgba(0,0,0,.18)" />
      {/* hill highlight ridge */}
      <polygon points="26,-44 42,-38 40,-32 26,-38" fill="rgba(255,255,255,.08)" />
      {/* rock cracks */}
      <g stroke={PAL.stoneShade} strokeWidth="1" opacity=".5" fill="none">
        <path d="M20,-2 L24,-14 L20,-24" />
        <path d="M44,-8 L40,-20 L46,-30" />
        <path d="M32,-2 L34,-16" />
      </g>
      {/* scattered boulders at hill base */}
      <ellipse cx="50" cy="-4" rx="6" ry="4" fill={PAL.stone} />
      <ellipse cx="50" cy="-5" rx="4" ry="2.4" fill="rgba(255,255,255,.07)" />

      {/* === TIMBERED MINE ENTRANCE (adit) === */}
      {/* dark opening */}
      <path d="M16,0 L16,-18 Q26,-26 36,-18 L36,0 Z" fill="#0e0b07" />
      {/* lantern glow inside */}
      <ellipse cx="26" cy="-8" rx="7" ry="6" fill="#ffb347" opacity={isBuilt ? 0.5 : 0.12}
               style={isBuilt ? { animation: "flicker 3s ease-in-out infinite", transformOrigin: "26px -8px" } : undefined} />
      {/* timber frame posts */}
      <rect x="13" y="-20" width="5" height="20" fill={PAL.timber} />
      <rect x="34" y="-20" width="5" height="20" fill={PAL.timber} />
      <rect x="13.6" y="-20" width="1.4" height="20" fill={PAL.timberSoft} opacity=".7" />
      {/* lintel beam */}
      <rect x="11" y="-24" width="30" height="6" rx="1" fill={PAL.timberSoft} />
      <rect x="11" y="-24" width="30" height="2" fill={PAL.timber} />
      {/* grain marks on lintel */}
      <g stroke={PAL.timber} strokeWidth=".5" opacity=".5">
        <line x1="16" y1="-21" x2="22" y2="-21" />
        <line x1="26" y1="-22" x2="34" y2="-22" />
      </g>

      {/* === RAIL TRACK from entrance toward front-left === */}
      <g>
        {/* sleepers */}
        <g fill={PAL.timber} opacity=".85">
          {([-32, -22, -12, -2, 8, 18] as number[]).map((x) => (
            <rect key={x} x={x} y="-2.4" width="6" height="2.4" rx=".4" />
          ))}
        </g>
        {/* rails */}
        <line x1="-34" y1="-0.6" x2="22" y2="-0.6" stroke="#6a6258" strokeWidth="1.2" />
        <line x1="-34" y1="-3" x2="22" y2="-3" stroke="#8a8278" strokeWidth="1.2" />
      </g>

      {/* === ORE CART on the rails (center) === */}
      <g transform="translate(-8 -4)">
        {/* cart body */}
        <path d="M-10,-8 L10,-8 L8,2 L-8,2 Z" fill="#4a4038" />
        <path d="M-10,-8 L10,-8 L9,-5 L-9,-5 Z" fill="#5e534a" />
        <path d="M-10,-8 L-8,2 L-6,2 L-8,-8 Z" fill="#332c26" />
        {/* metal bands */}
        <rect x="-9" y="-3" width="17" height="1.2" fill="#2b2520" opacity=".7" />
        {/* ore heap */}
        <g>
          <ellipse cx="0" cy="-8" rx="9" ry="3" fill={PAL.stoneShade} />
          <circle cx="-4" cy="-10" r="2.4" fill={PAL.stone} />
          <circle cx="1" cy="-11" r="2.8" fill="#a89a7e" />
          <circle cx="5" cy="-9.5" r="2.2" fill={PAL.stone} />
          {/* gem sparkle in the ore */}
          {detail !== "low" && (
            <g>
              <path d="M2,-12 l1.4,1.4 l-1.4,1.4 l-1.4,-1.4 Z" fill="#7fd4e8"
                    style={{ animation: "flicker 2.4s .4s ease-in-out infinite", transformOrigin: "2px -10.6px" }} />
            </g>
          )}
        </g>
        {/* wheels */}
        <circle cx="-6" cy="3" r="2.4" fill="#2b2520" />
        <circle cx="-6" cy="3" r="1" fill="#6a6258" />
        <circle cx="6" cy="3" r="2.4" fill="#2b2520" />
        <circle cx="6" cy="3" r="1" fill="#6a6258" />
      </g>

      {/* === WOODEN HEADFRAME (pit-head gear) on the left === */}
      <g>
        {/* back leg */}
        <polygon points="-26,0 -22,0 -33,-44 -36,-44" fill={PAL.timber} />
        {/* front leg */}
        <polygon points="-46,0 -42,0 -34,-44 -37,-44" fill={PAL.timberSoft} />
        {/* cross braces */}
        <g stroke={PAL.timber} strokeWidth="2.4" opacity=".9">
          <line x1="-43" y1="-14" x2="-27" y2="-14" />
          <line x1="-41" y1="-28" x2="-30" y2="-28" />
        </g>
        {/* diagonal brace */}
        <line x1="-43" y1="-14" x2="-30" y2="-28" stroke={PAL.timberSoft} strokeWidth="1.6" opacity=".7" />
        {/* head platform */}
        <rect x="-40" y="-47" width="12" height="4" rx="1" fill={PAL.timberSoft} />
        <rect x="-40" y="-47" width="12" height="1.4" fill={PAL.timber} />

        {/* sheave (pulley) wheel — spins */}
        <g transform="translate(-34 -48)">
          <circle r="6" fill="#5b5346" />
          <circle r="6" fill="none" stroke="#3a352e" strokeWidth="1" />
          <g style={detail !== "low" ? { animation: "waterwheel 7s linear infinite", transformOrigin: "0 0" } : undefined}>
            <circle r="4.6" fill="#8a8278" />
            <circle r="4.6" fill="none" stroke="#3a352e" strokeWidth=".5" />
            <g stroke="#5b5346" strokeWidth="1">
              {[0, 60, 120].map((deg) => (
                <line key={deg} x1="-4.6" y1="0" x2="4.6" y2="0" transform={`rotate(${deg})`} />
              ))}
            </g>
            <circle r="1.4" fill="#3a352e" />
          </g>
        </g>
        {/* hoist rope down into the shaft */}
        <line x1="-34" y1="-42" x2="-34" y2="-12" stroke="#3a352e" strokeWidth="1" />
        {/* ore bucket on the rope */}
        <g transform="translate(-34 -10)">
          <path d="M-4,-2 L4,-2 L3,4 L-3,4 Z" fill="#4a4038" />
          <rect x="-4" y="-2.4" width="8" height="1.4" fill="#2b2520" />
          <path d="M-3,-2 Q0,-6 3,-2" fill="none" stroke="#2b2520" strokeWidth=".8" />
        </g>
      </g>

      {/* === ORE / ROCK PILE at front === */}
      {detail !== "low" && (
        <g transform="translate(34 -2)">
          <ellipse cx="0" cy="2" rx="14" ry="2.6" fill="rgba(0,0,0,.28)" />
          <circle cx="-6" cy="-1" r="3.4" fill={PAL.stoneShade} />
          <circle cx="-1" cy="-2.4" r="3.8" fill={PAL.stone} />
          <circle cx="5" cy="-1" r="3.2" fill="#a89a7e" />
          <circle cx="9" cy="0.4" r="2.4" fill={PAL.stoneShade} />
          <circle cx="2" cy="0.6" r="2.6" fill={PAL.stone} />
          {/* highlights */}
          <circle cx="-2" cy="-3.4" r="1.2" fill="rgba(255,255,255,.12)" />
          <circle cx="6" cy="-2" r="1" fill="rgba(255,255,255,.1)" />
        </g>
      )}

      {/* === PICKAXE leaning against the frame === */}
      {detail === "high" && (
        <g transform="translate(-46 -2) rotate(18)">
          <rect x="-0.8" y="-18" width="1.8" height="18" rx=".6" fill={PAL.timberSoft} />
          <path d="M-5,-18 Q0,-21 5,-18" fill="none" stroke="#8a8278" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {/* === dust motes near the cart === */}
      {detail !== "low" && (
        <g>
          {([
            { cx: -10, cy: -16, dur: 3.0, delay: 0 },
            { cx: 0, cy: -20, dur: 3.4, delay: 0.7 },
            { cx: -4, cy: -24, dur: 2.8, delay: 1.2 },
            { cx: 6, cy: -18, dur: 3.2, delay: 0.4 },
          ]).map(({ cx, cy, dur, delay }, i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 0.9 : 0.6} fill="#cbbfa2"
                    style={{ animation: `bob ${dur}s ${delay}s ease-in-out infinite`, transformOrigin: `${cx}px ${cy}px`, opacity: 0.6 }} />
          ))}
        </g>
      )}
    </svg>
  );
}
