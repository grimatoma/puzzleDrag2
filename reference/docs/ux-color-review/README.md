# puzzleDrag2 — UX & Color Review

*Reviewer pass: 2026-06-30. Method: read the live code in `src/` (not `reference/` docs), ran the
app at `/`, `/b/`, captured screenshots across Town, Inventory, Map, the board-config modal, and the
Wiki, and measured WCAG contrast on the actual token values. The frontend-design plugin's principles
("spend your boldness in one place," signature element, contrast as structure) framed the critique.*

Screenshots referenced below live in `./shots/`.

---

## TL;DR

Your instinct is right, and it's specific. The game is **not** hard to read — primary ink on
parchment is a healthy **13.6:1**. The problem is that **every signal *other* than body text is too
soft to do its job**: borders, dividers, card edges, tertiary labels, the "current season" cue, and
most accent colors all sit at or below **1.7:1**, so the whole UI collapses into one flat parchment
plane. There is no contrast *ladder* and effectively only **two** live accent colors (ember orange,
gold). Several accent tokens are defined but **dead** (never used).

The fix is **not** to go dark or loud. Keep the warm-parchment identity — it's cohesive and
differentiates you from the sea of dark-mode idle games. The work is to rebuild three things:

1. A real **contrast ladder** (surfaces that actually differ + borders that read at ≥3:1).
2. A real **accent system** (saturated, legible, semantic — and *wire the dead tokens*).
3. **Season & world legibility** (the board's season and the town's overlays are under-signaled).

The **Wiki** is in better shape than the game — information-dense and semantically color-coded — but
it has drifted onto an older, darker skin and has an inverted heading hierarchy. It needs alignment,
not a rebuild.

---

## How I evaluated it

- Token source of truth: `src/tokens.css` (game) and `src/balanceManager/wiki/wikiTheme.css` (wiki,
  which copies `src/ui/primitives/palette.ts`).
- Contrast measured with the WCAG 2.x relative-luminance formula on the literal hex values.
- "Dead token" claims verified by grepping `src/` + `prototype.tsx` for consumers.

---

## 1. The core diagnosis: there is no contrast ladder

`src/tokens.css` was deliberately "lifted" out of an older dark-brown frame into an all-parchment
palette. The comments say so explicitly: *"was a dark brown frame; now a soft cream border,"* *"was
saturated season fills."* That lift went one shade too far. The surfaces and the things meant to
separate them now sit on top of each other:

| Role | Token | Value | On surface | Contrast | WCAG (UI ≥3:1, text ≥4.5:1) |
|---|---|---|---|---:|---|
| Panel/card **border**, divider | `--iron` / `--panel-border` / `--card-border` | `#c9b993` | `#f6efe0` | **1.69:1** | ❌ FAIL |
| **Tertiary text** (`--on-panel-faint`) — *same hex as the border* | `--on-panel-faint` | `#c9b993` | `#f6efe0` | **1.69:1** | ❌ invisible |
| **Gold** as text | `--gold` | `#e2b24a` | `#f6efe0` | 1.71:1 | ❌ (fine as fill, not text) |
| **Ember** accent | `--ember` | `#d6612a` | `#f6efe0` | 3.27:1 | ⚠️ large/UI only |
| **Moss** accent | `--moss` | `#6f8a3a` | `#f6efe0` | 3.41:1 | ⚠️ large/UI only |
| Section label | `--on-panel-label` | `#8a4a26` | `#f6efe0` | 5.94:1 | ✅ |
| Secondary text | `--ink-soft` | `#7a5e3f` | `#f6efe0` | 5.24:1 | ✅ |
| **Primary text** | `--ink` | `#2b2218` | `#f6efe0` | 13.64:1 | ✅ |

What this means in practice (see `shots/inventory.png`):

- **Cards have no edges.** Every inventory row, every panel, every well is bordered with `#c9b993`
  on a `#f6efe0`/`#fbf7eb` surface — a 1.7:1 edge. The list reads as one undifferentiated column;
  the borders are doing nothing.
- **"Tertiary" text is invisible.** `--on-panel-faint` is literally the border color
  (`tokens.css:200`). Anything using it is unreadable.
- **The three "surfaces" are nearly one surface.** Page `#f4ecd6`, panel `#fbf7eb`, card `#fbf7eb`,
  parchment `#f6efe0` — these differ by a few luminance points. There's no felt sense of "this sits
  on top of that."
