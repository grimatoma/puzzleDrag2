# Design principles for HTML docs

Reference for `html-docs`. The goal: a doc that looks **intentional**, not auto-generated. Adapted from the Claude frontend-aesthetics cookbook (https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics) and the HTML-effectiveness gallery (https://github.com/anthropics/html-effectiveness).

## 1. Type with character

Default fonts read as "AI generated". Pick a deliberate trio and load it from a CDN so the file stays self-contained:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
```

- **Display / serif for headings** — Fraunces, Newsreader, Spectral, Playfair, Libre Caslon. Gives the page a voice.
- **Clean sans for body** — IBM Plex Sans, Source Sans, Public Sans, Work Sans. Not Inter/Roboto/Arial.
- **Real monospace for code** — JetBrains Mono, IBM Plex Mono, Space Mono.

**Pick by aesthetic** (from the cookbook's menus):

| Aesthetic | Try |
|---|---|
| Editorial | Playfair Display, Crimson Pro, **Fraunces**, Newsreader |
| Technical | **IBM Plex** family, Source Sans 3 |
| Code / terminal | **JetBrains Mono**, Fira Code |
| Startup | Clash Display, Satoshi, Cabinet Grotesk |
| Distinctive | Bricolage Grotesque, Obviously |

**Never default to** Inter, Roboto, Open Sans, Lato, Arial, or raw system fonts — and note **Space Grotesk**, which Claude reaches for reflexively. Pairing rule: **high contrast wins** — display + monospace, or serif + geometric sans.

**Bold hierarchy beats timid hierarchy.** Make the jumps obvious:

```css
h1 { font: 800 2.7rem/1.08 var(--serif); letter-spacing:-.015em; }
h2 { font: 800 1.85rem/1.15 var(--serif); }
h3 { font: 600 1.22rem/1.25 var(--serif); }
body { font: 400 16px/1.64 var(--sans); }
```

A 400-vs-600 / 16px-vs-18px difference is invisible. Use weight 300↔800 and 3×+ size jumps.

## 2. Cohesive palette via CSS variables

One dominant color, one or two sharp accents — not an even rainbow. **Avoid purple-gradient-on-white** (the generic look). Match the palette to the subject: warm/earthy for a farming game, cool slate for infra, deep ink + neon for a dark technical theme.

```css
:root{
  --ink:#23252b; --muted:#6b7280; --line:#e6e2da; --bg:#fbfaf7;
  --accent:#b45309;      /* dominant */
  --accent2:#0f766e;     /* secondary accent */
  --paper:#fffdf9;
  --shadow:0 1px 2px rgba(20,16,8,.06),0 6px 20px -10px rgba(20,16,8,.18);
  /* status ramp for chips/pills */
  --ok:#2f9e44; --warn:#e8590c; --info:#1971c2; --danger:#b5341f; --idle:#6b7280;
}
```

Derive everything from these variables so a retheme is a one-block edit. A **dark theme** is a legitimate, often better choice for technical docs — ship it when it suits.

## 3. Depth, not flat fills

A bare white sheet looks unfinished. Add atmosphere:

```css
body{
  background:
    radial-gradient(1200px 520px at 78% -8%, color-mix(in srgb,var(--accent) 9%,transparent), transparent 60%),
    radial-gradient(1000px 460px at -10% 4%, color-mix(in srgb,var(--accent2) 8%,transparent), transparent 55%),
    linear-gradient(180deg,var(--bg),#f5f1e8);
  background-attachment:fixed;
}
.card{ background:var(--paper); border:1px solid var(--line); border-radius:12px; box-shadow:var(--shadow); }
```

Layered gradients, soft shadows, rounded cards, a subtle border. Optionally a faint geometric/texture background.

## 4. Polish with restraint

A little motion makes the page feel alive; too much is noise.

```css
@keyframes fadeUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
header.hero, main>section{ animation:fadeUp .55s cubic-bezier(.21,.61,.35,1) both; }
main>section:nth-child(1){animation-delay:.05s} main>section:nth-child(2){animation-delay:.10s}
main>section:nth-child(n+3){animation-delay:.16s}
.card{ transition:transform .14s, box-shadow .14s; }
.card:hover{ transform:translateY(-2px); }
```

- Staggered page-load reveal via `animation-delay`. Tasteful hover on nav links and cards.
- **No** scatter-shot micro-animations, bouncing icons, or autoplaying anything.
- Keep all motion CSS-only.

## 5. Always handle the edge cases

These are requirements, not nice-to-haves:

```css
@media (max-width:820px){ .layout{grid-template-columns:1fr} nav.toc{position:static} }
@media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} html{scroll-behavior:auto} }
@media print{ nav.toc,.filterbar{display:none} *{box-shadow:none!important} a{color:inherit} body{background:#fff} }
```

- **Mobile:** collapse the sidebar TOC to a static row; single-column body.
- **Reduced motion:** kill animations and smooth-scroll.
- **Print:** hide nav/filters, drop shadows and backgrounds, let links show as plain text. Docs get printed and PDF'd.

## Reusable building blocks

- **Sticky TOC + scroll-spy** — `position:sticky` sidebar; a small `IntersectionObserver` adds `.active` to the current section's link.
- **Callout boxes** — left accent border, tinted background; variants for note / warning / tip via a modifier class.
- **Status chips / pills** — `border-radius:999px`, colored by the status ramp variables, with a legend.
- **Tables** — `border-collapse`, zebra `tbody tr:nth-child(even)`, sticky `th`, rounded container via `overflow:hidden`.
- **SVG diagrams** — inline `<svg>` with `currentColor`/CSS-variable fills so they retheme automatically. Flowcharts, timelines, architecture maps.
- **`<details>`** — collapsible appendices, raw data dumps, long enumerations.
- **Filters / tabs** — a dozen lines of vanilla JS toggling a class or `hidden` attribute to filter rows or switch panes; degrade gracefully (content visible if JS is off).

The `template.html` in this skill folder ships all of these wired up — start from it rather than from scratch.

## Avoid the "AI slop" look

The tells that make a page read as machine-generated — actively design against each:

- Overused fonts: Inter / Roboto / Open Sans / Lato / Arial / system fonts (and Space Grotesk).
- Clichéd color: a purple gradient on a white background.
- Predictable, cookie-cutter layouts and components with no context-specific character.
- Plain white background used as a default instead of building atmosphere.

Draw inspiration from **IDE themes and cultural aesthetics**, and **vary** between light and dark across docs rather than converging on one safe look.

## Self-prompt block (drop into generation context for a bespoke doc)

When generating a one-off doc with a strong visual identity, paste this constraint block (from the Anthropic frontend-aesthetics cookbook) into your working context to push away from generic output:

```
<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs — the "AI slop" aesthetic. Avoid it: make distinctive frontends that surprise and delight.
- Typography: beautiful, unique fonts. Avoid Arial/Inter; pick distinctive faces.
- Color & Theme: commit to a cohesive aesthetic via CSS variables. Dominant colors + sharp accents beat timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics.
- Motion: CSS-only for HTML. One well-orchestrated page-load with staggered reveals (animation-delay) beats scattered micro-interactions.
- Backgrounds: create atmosphere and depth, not solid fills — layer gradients, patterns, contextual effects.
Avoid: overused fonts (Inter/Roboto/Arial/system/Space Grotesk), purple-gradient-on-white, predictable layouts, cookie-cutter design. Make unexpected choices that feel genuinely designed for the context; vary light/dark and fonts across generations.
</frontend_aesthetics>
```
