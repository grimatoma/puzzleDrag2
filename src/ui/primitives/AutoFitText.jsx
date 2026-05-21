import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Renders text on a single line and scales the font-size down to fit the
 * container width — so titles never collapse to "Weddi…". Falls back to the
 * minimum size if even that overflows (the detector will still warn in dev).
 *
 * Pair with a parent that has a real width (e.g. `min-w-0` inside a flex row).
 */
export default function AutoFitText({
  children,
  className = "",
  maxFontSize = 14,
  minFontSize = 9,
  as: Tag = "span",
  title,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return undefined;

    const fit = () => {
      el.style.fontSize = `${maxFontSize}px`;
      const fits = () => el.scrollWidth <= el.clientWidth + 0.5;
      if (fits()) {
        setFontSize(maxFontSize);
        return;
      }
      let lo = minFontSize;
      let hi = maxFontSize;
      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        el.style.fontSize = `${mid}px`;
        if (fits()) lo = mid;
        else hi = mid - 1;
      }
      setFontSize(lo);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [children, maxFontSize, minFontSize]);

  return (
    <Tag
      ref={ref}
      className={`block whitespace-nowrap overflow-hidden ${className}`}
      style={{ ...style, fontSize: `${fontSize}px` }}
      data-autofit="1"
      title={title}
      {...rest}
    >
      {children}
    </Tag>
  );
}
