import { useId } from "react";
import type { IconProps } from "./types.js";

// Illustrative NPC portraits. Self-colored (the `fill` prop is ignored).
// Shared recipe: shoulders, layered hair, a soft-shaded face,
// brows/eyes-with-catchlight/mouth, then a per-character signature trait.
// No circular backdrop — figures render on a transparent field.

export function NpcMira({ size = 48 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}hair`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#824f29"/><stop offset="1" stopColor="#4c2c13"/></linearGradient>
        <radialGradient id={`${u}skin`} cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#fce2c0"/><stop offset="1" stopColor="#ecbf8d"/></radialGradient>
      </defs>
      <path d="M9 47 Q11 33 24 33 Q37 33 39 47 Z" fill="#b3673a"/>
      <path d="M16 35 Q24 32 32 35 L31 39 Q24 36.5 17 39 Z" fill="#cf8a52" opacity="0.7"/>
      <path d="M10.5 27 Q7 12 24 9 Q41 12 37.5 27 Q39.5 30.5 36.5 33.5 Q34 22 24 21 Q14 22 11.5 33.5 Q8.5 30.5 10.5 27 Z" fill={`url(#${u}hair)`}/>
      <ellipse cx="24" cy="25" rx="10.8" ry="12.6" fill={`url(#${u}skin)`}/>
      <ellipse cx="18.4" cy="28" rx="2.1" ry="1.3" fill="#e8896a" opacity="0.32"/>
      <ellipse cx="29.6" cy="28" rx="2.1" ry="1.3" fill="#e8896a" opacity="0.32"/>
      <path d="M17.5 21.6 Q19.6 20.4 21.4 21.4 M26.6 21.4 Q28.4 20.4 30.5 21.6" stroke="#6e4326" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="24.4" r="1.5" fill="#3a2a1e"/><circle cx="20.5" cy="23.9" r="0.5" fill="#fff"/>
      <circle cx="28" cy="24.4" r="1.5" fill="#3a2a1e"/><circle cx="28.5" cy="23.9" r="0.5" fill="#fff"/>
      <path d="M20.5 30 Q24 32.6 27.5 30" stroke="#b3673a" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M12.5 20.5 Q16 13.5 24 13.5 Q32 13.5 35.5 20.5 Q30 16.8 24 16.8 Q18 16.8 12.5 20.5 Z" fill={`url(#${u}hair)`}/>
      <path d="M15.5 14.8 Q20 12.4 25.5 13" stroke="#a8703c" strokeWidth="1.1" fill="none" opacity="0.5" strokeLinecap="round"/>
    </svg>
  );
}

export function NpcBram({ size = 48 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}hair`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2e22"/><stop offset="1" stopColor="#191108"/></linearGradient>
        <radialGradient id={`${u}skin`} cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#dca878"/><stop offset="1" stopColor="#b07e4e"/></radialGradient>
      </defs>
      <path d="M8 47 Q10 32 24 32 Q38 32 40 47 Z" fill="#5a4030"/>
      <path d="M9 26 Q6 10 24 8.5 Q42 10 39 26 Q40 22 36 20 Q31 17 24 17 Q17 17 12 20 Q8 22 9 26 Z" fill={`url(#${u}hair)`}/>
      <ellipse cx="24" cy="24" rx="11" ry="12.6" fill={`url(#${u}skin)`}/>
      <path d="M13 25 Q14 41 24 41 Q34 41 35 25 Q31 31 24 31 Q17 31 13 25 Z" fill={`url(#${u}hair)`}/>
      <path d="M18 31.5 Q24 33 30 31.5" stroke="#1a120a" strokeWidth="0.8" fill="none" opacity="0.5"/>
      <path d="M14 21 Q17.5 18.8 21 20.6 M27 20.6 Q30.5 18.8 34 21" stroke="#241910" strokeWidth="2.1" fill="none" strokeLinecap="round"/>
      <circle cx="19.5" cy="24" r="1.5" fill="#241910"/><circle cx="20" cy="23.5" r="0.5" fill="#fff"/>
      <circle cx="28.5" cy="24" r="1.5" fill="#241910"/><circle cx="29" cy="23.5" r="0.5" fill="#fff"/>
      <path d="M24 25 L23 28.5 L25 28.5 Z" fill="#9a6a42" opacity="0.5"/>
      <path d="M18 30.4 Q24 28.4 30 30.4 Q24 30 18 30.4 Z" fill="#241910"/>
      <path d="M20.5 30 Q24 31.4 27.5 30" stroke="#7a4a30" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <circle cx="30.5" cy="28.5" r="0.9" fill="#3a2418" opacity="0.5"/>
    </svg>
  );
}

