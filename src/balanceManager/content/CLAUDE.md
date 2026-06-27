# CLAUDE.md — wiki content (`src/balanceManager/content/**/*.html`)

These HTML fragments are the in-app Wiki's **hand-authored prose** — the only
place the wiki can drift from the game. Everything structured (tile/resource/
recipe/building/boss/zone facts) is generated live from the source maps and
**cannot** drift; don't restate it here.

> **Code is truth. If prose and code disagree, fix the prose in the same change.**

## Non-negotiables

1. **Never hand-type a structured fact** — tier-ladder rungs, plot counts,
   upgrade costs, building rosters, sell values, turn budgets. Inject it instead
   (below) or defer to the generated per-entity section.
2. **Inject facts live** via the placeholders `HtmlBody.tsx` swaps for code-derived
   components (see `../wiki/derivedFacts.tsx`):
   - `<div data-wiki-tier-ladder="home"></div>` — a whole settlement-tier ladder.
   - `<span data-wiki-fact="zone.home.ladderSpan"></span>` — an inline scalar.
   - Need a key that doesn't exist? Extend `resolveFact()` in `derivedFacts.tsx`
     (read only the live source maps, never a copied constant) — don't type the number.
3. **No coin costs for buildings/tier upgrades** — those are resource-only; coins
   are spent on founding and the Market.
4. **Guard tests fail CI — satisfy them, don't bypass:** `../wiki/derivedFacts.test.ts`
   (no dangling `data-wiki-fact` keys; economy pages must use the embed, not a
   hand-typed cost/ladder `<table>`), `../wiki/htmlContent.test.ts` (every fragment
   loads, every `[[wikilink]]` resolves), `../wiki/staleContent.test.ts` (forbidden
   tokens for removed systems — add a renamed/removed system's old token here in the
   same change).

## For anything beyond a one-line prose tweak

Use the **`wiki-content`** skill (`/wiki-content`). It covers the generated-vs-authored
split, the full `data-wiki-fact` key list, the priority order for keeping a fact from
drifting, and the pre-commit checklist. This file is just the always-on reminder; the
skill is the manual.
