# puzzleDrag2 — Full Game Design Review

**The report is [`index.html`](./index.html)** — a self-contained, tabbed document. Open it in a
browser. This README is a short companion (method + how to read it + the headline summary).

*Reviewer pass: 2026-07. Method: read the live code in `src/` (not the `reference/` docs), rendered
the running game across ~85 visual scenarios (`src/visualTesting/matrix.ts`) at both a phone (390×844)
and a desktop (1280×1024) viewport, and judged it mobile-first through a frontend-design lens. Screenshots
live in [`./shots/`](./shots/). A prior UX/color pass already landed (contrast ladder, accents, season
tokens, bundled Fraunces) — this review deliberately goes **beyond color** into layout, IA, motion/feel,
per-view UX, and whether the player understands what is happening.*

## How to read the report

The `index.html` is organized into tabs (the "sub-docs"):

- **00 · Overview & roadmap** — the TL;DR, method, what's genuinely strong, the big themes, top priorities.
- **01 · The Board** — the puzzle: layout, HUD/tools/season strip, and the drag/chain "feel."
- **02 · The Town** — settlement screen, world-overlays, the Farm plot, growth across tiers.
- **03 · World Map** — cartography / zones / founding.
- **04 · Screens & panels** — quests/orders, tiles/research, crafting, inventory, workers/castle/bosses.
- **05 · Story & big moments** — story modals, cinematics, run-summary, chronicle.
- **06 · Shell, nav & onboarding** — HUD, bottom nav, menu/settings, modals, first-run/tutorial.
- **07 · Cross-cutting themes** — visual cohesion, motion, information architecture, mobile/responsive,
  accessibility, progression & reward legibility.
- **08 · Prioritized roadmap** — phased plan; quick wins vs. bigger bets.

Every finding carries a severity (**S1** blocks/glaring · **S2** real fix · **S3** minor · **POLISH**),
the screenshot it came from, and the `file:line` behind it, plus a concrete proposal.

## Headline summary

**161 findings across 18 review scopes** (24 S1 · 70 S2 · 57 S3 · 10 polish). The game is genuinely
charming with a strong core: the chain-drag interaction, the town/building art, the world map, and the
storybook identity are real strengths worth protecting. The prior color/contrast pass landed well — so the
work that's left is **not** more color. Seven themes recur:

1. **Systems exist but are unreachable / unnamed / scattered.** Seven full-screen systems (Orders, Castle,
   Bosses, Portal, Decorations, Tiles, Chronicle) are reachable *only* via the Debug menu; the 6-tab nav can't
   scale and has no "More"/hub pattern.
2. **Rewards & progress are illegible.** XP is invisible; level-up celebrates a bare number; crafts/orders
   never show output value; fractional harvest progress silently vanishes; the board states no season goal.
3. **Two identities fight** — warm painterly parchment vs. saturated "candy-square" board tiles, a generic
   boss-modal popup, two icon families, and grass "confetti" noise.
4. **Layout isn't truly responsive** — desktop wastes ~40% as dead parchment; mobile starves the board and
   truncates titles; the 44px tap-target token is defined but never applied.
5. **Feedback & motion are incoherent and partly accessibility-unsafe** — canvas screen-shake/flash ignore
   `prefers-reduced-motion` (DOM motion *is* gated); the board is pointer-only and opaque to assistive tech.
6. **Placeholder / mislabeled states leak** — a researched tile labeled "Locked", snake_case boss tributes,
   "Done" over a 12/100 bar, a backwards "balance / cost" line, an off-screen tutorial spotlight.
7. **Modal / CTA / status vocabulary is inconsistent** across the shell.

**Top three fixes:** (1) build a navigation hub so every built system has a door; (2) make rewards legible
end-to-end (XP + "what unlocked" + output values); (3) reclaim the board's real-estate on both viewports.
A cheap "repair the leaks" pass (Phase 0 in the report's Roadmap) removes most of the "unfinished" feel almost
for free. Full detail, screenshots, and `file:line` evidence are in **`index.html`**.

---

*Screenshots are real renders of the running current-code game captured for this review. Some
desktop action-modal shots did not trigger and fall back to the base screen; the mobile shots are
authoritative for those interaction states.*
