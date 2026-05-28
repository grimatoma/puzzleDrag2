import { useId } from "react";
import type { IconProps } from "./types.js";

// Illustrative, self-colored tile icons. Each carries its own gradient +
// outline + highlight palette to sit alongside the canvas ICON_REGISTRY art.
// Gradient ids are namespaced with useId() so they never collide when many
// icons render on the same page.

export function TileGrass({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a6dd57"/><stop offset="1" stopColor="#5c8e26"/></linearGradient></defs>
      <ellipse cx="12" cy="21.3" rx="6.6" ry="1.4" fill="#000" opacity="0.14"/>
      <path d="M5 21 Q12 18.8 19 21 Q12 22.4 5 21 Z" fill="#6b4a26"/>
      <path d="M8 21.2 Q5.9 15 6.2 8.4 Q9.6 14 9.6 21.2 Z" fill={`url(#${u}g)`} stroke="#3e6018" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M16 21.2 Q18.1 15 17.8 8.4 Q14.4 14 14.4 21.2 Z" fill={`url(#${u}g)`} stroke="#3e6018" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M12 21.2 Q10.5 13 12.4 4.6 Q15.1 12.4 13.4 21.2 Z" fill={`url(#${u}g)`} stroke="#3e6018" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M12.2 19 Q11.3 12.5 12.4 6" stroke="#cdeb8a" strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round"/>
    </svg>
  );
}

export function TileHay({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f0d066"/><stop offset="1" stopColor="#a87e2a"/></linearGradient></defs>
      <ellipse cx="12" cy="20.6" rx="9" ry="1.5" fill="#000" opacity="0.15"/>
      <ellipse cx="12" cy="13.4" rx="9.2" ry="7.2" fill={`url(#${u}g)`} stroke="#7a5520" strokeWidth="0.9"/>
      <path d="M3.4 11 Q12 8 20.6 11" stroke="#8a6420" strokeWidth="0.7" fill="none" opacity="0.55"/>
      <path d="M2.9 13.8 Q12 11.2 21.1 13.8" stroke="#8a6420" strokeWidth="0.7" fill="none" opacity="0.55"/>
      <path d="M3.6 16.8 Q12 19.4 20.4 16.8" stroke="#8a6420" strokeWidth="0.7" fill="none" opacity="0.5"/>
      <path d="M8.4 6.6 L8.4 20.2" stroke="#6e4a18" strokeWidth="0.7" opacity="0.45"/>
      <path d="M15.6 6.6 L15.6 20.2" stroke="#6e4a18" strokeWidth="0.7" opacity="0.45"/>
      <ellipse cx="8.4" cy="10.4" rx="3" ry="2" fill="#fff" opacity="0.22"/>
      <path d="M4 12.6 L2.4 12.2 M20 12.6 L21.6 12.2 M5 16 L3.5 16.9" stroke="#e6c860" strokeWidth="0.6" strokeLinecap="round"/>
    </svg>
  );
}

