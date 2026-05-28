import { useId } from "react";
import type { IconProps } from "./types.js";
import { TileRune } from "./tiles.js";

export function CoinCoin({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><radialGradient id={`${u}g`} cx="38%" cy="32%" r="78%">
        <stop offset="0" stopColor="#fff3c4"/><stop offset="0.46" stopColor="#f6cf52"/><stop offset="1" stopColor="#c1881b"/></radialGradient></defs>
      <ellipse cx="12" cy="21" rx="8" ry="1.8" fill="#000" opacity="0.16"/>
      <circle cx="12" cy="11.6" r="9.1" fill="#9c6f1a"/>
      <circle cx="12" cy="11.4" r="9" fill={`url(#${u}g)`} stroke="#7a5512" strokeWidth="0.8"/>
      <circle cx="12" cy="11.4" r="6.3" fill="none" stroke="#b8861d" strokeWidth="0.9" opacity="0.75"/>
      <path d="M12 7.4 L13.35 10.2 L16.4 10.6 L14.1 12.7 L14.75 15.8 L12 14.3 L9.25 15.8 L9.9 12.7 L7.6 10.6 L10.65 10.2 Z" fill="#b07d18" opacity="0.5"/>
      <path d="M6.6 8.6 Q8.8 6.1 12 6" stroke="#fff" strokeWidth="1.3" opacity="0.55" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function CoinEmber({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id={`${u}h`} cx="50%" cy="58%" r="58%"><stop offset="0" stopColor="#ffb13a" stopOpacity="0.55"/><stop offset="100%" stopColor="#ffb13a" stopOpacity="0"/></radialGradient>
        <radialGradient id={`${u}g`} cx="50%" cy="62%" r="60%"><stop offset="0" stopColor="#fff3c0"/><stop offset="0.5" stopColor="#ff8a2e"/><stop offset="1" stopColor="#b5371a"/></radialGradient>
      </defs>
      <circle cx="12" cy="13.5" r="10" fill={`url(#${u}h)`}/>
      <path d="M5 13.5 Q4 8 9.5 6.7 Q14.5 5.2 18 9 Q21.5 13 18 18 Q13 21.5 7 18.5 Q4 16.5 5 13.5 Z" fill="#3e2016" stroke="#180a04" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M8 13.5 Q7.5 9.8 11 9.2 Q15 8.6 16.5 12.2 Q17.6 15.6 13.6 17.6 Q9 18.6 8 13.5 Z" fill={`url(#${u}g)`}/>
      <path d="M11 9.6 L12.2 13.2 L10.6 16.2 M14 11.2 L13 13.6" stroke="#ffdd7a" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.85"/>
      <path d="M9 4.4 L9.6 6.4 M13 3.5 L12.7 5.7 M16 5 L15.2 6.8" stroke="#ffcf5a" strokeWidth="0.9" strokeLinecap="round"/>
    </svg>
  );
}

export function CoinIngot({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}t`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef2f5"/><stop offset="1" stopColor="#c2cace"/></linearGradient>
        <linearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#aab2b8"/><stop offset="1" stopColor="#6e767c"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="20.4" rx="9" ry="1.5" fill="#000" opacity="0.16"/>
      <path d="M6 9.6 L18 9.6 L20.6 12 L3.4 12 Z" fill={`url(#${u}t)`} stroke="#474d52" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M3.4 12 L20.6 12 L18.6 18.6 L5.4 18.6 Z" fill={`url(#${u}f)`} stroke="#474d52" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M7.6 10.7 L16 10.7" stroke="#ffffff" strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
      <path d="M5.8 13.1 L18.2 13.1" stroke="#d2d8dc" strokeWidth="0.7" opacity="0.5"/>
    </svg>
  );
}

export function CoinGem({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="21" rx="6" ry="1.3" fill="#000" opacity="0.14"/>
      <path d="M8 6 L16 6 L18.2 9 L5.8 9 Z" fill="#d6f0fa"/>
      <path d="M5.8 9 L8 6 L12 9 Z" fill="#9ad4ec"/>
      <path d="M18.2 9 L16 6 L12 9 Z" fill="#7ec0e0"/>
      <path d="M5.8 9 L12 9 L12 21 Z" fill="#57a6d0"/>
      <path d="M18.2 9 L12 9 L12 21 Z" fill="#3f8fbe"/>
      <path d="M8 6 L16 6 L18.2 9 L12 21 L5.8 9 Z" fill="none" stroke="#2f6a8a" strokeWidth="0.9" strokeLinejoin="round"/>
      <path d="M5.8 9 L18.2 9" stroke="#2f6a8a" strokeWidth="0.6" opacity="0.55"/>
      <path d="M9 7 l0.5 1 1 0.5 -1 0.5 -0.5 1 -0.5 -1 -1 -0.5 1 -0.5 Z" fill="#ffffff" opacity="0.85"/>
    </svg>
  );
}

export function CoinHeirloom({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4d24a"/><stop offset="1" stopColor="#b07e1a"/></linearGradient></defs>
      <ellipse cx="12" cy="21" rx="6" ry="1.3" fill="#000" opacity="0.14"/>
      <path d="M12 2.5 L14.2 8.4 L20.5 8.6 L15.4 12.4 L17.3 18.4 L12 14.7 L6.7 18.4 L8.6 12.4 L3.5 8.6 L9.8 8.4 Z" fill={`url(#${u}g)`} stroke="#7a5520" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M12 5.5 L13.3 9.2 L11 11.4 Z" fill="#fff3b0" opacity="0.6"/>
    </svg>
  );
}

export function CoinRune({ size = 24 }: IconProps) {
  return <TileRune size={size}/>;
}
