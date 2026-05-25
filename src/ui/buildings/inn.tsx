import { svgState, Shadow } from "./helpers.jsx";

export default function InnIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={44} />
      <rect x="66" y="8" width="10" height="22" rx="1" fill="#8a7a6a" />
      <rect x="64" y="6" width="14" height="5" rx="1" fill="#6a5a4a" />
      <polygon points="5,36 50,6 95,36" fill="#4a6a3a" />
      <line x1="5" y1="36" x2="28" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
      <line x1="50" y1="6" x2="28" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
      <line x1="95" y1="36" x2="72" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
      <rect x="7" y="36" width="86" height="28" rx="2" fill="#8a7a60" />
      {[14, 32, 54, 72].map((x) => (
        <g key={x}>
          <rect x={x} y="41" width="14" height="12" rx="2" fill={lit} />
          <line x1={x + 7} y1="41" x2={x + 7} y2="53" stroke="#7a6a4a" strokeWidth="1" />
          <rect x={x} y="41" width="14" height="12" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
        </g>
      ))}
      <rect x="7" y="63" width="86" height="5" rx="1" fill="#6a5a3a" />
      <rect x="7" y="64" width="86" height="34" rx="2" fill="#9a8a70" />
      <line x1="38" y1="63" x2="38" y2="73" stroke="#6a4a2a" strokeWidth="1.5" />
      <line x1="62" y1="63" x2="62" y2="73" stroke="#6a4a2a" strokeWidth="1.5" />
      <rect x="30" y="69" width="40" height="10" rx="2" fill="#c8923a" />
      <rect x="30" y="69" width="40" height="10" rx="2" fill="none" stroke="#8a5a1a" strokeWidth="1" />
      <rect x="10" y="71" width="16" height="14" rx="2" fill={lit} />
      <rect x="10" y="71" width="16" height="14" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
      <rect x="74" y="71" width="16" height="14" rx="2" fill={lit} />
      <rect x="74" y="71" width="16" height="14" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
      <path d="M37,98 L37,82 A13,13 0 0,1 63,82 L63,98 Z" fill="#7a4a2a" />
      <path d="M37,82 A13,13 0 0,1 63,82" fill="none" stroke="#5a3a1a" strokeWidth="2" />
      <line x1="50" y1="82" x2="50" y2="98" stroke="#5a3a1a" strokeWidth="1" />
      <circle cx="59" cy="91" r="2.5" fill="#c8923a" />
    </svg>
  );
}
