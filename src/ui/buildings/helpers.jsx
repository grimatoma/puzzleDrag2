export function svgState(isBuilt) {
  return {
    f: isBuilt ? {} : { filter: "saturate(0.15) brightness(0.65)" },
    lit: isBuilt ? "#ffd86b" : "#5a5040",
    glow: isBuilt ? "#ff8040" : "#3a2020",
  };
}

export function Shadow({ cx = 50, rx = 40 }) {
  return <ellipse cx={cx} cy="97" rx={rx} ry="4" fill="rgba(0,0,0,.2)" />;
}
