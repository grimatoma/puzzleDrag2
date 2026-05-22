export function TileGrass({ size = 24, fill = "#7faf3a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 22 Q4 14 7 8 Q8 14 7 22 Z" fill={fill}/>
      <path d="M11 22 Q10 12 13 5 Q14 12 13 22 Z" fill={fill}/>
      <path d="M17 22 Q16 13 19 8 Q20 14 19 22 Z" fill={fill}/>
    </svg>
  );
}

export function TileHay({ size = 24, fill = "#d7b34a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="9" ry="7" fill={fill}/>
      <path d="M5 12 L19 12 M5 16 L19 16 M8 9 L8 19 M12 7 L12 21 M16 9 L16 19"
        stroke="#7a5520" strokeWidth="0.8" opacity="0.6"/>
    </svg>
  );
}

export function TileWheat({ size = 24, fill = "#f0c64a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22 L12 6" stroke="#7a5520" strokeWidth="1.5"/>
      <ellipse cx="9" cy="9" rx="2.5" ry="1.4" fill={fill} transform="rotate(-25 9 9)"/>
      <ellipse cx="15" cy="9" rx="2.5" ry="1.4" fill={fill} transform="rotate(25 15 9)"/>
      <ellipse cx="9" cy="13" rx="2.5" ry="1.4" fill={fill} transform="rotate(-25 9 13)"/>
      <ellipse cx="15" cy="13" rx="2.5" ry="1.4" fill={fill} transform="rotate(25 15 13)"/>
      <ellipse cx="12" cy="6" rx="2.5" ry="1.4" fill={fill}/>
    </svg>
  );
}

export function TileDirt({ size = 24, fill = "#7a5836" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2" fill={fill}/>
      <circle cx="7" cy="10" r="1" fill="#3a2715"/>
      <circle cx="13" cy="14" r="0.8" fill="#3a2715"/>
      <circle cx="18" cy="11" r="0.6" fill="#3a2715"/>
      <circle cx="9" cy="16" r="0.5" fill="#3a2715"/>
      <circle cx="16" cy="17" r="0.7" fill="#3a2715"/>
    </svg>
  );
}

export function TileStone({ size = 24, fill = "#9a948a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 L21 9 L21 17 L12 22 L3 17 L3 9 Z" fill={fill} stroke="#3a3530" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M12 3 L12 22 M3 9 L12 12 L21 9" stroke="#3a3530" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  );
}

export function TileOre({ size = 24, fill = "#c8825a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 14 L8 5 L16 4 L20 12 L17 21 L7 22 Z" fill="#5a4030" stroke="#1a1208" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M9 7 L11 13 L8 17 Z" fill={fill}/>
      <path d="M14 9 L17 11 L15 14 Z" fill={fill}/>
      <path d="M11 17 L14 19 L12 21 Z" fill={fill}/>
    </svg>
  );
}

export function TileFish({ size = 24, fill = "#5ea6c8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12 Q6 6 14 8 Q18 9 20 12 Q18 15 14 16 Q6 18 3 12 Z" fill={fill}/>
      <path d="M20 12 L23 9 L23 15 Z" fill={fill}/>
      <circle cx="16" cy="11" r="1" fill="#1a1208"/>
      <path d="M9 12 Q10 13 9 14" stroke="#1f4858" strokeWidth="0.6" fill="none"/>
    </svg>
  );
}

export function TileHorse({ size = 24, fill = "#8a6a40" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21 L5 14 Q4 10 7 8 L10 4 Q11 3 12 4 L14 7 L18 9 Q21 11 21 15 L21 21 L18 21 L18 15 L13 14 L13 21 L10 21 L10 16 L8 16 L8 21 Z" fill={fill}/>
      <circle cx="10" cy="7" r="0.7" fill="#1a1208"/>
      <path d="M8 5 L9 7" stroke="#5a4020" strokeWidth="0.8"/>
    </svg>
  );
}

export function TileRune({ size = 24, fill = "#9a6ec8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill={fill}/>
      <circle cx="12" cy="12" r="2" fill="#f5e9ff" opacity="0.8"/>
    </svg>
  );
}

export function TileFire({ size = 24, fill = "#e07040" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22 Q4 17 6 11 Q8 8 9 11 Q9 6 12 2 Q14 5 14 8 Q18 6 18 13 Q19 18 12 22 Z" fill={fill}/>
      <path d="M12 20 Q9 17 10 13 Q11 10 12 12 Q13 14 14 12 Q15 16 12 20 Z" fill="#ffd248"/>
    </svg>
  );
}

export function TileIce({ size = 24, fill = "#a8d8e8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M19 5 L5 19" stroke={fill} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2.5" fill={fill}/>
    </svg>
  );
}

export function TilePearl({ size = 24, fill = "#f0e8d8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill={fill}/>
      <circle cx="9" cy="9" r="3" fill="#fff" opacity="0.6"/>
      <circle cx="14" cy="15" r="1" fill="#d0c8b8" opacity="0.5"/>
    </svg>
  );
}
