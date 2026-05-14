/**
 * <Pill> — the codebase's atomic display element. Replaces the at-least-eight
 * scattered "rounded-full + iron border + parchment fill + iron text" recipes
 * called out in UX Audit Vol II §04 #01.
 *
 * The story system's StoryPill (which had the better, tone-based vocabulary)
 * was promoted to be the canonical implementation — its tones (iron, gold,
 * ember, moss, indigo, rose, slate) now apply game-wide.
 *
 * Tones map to the design tokens in src/tokens.css.
 * Sizes: xs ≈ 18h, sm ≈ 24h, md ≈ 32h (tap-friendly when interactive).
 * Variants:
 *   - solid:   filled — for status (sandbox banner, ARMED, ready-order tag)
 *   - outline: parchment fill + iron border — the classic HUD chip
 *   - soft:    translucent tone — the original StoryPill look
 */

const TONES = {
  iron:   { solid: { bg: "var(--iron)",   fg: "#fff",                   bd: "var(--iron)" },
            outline: { bg: "var(--paper)", fg: "var(--ink-warm)",       bd: "var(--iron)" },
            soft:    { bg: "rgba(178,139,98,0.16)", fg: "#dac6a2",      bd: "rgba(178,139,98,0.5)" } },
  gold:   { solid: { bg: "var(--gold)",   fg: "var(--ink-strong)",     bd: "var(--gold)" },
            outline: { bg: "#fff7df",     fg: "#3a2a0e",                bd: "var(--gold)" },
            soft:    { bg: "rgba(226,178,74,0.18)", fg: "var(--gold-soft)", bd: "rgba(226,178,74,0.5)" } },
  ember:  { solid: { bg: "var(--ember)",  fg: "#fff",                   bd: "var(--ember-deep)" },
            outline: { bg: "#fbe2d3",     fg: "var(--ember-deep)",     bd: "var(--ember)" },
            soft:    { bg: "rgba(214,97,42,0.16)", fg: "var(--ember-soft)", bd: "rgba(214,97,42,0.45)" } },
  moss:   { solid: { bg: "var(--moss)",   fg: "#fff",                   bd: "var(--moss-deep)" },
            outline: { bg: "#eaf6c8",     fg: "var(--moss-deep)",      bd: "var(--moss)" },
            soft:    { bg: "rgba(120,170,90,0.18)", fg: "#aacf83",     bd: "rgba(120,170,90,0.45)" } },
  indigo: { solid: { bg: "var(--indigo)", fg: "#fff",                   bd: "var(--indigo)" },
            outline: { bg: "#dde0ec",     fg: "var(--indigo)",         bd: "var(--indigo)" },
            soft:    { bg: "rgba(56,64,107,0.18)", fg: "#bcc6d8",      bd: "rgba(56,64,107,0.4)" } },
  rose:   { solid: { bg: "var(--rose)",   fg: "#fff",                   bd: "var(--rose)" },
            outline: { bg: "#f7dde2",     fg: "var(--rose)",           bd: "var(--rose)" },
            soft:    { bg: "rgba(156,58,74,0.18)", fg: "#d8a8b0",      bd: "rgba(156,58,74,0.45)" } },
  slate:  { solid: { bg: "#6e7a96",       fg: "#fff",                   bd: "#5a6580" },
            outline: { bg: "#e3e7f0",     fg: "#4a546d",               bd: "#9aa3b8" },
            soft:    { bg: "rgba(150,165,190,0.14)", fg: "var(--slate)", bd: "rgba(150,165,190,0.4)" } },
};

const SIZE = {
  xs: { padX: 7,  padY: 1,  font: 10, gap: 4, borderW: 1 },
  sm: { padX: 10, padY: 3,  font: 12, gap: 5, borderW: 1.5 },
  md: { padX: 14, padY: 6,  font: 13, gap: 6, borderW: 2 },
};

export default function Pill({
  tone = "iron",
  variant = "outline",
  size = "sm",
  leading = null,
  trailing = null,
  className = "",
  title,
  children,
  // When true, the pill renders as a <button>. Use for tappable status pills
  // (e.g. coin pill opens currency breakdown — Vol II §02).
  interactive = false,
  onClick,
}) {
  const t = TONES[tone] || TONES.iron;
  const v = t[variant] || t.outline;
  const s = SIZE[size] || SIZE.sm;
  const Tag = interactive ? "button" : "span";
  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: s.gap,
    padding: `${s.padY}px ${s.padX}px`,
    borderRadius: 999,
    border: `${s.borderW}px solid ${v.bd}`,
    background: v.bg,
    color: v.fg,
    fontWeight: 600,
    fontSize: s.font,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    fontVariantNumeric: "tabular-nums",
  };
  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      style={baseStyle}
      className={className}
      title={title}
    >
      {leading}
      {children}
      {trailing}
    </Tag>
  );
}