export function NpcLiss({ size = 48 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}hair`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3626"/><stop offset="1" stopColor="#271a10"/></linearGradient>
        <radialGradient id={`${u}skin`} cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#ecceA4"/><stop offset="1" stopColor="#d2ac80"/></radialGradient>
      </defs>
      <path d="M10 47 Q12 34 24 34 Q36 34 38 47 Z" fill="#4a5a7a"/>
      <path d="M16 36 Q24 33.5 32 36 L31 40 Q24 37.5 17 40 Z" fill="#6a7a98" opacity="0.7"/>
      <circle cx="24" cy="9.5" r="3.4" fill={`url(#${u}hair)`}/>
      <path d="M11 27 Q8 12 24 10 Q40 12 37 27 Q38 23 33 21 Q28 19.5 24 19.5 Q20 19.5 15 21 Q10 23 11 27 Z" fill={`url(#${u}hair)`}/>
      <ellipse cx="24" cy="24.5" rx="10.4" ry="12" fill={`url(#${u}skin)`}/>
      <path d="M13.5 21 Q17.5 13.5 24 13.5 Q30.5 13.5 34.5 21 Q29 17.5 24 18.6 Q19 17.8 13.5 21 Z" fill={`url(#${u}hair)`}/>
      <path d="M16 14.5 Q20 12.6 24.5 13.2" stroke="#6a4e34" strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round"/>
      <ellipse cx="18.6" cy="28" rx="1.9" ry="1.1" fill="#e08868" opacity="0.3"/>
      <ellipse cx="29.4" cy="28" rx="1.9" ry="1.1" fill="#e08868" opacity="0.3"/>
      <path d="M16.5 21 Q18.6 20 20.4 20.8 M27.6 20.8 Q29.4 20 31.5 21" stroke="#5a4230" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="24" r="1.4" fill="#2e2218"/><circle cx="20.5" cy="23.5" r="0.45" fill="#fff"/>
      <circle cx="28" cy="24" r="1.4" fill="#2e2218"/><circle cx="28.5" cy="23.5" r="0.45" fill="#fff"/>
      <g fill="none" stroke="#2b2218" strokeWidth="0.9">
        <circle cx="20" cy="24" r="3.1"/><circle cx="28" cy="24" r="3.1"/>
        <path d="M23.1 24 L24.9 24 M16.9 23.4 L15.4 22.8 M31.1 23.4 L32.6 22.8"/>
      </g>
      <path d="M21.5 29.5 Q24 31 26.5 29.5" stroke="#b3673a" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function NpcTomas({ size = 48 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}hair`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c4bcb2"/><stop offset="1" stopColor="#8c847a"/></linearGradient>
        <radialGradient id={`${u}skin`} cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#e8ca9c"/><stop offset="1" stopColor="#ccA878"/></radialGradient>
      </defs>
      <path d="M8 47 Q12 33 24 33 Q36 33 40 47 Z" fill="#6a7050"/>
      <path d="M15 38 Q24 35.5 33 38 L32 41 Q24 38.5 16 41 Z" fill="#838a64" opacity="0.7"/>
      <ellipse cx="24" cy="25" rx="11" ry="12.8" fill={`url(#${u}skin)`}/>
      <path d="M11.5 24 Q10.5 17 16 17.5 Q14 19.5 13.6 24 Z" fill={`url(#${u}hair)`}/>
      <path d="M36.5 24 Q37.5 17 32 17.5 Q34 19.5 34.4 24 Z" fill={`url(#${u}hair)`}/>
      <path d="M14 19.5 Q19 17 24 17.2" stroke="#caa176" strokeWidth="0.9" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M16.5 21.5 Q18.6 20.4 20.8 21.4 M27.2 21.4 Q29.4 20.4 31.5 21.5" stroke="#9c948a" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="24.6" r="1.4" fill="#3a2c20"/><circle cx="20.5" cy="24.1" r="0.45" fill="#fff"/>
      <circle cx="28" cy="24.6" r="1.4" fill="#3a2c20"/><circle cx="28.5" cy="24.1" r="0.45" fill="#fff"/>
      <path d="M17 18 Q20 16.8 23 17.2 M25 17.2 Q28 16.8 31 18" stroke="#b8a078" strokeWidth="0.5" fill="none" opacity="0.5"/>
      <ellipse cx="18" cy="28.5" rx="2" ry="1.2" fill="#e09068" opacity="0.3"/>
      <ellipse cx="30" cy="28.5" rx="2" ry="1.2" fill="#e09068" opacity="0.3"/>
      <path d="M18.5 30 Q24 29 29.5 30 Q24 31 18.5 30 Z" fill="#b0a89c"/>
      <path d="M20 31.8 Q24 33.6 28 31.8" stroke="#a06848" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function NpcWren({ size = 48 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}hood`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#42433a"/><stop offset="1" stopColor="#20211a"/></linearGradient>
        <radialGradient id={`${u}skin`} cx="50%" cy="42%" r="62%"><stop offset="0" stopColor="#dccbb6"/><stop offset="1" stopColor="#b8a387"/></radialGradient>
        <radialGradient id={`${u}eye`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff3b0"/><stop offset="0.45" stopColor="#ffd23a"/><stop offset="1" stopColor="#ffd23a" stopOpacity="0"/></radialGradient>
      </defs>
      <path d="M6 47 Q9 33 24 33 Q39 33 42 47 Z" fill={`url(#${u}hood)`}/>
      <path d="M24 6 Q12 7 9.5 20 Q8.5 26 12 28 Q12 19 16 16 Q12 21 13 27 L13 30 Q18 26 24 26 Q30 26 35 30 L35 27 Q36 21 32 16 Q36 19 36 28 Q39.5 26 38.5 20 Q36 7 24 6 Z" fill={`url(#${u}hood)`}/>
      <ellipse cx="24" cy="24.5" rx="9.6" ry="11.4" fill={`url(#${u}skin)`}/>
      <path d="M14.6 19.5 Q17 11 24 10.5 Q31 11 33.4 19.5 Q28 16 24 16.2 Q20 16 14.6 19.5 Z" fill="#1a140d"/>
      <path d="M16.5 22 Q18.6 21.2 20.4 22 M27.6 22 Q29.4 21.2 31.5 22" stroke="#1a140d" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="24.6" r="2.6" fill={`url(#${u}eye)`}/>
      <circle cx="28" cy="24.6" r="2.6" fill={`url(#${u}eye)`}/>
      <circle cx="20" cy="24.6" r="1" fill="#fff6cc"/>
      <circle cx="28" cy="24.6" r="1" fill="#fff6cc"/>
      <path d="M22.5 30 Q24 30.8 25.5 30" stroke="#7a604a" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M31 9 Q35 11 36.5 16 Q33.5 14.5 31.5 11 Z" fill="#8a6230" stroke="#5a3c18" strokeWidth="0.4" strokeLinejoin="round"/>
      <path d="M32 11 Q34 13 35 15.5" stroke="#c8a060" strokeWidth="0.4" fill="none"/>
    </svg>
  );
}
