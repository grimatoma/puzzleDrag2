import { TileFire, TileIce } from "./tiles.jsx";

export function HzRats({ size = 24, fill = "#3a3530" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="11" cy="14" rx="7" ry="4" fill={fill}/>
      <circle cx="17" cy="13" r="2.5" fill={fill}/>
      <path d="M14 10 L15 8 M19 11 L20 9" stroke={fill} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="18" cy="12.5" r="0.6" fill="#ffd248"/>
      <path d="M4 14 Q1 14 1 17 Q1 20 4 18" stroke={fill} strokeWidth="0.8" fill="none"/>
    </svg>
  );
}

export function HzFire({ size = 24, fill = "#e07040" }) {
  return <TileFire size={size} fill={fill}/>;
}

export function HzFrost({ size = 24, fill = "#a8d8e8" }) {
  return <TileIce size={size} fill={fill}/>;
}

export function HzBlight({ size = 24, fill = "#7a4a6a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22 Q10 17 6 16 Q3 14 6 11 Q5 7 9 7 Q11 4 12 7 Q14 4 16 7 Q19 6 19 11 Q22 13 18 16 Q15 17 12 22 Z" fill={fill}/>
      <circle cx="9" cy="11" r="1" fill="#1a0a14"/>
      <circle cx="14" cy="11" r="1" fill="#1a0a14"/>
      <circle cx="11" cy="14" r="0.8" fill="#1a0a14"/>
    </svg>
  );
}

export function HzStorm({ size = 24, fill = "#5a6878" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 11 Q3 11 3 8 Q3 5 6 5 Q7 3 10 4 Q14 3 16 6 Q20 6 20 10 Q21 13 17 13 L7 13 Q5 13 6 11 Z" fill={fill}/>
      <path d="M9 13 L7 17 L9 17 L7 22 M14 13 L12 17 L14 17 L12 22" stroke="#ffd248" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function HzKeeper({ size = 24, fill = "#5e4b3a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 22 L4 14 Q4 8 8 6 Q11 4 12 4 Q13 4 16 6 Q20 8 20 14 L20 22 Z" fill={fill}/>
      <circle cx="9" cy="12" r="1.4" fill="#ffd248"/>
      <circle cx="15" cy="12" r="1.4" fill="#ffd248"/>
      <path d="M6 10 L4 6 L8 8 M18 10 L20 6 L16 8" fill="none" stroke={fill} strokeWidth="1.2"/>
    </svg>
  );
}
