import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function SawmillIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-62 -108 124 124" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="-6" cy="2" rx="46" ry="5" fill="rgba(0,0,0,.3)" />
      {/* RIVER strip on the right side */}
      <rect x="22" y="0" width="32" height="14" fill={PAL.sea} />
      <rect x="22" y="0" width="32" height="3" fill={PAL.seaLight} />
      <g style={{ animation: 'wave 3s ease-in-out infinite', transformOrigin: '36px 6px' }}>
        <path d="M22,5 Q32,2 42,5 T54,5 L54,8 L22,8 Z" fill={PAL.seaLight} opacity=".55" />
      </g>
      {/* river bank line */}
      <rect x="20" y="-2" width="4" height="14" fill="#7a6038" />
      {/* foundation */}
      <rect x="-38" y="-6" width="60" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-34" y="-4" width="6" height="2" /><rect x="-20" y="-4" width="6" height="2" />
        <rect x="-4" y="-4" width="6" height="2" /><rect x="12" y="-4" width="6" height="2" />
      </g>
      {/* WALLS — natural unpainted plank shed */}
      <rect x="-36" y="-30" width="58" height="24" fill="#bda268" />
      <rect x="-36" y="-30" width="12" height="24" fill="#8a6a3a" />
      {/* vertical plank seams */}
      <g stroke="#7a5c34" strokeWidth=".5" opacity=".8">
        {[-30, -24, -18, -12, -6, 0, 6, 12, 18].map(px => <line key={px} x1={px} y1="-30" x2={px} y2="-6" />)}
      </g>
      <rect x="-36" y="-30" width="58" height="2" fill="#5a3a1f" />
      {/* peak roof — like a barn */}
      <polygon points="-42,-30 -8,-50 22,-50 22,-30" fill="#5a3a1f" />
      <polygon points="-42,-30 -8,-50 -22,-30" fill="rgba(0,0,0,.32)" />
      <rect x="-42" y="-30" width="64" height="2.4" fill="#3a2715" />
      {/* hayloft door / haul opening */}
      <rect x="-10" y="-46" width="10" height="10" fill="#3a2715" />
      <rect x="-9.4" y="-45.4" width="9" height="9" fill="#5a3a1f" />
      <line x1="-5" y1="-46" x2="-5" y2="-36" stroke="#3a2715" strokeWidth=".4" />
      {/* big open SAWING DOORWAY — center, you can see the saw inside */}
      <rect x="-14" y="-26" width="20" height="20" fill="#1a1410" />
      {/* SAW BLADE inside (signature) */}
      <g transform="translate(-4 -16)">
        {/* table */}
        <rect x="-10" y="2" width="20" height="3" fill="#5a3a1f" />
        <rect x="-10" y="2" width="20" height="1" fill="#3a2715" />
        {/* log being sawed */}
        <ellipse cx="-6" cy="-1" rx="6" ry="2.4" fill="#a98a5a" />
        <ellipse cx="-6" cy="-1" rx="4" ry="1.6" fill="#bda268" />
        {/* rings */}
        <g stroke="#7a5c34" strokeWidth=".3" fill="none">
          <ellipse cx="-6" cy="-1" rx="3" ry="1.2" /><ellipse cx="-6" cy="-1" rx="2" ry=".8" />
        </g>
        {/* circular saw */}
        <g transform="translate(2 -1)" style={detail !== 'low' ? { animation: 'v2spin .35s linear infinite', transformOrigin: '0 0' } : undefined}>
          <circle r="4.4" fill="#9a9c9e" />
          <circle r="3.4" fill="#bcc4c8" />
          <circle r="3.4" fill="none" stroke="#5b5346" strokeWidth=".4" />
          {/* teeth */}
          <g fill="#3a3530">
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              const x1 = Math.cos(a) * 4.4, y1 = Math.sin(a) * 4.4;
              const x2 = Math.cos(a + 0.2) * 5.2, y2 = Math.sin(a + 0.2) * 5.2;
              const x3 = Math.cos(a + 0.4) * 4.4, y3 = Math.sin(a + 0.4) * 4.4;
              return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} />;
            })}
          </g>
          <circle r=".8" fill="#3a3530" />
        </g>
        {/* sparks/sawdust at contact point */}
        {detail !== 'low' && (
          <g>
            {[0, .15, .3, .45].map((d, i) => (
              <circle key={i} cx="-2" cy="-1" r=".5" fill="#e8c39a"
                style={{ '--sx': `${(i % 2 ? -4 : -8)}px`, '--sy': `${-(i + 1)}px`, animation: `spark 1s ${d}s ease-out infinite`, transformOrigin: '-2px -1px' }} />
            ))}
          </g>
        )}
      </g>
      {/* WATER WHEEL on the right side (signature) */}
      <g transform="translate(22 -16)">
        {/* axle housing on wall */}
        <rect x="-3" y="-2" width="6" height="4" fill="#5a3a1f" />
        <circle cx="0" cy="0" r="1.4" fill="#3a2715" />
        {/* wheel — spins (slow) */}
        <g style={detail !== 'low' ? { animation: 'waterwheel 6s linear infinite', transformOrigin: '0 0' } : undefined}>
          <circle r="14" fill="none" stroke="#5a3a1f" strokeWidth="2" />
          <circle r="11" fill="none" stroke="#5a3a1f" strokeWidth="1" />
          {/* spokes */}
          <g stroke="#5a3a1f" strokeWidth="1.4">
            {[0, 45, 90, 135].map(deg => (
              <line key={deg} x1="-14" y1="0" x2="14" y2="0" transform={`rotate(${deg})`} />
            ))}
          </g>
          {/* paddles */}
          <g fill="#3a2715">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <rect key={deg} x="11" y="-1.6" width="4" height="3.2" transform={`rotate(${deg})`} />
            ))}
          </g>
          {/* hub */}
          <circle r="2" fill="#3a2715" />
          <circle r=".7" fill="#bda268" />
        </g>
        {/* water dripping off paddles */}
        {detail !== 'low' && (
          <g>
            {[0, .8, 1.6].map((d, i) => (
              <ellipse key={i} cx={14} cy={-2 + i} rx=".7" ry="1.4" fill={PAL.seaFoam}
                style={{ animation: `drip 2s ${d}s ease-in infinite`, transformOrigin: `14px ${-2 + i}px` }} />
            ))}
            {/* splash where wheel meets water */}
            <ellipse cx="14" cy="14" rx="6" ry="1.4" fill={PAL.seaFoam} opacity=".8"
              style={{ animation: 'splash 1.4s ease-in-out infinite', transformOrigin: '14px 14px' }} />
          </g>
        )}
      </g>
      {/* LUMBER STACK at front */}
      {detail !== 'low' && (
        <g transform="translate(-30 -6)">
          <ellipse cx="0" cy="0" rx="10" ry="1.4" fill="rgba(0,0,0,.34)" />
          {/* planks stacked */}
          <rect x="-10" y="-8" width="20" height="2" fill="#c89570" />
          <rect x="-10" y="-6" width="20" height="2" fill="#bda268" />
          <rect x="-10" y="-4" width="20" height="2" fill="#c89570" />
          <rect x="-10" y="-2" width="20" height="2" fill="#bda268" />
          {/* end grain rings */}
          <g fill="#a98a5a" stroke="#7a5c34" strokeWidth=".25">
            <circle cx="-10" cy="-7" r=".7" /><circle cx="-10" cy="-5" r=".7" />
            <circle cx="-10" cy="-3" r=".7" /><circle cx="-10" cy="-1" r=".7" />
          </g>
        </g>
      )}
      {/* sawdust motes drifting */}
      {detail !== 'low' && (
        <g>
          {[0, .5, 1, 1.5].map((d, i) => (
            <circle key={i} cx={-4 + i * 4} cy={-14} r=".6" fill="#e8c39a"
              style={{ '--px': `${(i % 2 ? 30 : -30)}px`, animation: `pollen ${4 + i}s ${d}s ease-in-out infinite`, transformOrigin: `${-4 + i * 4}px -14px` }} />
          ))}
        </g>
      )}
      {/* small lit windows */}
      <rect x="10" y="-24" width="6" height="8" fill="#3a2715" />
      <rect x="10.5" y="-23.5" width="5" height="7" fill="#ffd98a"
        style={{ animation: 'flicker 3s ease-in-out infinite', transformOrigin: '13px -20px' }} />
      <line x1="13" y1="-23" x2="13" y2="-17" stroke="#3a2715" strokeWidth=".3" />
      <line x1="10.5" y1="-20" x2="15.5" y2="-20" stroke="#3a2715" strokeWidth=".3" />
    </svg>
  );
}
