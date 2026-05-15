import { TileRune } from "./tiles.jsx";

export function CoinCoin({ size = 24, fill = "#ffd248" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={fill} stroke="#7a5520" strokeWidth="0.8"/>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#7a5520" strokeWidth="0.6" opacity="0.6"/>
      <path d="M12 7 L12 17 M9 9 Q9 12 15 12 Q15 15 12 15" stroke="#7a5520" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function CoinEmber({ size = 24, fill = "#c96442" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13" r="8" fill={fill}/>
      <circle cx="12" cy="13" r="5" fill="#ffd248"/>
      <circle cx="11" cy="12" r="2" fill="#fff8e8"/>
      <path d="M9 4 L10 7 M14 5 L13 8 M16 7 L14 9" stroke={fill} strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
}

export function CoinIngot({ size = 24, fill = "#8a8780" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 14 L6 9 L18 9 L21 14 L18 19 L6 19 Z" fill={fill} stroke="#3a3530" strokeWidth="0.6" strokeLinejoin="round"/>
      <path d="M3 14 L21 14" stroke="#3a3530" strokeWidth="0.4" opacity="0.5"/>
      <path d="M8 11 L11 11" stroke="#fff" strokeWidth="0.6" opacity="0.5"/>
    </svg>
  );
}

export function CoinGem({ size = 24, fill = "#7ec0e0" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L20 9 L12 22 L4 9 Z" fill={fill} stroke="#3a4850" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M4 9 L20 9 M12 2 L8 9 L12 22 M12 2 L16 9" stroke="#3a4850" strokeWidth="0.5" opacity="0.6"/>
    </svg>
  );
}

export function CoinHeirloom({ size = 24, fill = "#c8a020" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L14 8 L20 8 L15 12 L17 18 L12 14 L7 18 L9 12 L4 8 L10 8 Z" fill={fill} stroke="#7a5520" strokeWidth="0.6" strokeLinejoin="round"/>
    </svg>
  );
}

export function CoinRune({ size = 24, fill = "#9a6ec8" }) {
  return <TileRune size={size} fill={fill}/>;
}
