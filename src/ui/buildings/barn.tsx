import { svgState, Shadow } from "./helpers.jsx";

export default function BarnIllustration({ isBuilt }) {
  const { f } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow />
      <rect x="62" y="14" width="10" height="24" rx="1" fill="#4a4030" />
      <rect x="60" y="12" width="14" height="5" rx="1" fill="#2a2018" />
      <polygon points="6,38 28,16 72,16 94,38" fill="#5a2818" />
      <polygon points="6,38 28,16 72,16 94,38" fill="none" stroke="#3a1808" strokeWidth="1.5" />
      <line x1="6" y1="38" x2="28" y2="16" stroke="#3a1808" strokeWidth="1" opacity="0.55" />
      <line x1="94" y1="38" x2="72" y2="16" stroke="#3a1808" strokeWidth="1" opacity="0.55" />
      <rect x="6" y="38" width="88" height="60" rx="2" fill="#7a4838" />
      <rect x="6" y="38" width="88" height="60" rx="2" fill="none" stroke="#3a1808" strokeWidth="2" />
      <line x1="6" y1="52" x2="94" y2="52" stroke="#3a1808" strokeWidth="0.8" opacity="0.4" />
      <line x1="6" y1="68" x2="94" y2="68" stroke="#3a1808" strokeWidth="0.8" opacity="0.4" />
      <line x1="6" y1="84" x2="94" y2="84" stroke="#3a1808" strokeWidth="0.8" opacity="0.4" />
      <line x1="26" y1="38" x2="26" y2="98" stroke="#3a1808" strokeWidth="0.6" opacity="0.35" />
      <line x1="50" y1="38" x2="50" y2="98" stroke="#3a1808" strokeWidth="0.6" opacity="0.35" />
      <line x1="74" y1="38" x2="74" y2="98" stroke="#3a1808" strokeWidth="0.6" opacity="0.35" />
      <rect x="11" y="42" width="78" height="3" fill="#4a4030" />
      <rect x="11" y="95" width="78" height="3" fill="#4a4030" />
      <line x1="14" y1="42" x2="14" y2="98" stroke="#4a4030" strokeWidth="2" />
      <line x1="86" y1="42" x2="86" y2="98" stroke="#4a4030" strokeWidth="2" />
      <rect x="36" y="52" width="14" height="14" rx="1" fill="#3a2818" />
      <rect x="36" y="52" width="14" height="14" rx="1" fill="none" stroke="#1a1208" strokeWidth="1" />
      <line x1="36" y1="59" x2="50" y2="59" stroke="#1a1208" strokeWidth="0.8" />
      <line x1="43" y1="52" x2="43" y2="66" stroke="#1a1208" strokeWidth="0.8" />
      <rect x="50" y="52" width="14" height="14" rx="1" fill="#3a2818" />
      <rect x="50" y="52" width="14" height="14" rx="1" fill="none" stroke="#1a1208" strokeWidth="1" />
      <line x1="50" y1="59" x2="64" y2="59" stroke="#1a1208" strokeWidth="0.8" />
      <line x1="57" y1="52" x2="57" y2="66" stroke="#1a1208" strokeWidth="0.8" />
      <path d="M30,98 L30,74 L70,74 L70,98 Z" fill="#3a2818" />
      <path d="M30,98 L30,74 L70,74 L70,98 Z" fill="none" stroke="#1a1208" strokeWidth="2" />
      <line x1="50" y1="74" x2="50" y2="98" stroke="#1a1208" strokeWidth="1.5" />
      <line x1="30" y1="74" x2="50" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
      <line x1="50" y1="74" x2="30" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
      <line x1="50" y1="74" x2="70" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
      <line x1="70" y1="74" x2="50" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
      <circle cx="46" cy="86" r="1.6" fill="#c8923a" />
      <circle cx="54" cy="86" r="1.6" fill="#c8923a" />
      <rect x="14" y="78" width="12" height="14" rx="1" fill="#5a3818" />
      <rect x="14" y="78" width="12" height="14" rx="1" fill="none" stroke="#3a2008" strokeWidth="1" />
      <ellipse cx="20" cy="78" rx="6" ry="2" fill="#7a4828" />
      <line x1="14" y1="84" x2="26" y2="84" stroke="#2a1808" strokeWidth="0.8" />
      <rect x="76" y="48" width="6" height="14" rx="1" fill={isBuilt ? "#c86820" : "#5a4830"} />
      <rect x="76" y="48" width="6" height="14" rx="1" fill="none" stroke="#3a2008" strokeWidth="0.8" />
      {isBuilt && <ellipse cx="79" cy="50" rx="3" ry="1" fill="#f8a040" opacity="0.85" />}
      <line x1="79" y1="42" x2="79" y2="48" stroke="#3a2008" strokeWidth="1" />
    </svg>
  );
}
