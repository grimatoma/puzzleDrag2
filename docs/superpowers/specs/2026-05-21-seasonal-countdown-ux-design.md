# Seasonal Turn Countdown UX

## Goal

The puzzle board HUD currently shows a small 4-quadrant `SeasonWheel` (`src/ui/puzzleBoard.jsx:50-109`) with an orbiting sun, a center turn-count numeral, and a sidecar label that uses an emoji glyph. The only per-season variation today is which quadrant is brightened and which emoji renders — the indicator looks essentially identical in Spring vs. Winter.

This design replaces that with two implementations behind a debug toggle:

1. **Themed wheel** — same 4-quadrant structure, heavily reskinned per season (colors, decorations, orbiting indicator, idle motion).
2. **Bespoke per-season widget** — a different mini-scene per season, each visualizing remaining turns with themed art *and* a dominant numeral.

A new debug-menu toggle (`bespokeSeasonWidget`) switches between them. The themed wheel is the default; bespoke widgets are opt-in.

**No emoji anywhere.** Existing `SEASON_GLYPHS` emoji at `puzzleBoard.jsx:26` are replaced with inline SVG icons. All seasonal art (flowers, sun, leaves, snowflakes, butterfly, snowman) is hand-drawn SVG.

## Architecture

### Component layout

`src/ui/puzzleBoard.jsx` gains:

- **`SeasonIndicator`** (new, exported) — top-level component. Picks between `SeasonWheel` and `SeasonScene` based on a `bespoke` boolean prop.
- **`SeasonWheel`** (existing, refactored) — keeps the 4-quadrant SVG structure but reads per-season visual config (palette, decoration nodes, orbiting indicator icon, idle animation) from a `WHEEL_THEMES` table.
- **`SeasonScene`** (new) — dispatches on `seasonIdx` to render one of four bespoke scene components: `SpringGarden`, `SummerSun`, `AutumnTree`, `WinterSnowman`.
- **`SeasonIcon`** (new, internal) — small SVG icon (flower / sun / leaf / snowflake) used in the wheel's sidecar label and anywhere else a season needs a compact glyph.

`src/ui/Hud.jsx` changes one line — `<SeasonWheel ... />` becomes `<SeasonIndicator ... />` and we pass `bespoke={!!state.settings?.bespokeSeasonWidget}` alongside the existing five props.

### Settings flag

`src/features/settings/slice.js`:

- Add `bespokeSeasonWidget: false` to `DEFAULT_SETTINGS`.
- Existing `SETTINGS/TOGGLE` reducer handles the flip; `persistSettings()` writes to `hearth.settings` localStorage key.
- **No save-schema bump** — the setting lives under `hearth.settings`, not `hearth.save.v1`.

### Debug-menu toggle

`src/features/debug/index.jsx`:

- Add a new "Display" section after the existing controls.
- Render one toggle row using the same `Toggle` pattern as `src/features/settings/index.jsx:9-23`.
- Label: "Bespoke season widgets" with a small helper "Use themed mini-scenes instead of the wheel".
- onToggle dispatches `{ type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" }`.

## Themed wheel — per-season reskin

The wheel keeps its 64-unit SVG box, 4 quadrants, orbiting indicator, and center numeral. A `WHEEL_THEMES[seasonIdx]` table supplies all the per-season visuals so the JSX stays single-pass.

| Season | Active quadrant fill | Inactive quadrants | Center disc | Numeral color | Orbiting indicator | Idle motion | Rim decoration |
|---|---|---|---|---|---|---|---|
| **Spring** | Pastel green w/ faint petal speckles | Muted lilac | Pale cream w/ pink ring | Rose-pink | Butterfly (2-wing SVG, soft purple) | Wings flutter (scaleX ↔ 1) every 1.2s | Small petal shapes around the rim |
| **Summer** | Warm gold w/ radial rays | Beige | Sunlit cream w/ amber ring | Amber | 5-point sun | Ray pulse (opacity 0.85↔1) every 2s | Wheat fronds at NE / SW |
| **Autumn** | Ember orange w/ maple-vein streaks | Burnt sienna | Cream w/ russet ring | Maple-red | Falling leaf | Leaf sways (rotate ±8°) every 1.6s | Acorns at quadrant joints |
| **Winter** | Frosted ice-blue w/ snowflake spokes | Pale slate | Icy white w/ deep-blue ring | Deep blue | Snowflake | Snowflake slow-rotates (8s linear) | Tiny icicles dangling from rim |