- **The active state of the filter chips barely registers** (`shots/inventory.png`, the
  All/Resources/Tools/Items row): the selected chip is one shade off the others.

This is the whole "too soft" feeling, quantified. It is a **separation** problem, not a legibility
problem.

---

## 2. The accent system is two colors wide, and some of it is dead

`tokens.css` defines a respectable accent set — `--ember`, `--gold`, `--moss`, `--indigo`, `--rose`,
`--slate`, `--danger`, plus biome accents `--biome-farm/-mine/-fish`. In the running game:

- **Only `--ember` (orange) and the `--gold` family read as "alive."** Ember is the sole active
  signal — it's the nav active-bar, the level pill, primary buttons. Gold is coins. That's it.
- **`--moss`, `--indigo`, `--rose`, `--slate` are desaturated and low-energy** — when they appear
  they don't feel like a system, they feel like exceptions.
- **`--biome-farm`, `--biome-mine`, `--biome-fish` have ZERO consumers** anywhere in `src/` or
  `prototype.tsx` (verified by grep). The board's biome color is pulled from `season.look.fill`
  instead. So a whole intended "each domain has a color" system is defined and unused.
- **The only screens that feel colorful are the ones where the color comes from the *art*, not the
  UI**: the Phaser town map (`shots/town.png`), the resource icons in the inventory list, and the
  tile cards in the Start-Farming modal (`shots/start-farming.png`, where the green/red card outlines
  and green CTA are the most confident color use in the whole game). The chrome around the art is
  always the same brown-on-cream.

Net: the UI has no vocabulary for "this is a farm thing / a mine thing / a danger / a reward / an
arcane thing." Everything is the same temperature.

---

## 3. Season & world state are under-signaled

The current **season** is core game state, and it's whispered:

- **Field gradients are washed pastels** (`tokens.css:68–75`, used in `puzzleBoard.tsx`). Summer
  (`#ecdfb0→#c7b87a`) and winter (`#dde4ea→#b6c2cc`) are especially close — you can't tell the
  season at a glance from the board backdrop.
- **The HUD season-accent strip is ~33% alpha** (`Hud.tsx:157`, `${seasonAccent}55` over a 3px
  inset) — effectively invisible.
- Combined with the dead biome tokens, the two things a player should always feel — *what season is
  it, what kind of place is this* — are the weakest cues on screen.

The **town world-overlays** look unfinished (`shots/town.png`):

- The **"Upgrade to Hamlet · 0/8 Plank…" sign** is a translucent dark-olive box with low-contrast
  text. It reads like a debug overlay, not a designed wooden sign in the world.
- The **"Enter Farm Field" / "Build · 3/3 plots" pills** float as translucent washed shapes over a
  busy map — low contrast, and they don't share a visual language (one cream, one muted green).
  `Town.tsx` hand-rolls these with inline colors rather than primitives, and the **banners**
  (`FoundSettlementBanner`, `TierUpgradeBanner`) duplicate that inline styling in two *different*
  color systems.

---

## 4. Typography

- `--font-display` (Cinzel / IM Fell / Fraunces) is defined and applied to ~5 title classes — **but
  the webfonts are not bundled in the game** (only the Wiki self-hosts fonts via `@fontsource`). The
  comment in `tokens.css` admits it only renders "if the user agent / host page loaded them."
  So the game's "hand-set" titles fall back to Georgia/system serif — the intended character is lost.
- Most in-world text doesn't even reach for it: the Town location name is plain `font-bold`
  (`Town.tsx:618`); HUD labels are system sans.
- Secondary labels are all the same mid-brown (`--ink-soft` == `--ink-mid` == `#7a5e3f`), so there's
  no tonal hierarchy within "not-primary" text.

---

## 5. The Wiki (route `/b/`)

The Wiki is genuinely good and **should not be rebuilt** (`shots/wiki-overview.png`,
`shots/wiki-buildings.png`):

- Strong Fraunces display hero, ember title, category cards with **per-group colored borders**
  (systems=tan, board=green, economy=gold, world=violet, progression=gold), semantic chip-tags
  (green = Crafts, violet = Unlocks, gold = Bonus/Threshold), ember data-bars on the cost matrix,
  S/M/L density toggles, Developer/Player view, ⌘K search. This is the most confident visual design
  in the project.

But it has drifted and has a few real defects:

