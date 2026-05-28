// Allow CSS custom properties (e.g. `--sx`, `--px`) in inline `style` objects.
// The painted-SVG building kit drives its keyframe animations through custom
// properties, so React's CSSProperties must accept arbitrary `--*` keys.
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