**Reaction on turn spent:** the orbiting indicator animates from old angle → new angle with a 250ms `cubic-bezier(0.4, 0, 0.2, 1)` ease and a small overshoot; the newly active quadrant briefly bumps opacity 1.0 → 0.7 → 1.0 over 400ms.

**Sidecar label:** the existing `inline-flex` layout to the right of the wheel stays, but the emoji glyph (`SEASON_GLYPHS[seasonIdx]`) is replaced with a `<SeasonIcon kind={seasonIdx} size={14} />` SVG. The season name + "X turns left" copy is unchanged.

## Bespoke per-season widgets

Each scene fits an 88×52 viewBox with an internal label so it doesn't need the sidecar text. Large numeral is always the dominant element. Each scene declares its own `MAX_ICONS` cap (one number that fits the art) and renders `iconCount = Math.min(remaining, MAX_ICONS)` themed icons — when `remaining` exceeds the cap the numeral carries the precise value and the art stays at "full bloom." When `remaining < MAX_ICONS`, the empty slots show their spent variant (bare stem, faded ray, fallen leaf, missing snowflake).

### Spring — `SpringGarden`

A grass strip along the bottom with 6 stems. `MAX_ICONS = 6`. Each stem holds a 4-petal flower (alternating pink, yellow, lilac); blooming flowers = remaining turns, spent stems are bare with a fallen petal at the base. A 2-wing butterfly hovers above the leftmost blooming flower, wings flutter every 1.2s. Big numeral sits on a pale pink panel on the right.

- **Idle:** one flower sways (rotate ±4°, 1.8s), butterfly wings flutter.
- **Reaction (turn spent):** topmost blooming flower goes wilted (petals droop), a single petal drifts down to the strip, the flower fades to "bare stem" over 400ms.

### Summer — `SummerSun`

A sun in the upper-left with N straight rays (max 8, 1 per remaining turn). Below, a sandy bottom strip with a tiny shell silhouette. Big numeral sits on the sand. Soft warm gradient background.

- **Idle:** ray opacity oscillates 0.85↔1.0, period 2s, staggered per-ray so it shimmers.
- **Reaction:** outermost ray fades opacity 1 → 0 and shortens length 100% → 0 over 350ms.

### Autumn — `AutumnTree`

A small tree on the left with N leaves on its branches (max 7, 1 per remaining turn). Beneath the tree, fallen leaves pile up — one per spent turn, stacked. Big numeral sits in a leaf-shaped medallion on the right.

- **Idle:** one leaf gently sways (rotate ±6°, 1.6s).
- **Reaction:** a leaf detaches from a random branch, drifts down with a 500ms ease-out + slight rotation, lands on the pile.

### Winter — `WinterSnowman`

A 3-tier snowman on the right with twig arms, hat, and a small scarf. N snowflakes float around it (max 6, 1 per remaining turn). Big numeral sits on the snowman's middle (belly) snowball. Pale icy background gradient.

- **Idle:** a single drifting snowflake floats down-then-up on a slow vertical sine (3s); a tiny breath-puff appears at the snowman's mouth every ~2s.
- **Reaction:** the topmost floating snowflake "puffs" — scales 1 → 1.4 → 0 with opacity fading over 300ms. On the last turn of Winter only, the snowman's top snowball gives a small droop (translate Y +1, 200ms) to hint at melting.

## Shared behavior

### Motion budget