- **Palette drift from the game.** The Wiki seeds its own vars from `palette.ts` (copied, not
  `var()`-referenced), so it's stuck on the *older, darker* skin: border `#b28b62` (2.64:1) vs the
  game's `#c9b993`, darker parchment, etc. The two products look like different versions of the same
  app. *(Ironically the Wiki's borders, while still below 3:1, are more visible than the game's.)*
- **Inverted heading hierarchy in authored prose.** `HtmlBody.tsx` styles authored `<h1/h2/h3>`
  inline at **18/15/13px** — so an `h2` (15px) and `h3` (13px) are *smaller* than the surrounding
  ~16px body text. Narrative pages don't visually chunk. **Highest-impact wiki issue.**
- **Two disjoint heading & table systems** (big Fraunces on generated pages vs tiny inline headings
  on prose; CSS-themed tables vs inline-styled tier-ladder tables).
- **Off-palette hardcoded hex in authored content** — raw `#1d5bb0` blue (61×), `#1f7a36` green
  (57×), greys — none from the parchment palette and un-themable centrally. The blue reads as a
  foreign generic-link color.
- **Every sidebar nav row uses the same `ui_star` icon** — categories aren't scannable by icon.
- **No callout/note component and no `<pre>` code-block styling** — prose fakes emphasis with
  inline-colored spans.

---

## 6. Smaller friction (worth a cleanup pass)

- **~290 inline hex literals** in `features/*.tsx` bypass tokens (heaviest: `cartography` 60,
  `settings` 23, `StartFarmingModal` 17). `Town.tsx` hardcodes every banner/button/pill color.
  Disabled states use ad-hoc `#7a6a4a`/`#5a4a30` per screen instead of a token.
- **Two icon systems** imported side-by-side (`ui/Icon` LegacyIcon + `ui/primitives/Icon`
  DesignIcon) in the same files.
- **`townsfolk` re-renders its own BottomNav** (nav is normally shell-owned) — divergence risk.
- **Legacy "dark" bg tokens now resolve to light** (`--bg-darkest: #e9dfc6`) — names lie; a future
  consumer expecting a dark surface silently gets parchment.
- **Two redundant legends stacked** at the bottom of the Map screen (`shots/map.png`).
- **Text overflow**: tile-category labels truncate ("Vegeta…") in the Start-Farming modal.
- **Magic z-index numbers** (`z-[10000]`, `z-[9999]`) hand-managed in `Town.tsx`.

---

## Proposed direction (keep parchment, rebuild the ladder)

The frontend-design principle that applies: **structure is information, and contrast is the cheapest
structural tool.** We don't add decoration; we make the existing structure *read*. Spend the boldness
in two places — a punchy **accent/reward** moment and a legible **season** signal — and keep
everything else quiet but *separated*.

### A. A real surface + border ladder

Three planes that actually differ, and borders that hit ≥3:1.

| Token | Now | Proposed | Why |
|---|---|---|---|
| page bg | `#f4ecd6` | `#efe6cf` | drop the page a touch so panels lift |
| panel | `#fbf7eb` | `#faf4e4` | keep |
| card | `#fbf7eb` | `#fffdf6` | raise cards clearly above panels |
| **well** (sunk) | `rgba(122,94,63,.10)` | `#e7dcc0` solid | a real recessed plane |
| **border** `--iron` | `#c9b993` (1.69) | `#b59a6a` (≈3.1:1) | edges finally read |
| border-strong | `#a89272` | `#94774b` | for emphasis edges |
| `--on-panel-faint` | `#c9b993` (text!) | `#9a8259` (≈3.0) | stop reusing the border hex for text; still clearly tertiary |

*(These are starting points — exact values to be tuned against the visual goldens. The rule: any
edge/divider ≥3:1, any text ≥4.5:1, "tertiary" text decoupled from the border color.)*

### B. A semantic accent system — and wire the dead tokens

Pick one saturated, ≥3:1 hue per domain and use it consistently for state (board frame, badges,
chips, the matching town zone). Promote ember+gold to "action/reward."

| Meaning | Token | Proposed | Use |
|---|---|---|---|
| Primary action / level / XP | `--ember` | `#cf5520` (deepen slightly for text ≥4.5) | CTAs, active nav |
| Reward / currency | `--gold` | keep `#e2b24a` for *fills*, add `--gold-ink #8a5a12` for text-on-light | coins, rewards |
| Farm domain | `--biome-farm` | `#4f7a2a` (wire it!) | farm board frame, farm zone badge |
| Mine domain | `--biome-mine` | `#3f5d80` (wire it!) | mine board/zone |
| Fish domain | `--biome-fish` | `#2f7e96` (wire it!) | fishing board/zone |
| Danger | `--danger` | `#b1322a` (keep, already used well on the board danger cards) | hazards |
| Arcane | `--indigo`→`--arcane` | `#5b3f86` | portal/keeper |

