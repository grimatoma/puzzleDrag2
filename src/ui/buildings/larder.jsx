import { svgState, Shadow } from "./helpers.jsx";

export default function LarderIllustration({ isBuilt }) {
  const { f } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={38} />
      <polygon points="6,46 50,18 94,46" fill="#7a6858" />
      <polygon points="6,46 50,18 94,46" fill="none" stroke="#5a4a38" strokeWidth="1.5" />
      <rect x="11" y="46" width="78" height="51" rx="3" fill="#9a8878" />
      <line x1="11" y1="60" x2="89" y2="60" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      <line x1="11" y1="74" x2="89" y2="74" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      <line x1="11" y1="88" x2="89" y2="88" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      <line x1="37" y1="46" x2="37" y2="60" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <line x1="63" y1="60" x2="63" y2="74" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <rect x="15" y="52" width="16" height="12" rx="1" fill={isBuilt ? "#b0c0d0" : "#6a5a4a"} />
      <line x1="23" y1="52" x2="23" y2="64" stroke="#6a5a4a" strokeWidth="2" />
      <line x1="15" y1="58" x2="31" y2="58" stroke="#6a5a4a" strokeWidth="1" />
      <rect x="15" y="52" width="16" height="12" rx="1" fill="none" stroke="#6a5a4a" strokeWidth="1.5" />
      <rect x="69" y="52" width="16" height="12" rx="1" fill={isBuilt ? "#b0c0d0" : "#6a5a4a"} />
      <line x1="77" y1="52" x2="77" y2="64" stroke="#6a5a4a" strokeWidth="2" />
      <line x1="69" y1="58" x2="85" y2="58" stroke="#6a5a4a" strokeWidth="1" />
      <rect x="69" y="52" width="16" height="12" rx="1" fill="none" stroke="#6a5a4a" strokeWidth="1.5" />
      <rect x="34" y="65" width="32" height="32" rx="2" fill="#5a4a38" />
      <rect x="34" y="65" width="32" height="32" rx="2" fill="none" stroke="#3a2a18" strokeWidth="2" />
      <line x1="34" y1="79" x2="66" y2="79" stroke="#3a2a18" strokeWidth="2" />
      <line x1="34" y1="91" x2="66" y2="91" stroke="#3a2a18" strokeWidth="2" />
      <rect x="47" y="84" width="6" height="6" rx="1" fill="#c8923a" />
      <rect x="11" y="46" width="78" height="51" rx="3" fill="none" stroke="#6a5848" strokeWidth="2" />
    </svg>
  );
}
