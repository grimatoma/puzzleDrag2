export function BldgBakery({ size = 32, fill = "#c96442" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 14 L21 14 L21 22 Z" fill="#7a5520"/>
      <path d="M3 14 L12 4 L21 14 Z" fill={fill}/>
      <ellipse cx="12" cy="18" rx="4" ry="3" fill="#1a0a04"/>
      <ellipse cx="12" cy="18" rx="2.5" ry="2" fill="#ffd248"/>
      <path d="M5 8 L7 5 M19 8 L17 5" stroke="#fff" strokeWidth="0.6" opacity="0.5"/>
    </svg>
  );
}

export function BldgSmithy({ size = 32, fill = "#3a3530" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 12 L21 12 L21 22 Z" fill="#5a4030"/>
      <rect x="3" y="10" width="18" height="3" fill="#3a2715"/>
      <path d="M9 5 L15 5 L18 10 L6 10 Z" fill={fill}/>
      <ellipse cx="12" cy="18" rx="3" ry="2.5" fill="#ff7038"/>
      <ellipse cx="12" cy="18.5" rx="1.5" ry="1" fill="#ffd248"/>
      <line x1="13" y1="3" x2="13" y2="5" stroke="#fff" strokeWidth="0.6" opacity="0.4"/>
    </svg>
  );
}

export function BldgScriptorium({ size = 32, fill = "#a8c4dc" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 12 L21 12 L21 22 Z" fill="#3a2715"/>
      <path d="M3 12 L12 4 L21 12 Z" fill="#5a4030"/>
      <rect x="9" y="14" width="6" height="6" fill={fill}/>
      <line x1="10" y1="16" x2="14" y2="16" stroke="#3a2715" strokeWidth="0.5"/>
      <line x1="10" y1="17.5" x2="14" y2="17.5" stroke="#3a2715" strokeWidth="0.5"/>
      <line x1="10" y1="19" x2="13" y2="19" stroke="#3a2715" strokeWidth="0.5"/>
    </svg>
  );
}

export function BldgTea({ size = 32, fill = "#90c890" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 14 L21 14 L21 22 Z" fill="#4a3220"/>
      <path d="M2 14 L12 6 L22 14 Z" fill={fill}/>
      <path d="M2 14 L12 8 L22 14" stroke="#3a5030" strokeWidth="0.4"/>
      <ellipse cx="12" cy="11" rx="0.7" ry="2" fill="#fff" opacity="0.5"/>
      <rect x="10" y="17" width="4" height="5" fill="#1a0e08"/>
    </svg>
  );
}

export function BldgKitchen({ size = 32, fill = "#d0a070" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 14 L21 14 L21 22 Z" fill="#5a4030"/>
      <rect x="3" y="14" width="18" height="2" fill="#3a2715"/>
      <rect x="6" y="8" width="12" height="6" fill={fill}/>
      <rect x="9" y="5" width="2" height="3" fill="#9a948a"/>
      <rect x="13" y="5" width="2" height="3" fill="#9a948a"/>
      <circle cx="9" cy="18" r="1.5" fill="#3a2715"/>
      <circle cx="15" cy="18" r="1.5" fill="#3a2715"/>
    </svg>
  );
}

export function BldgMarket({ size = 32, fill = "#d8a040" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 10 L4 6 L20 6 L22 10 L20 11 L20 22 L4 22 L4 11 Z" fill={fill}/>
      <path d="M4 6 L4 10 L8 10 L8 6 M12 6 L12 10 L16 6 M16 6 L16 10 L20 6"
        stroke="#7a5520" strokeWidth="0.6" fill="none"/>
      <rect x="9" y="14" width="6" height="8" fill="#5a4030"/>
    </svg>
  );
}

export function BldgDock({ size = 32, fill = "#5e8aa0" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="18" width="20" height="2" fill="#5a4030"/>
      <rect x="4" y="20" width="2" height="3" fill="#3a2715"/>
      <rect x="11" y="20" width="2" height="3" fill="#3a2715"/>
      <rect x="18" y="20" width="2" height="3" fill="#3a2715"/>
      <path d="M2 17 Q5 16 8 17 Q12 18 16 17 Q19 16 22 17" stroke={fill} strokeWidth="1.4" fill="none"/>
      <path d="M14 4 L14 18 M14 4 L20 10 L14 10" fill="#f8e7c6" stroke="#3a2715" strokeWidth="0.6"/>
    </svg>
  );
}

export function BldgSilo({ size = 32, fill = "#c8b890" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 22 L8 8 Q8 4 12 4 Q16 4 16 8 L16 22 Z" fill={fill}/>
      <ellipse cx="12" cy="8" rx="4" ry="2" fill="#d8c8a0"/>
      <path d="M8 12 L16 12 M8 16 L16 16" stroke="#7a5520" strokeWidth="0.4" opacity="0.5"/>
      <rect x="11" y="18" width="2" height="4" fill="#5a4030"/>
    </svg>
  );
}

export function BldgInn({ size = 32, fill = "#a06040" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 14 L21 14 L21 22 Z" fill="#5a4030"/>
      <path d="M3 14 L7 9 L17 9 L21 14 Z" fill={fill}/>
      <rect x="10" y="16" width="4" height="6" fill="#3a2715"/>
      <rect x="6" y="16" width="2.5" height="2" fill="#ffd248" opacity="0.7"/>
      <rect x="15.5" y="16" width="2.5" height="2" fill="#ffd248" opacity="0.7"/>
      <rect x="11" y="6" width="2" height="3" fill="#5a4030"/>
    </svg>
  );
}

export function BldgStable({ size = 32, fill = "#8a6a40" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 12 L21 12 L21 22 Z" fill={fill}/>
      <path d="M2 12 L12 5 L22 12 Z" fill="#5a4030"/>
      <path d="M9 22 L9 16 L11 16 L11 14 L13 14 L13 16 L15 16 L15 22 Z" fill="#3a2715"/>
      <path d="M3 14 L7 14 M3 16 L7 16 M3 18 L7 18 M17 14 L21 14 M17 16 L21 16 M17 18 L21 18"
        stroke="#3a2715" strokeWidth="0.5"/>
    </svg>
  );
}