### C. Make season unmistakable

- **Saturate the four field gradients** so spring/summer/autumn/winter are distinct at a glance
  (push chroma ~25–35%, keep them light enough that tiles read on top).
- Define a **per-season accent** (`--season-spring/summer/autumn/winter`) and use the *same* hue in
  three places at once: the board frame, the HUD season strip (raise from 33%→~70% alpha or use a
  solid 2px rule), and the season chip. One color, three placements = a season you *feel*.

### D. Redesign the world-overlays (highest visible polish win)

- Turn the **"Upgrade to …" sign** into a solid designed element — a wooden sign / banner primitive
  with opaque fill and ≥4.5:1 text, not a translucent box.
- Unify the **action pills** ("Enter Farm Field" / "Build") into one primitive with a shared shape;
  give "Build" the gold/ember "action" treatment and the board-entry pills the farm-domain accent.
  Route the `FoundSettlement`/`TierUpgrade` banners through the shared `Banner` primitive.

### E. Typography

- **Bundle the display font** in the game (add `@fontsource/fraunces` to the main entry, as the wiki
  already does) so titles render as intended; apply it to in-world titles (location name, banners).
- Split `--ink-soft` and `--ink-mid` into two real values so secondary/tertiary have tonal
  separation.

### F. Wiki alignment

- Re-reference the wiki vars to the game tokens (kill the drift); or, better, have both seed from a
  shared `var()` so they can't diverge again.
- **Fix the authored heading scale** in `HtmlBody.tsx` (h1 ≥ 24, h2 ≥ 19, h3 ≥ 16, all above body).
- Give the sidebar real per-category icons; replace off-palette inline hex with tokens; add a
  callout component and `<pre>` styling.

---

## Plan of work (phased, low-risk first)

Each phase ends with `npm run test:visual` and a written justification of the goldens diff
(per the repo's pre-PR rule).

**Phase 0 — Foundation (1 PR, highest leverage, lowest risk).**
Rewrite the `tokens.css` contrast ladder (§A) + accent values (§B) only. No structural code changes —
just the variables. This alone resolves most of the "too soft" feeling because borders, dividers,
cards, and tertiary text all start reading. Capture fresh visual goldens as the new baseline first.

**Phase 1 — Wire accents & season (1 PR).**
Connect the now-live `--biome-*` tokens to the board frame + zone badges; add the per-season accent
tokens; saturate the field gradients (§C); raise the HUD season strip. Pure additive theming.

**Phase 2 — World-overlays (1 PR).**
Redesign the Town sign + action pills + route banners through the `Banner` primitive (§D). The most
*visible* improvement; touches `Town.tsx` and adds/uses primitives.

**Phase 3 — Typography (1 PR).**
Bundle the display font; apply to in-world titles; split the secondary/tertiary ink tokens (§E).

**Phase 4 — Wiki alignment & polish (1 PR).**
Re-reference wiki vars to game tokens, fix the authored heading scale, sidebar icons, callouts,
off-palette hex (§F).

**Phase 5 — Cleanup (ongoing / optional).**
Migrate the ~290 inline hex literals to tokens, unify the two icon systems, fix the duplicate Map
legend and `townsfolk` nav, rename the lying "dark" bg tokens.

### Quick wins vs. bigger bets

- **Quick wins (Phase 0 + the season strip):** a few dozen lines in `tokens.css` + `Hud.tsx`. This is
  ~80% of the perceived improvement for ~5% of the effort. **Recommend doing this first and reviewing
  before committing to the rest.**
- **Bigger bets:** the world-overlay redesign (Phase 2) and font bundling (Phase 3) are real design
  work; the Wiki realign (Phase 4) is mechanical but broad.

---

## Open questions for you

1. **Identity:** stay warm-parchment (my recommendation), or is this the moment to consider a bolder
   direction (the `art-direction-eval` skill exists for exactly that)?
2. **Boldness budget:** are you comfortable letting season + reward be the two "loud" moments while
   everything else stays quiet? Or do you want a flatter, more uniform feel?
3. **Scope:** start with the Phase-0 token rewrite and review it live before I proceed, or do you want
   the whole sequence planned out as PRs up front?