export function TileWheat({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe188"/><stop offset="1" stopColor="#cc8f24"/></linearGradient></defs>
      <ellipse cx="12" cy="22" rx="6" ry="1.4" fill="#000" opacity="0.14"/>
      <path d="M12 22.5 L12 9.5" stroke="#8a5e22" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M12 16.4 Q7.2 15.6 5.6 11.4 Q9.4 12.2 12 14.8 Z" fill="#a8832c" stroke="#6e4a16" strokeWidth="0.6" strokeLinejoin="round"/>
      <path d="M12 16.4 Q16.8 15.6 18.4 11.4 Q14.6 12.2 12 14.8 Z" fill="#a8832c" stroke="#6e4a16" strokeWidth="0.6" strokeLinejoin="round"/>
      <g stroke="#8a5e22" strokeWidth="0.5">
        <g transform="translate(12 6.4)"><ellipse rx="1.7" ry="2.5" fill={`url(#${u}g)`}/></g>
        <g transform="translate(9.5 8.9) rotate(-26)"><ellipse rx="1.7" ry="2.5" fill={`url(#${u}g)`}/></g>
        <g transform="translate(14.5 8.9) rotate(26)"><ellipse rx="1.7" ry="2.5" fill={`url(#${u}g)`}/></g>
        <g transform="translate(9.1 11.6) rotate(-26)"><ellipse rx="1.7" ry="2.5" fill={`url(#${u}g)`}/></g>
        <g transform="translate(14.9 11.6) rotate(26)"><ellipse rx="1.7" ry="2.5" fill={`url(#${u}g)`}/></g>
        <g transform="translate(9.6 14.2) rotate(-26)"><ellipse rx="1.6" ry="2.3" fill={`url(#${u}g)`}/></g>
        <g transform="translate(14.4 14.2) rotate(26)"><ellipse rx="1.6" ry="2.3" fill={`url(#${u}g)`}/></g>
      </g>
      <path d="M12 5.6 L12 3.4 M10.8 5.8 L9.7 3.9 M13.2 5.8 L14.3 3.9" stroke="#caa53a" strokeWidth="0.7" strokeLinecap="round"/>
    </svg>
  );
}

export function TileDirt({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a724a"/><stop offset="1" stopColor="#5a3e24"/></linearGradient></defs>
      <ellipse cx="12" cy="21.4" rx="8.6" ry="1.5" fill="#000" opacity="0.16"/>
      <path d="M3.6 19.6 Q3 11.6 12 10.8 Q21 11.6 20.4 19.6 Q20.4 21.6 18.4 21.6 L5.6 21.6 Q3.6 21.6 3.6 19.6 Z" fill={`url(#${u}g)`} stroke="#342414" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M5.5 13 Q12 11.6 18.5 13" stroke="#caa176" strokeWidth="0.8" fill="none" opacity="0.5" strokeLinecap="round"/>
      <ellipse cx="8" cy="16" rx="1.5" ry="1.1" fill="#3a2818"/>
      <ellipse cx="15.5" cy="17.5" rx="1.2" ry="0.9" fill="#3a2818"/>
      <ellipse cx="12.5" cy="14.6" rx="0.9" ry="0.7" fill="#3a2818"/>
      <circle cx="11" cy="18.4" r="0.9" fill="#b78a5e"/>
      <circle cx="17" cy="14.6" r="0.7" fill="#b78a5e"/>
    </svg>
  );
}

export function TileStone({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c6c0b6"/><stop offset="1" stopColor="#7e7870"/></linearGradient></defs>
      <ellipse cx="12" cy="21" rx="8" ry="1.5" fill="#000" opacity="0.17"/>
      <path d="M4.5 19.5 Q3 12 8 8.2 Q14 5 19 9 Q22 14 18.5 19 Q12 22 4.5 19.5 Z" fill={`url(#${u}g)`} stroke="#43403a" strokeWidth="0.9" strokeLinejoin="round"/>
      <path d="M8 8.2 Q14 5 19 9 L13 11.6 Z" fill="#d6d1c8" opacity="0.8"/>
      <path d="M19 9 Q22 14 18.5 19 L13 11.6 Z" fill="#7d766d" opacity="0.55"/>
      <path d="M13 11.6 L9 18.5 M13 11.6 L17.5 17" stroke="#4a463f" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  );
}

