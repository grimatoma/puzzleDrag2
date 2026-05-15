export function ToolHoe({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="20" x2="18" y2="6" stroke="#7a5520" strokeWidth="1.5"/>
      <path d="M16 4 L20 4 L20 10 L17 11 Z" fill={fill}/>
    </svg>
  );
}

export function ToolWater({ size = 24, fill = "#7ec0e0" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 18 Q3 13 5 11 L13 11 L15 9 L18 9 L18 11 L20 11 L20 17 Q19 19 16 19 Z" fill={fill} stroke="#3a4850" strokeWidth="0.6"/>
      <path d="M14 9 L20 6" stroke="#3a4850" strokeWidth="0.6"/>
      <circle cx="20" cy="6" r="1.5" fill={fill}/>
      <path d="M21 4 L20.5 3 M22 5 L22.5 4" stroke="#3a4850" strokeWidth="0.5"/>
    </svg>
  );
}

export function ToolRake({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="20" x2="18" y2="6" stroke="#7a5520" strokeWidth="1.5"/>
      <path d="M14 4 L20 4 M14 4 L14 7 M16 4 L16 7 M18 4 L18 7 M20 4 L20 7" stroke={fill} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

export function ToolFirebreak({ size = 24, fill = "#c96442" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22 Q4 17 6 11 Q8 8 9 11 Q9 6 12 2 Q14 5 14 8 Q18 6 18 13 Q19 18 12 22 Z" fill={fill} opacity="0.4"/>
      <line x1="4" y1="6" x2="20" y2="22" stroke="#3a2715" strokeWidth="2.5"/>
      <line x1="4" y1="6" x2="20" y2="22" stroke="#ffd248" strokeWidth="1"/>
    </svg>
  );
}

export function ToolAxe({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="20" x2="14" y2="10" stroke="#7a5520" strokeWidth="1.5"/>
      <path d="M14 6 Q17 7 18 11 L18 13 Q15 13 13 11 Z" fill={fill}/>
    </svg>
  );
}

export function ToolPick({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="20" x2="12" y2="12" stroke="#7a5520" strokeWidth="1.5"/>
      <path d="M5 4 Q15 5 20 10 L18 12 Q14 8 6 6 Z" fill={fill}/>
    </svg>
  );
}

export function ToolFleestone({ size = 24, fill = "#9a948a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 L20 8 L21 16 L14 22 L6 19 L3 11 Z" fill={fill} stroke="#3a3530" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M10 9 L14 11 L12 15 Z" fill="#ffd248" opacity="0.6"/>
      <circle cx="9" cy="12" r="1" fill="#ffd248"/>
    </svg>
  );
}

export function ToolNet({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6 L21 6 L18 21 L6 21 Z" fill="none" stroke={fill} strokeWidth="1.4"/>
      <path d="M3 6 L18 21 M21 6 L6 21 M7 12 L17 12 M5 18 L19 18 M9 9 L9 21 M15 9 L15 21" stroke={fill} strokeWidth="0.7"/>
    </svg>
  );
}
