import { svgState, Shadow } from "./helpers.jsx";

export default function HousingIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={38} />
      <rect x="74" y="14" width="9" height="22" rx="1" fill="#8a6a5a" />
      <rect x="72" y="12" width="13" height="5" rx="1" fill="#6a4a3a" />
      <polygon points="8,42 50,16 92,42" fill="#6a3818" />
      <polygon points="8,42 50,16 92,42" fill="none" stroke="#4a2008" strokeWidth="1.5" />
      <line x1="50" y1="16" x2="28" y2="29" stroke="#4a2008" strokeWidth="1" opacity="0.55" />
      <line x1="50" y1="16" x2="72" y2="29" stroke="#4a2008" strokeWidth="1" opacity="0.55" />
      <line x1="8" y1="42" x2="92" y2="42" stroke="#4a2008" strokeWidth="0.8" opacity="0.4" />
      <rect x="11" y="42" width="78" height="56" rx="3" fill="#d8b888" />
      <line x1="11" y1="58" x2="89" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="11" y1="74" x2="89" y2="74" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="11" y1="90" x2="89" y2="90" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <rect x="17" y="48" width="14" height="14" rx="1" fill={lit} />
      <line x1="24" y1="48" x2="24" y2="62" stroke="#7a5a3a" strokeWidth="1" />
      <line x1="17" y1="55" x2="31" y2="55" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="17" y="48" width="14" height="14" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
      <rect x="69" y="48" width="14" height="14" rx="1" fill={lit} />
      <line x1="76" y1="48" x2="76" y2="62" stroke="#7a5a3a" strokeWidth="1" />
      <line x1="69" y1="55" x2="83" y2="55" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="69" y="48" width="14" height="14" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
      <rect x="42" y="48" width="16" height="12" rx="1" fill={lit} />
      <line x1="50" y1="48" x2="50" y2="60" stroke="#7a5a3a" strokeWidth="1" />
      <line x1="42" y1="54" x2="58" y2="54" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="42" y="48" width="16" height="12" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
      <path d="M40,98 L40,72 A10,10 0 0,1 60,72 L60,98 Z" fill="#5a3818" />
      <path d="M40,72 A10,10 0 0,1 60,72" fill="none" stroke="#3a2008" strokeWidth="1.5" />
      <line x1="50" y1="72" x2="50" y2="98" stroke="#3a2008" strokeWidth="1" />
      <circle cx="56" cy="86" r="1.6" fill="#c8923a" />
      <rect x="17" y="68" width="14" height="10" rx="1" fill={lit} />
      <line x1="17" y1="73" x2="31" y2="73" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="17" y="68" width="14" height="10" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.2" />
      <rect x="69" y="68" width="14" height="10" rx="1" fill={lit} />
      <line x1="69" y1="73" x2="83" y2="73" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="69" y="68" width="14" height="10" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.2" />
      <rect x="11" y="42" width="78" height="56" rx="3" fill="none" stroke="#7a5a3a" strokeWidth="2" />
    </svg>
  );
}