- **Idle:** subtle. Single-element motion per scene, ≤1.2s period typical, max ~2s.
- **Reaction:** triggered when `turnsRemaining` decreases by 1. Implemented by watching the value in `SeasonIndicator` via a small `usePrevious` hook and applying a one-shot CSS class that auto-clears on `animationend`.
- **`prefers-reduced-motion: reduce`:** idle animations are suppressed entirely; reactions become an instant cross-fade (no movement, no rotation). A11y check at top of each scene checks the media query and toggles a `motion-reduced` class on the root element.

### Accessibility

- The numeral element keeps `data-testid="turns-left"` so existing tests still find it.
- `SeasonIndicator` root gets `aria-label={`${seasonName} — ${remaining} turn${remaining === 1 ? "" : "s"} left`}` and `role="status"`. Decorative SVG paths get `aria-hidden="true"`.
- Keyboard / focus: indicator is not interactive, so no focus state required.

### Layout

- Same HUD slot, same ~140px footprint.
- Wheel keeps its sidecar text label (SVG icon + season name + "X turns left").
- Bespoke scenes are self-labeled inside the SVG (small season name under the scene if space allows, otherwise embedded into the design).
- Both modes share the same outer container so the HUD layout stays stable when the toggle flips.

### Visual scenarios

Add 8 new entries to `src/visualTesting/matrix.js` to cover the matrix:

- `board-season-spring-wheel`, `board-season-spring-bespoke`
- `board-season-summer-wheel`, `board-season-summer-bespoke`
- `board-season-autumn-wheel`, `board-season-autumn-bespoke`
- `board-season-winter-wheel`, `board-season-winter-bespoke`

Each scenario sets `settings.bespokeSeasonWidget` accordingly and seeds `turnsUsed` to land mid-season with a non-trivial remaining count (e.g. 7, 5, 3, 1). Visual scenarios call `window.__hearthVisual.freeze()` already, so idle animations don't flake screenshots.

## Engineering decisions

- All season visuals are inline SVG — no external image assets, consistent with the repo's "all textures drawn procedurally" rule.
- Per-season config (palettes, ray counts, animation timings) lives in module-scope constants at the top of `puzzleBoard.jsx` next to existing `QUAD_COLORS` / `FIELD_GRADIENTS`. No new files unless the bespoke scenes push the file past readability — if `puzzleBoard.jsx` grows past ~1800 lines, split the four scene components into `src/ui/seasonScenes/`.
- Each scene component is a pure function of `{ remaining, total, name }`. No state, no refs except the one `usePrevious` hook in `SeasonIndicator`.
- CSS animations are defined inline via `<style>` tag in each component (Tailwind keyframes are awkward for the SVG transforms we need) or in a small `.css` file co-located if inline gets unwieldy.

## Testing

### Unit (Vitest)

- `SeasonIndicator` renders `SeasonWheel` when `bespoke=false` and `SeasonScene` when `bespoke=true`.
- For each `seasonIdx` 0–3, `SeasonScene` renders the correct component (`SpringGarden`, etc.).
- Each scene's numeral matches `turnsRemaining`.
- `data-testid="turns-left"` still resolves to a numeric element in both modes.
- `aria-label` on the root is well-formed for singular and plural ("1 turn left" vs. "7 turns left").

### Existing tests

- `Hud.jsx` snapshot / HUD tests should still pass — default flag keeps the wheel.
- `runSelfTests()` smoke set is unaffected (no save schema change).

### Visual (Playwright)

- 8 new scenarios above × desktop smoke set.
- Run `npm run test:visual:update` after first review to capture goldens.

## Out of scope

- Ambient board-level seasonal effects (petals across the board, falling snow on the canvas). The user previously rejected the "ambient flair" scope option.
- Sound design — no new SFX hooks.
- Phaser-side animations — all seasonal UX is React/SVG/CSS only. The bridge is untouched.
- Migration of existing players — the default flag is `false`, so existing saves see the (improved) wheel with no extra work.