export function TileOre({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a5a4a"/><stop offset="1" stopColor="#352a20"/></linearGradient>
        <linearGradient id={`${u}v`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4b176"/><stop offset="1" stopColor="#b5632e"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="21.2" rx="8" ry="1.5" fill="#000" opacity="0.18"/>
      <path d="M4.5 14.5 Q5 6 11 5 Q18 4.5 20 11 Q21 18 15 20.5 Q6 22 4.5 14.5 Z" fill={`url(#${u}r)`} stroke="#170f08" strokeWidth="0.9" strokeLinejoin="round"/>
      <path d="M9.4 7.2 L12 12 L8.6 15.5 Z" fill={`url(#${u}v)`} stroke="#f7d2a4" strokeWidth="0.4"/>
      <path d="M14.5 9.5 L17.5 11.5 L15.2 14.5 Z" fill={`url(#${u}v)`} stroke="#f7d2a4" strokeWidth="0.4"/>
      <path d="M11.5 16.5 L14.5 18 L12.5 20 Z" fill={`url(#${u}v)`}/>
      <path d="M16 6.5 l0.6 1.2 1.2 0.6 -1.2 0.6 -0.6 1.2 -0.6 -1.2 -1.2 -0.6 1.2 -0.6 Z" fill="#fff6e2"/>
    </svg>
  );
}

export function TileFish({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#86c8e2"/><stop offset="1" stopColor="#3a7fa0"/></linearGradient></defs>
      <ellipse cx="12" cy="20.5" rx="8" ry="1.4" fill="#000" opacity="0.13"/>
      <path d="M18.5 12 L23 8 L23 16 Z" fill="#3f86a6" stroke="#245a72" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M3 12 Q6 5.6 13.5 7.4 Q19 8.6 20 12 Q19 15.4 13.5 16.6 Q6 18.4 3 12 Z" fill={`url(#${u}g)`} stroke="#245a72" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M3 12 Q6 16.8 12.5 16.6 Q9 14 8.5 12 Z" fill="#bfe4f2" opacity="0.55"/>
      <path d="M11 7 Q13 5 14.5 7.6" fill="#5ba3c4" stroke="#245a72" strokeWidth="0.5"/>
      <circle cx="16.4" cy="10.8" r="1.5" fill="#fff"/>
      <circle cx="16.7" cy="10.9" r="0.8" fill="#16323e"/>
      <path d="M9 9.5 Q10.4 12 9 14.5" stroke="#235468" strokeWidth="0.6" fill="none"/>
    </svg>
  );
}

export function TileHorse({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a8804f"/><stop offset="1" stopColor="#664628"/></linearGradient></defs>
      <ellipse cx="12" cy="21.6" rx="6.5" ry="1.3" fill="#000" opacity="0.15"/>
      <path d="M11.2 5.6 Q15.4 6.2 16.8 9.4 Q17.8 12.4 16.9 15.6 L14.8 15 Q15.6 11.6 14 9.4 Q12.6 7.4 10.4 7.6 Z" fill="#3f2d18"/>
      <path d="M8 21.5 L8.4 13 Q8.6 10.1 11.2 9.3 L11.9 6.2 Q12.1 5.2 12.9 5.7 L13.7 7.1 Q14 5.9 14.8 6.1 Q15.5 6.4 15.2 7.6 Q18.1 8.5 18.5 12.4 L19.5 13.7 Q20.1 14.5 19.1 14.9 L17.1 15.3 Q16.4 16.3 15.4 15.6 L14.6 14.1 Q12.7 13.7 12.5 16 L12.3 21.5 Z" fill={`url(#${u}g)`} stroke="#352312" strokeWidth="0.8" strokeLinejoin="round"/>
      <circle cx="13.5" cy="9.7" r="0.75" fill="#1a1208"/>
      <circle cx="13.7" cy="9.5" r="0.22" fill="#fff"/>
      <ellipse cx="18.1" cy="13.3" rx="0.6" ry="0.45" fill="#2a1c10"/>
      <path d="M10.6 12 Q10.2 15 10.7 18" stroke="#cBa178" strokeWidth="0.6" fill="none" opacity="0.4"/>
    </svg>
  );
}

export function TileRune({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id={`${u}h`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ead4ff" stopOpacity="0.85"/><stop offset="100%" stopColor="#ead4ff" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c79bf0"/><stop offset="1" stopColor="#7a4ba8"/></linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${u}h)`}/>
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill={`url(#${u}g)`} stroke="#5e3a8a" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M12 6 L13 11 L18 12 L13 13 L12 18 L11 13 L6 12 L11 11 Z" fill="#f0e2ff" opacity="0.6"/>
      <circle cx="12" cy="12" r="1.7" fill="#fff" opacity="0.9"/>
      <circle cx="5" cy="6" r="0.7" fill="#fff" opacity="0.8"/>
      <circle cx="19.5" cy="17.5" r="0.6" fill="#fff" opacity="0.7"/>
      <circle cx="19" cy="5.5" r="0.5" fill="#fff" opacity="0.6"/>
    </svg>
  );
}

export function TileFire({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}g`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#d23a16"/><stop offset="0.5" stopColor="#ff7a2e"/><stop offset="1" stopColor="#ffc23a"/></linearGradient>
        <radialGradient id={`${u}h`} cx="50%" cy="70%" r="60%"><stop offset="0" stopColor="#ffb13a" stopOpacity="0.5"/><stop offset="100%" stopColor="#ffb13a" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="12" cy="21.5" rx="6" ry="1.3" fill="#000" opacity="0.12"/>
      <circle cx="12" cy="14" r="10" fill={`url(#${u}h)`}/>
      <path d="M12 22 Q4 17 6 11 Q8 8 9 11 Q9 6 12 2 Q14 5 14 8 Q18 6 18 13 Q19 18 12 22 Z" fill={`url(#${u}g)`} stroke="#b5301a" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M12 20.5 Q8 17 9.4 12.6 Q10.6 10 11.6 12.2 Q12.6 14.4 13.6 12.4 Q14.8 16 12 20.5 Z" fill="#ffe06a"/>
      <path d="M12 19.4 Q10 17.4 10.8 14.4 Q11.6 13 12 14.6 Q12.6 16.6 12 19.4 Z" fill="#fff4c4"/>
    </svg>
  );
}

export function TileIce({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eaf8ff"/><stop offset="1" stopColor="#6fb6d6"/></linearGradient>
        <radialGradient id={`${u}h`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#dff4ff" stopOpacity="0.7"/><stop offset="100%" stopColor="#dff4ff" stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${u}h)`}/>
      <g stroke={`url(#${u}g)`} strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5 L12 21.5"/>
        <path d="M3.8 7.2 L20.2 16.8"/>
        <path d="M20.2 7.2 L3.8 16.8"/>
      </g>
      <g stroke="#bfe6f4" strokeWidth="1.3" strokeLinecap="round">
        <path d="M12 5 L10 7 M12 5 L14 7 M12 19 L10 17 M12 19 L14 17"/>
        <path d="M5.6 8.3 L5.4 11 M5.6 8.3 L8.3 8.4 M18.4 15.7 L18.6 13 M18.4 15.7 L15.7 15.6"/>
        <path d="M18.4 8.3 L18.6 11 M18.4 8.3 L15.7 8.4 M5.6 15.7 L5.4 13 M5.6 15.7 L8.3 15.6"/>
      </g>
      <circle cx="12" cy="12" r="2.4" fill={`url(#${u}g)`} stroke="#4a93b4" strokeWidth="0.5"/>
      <circle cx="11.2" cy="11.2" r="0.8" fill="#fff" opacity="0.8"/>
    </svg>
  );
}

export function TilePearl({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><radialGradient id={`${u}g`} cx="40%" cy="34%" r="72%">
        <stop offset="0" stopColor="#ffffff"/><stop offset="55%" stopColor="#f0e6d6"/><stop offset="100%" stopColor="#c4b298"/></radialGradient></defs>
      <ellipse cx="12" cy="20.6" rx="6.5" ry="1.4" fill="#000" opacity="0.14"/>
      <circle cx="12" cy="12" r="8.2" fill={`url(#${u}g)`} stroke="#b09c7e" strokeWidth="0.6"/>
      <path d="M5.4 15.5 Q12 19.5 18.6 15.5" stroke="#f6c9d6" strokeWidth="1" fill="none" opacity="0.4"/>
      <ellipse cx="9.2" cy="9" rx="3.2" ry="2.4" fill="#fff" opacity="0.7" transform="rotate(-30 9.2 9)"/>
      <circle cx="14.5" cy="15" r="0.9" fill="#fff" opacity="0.55"/>
    </svg>
  );
}
