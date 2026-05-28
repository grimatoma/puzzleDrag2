import { svgState } from "./helpers.jsx";
import { PAL } from "./v2kit.jsx";

export default function LighthouseIllustration({ isBuilt }: { isBuilt?: boolean }) {
  const { f } = svgState(isBuilt);
  const detail: string = "high";
  return (
    <svg viewBox="-80 -144 160 160" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <ellipse cx="0" cy="2" rx="44" ry="5" fill="rgba(0,0,0,.34)" />
      {/* WATER — fills around the rocky base */}
      <rect x="-50" y="0" width="100" height="14" fill={PAL.sea} />
      <rect x="-50" y="0" width="100" height="3" fill={PAL.seaLight} />
      <g style={{ animation: 'wave 3s ease-in-out infinite', transformOrigin: '0 6px' }}>
        <path d="M-50,4 Q-30,1 -10,4 T30,4 T50,4 L50,8 L-50,8 Z" fill={PAL.seaLight} opacity=".55" />
      </g>
      <g style={{ animation: 'wave 4s .8s ease-in-out infinite', transformOrigin: '0 10px' }}>
        <path d="M-50,10 Q-30,8 -10,10 T30,10 T50,10 L50,14 L-50,14 Z" fill={PAL.seaDark} opacity=".5" />
      </g>
      {/* ROCKY ISLET base */}
      <path d="M-22,0 L-18,-10 L-12,-14 L-8,-10 L0,-14 L8,-10 L14,-12 L20,-8 L22,0 Z" fill="#5b5346" />
      <path d="M-22,0 L-18,-10 L-12,-14 L-8,-10 L0,-14 L0,0 Z" fill="#3a3530" />
      {/* foam splashing at rocks */}
      {detail !== 'low' && (
        <g>
          <ellipse cx="-18" cy="0" rx="6" ry="1.2" fill={PAL.seaFoam} opacity=".8"
            style={{ animation: 'splash 1.6s ease-in-out infinite', transformOrigin: '-18px 0' }} />
          <ellipse cx="18" cy="0" rx="6" ry="1.2" fill={PAL.seaFoam} opacity=".8"
            style={{ animation: 'splash 1.8s .4s ease-in-out infinite', transformOrigin: '18px 0' }} />
        </g>
      )}
      {/* TOWER — stripey red/white */}
      {/* base ring (granite) */}
      <path d="M-14,-14 L-13,-22 L13,-22 L14,-14 Z" fill={PAL.stone} />
      <path d="M-14,-14 L-13,-22 L-3,-22 L-5,-14 Z" fill={PAL.stoneShade} />
      {/* tapered cylinder body */}
      <path d="M-12,-22 L-9,-76 L9,-76 L12,-22 Z" fill="#fbf7eb" />
      {/* horizontal painted bands (the signature stripe) */}
      <path d="M-12,-22 L-11,-30 L11,-30 L12,-22 Z" fill="#c96442" />
      <path d="M-10.6,-44 L-10,-52 L10,-52 L10.6,-44 Z" fill="#c96442" />
      <path d="M-9.6,-66 L-9,-72 L9,-72 L9.6,-66 Z" fill="#c96442" />
      {/* curve shading — left shadow */}
      <path d="M-12,-22 L-9,-76 L-3,-76 L-5,-22 Z" fill="rgba(0,0,0,.18)" />
      {/* small portholes */}
      {[-38, -58].map(yy => (
        <g key={yy}>
          <circle cx="0" cy={yy} r="2.2" fill="#3a2715" />
          <circle cx="0" cy={yy} r="1.6" fill="#ffd98a"
            style={{ animation: 'flicker 3s ease-in-out infinite', transformOrigin: `0 ${yy}px` }} />
          <circle cx="0" cy={yy} r="2.2" fill="none" stroke="#3a2715" strokeWidth=".5" />
          <line x1="-2.2" y1={yy} x2="2.2" y2={yy} stroke="#3a2715" strokeWidth=".4" />
        </g>
      ))}
      {/* GALLERY — railed walkway just below the lamp */}
      <rect x="-13" y="-77" width="26" height="3" fill="#3a3530" />
      <rect x="-13" y="-76" width="26" height="1" fill="#7c858d" />
      {detail !== 'low' && (
        <g stroke="#3a3530" strokeWidth=".5">
          {[-12, -8, -4, 0, 4, 8, 12].map(px => <line key={px} x1={px} y1="-77" x2={px} y2="-80" />)}
          <line x1="-12" y1="-80" x2="12" y2="-80" />
        </g>
      )}
      {/* LAMP ROOM — glass with diamond mullions */}
      <rect x="-7" y="-90" width="14" height="13" fill="#3a3530" />
      <rect x="-6" y="-89" width="12" height="11" fill="#ffd98a" opacity=".9" />
      {/* mullions */}
      <g stroke="#3a3530" strokeWidth=".5">
        <line x1="-6" y1="-83.5" x2="6" y2="-83.5" />
        <line x1="-3" y1="-89" x2="-3" y2="-78" />
        <line x1="0" y1="-89" x2="0" y2="-78" />
        <line x1="3" y1="-89" x2="3" y2="-78" />
      </g>
      {/* lamp core — bright orb */}
      <circle cx="0" cy="-83.5" r="2.6" fill="#fff8c2"
        style={{ animation: 'flicker 1.6s ease-in-out infinite', transformOrigin: '0 -83.5px' }} />
      <circle cx="0" cy="-83.5" r="1.4" fill="#fbf7eb" />
      {/* ROOF DOME */}
      <path d="M-9,-90 Q0,-100 9,-90 Z" fill="#7a1d12" />
      <path d="M-9,-90 Q0,-100 -3,-90 Z" fill="rgba(0,0,0,.32)" />
      <ellipse cx="0" cy="-90" rx="9" ry="1.2" fill="#3a160a" />
      {/* finial */}
      <line x1="0" y1="-100" x2="0" y2="-108" stroke="#3a3530" strokeWidth="1.2" />
      <path d="M-1.4,-108 L1.4,-108 L0,-112 Z" fill="#bcc4c8" />
      {/* ROTATING LIGHT BEAM (signature) — TWO opposing cones rotating */}
      {detail !== 'low' && (
        <g transform="translate(0 -83.5)" style={{ animation: 'windmill 8s linear infinite', transformOrigin: '0 0' }}>
          {/* primary cone */}
          <path d="M0,0 L-44,-28 L-46,-22 L0,0 L-46,-12 L-44,-6 L0,0 Z" fill="#fff8c2" opacity=".35" />
          {/* opposite cone */}
          <path d="M0,0 L44,-28 L46,-22 L0,0 L46,-12 L44,-6 L0,0 Z" fill="#fff8c2" opacity=".22" />
        </g>
      )}
      {/* tiny stars in beam path */}
      {detail !== 'low' && (
        <g>
          {[0, 1.5, 3].map((d, i) => (
            <circle key={i} cx={-30 + i * 30} cy={-90 + i * 4} r=".7" fill="#fff8c2"
              style={{ animation: `pulse2 2.4s ${d}s ease-in-out infinite`, transformOrigin: `${-30 + i * 30}px ${-90 + i * 4}px` }} />
          ))}
        </g>
      )}
      {/* small DOCK at base */}
      {detail === 'high' && (
        <g transform="translate(28 -10)">
          <rect x="-8" y="0" width="16" height="2" fill="#bda268" />
          <rect x="-6" y="2" width="2" height="6" fill="#5a3a1f" />
          <rect x="4" y="2" width="2" height="6" fill="#5a3a1f" />
          {/* tied dinghy */}
          <g style={{ animation: 'bob 3.8s ease-in-out infinite', transformOrigin: '12px 4px' }}>
            <path d="M8,4 Q11,7 14,4 Z" fill="#7a3d24" />
            <line x1="8" y1="3" x2="14" y2="3" stroke="#5a2415" strokeWidth=".4" />
          </g>
          <path d="M0,0 Q4,1 8,3" stroke="#3a2715" strokeWidth=".5" fill="none" />
        </g>
      )}
    </svg>
  );
}
