import { svgState } from "./helpers.jsx";
import { PAL, RoofTiles } from "./v2kit.jsx";

export default function StableIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-56 -96 112 112" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="48" ry="5" fill="rgba(0,0,0,.28)" />
      {/* foundation */}
      <rect x="-40" y="-6" width="80" height="6" fill={PAL.stone} />
      <g fill={PAL.stoneShade} opacity=".5">
        <rect x="-36" y="-4" width="6" height="2" /><rect x="-22" y="-4" width="6" height="2" />
        <rect x="-6" y="-4" width="6" height="2" /><rect x="10" y="-4" width="6" height="2" />
        <rect x="26" y="-4" width="6" height="2" />
      </g>
      {/* WALLS — warm sandy plaster */}
      <rect x="-38" y="-30" width="76" height="24" fill="#e0c890" />
      <rect x="-38" y="-30" width="12" height="24" fill="#b8a060" />
      {/* timber framing (horizontal post-and-beam) */}
      <g fill={PAL.timber}>
        <rect x="-38" y="-30" width="76" height="1.4" />
        <rect x="-38" y="-19" width="76" height="1.4" />
        <rect x="-38" y="-8" width="76" height="1.4" />
        {/* vertical posts */}
        <rect x="-38" y="-30" width="2" height="24" />
        <rect x="-14" y="-30" width="2" height="24" />
        <rect x="12" y="-30" width="2" height="24" />
        <rect x="36" y="-30" width="2" height="24" />
      </g>
      {/* shallow tile roof — long ridge */}
      <defs><RoofTiles id="stable-tiles" color="#8a4a30" /></defs>
      <polygon points="-44,-30 -38,-44 38,-44 44,-30" fill="url(#stable-tiles)" />
      <polygon points="-44,-30 -38,-44 -8,-44 -14,-30" fill="rgba(0,0,0,.28)" />
      <rect x="-44" y="-30" width="88" height="2.4" fill="#5a2a18" />
      <rect x="-38" y="-46" width="76" height="2" fill="#3a160a" />
      {/* gable end vents — horseshoe shapes */}
      {detail !== 'low' && (
        <g transform="translate(0 -38)" stroke="#3a2715" strokeWidth=".8" fill="none">
          <path d="M-2,-2 a2.4,2.4 0 0 1 4.8,0 L2.4,2 L-2.4,2 Z" fill="#1a1410" />
        </g>
      )}
      {/* TWO STALL DOORWAYS — Dutch doors, open top half showing horse */}
      {/* Stall 1 — chestnut horse */}
      <g transform="translate(-22 -6)">
        {/* doorway frame */}
        <rect x="-9" y="-22" width="18" height="22" fill="#1a1410" />
        <rect x="-8.4" y="-21.4" width="17" height="21" fill="#3a2715" />
        {/* lower half of Dutch door (closed) */}
        <rect x="-8.4" y="-11" width="17" height="11" fill="#7a5c34" />
        <g stroke="#5a3a1f" strokeWidth=".5">
          <line x1="-8.4" y1="-7" x2="8.6" y2="-7" />
          <line x1="-8.4" y1="-3" x2="8.6" y2="-3" />
        </g>
        <circle cx="6" cy="-5.5" r=".7" fill={PAL.brass} />
        {/* nameplate */}
        <rect x="-4" y="-14" width="8" height="2.2" fill="#fbf7eb" stroke="#5a3a1f" strokeWidth=".3" />
        <text x="0" y="-12.4" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="1.8" fontWeight="700" fill="#3a2715">ROAN</text>
        {/* HORSE HEAD poking over the door (signature) */}
        <g style={{ animation: 'bob 4s ease-in-out infinite', transformOrigin: '0 -14px' }}>
          {/* neck */}
          <path d="M-3,-12 L-2.4,-18 L3,-18 L4,-12 Z" fill="#a55a3a" />
          {/* head */}
          <path d="M-1,-19 Q-1,-21 0,-22 L3,-22 Q5,-22 5,-19 L5,-15 L3,-15 L3,-13 L-1,-13 Z" fill="#a55a3a" />
          {/* mane */}
          <path d="M-1,-19 L-3,-15 L-2,-14 L-1.4,-17 Z" fill="#5a3a1f" />
          <path d="M-1,-21 L-3,-19 L-2,-18 Z" fill="#5a3a1f" />
          {/* eye */}
          <circle cx="2" cy="-19" r=".4" fill="#1a1410" />
          {/* ear */}
          <path d="M0,-22 L1,-24 L2,-22 Z" fill="#a55a3a" />
          {/* nostril */}
          <ellipse cx="4.6" cy="-16" rx=".3" ry=".5" fill="#3a160a" />
          {/* white blaze */}
          <path d="M2,-21 L2.4,-17 L3,-16 L3.4,-17 L4,-21 Z" fill="#fbf7eb" opacity=".7" />
        </g>
      </g>
      {/* Stall 2 — black horse */}
      <g transform="translate(22 -6)">
        <rect x="-9" y="-22" width="18" height="22" fill="#1a1410" />
        <rect x="-8.4" y="-21.4" width="17" height="21" fill="#3a2715" />
        <rect x="-8.4" y="-11" width="17" height="11" fill="#7a5c34" />
        <g stroke="#5a3a1f" strokeWidth=".5">
          <line x1="-8.4" y1="-7" x2="8.6" y2="-7" />
          <line x1="-8.4" y1="-3" x2="8.6" y2="-3" />
        </g>
        <circle cx="-6" cy="-5.5" r=".7" fill={PAL.brass} />
        <rect x="-4" y="-14" width="8" height="2.2" fill="#fbf7eb" stroke="#5a3a1f" strokeWidth=".3" />
        <text x="0" y="-12.4" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="1.8" fontWeight="700" fill="#3a2715">SHADE</text>
        {/* horse head (slightly offset timing) */}
        <g style={{ animation: 'bob 4.4s .6s ease-in-out infinite', transformOrigin: '0 -14px' }}>
          <path d="M-3,-12 L-2.4,-18 L3,-18 L4,-12 Z" fill="#3a2715" />
          <path d="M-1,-19 Q-1,-21 0,-22 L3,-22 Q5,-22 5,-19 L5,-15 L3,-15 L3,-13 L-1,-13 Z" fill="#3a2715" />
          <path d="M-1,-19 L-3,-15 L-2,-14 L-1.4,-17 Z" fill="#1a1410" />
          <path d="M-1,-21 L-3,-19 L-2,-18 Z" fill="#1a1410" />
          <circle cx="2" cy="-19" r=".4" fill="#bda268" />
          <path d="M0,-22 L1,-24 L2,-22 Z" fill="#3a2715" />
          <ellipse cx="4.6" cy="-16" rx=".3" ry=".5" fill="#1a1410" />
        </g>
      </g>
      {/* CENTER big sliding door (closed) */}
      <g transform="translate(0 -6)">
        <rect x="-10" y="-22" width="20" height="22" fill="#5a3a1f" />
        <g stroke="#3a2715" strokeWidth=".5">
          {[-7, -3, 1, 5, 9].map(px => <line key={px} x1={px} y1="-22" x2={px} y2="0" />)}
          <line x1="-10" y1="-15" x2="10" y2="-15" />
        </g>
        {/* sliding rail above door */}
        <rect x="-12" y="-23" width="24" height="1.4" fill="#3a3530" />
        {/* X-brace */}
        <line x1="-10" y1="-22" x2="10" y2="0" stroke="#3a2715" strokeWidth="1.4" />
        <line x1="10" y1="-22" x2="-10" y2="0" stroke="#3a2715" strokeWidth="1.4" />
        {/* handle */}
        <rect x="-2" y="-12" width="4" height="1.2" fill="#3a3530" />
      </g>
      {/* HAY BALES outside */}
      {detail !== 'low' && (
        <g transform="translate(-38 -2)">
          <ellipse cx="0" cy="0" rx="9" ry="1.4" fill="rgba(0,0,0,.3)" />
          <rect x="-8" y="-7" width="16" height="7" rx="1" fill="#e8c266" />
          <g stroke="#a98a4a" strokeWidth=".4" fill="none">
            <line x1="-8" y1="-5" x2="8" y2="-5" />
            <line x1="-8" y1="-3" x2="8" y2="-3" />
            <line x1="-2" y1="-7" x2="-2" y2="0" />
            <line x1="3" y1="-7" x2="3" y2="0" />
          </g>
          {/* straw wisps */}
          <g stroke="#bda268" strokeWidth=".4">
            <line x1="-8" y1="-7" x2="-10" y2="-9" />
            <line x1="8" y1="-7" x2="10" y2="-9" />
            <line x1="0" y1="-7" x2="-1" y2="-9" />
          </g>
        </g>
      )}
      {/* water TROUGH */}
      {detail !== 'low' && (
        <g transform="translate(38 -2)">
          <ellipse cx="0" cy="0" rx="8" ry="1.4" fill="rgba(0,0,0,.3)" />
          <rect x="-8" y="-5" width="16" height="5" fill="#5a3a1f" />
          <rect x="-8" y="-5" width="16" height="1" fill="#3a2715" />
          <rect x="-7" y="-4" width="14" height="3" fill="#3a7088" />
          <ellipse cx="0" cy="-4" rx="7" ry=".7" fill="#5aa0bd" />
          {/* ripples */}
          <g style={{ animation: 'wave 2.4s ease-in-out infinite', transformOrigin: '0 -3px' }}>
            <ellipse cx="0" cy="-3.2" rx="5" ry=".3" fill="#cfe4ee" opacity=".6" />
          </g>
        </g>
      )}
      {/* HORSESHOE shop sign */}
      {detail !== 'low' && (
        <g transform="translate(-20 -32)">
          <rect x="-1" y="-3" width="2" height="3" fill="#3a2715" />
          <path d="M-3,0 a3,3 0 0 1 6,0 L1.6,1 L1.6,3 L-1.6,3 L-1.6,1 Z" fill="#7c858d" stroke="#3a3530" strokeWidth=".4" />
          <g fill="#3a3530">
            <circle cx="-2" cy="0" r=".3" /><circle cx="-1" cy="-1.4" r=".3" />
            <circle cx="1" cy="-1.4" r=".3" /><circle cx="2" cy="0" r=".3" />
          </g>
        </g>
      )}
      {/* PITCHFORK leaning */}
      {detail === 'high' && (
        <g transform="translate(-30 -8) rotate(15)">
          <line x1="0" y1="0" x2="0" y2="-16" stroke="#7a5c34" strokeWidth=".8" />
          <line x1="-1.4" y1="-16" x2="-1.4" y2="-19" stroke="#7c858d" strokeWidth=".6" />
          <line x1="0" y1="-16" x2="0" y2="-19" stroke="#7c858d" strokeWidth=".6" />
          <line x1="1.4" y1="-16" x2="1.4" y2="-19" stroke="#7c858d" strokeWidth=".6" />
          <line x1="-1.4" y1="-16" x2="1.4" y2="-16" stroke="#5a3a1f" strokeWidth=".4" />
        </g>
      )}
      {/* SWALLOWS flying around */}
      {detail !== 'low' && (
        <g>
          <g transform="translate(-10 -42)" style={{ animation: 'walk 12s linear infinite alternate', '--end': '20px' }}>
            <path d="M-3,1 Q-1.5,-1 0,0 Q1.5,-1 3,1" stroke="#3a2715" strokeWidth="1" fill="none" strokeLinecap="round" />
          </g>
        </g>
      )}
    </svg>
  );
}
