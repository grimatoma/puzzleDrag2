import { svgState, Shadow } from "./helpers.jsx";

export default function CaravanPostIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={48} />
      <line x1="82" y1="12" x2="82" y2="40" stroke="#8a5a2a" strokeWidth="2.5" />
      <polygon points="82,12 95,18 82,24" fill="#c83030" />
      <rect x="5" y="45" width="72" height="52" rx="3" fill="#a8784a" />
      <line x1="5" y1="58" x2="77" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
      <line x1="5" y1="71" x2="77" y2="71" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
      <line x1="5" y1="84" x2="77" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
      <path d="M2,38 L79,38 L77,52 L4,52 Z" fill="#c83a1a" />
      {[13, 26, 40, 53, 66].map((x) => (
        <line key={x} x1={x} y1="38" x2={x - 1} y2="52" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
      ))}
      <line x1="24" y1="38" x2="24" y2="46" stroke="#6a4a2a" strokeWidth="1.5" />
      <line x1="56" y1="38" x2="56" y2="46" stroke="#6a4a2a" strokeWidth="1.5" />
      <rect x="16" y="42" width="48" height="9" rx="2" fill="#e8c060" />
      <rect x="16" y="42" width="48" height="9" rx="2" fill="none" stroke="#9a7a20" strokeWidth="1" />
      <rect x="9" y="57" width="18" height="14" rx="2" fill={lit} />
      <line x1="18" y1="57" x2="18" y2="71" stroke="#8a6a3a" strokeWidth="1" />
      <line x1="9" y1="64" x2="27" y2="64" stroke="#8a6a3a" strokeWidth="1" />
      <rect x="9" y="57" width="18" height="14" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
      <rect x="37" y="67" width="22" height="30" rx="2" fill="#7a4a2a" />
      <rect x="37" y="67" width="22" height="30" rx="2" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
      <circle cx="56" cy="83" r="2" fill="#c8923a" />
      <circle cx="85" cy="75" r="13" fill="none" stroke="#8a5a2a" strokeWidth="2.5" />
      <circle cx="85" cy="75" r="4" fill="#8a5a2a" />
      <line x1="85" y1="62" x2="85" y2="88" stroke="#8a5a2a" strokeWidth="1.5" />
      <line x1="72" y1="75" x2="98" y2="75" stroke="#8a5a2a" strokeWidth="1.5" />
      <line x1="76" y1="66" x2="94" y2="84" stroke="#8a5a2a" strokeWidth="1.5" />
      <line x1="76" y1="84" x2="94" y2="66" stroke="#8a5a2a" strokeWidth="1.5" />
      <rect x="5" y="45" width="72" height="52" rx="3" fill="none" stroke="#7a5a3a" strokeWidth="2" />
    </svg>
  );
}
