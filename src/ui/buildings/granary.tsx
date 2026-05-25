import { svgState, Shadow } from "./helpers.jsx";

export default function GranaryIllustration({ isBuilt }) {
  const { f } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={38} />
      <rect x="13" y="52" width="74" height="45" rx="3" fill="#c8b070" />
      {[24, 36, 50, 64, 76].map((x) => (
        <line key={x} x1={x} y1="52" x2={x} y2="97" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
      ))}
      <ellipse cx="50" cy="52" rx="40" ry="22" fill="#c8923a" />
      <ellipse cx="50" cy="52" rx="40" ry="22" fill="none" stroke="#9a6a3a" strokeWidth="1.5" />
      <path d="M12,52 Q50,38 88,52" fill="none" stroke="#9a6a3a" strokeWidth="1" opacity="0.5" />
      <path d="M18,44 Q50,30 82,44" fill="none" stroke="#9a6a3a" strokeWidth="1" opacity="0.5" />
      <ellipse cx="50" cy="30" rx="8" ry="4" fill="#8a5a1a" />
      <rect x="18" y="59" width="12" height="5" rx="2" fill="rgba(0,0,0,.3)" />
      <rect x="70" y="59" width="12" height="5" rx="2" fill="rgba(0,0,0,.3)" />
      <rect x="28" y="72" width="20" height="25" rx="2" fill="#8a5a2a" />
      <rect x="52" y="72" width="20" height="25" rx="2" fill="#8a5a2a" />
      <line x1="50" y1="72" x2="50" y2="97" stroke="#6a4a1a" strokeWidth="2" />
      <rect x="28" y="72" width="44" height="25" rx="2" fill="none" stroke="#6a4a1a" strokeWidth="1.5" />
      <circle cx="46" cy="85" r="2" fill="#c8923a" />
      <circle cx="54" cy="85" r="2" fill="#c8923a" />
      <rect x="13" y="52" width="74" height="45" rx="3" fill="none" stroke="#9a7a4a" strokeWidth="2" />
    </svg>
  );
}
