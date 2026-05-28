import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function HarborDockIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-68 -120 136 136" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      {/* shoreline */}
      <path d="M-60,0 L-20,0 L-12,-3 L-60,-3 Z" fill="#d8c08a" />
      {/* water */}
      <rect x="-20" y="0" width="80" height="14" fill={PAL.sea} />
      <rect x="-20" y="0" width="80" height="3" fill={PAL.seaLight} />
      <g style={{ animation: 'wave 3s ease-in-out infinite', transformOrigin: '0 6px' }}>
        <path d="M-20,4 Q-8,1 6,4 T34,4 T62,4 L62,8 L-20,8 Z" fill={PAL.seaLight} opacity=".6" />
      </g>
      <g style={{ animation: 'wave 4s .8s ease-in-out infinite', transformOrigin: '0 10px' }}>
        <path d="M-20,10 Q-4,8 12,10 T44,10 T62,10 L62,14 L-20,14 Z" fill={PAL.seaDark} opacity=".55" />
      </g>
      {detail !== 'low' && (
        <g fill={PAL.seaFoam} opacity=".75">
          <ellipse cx="-16" cy="1" rx="6" ry="1"
            style={{ animation: 'splash 2s ease-in-out infinite', transformOrigin: '-16px 1px' }} />
          <ellipse cx="-4" cy="2" rx="4" ry=".8"
            style={{ animation: 'splash 2.4s .4s ease-in-out infinite', transformOrigin: '-4px 2px' }} />
        </g>
      )}
      {/* pier */}
      <g>
        <rect x="-30" y="-6" width="60" height="4" fill="#bda268" />
        <rect x="-30" y="-6" width="60" height="1" fill="#7a5c34" />
        <rect x="-30" y="-2" width="60" height="1" fill="#3a2715" />
        <g stroke="#7a5c34" strokeWidth=".5" opacity=".7">
          {[-22, -14, -6, 2, 10, 18, 26].map(px => <line key={px} x1={px} y1="-6" x2={px} y2="-2" />)}
        </g>
        <g fill="#5a3a1f">
          <rect x="-26" y="-2" width="3" height="12" /><rect x="-10" y="-2" width="3" height="12" />
          <rect x="6" y="-2" width="3" height="12" /><rect x="22" y="-2" width="3" height="12" />
        </g>
        <g stroke="#3a2715" strokeWidth="1" fill="none">
          <line x1="-28" y1="4" x2="-21" y2="4" /><line x1="-12" y1="4" x2="-5" y2="4" />
          <line x1="4" y1="4" x2="11" y2="4" /><line x1="20" y1="4" x2="27" y2="4" />
        </g>
        <rect x="-30" y="-1" width="60" height="2" fill="rgba(0,0,0,.22)" />
      </g>
      {/* crane derrick + bobbing crate WITH bobbing rope (FIX) */}
      <g transform="translate(-16 -6)">
        <rect x="-4" y="-2" width="8" height="2" fill="#3a3530" />
        <rect x="-1" y="-30" width="2" height="28" fill="#5a3a1f" />
        <line x1="0" y1="-30" x2="20" y2="-12" stroke="#5a3a1f" strokeWidth="2.2" />
        <line x1="-1" y1="-30" x2="-8" y2="-2" stroke="#3a2715" strokeWidth="1" />
        {/* boom-tip pulley */}
        <circle cx="20" cy="-12" r="1.2" fill="#3a3530" />
        <circle cx="20" cy="-12" r=".5" fill="#bda268" />
        <g style={{ animation: 'bob 3.2s ease-in-out infinite', transformOrigin: '20px -2px' }}>
          {/* rope now part of bobbing group */}
          <line x1="20" y1="-11" x2="20" y2="-2" stroke="#3a2715" strokeWidth=".8" />
          <rect x="16" y="-2" width="8" height="6" fill="#bda268" stroke="#5a3a1f" strokeWidth=".8" />
          <line x1="16" y1="1" x2="24" y2="1" stroke="#5a3a1f" strokeWidth=".5" />
          <rect x="19" y="-2" width="2" height="6" fill="#5a3a1f" opacity=".6" />
        </g>
      </g>
      {/* sailboat */}
      <g transform="translate(20 -2)" style={{ animation: 'bob 4s ease-in-out infinite' }}>
        <path d="M-12,0 Q-8,4 0,4 Q8,4 12,0 Z" fill="#7a3d24" />
        <path d="M-12,0 L12,0 L10,-2 L-10,-2 Z" fill="#a55a3a" />
        <line x1="0" y1="-2" x2="0" y2="-22" stroke="#3a2715" strokeWidth="1.4" />
        <path d="M0,-22 L0,-6 L9,-6 Z" fill="#fbf7eb" stroke="#7a5c34" strokeWidth=".6" />
        <path d="M0,-22 L0,-15 L-7,-15 Z" fill="#fbf7eb" opacity=".85" stroke="#7a5c34" strokeWidth=".6" />
        <g style={{ animation: 'sway 2.4s ease-in-out infinite', transformOrigin: '0 -22px' }}>
          <path d="M0,-22 L6,-20 L4,-18 L6,-16 L0,-18 Z" fill="#c96442" />
        </g>
      </g>
      <path d="M11,-3 Q14,-5 16,-2" fill="none" stroke="#3a2715" strokeWidth=".8" />
      {detail !== 'low' && (
        <g transform="translate(6 -6)">
          <rect x="-1.4" y="-3" width="2.8" height="3" fill="#3a3530" />
          <ellipse cx="0" cy="-3" rx="2" ry=".7" fill="#7c858d" />
        </g>
      )}
      {/* harbor master shack */}
      <g transform="translate(-46 -6)">
        <ellipse cx="0" cy="2" rx="14" ry="2" fill="rgba(0,0,0,.22)" />
        <rect x="-10" y="-14" width="20" height="14" fill="#e0c08a" />
        <rect x="-10" y="-14" width="4" height="14" fill="#a8884a" />
        <polygon points="-12,-14 0,-22 12,-14" fill="#4a5e74" />
        <polygon points="-12,-14 0,-22 -4,-14" fill="rgba(0,0,0,.26)" />
        <rect x="-12" y="-14" width="24" height="1.4" fill="#2a3548" />
        <rect x="-2" y="-12" width="6" height="6" fill="#3a2715" />
        <rect x="-1.4" y="-11.4" width="4.8" height="4.8" fill="#ffd98a" />
        <rect x="-8" y="-8" width="4" height="8" fill={PAL.timber} />
        {/* ANCHOR — redrawn properly (FIX) */}
        <g transform="translate(8 -2)">
          {/* shank */}
          <line x1="0" y1="-2" x2="0" y2="-11" stroke="#3a3530" strokeWidth="1.2" />
          {/* ring at top */}
          <circle cx="0" cy="-12" r="1.4" fill="none" stroke="#3a3530" strokeWidth=".8" />
          {/* crossbar (stock) */}
          <line x1="-3" y1="-9" x2="3" y2="-9" stroke="#3a3530" strokeWidth="1" />
          {/* curved arms with flukes */}
          <path d="M0,-3 Q-3,-2 -4,0 L-3.4,.6 Q-2.2,-1 0,-2" fill="#3a3530" />
          <path d="M0,-3 Q3,-2 4,0 L3.4,.6 Q2.2,-1 0,-2" fill="#3a3530" />
          {/* fluke tips */}
          <path d="M-4,0 L-5,.4 L-4,1 Z" fill="#3a3530" />
          <path d="M4,0 L5,.4 L4,1 Z" fill="#3a3530" />
        </g>
      </g>
      {/* SEAGULLS — clear M-shape silhouettes (FIX) */}
      {detail !== 'low' && (
        <g>
          <g transform="translate(8 -42)" style={{ animation: 'walk 18s linear infinite alternate', '--end': '40px' }}>
            <g style={{ animation: 'flap .4s ease-in-out infinite', transformOrigin: '4px 0' }}>
              <path d="M-5,1 Q-2,-3 0,0 Q2,-3 5,1" stroke="#3a2715" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <circle cx="0" cy="-.5" r=".5" fill="#3a2715" />
            </g>
          </g>
          <g transform="translate(34 -34)" style={{ animation: 'walk 20s 2s linear infinite alternate', '--end': '-30px' }}>
            <g style={{ animation: 'flap .5s .15s ease-in-out infinite', transformOrigin: '0 0' }}>
              <path d="M-4,1 Q-2,-2 0,0 Q2,-2 4,1" stroke="#3a2715" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(-2 -52)" style={{ animation: 'walk 24s 1s linear infinite alternate', '--end': '20px' }}>
            <g style={{ animation: 'flap .42s .3s ease-in-out infinite', transformOrigin: '0 0' }}>
              <path d="M-3.4,1 Q-1.6,-2 0,0 Q1.6,-2 3.4,1" stroke="#3a2715" strokeWidth="1" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
