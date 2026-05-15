const TONE_SOLID = {
  iron:   "bg-iron text-cream",
  gold:   "bg-gold text-ink",
  ember:  "bg-ember text-cream",
  moss:   "bg-moss text-ink",
  indigo: "bg-indigo text-cream",
  rose:   "bg-rose text-cream",
  slate:  "bg-slate text-cream",
};

const TONE_OUTLINE = {
  iron:   "bg-transparent text-iron border border-iron",
  gold:   "bg-transparent text-gold border border-gold",
  ember:  "bg-transparent text-ember border border-ember",
  moss:   "bg-transparent text-moss border border-moss",
  indigo: "bg-transparent text-indigo border border-indigo",
  rose:   "bg-transparent text-rose border border-rose",
  slate:  "bg-transparent text-slate border border-slate",
};

const TONE_SOFT = {
  iron:   "bg-iron-soft/30 text-ink",
  gold:   "bg-gold-soft/40 text-ink",
  ember:  "bg-ember-soft/30 text-ink",
  moss:   "bg-moss-soft/40 text-ink",
  indigo: "bg-indigo/20 text-indigo",
  rose:   "bg-rose/20 text-rose",
  slate:  "bg-slate/25 text-ink",
};

const SIZES = {
  xs: "h-[18px] px-1.5 text-micro gap-1",
  sm: "h-6 px-2 text-caption gap-1",
  md: "h-8 px-3 text-body gap-1.5",
};

const ANCHORS = {
  "top-right": "absolute -top-1 -right-1 pointer-events-none",
  "top-left":  "absolute -top-1 -left-1 pointer-events-none",
};

export default function Pill({
  tone = "iron",
  variant = "soft",
  size = "md",
  leading,
  trailing,
  anchor,
  interactive = false,
  className = "",
  children,
  ...rest
}) {
  const toneMap = variant === "solid" ? TONE_SOLID : variant === "outline" ? TONE_OUTLINE : TONE_SOFT;
  const toneCls = toneMap[tone] || toneMap.iron;
  const sizeCls = SIZES[size] || SIZES.md;
  const anchorCls = anchor ? ANCHORS[anchor] || "" : "";

  const classes = [
    "inline-flex items-center justify-center rounded-pill font-medium tabular-nums whitespace-nowrap",
    sizeCls,
    toneCls,
    anchorCls,
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {leading != null && <span className="inline-flex items-center shrink-0">{leading}</span>}
      {children != null && <span className="inline-flex items-center">{children}</span>}
      {trailing != null && <span className="inline-flex items-center shrink-0">{trailing}</span>}
    </>
  );

  if (interactive) {
    return (
      <button type="button" className={classes} {...rest}>
        {content}
      </button>
    );
  }

  return (
    <span className={classes} {...rest}>
      {content}
    </span>
  );
}
