import { svgState, Shadow } from "./helpers.jsx";

export default function KitchenIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow />
      <rect x="58" y="10" width="12" height="30" rx="1" fill="#8a6858" />
      <rect x="56" y="8" width="16" height="5" rx="1" fill="#6a4a3a" />
      <rect x="60" y="14" width="8" height="3" rx="0.5" fill="#3a2a20" />
      <polygon points="6,42 50,12 94,42" fill="#7a4838" />
      <polygon points="6,42 50,12 94,42" fill="none" stroke="#5a2c1a" strokeWidth="1.5" />
      <line x1="50" y1="12" x2="28" y2="27" stroke="#5a2c1a" strokeWidth="1.2" opacity="0.55" />
      <line x1="50" y1="12" x2="72" y2="27" stroke="#5a2c1a" strokeWidth="1.2" opacity="0.55" />
      <rect x="8" y="42" width="84" height="56" rx="3" fill="#caa680" />
      <line x1="8" y1="56" x2="92" y2="56" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="8" y1="70" x2="92" y2="70" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="8" y1="84" x2="92" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <rect x="14" y="48" width="16" height="14" rx="2" fill={lit} />
      <line x1="22" y1="48" x2="22" y2="62" stroke="#8a6a3a" strokeWidth="1" />
      <line x1="14" y1="55" x2="30" y2="55" stroke="#8a6a3a" strokeWidth="1" />
      <rect x="14" y="48" width="16" height="14" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
      <rect x="44" y="58" width="32" height="24" rx="2" fill="#5a4838" />
      <rect x="44" y="58" width="32" height="24" rx="2" fill="none" stroke="#3a2818" strokeWidth="1.5" />
      <ellipse cx="60" cy="70" rx="11" ry="7" fill={isBuilt ? "#ffb060" : "#3a2818"} />
      <ellipse cx="60" cy="70" rx="11" ry="7" fill="none" stroke="#3a2818" strokeWidth="1.2" />
      {isBuilt && <ellipse cx="60" cy="70" rx="6" ry="3" fill="#ffe080" opacity="0.85" />}
      <rect x="46" y="80" width="28" height="3" rx="1" fill="#3a2818" />
      <path d="M14,98 L14,86 Q14,80 22,80 Q30,80 30,86 L30,98 Z" fill="#7a4a2a" />
      <path d="M14,86 Q14,80 22,80 Q30,80 30,86" fill="none" stroke="#5a3a1a" strokeWidth="1.2" />
      <circle cx="27" cy="91" r="1.6" fill="#c8923a" />
      <rect x="80" y="78" width="10" height="14" rx="1" fill="#9a7048" />
      <rect x="80" y="78" width="10" height="14" rx="1" fill="none" stroke="#6a4828" strokeWidth="1" />
      <line x1="80" y1="85" x2="90" y2="85" stroke="#6a4828" strokeWidth="0.8" />
      <rect x="8" y="42" width="84" height="56" rx="3" fill="none" stroke="#8a5a3a" strokeWidth="2" />
    </svg>
  );
}
