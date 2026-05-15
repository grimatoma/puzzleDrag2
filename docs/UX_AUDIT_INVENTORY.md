# UX Audit & Redesign Inventory

Compiled from the Claude Design handoff bundle (3 audits + 4 rounds of redesigns
across 19 JSX files and 3 chat transcripts). Sources:

- `UX Audit v1.html` — 32 findings, 9 P1 / 14 P2 / 9 P3
- `UX Audit v2.html` (= `Hearthlands UX Audit Vol II.html`) — 54 findings + 17 component proposals
- `Hearthlands UX redesigns.html` + `screens-*.jsx` — 5 ground-up redesigns + 3 additions + 12 idea cards + animated buildings + icon library

This file is the canonical work list. The status section below tracks implementation.

---

## Implementation status

Legend: `[ ]` todo · `[x]` done · `[~]` in progress · `[-]` skipped (deliberate) · `[?]` blocked

### Scope from user direction

- **A1–A10** (the top 10 from v1 §01) — with A1 skipped and A9 inverted (remove reduce-motion instead of adding it; agent search confirmed no such code exists currently, so this is effectively a no-op)
- **A16, A17, A18, A19, A20, A28** — system health + per-area calls
- **A34–A41** — quick wins (< 1h each)
- **C36–C41** — icon library (47 icons across 6 sets)
- **B35–B51** — all 17 component primitives

### Status

**Foundation:**
- [x] B51 — `tokens.css` (PR #406)
- [x] B50 — Safe-area CSS vars + `useChromeEdge` hook (PR #406)

**Primitives (PR #407):**
- [x] B42 — `<Icon>` registry/SVG/placeholder resolution
- [x] B35 — `<Pill>`
- [x] B43 — `<Button>`
- [x] B44 — `<Banner>`
- [x] B45 — `<ChainBadge>`
- [x] B46 — `<ProgressTrack>`
- [x] B37 — `<Stepper>`
- [x] B40 — `<ResourceCell>`
- [x] B38 — `<ParchmentDialog>` + `<StoryDialog>`
- [x] B39 — `<BottomSheet>`
- [x] B47 — `<Popover>`
- [x] B48 — `<Screen>`
- [x] B49 — `<Toast>` + `useNotifier()`
- [x] B41 — `<TabBar>`
- [x] B36 — `<ToolStrip>`

**Icon library (PR #407 — 47 design icons):**
- [x] C36–C41 — 12 tile + 6 currency + 8 tool + 10 building + 6 hazard + 5 NPC

**Audit fixes (A series):**
- [-] A1 — Strip dev-only UI *(skipped per user direction)*
- [x] A2 — HUD 3 zones (PR #411)
- [x] A3 — BottomNav 8 reserved slots + locked Portal (PR #409)
- [x] A4 — Emoji scrub across production UI (PRs #411, #412, #414)
- [x] A5 — Status glyphs paired with color (PR #412)
- [x] A6 — 44pt tap-target floor (PRs #412, #415)
- [x] A7 — `<ToolStrip>` consolidated (PR #410)
- [x] A8 — `<ParchmentDialog>` for Season + BiomeEntry (PR #413)
- [-] A9 — Reduce-motion *(no code existed to remove)*
- [x] A10 — Threshold pulses on board (PR #408)
- [x] A14 — Notifier queue unified (PR #416)
- [x] A16 — Town split (PR #418)
- [x] A17 — Sandbox → italic settlement-name suffix (PR #411)
- [x] A18 — Tide chip extended to harbor town view (PR #411)
- [x] A19 — Armed state collapsed to one ring + dim-others (PR #410)
- [x] A20 — Right-click / long-press inspect (PR #410)
- [x] A21 — Inventory filter / sort / search (PR #417)
- [x] A23 / B58 — NpcBubble tap-to-dismiss-early (PR #416)
- [x] A27 — Provisions packer presets (PR #415)
- [x] A28 — 600ms theme crossfade (PR #418)
- [x] A34 — Tabular numerals (PR #411)
- [x] A35 — Pluralize turn/turns (PR #414)
- [x] A36 — Drop double-border retina artifact (PR #414)
- [x] A37 — Menu glyph labelled (PR #411)
- [x] A38 — Return-bonus visual weight (PR #413)
- [x] A39 — Skeleton board (PR #414)
- [x] A40 — Inventory cell tappable (PR #412)
- [x] A41 — Esc dismiss everywhere (PR #413)
- [x] B82 — BottomNav orders-ready badge (PR #409)
- [x] B71 / B72 — Global :active + :focus-visible (PR #406)
- [x] B67 — `md` (≥768px) breakpoint registered (PR #406)

**Queued:**
- [ ] A29 — `useFocusTrap` on Settings / Debug / Tutorial holdouts
- [ ] A31 — WCAG AA contrast pass
- [ ] C2 — Run summary screen
- [ ] C3 — Charter / Choice-log viewer

### Out of scope (deferred)

A11–A13, A15, A22, A24–A26, A29 (until queued), A30–A33, B1–B34 (informational), B52–B85, C1, C4–C35, C42–C51.

---

## A. UX Audit v1 — 32 findings, "the chrome is in the way"

### A.1 Top 10 "Move the Needle" fixes

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A1 | P1 | **Strip dev-only UI from HUD.** Move DevButton pair (debug tools, Balance Manager) behind `?debug=1` / 5-tap easter egg / Settings → Developer. Balance Manager opens new tab — non-devs will hit it. | v1 §01 #01 · `src/ui/Hud.jsx · 137–142` |
| A2 | P1 | **Rebuild HUD as 3 zones, not 9 pills.** Left=identity+menu, Center=run state (season ring doubling as turn counter + larder badge), Right=progression (level/XP+currency popover). Collapse larder + meta currencies + Hearth-Tokens into one "Stash" pill. | v1 §01 #02 · `src/ui/Hud.jsx · 144–204` |
| A3 | P1 | **Stop bottom nav width from changing.** Reserve all 8 slots from session start; render Portal in locked state with lock glyph until `locBuilt(state).portal`. | v1 §01 #03 · `src/ui.jsx · 81–95` |
| A4 | P1 | **Pick one icon system.** Three coexist (IconCanvas, Icon, inline emoji). Treat missing canvas icon as `console.warn` + neutral placeholder; remove emoji from production except deliberate "✓". Add `/dev/icons` inventory. | v1 §01 #04 · `src/ui/Tools.jsx · 16–22`, `src/ui/Hud.jsx · 31–43` |
| A5 | P1 | **Pair every status color with a glyph.** Order ring color alone fails ~8% of male players. ✓ ready / ↑ needed / − excess. Break chain badge ("chain×5 ×2 +1★") into 3 discrete chips with their own iconography. Test in Chromium deuteranopia. | v1 §01 #05 · `src/ui/Inventory.jsx · 41–74`, `src/ui.jsx · 46–58` |
| A6 | P1 | **Adopt 44×40px hit-target floor.** BottomNav (~32 tall), provisions ± (24×24), trade buttons (~20 tall) all fail. Grow stepper to 32×32 with +/− on either side + long-press accelerator. | v1 §01 #06 · `src/ui/Town.jsx · 113–117`, `src/ui/Inventory.jsx · 40–50` |
| A7 | P1 | **One `<ToolStrip>` primitive — not three Tools surfaces.** ToolsGrid, PortraitToolsBar, MobileDock→sheet each rolled separately. Take a `layout={grid\|rail\|dock}` prop. Move arm/cancel inside the strip (delete the floating ArmedToolBanner). Right-click on desktop = long-press detail modal. | v1 §01 #07 · `src/ui/Tools.jsx · 132–349` |
| A8 | P1 | **Two modal chromes only.** Extract `<ParchmentDialog>` (SeasonModal, BiomeEntryModal, tool detail) and `<StoryDialog>` (dark parchment+iron variant) with standard slots: title/portrait/body/actions/dismiss. | v1 §01 #08 · `src/ui/Modals.jsx`, `Town.jsx · BiomeEntryModal`, `Tools.jsx · modalTool` |
| A9 | P1 | **Respect `prefers-reduced-motion`.** Gate 14 dust motes, animate-pulse, chain-badge interpolation. Default to 6 motes on touch. Add explicit "Reduce motion" Settings toggle. WCAG 2.3.3. | v1 §01 #09 · `prototype.jsx · DUST_MOTES`, `index.html · @keyframes dustfloat` |
| A10 | P1 | **Onboard chain mechanic on the board.** While dragging, paint soft-green pulse on tile #3 (passed minimum) and gold pulse on upgrade-threshold tile with floating "+1★" preview. Badge becomes confirmation, not decoder ring. | v1 §01 #10 · `src/GameScene.js`, `src/utils.js · upgradeCountForChain` |

### A.2 System health — design-system observations

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A11 | P2 | **Promote SC palette in Modals.jsx to global token sheet.** Move to `src/tokens.css` as CSS custom properties; expose via Tailwind theme.extend. Migrate `bg-[#5b3b20]` → `bg-iron-700`. Palette: parchment #F0E6CF, iron #B28B62, ink #3A2715, ember #D6612A, gold #E2B24A, moss #91BF24. | v1 §02 |
| A12 | P2 | **Lift the type floor.** Most chrome at 9–12px. Move to 12px min for nouns, 13.5px verbs, 15px body. Use 14–16.5px Newsreader the story system already proves. | v1 §02 |
| A13 | P2 | **Side panel = 3 sections incl. inventory.** Compress Orders to one line w/ progress bars; surface compact resource-only inventory as 3rd section so players don't leave the board to check "do I have enough wheat." | v1 §02 |
| A14 | P2 | **Single `<Notifier>` queue with 3 tiers.** Toasts (3s, non-blocking, queueable) / Bubbles (NPC-anchored) / Beats (full-modal). Today NpcBubble overwrites itself; aria-live is a separate channel. | v1 §02 |
| A15 | P2 | **One ChainBadge as React component portaled** into whichever surface mounts. Today: SidePanel + landscape-phone overlay diverge (×2 vs x2). Phaser fires events only. | v1 §02 · `src/ui.jsx · 47–58`, `prototype.jsx · 217–229` |
| A16 | P2 | **Split Town.jsx (118KB monolith).** One file per illustration in `src/ui/buildings/`; theme/biome config to `src/ui/town/config.js`; BiomeEntryModal to `src/features/zones/`. | v1 §02 |

### A.3 HUD area

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A17 | P2 | **"Sandbox Mode" pill → settlement-name italic caption** or trophy glyph near level disc. Currently reads as status not achievement. | v1 §03 (HUD) |
| A18 | P3 | **Tide chip on harbor town view too**, not just board — flips every 3 turns regardless of view. | v1 §03 (HUD) |

### A.4 Tools area

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A19 | P2 | **Armed state: stop showing 5 signals at once.** Today: 0.45-alpha ring + 0.35 glow + animate-pulse + ARMED pill + banner. Pick 2: solid yellow ring + over-board banner. Mute rest of toolbar to 60% opacity. | v1 §03 (Tools) |
| A20 | P3 | **Add tool-info on desktop.** Desktop never reaches rich-description modal. Add small info tap-target on each tool card or 1.2s hover-dwell upgrade. | v1 §03 (Tools) |

### A.5 Inventory area

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A21 | P2 | **Filter chips + sort + search on Resources grid.** Late game = 40+ types. Chain-only / items-only / sellable-only filters; sort by count desc / alpha / recent. | v1 §03 (Inventory) |
| A22 | P2 | **Batch trading.** Long-press = Buy/Sell ×5; long-press hold = max. 200-wheat sells shouldn't need 200 taps. | v1 §03 (Inventory) |
| A23 | P3 | **Trade-locked CTA = single banner above grid**, not disabled button on every cell. | v1 §03 (Inventory) |

### A.6 Story & dialogue

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A24 | P3 | **Dialogue system is the strongest UI — make rest match it.** Parchment+iron palette, serif voice, gold hairlines should be the design system, not the story system. | v1 §03 (Story) |
| A25 | P3 | **Story bar bottom offset uses a CSS var**, not hard-coded `bottom: 56`. Set `--bottom-chrome-h` from whichever surface mounts. | v1 §03 (Story) |

### A.7 Town view

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A26 | P2 | **BiomeEntryModal → wizard.** Convert to: 1. Pack → 2. Dangers → 3. Set out, sticky bottom CTA. | v1 §03 (Town) · `src/ui/Town.jsx · BiomeEntryModal` |
| A27 | P3 | **"Pack for 10 turns"/"Pack for 20" presets** alongside "Pack all." | v1 §03 (Town) |
| A28 | P3 | **600ms crossfade on theme container** instead of instant location swaps. | v1 §03 (Town) |

### A.8 Accessibility

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A29 | P2 | **`useFocusTrap` hook on every `role="dialog"`.** Tab past modal currently lands in hidden HUD. | v1 §03 (A11y) · `src/a11y.js` |
| A30 | P2 | **Keyboard chain-extension flow.** Arrow keys to move cursor on board, space to grow chain, enter to confirm. | v1 §03 (A11y) |
| A31 | P3 | **Contrast pass against WCAG AA.** `#d6612a` on `#5b3b20` = 3.4:1 (fails AA body); amber `#f7c254` on parchment = 1.9:1 (fails everywhere). | v1 §03 (A11y) |

### A.9 Save / settings / recovery

| # | Pri | Change | Reference |
|---|-----|--------|-----------|
| A32 | P2 | **Player-facing warning on save-schema discard.** JSON export + confirmation modal with read-only-old-save Cancel. | v1 §03 (Save) |
| A33 | P3 | **RootErrorBoundary "Copy details" link** with first 5 stack lines. | v1 §03 (Save) |

### A.10 Quick wins (< 1h each)

| # | Change | Reference |
|---|--------|-----------|
| A34 | `font-variant-numeric: tabular-nums` on every numeric chip (coins, XP, larder, level). | v1 §04 #1 |
| A35 | Pluralize "turn"/"turns" across season bar + seasonStats. | v1 §04 #2 |
| A36 | Drop double border-radius subpixel artifact on retina. | v1 §04 #3 |
| A37 | Menu glyph ≡ gets a name — "Menu" label or settlement crest. | v1 §04 #4 |
| A38 | Promote "+25◉ return bonus" to gold-tinted line above the CTA. | v1 §04 #5 |
| A39 | Replace "Loading board…" with skeleton 6×6 pulsing squares for ~250ms. | v1 §04 #6 |
| A40 | Inventory cell itself tappable → expand recipe/sources sheet. | v1 §04 #7 |
| A41 | Generalize Esc-dismisses-modal across every dialog with a Close button. | v1 §04 #8 |

---

## B. UX Audit Vol II — 54 findings + 17 primitives

### B.1 Responsive matrix (7 widths)

| # | Width | Change | Reference |
|---|-------|--------|-----------|
| B1 | 320×600 (Fold) | HUD wraps to 3 rows; Season pips clip; LarderWidget stacks; BottomNav 320px exact; story bar overlaps PortraitToolsBar. | v2 §01 |
| B2 | 360×780 (Pixel 4a) | HUD turns from 1→2 rows mid-game when festival mounts larder; 9px larder labels sub-perceptual. | v2 §01 |
| B3 | 390×844 (iPhone 14/15) | ~150px of chrome; tap targets on-board 108px vs off-board 18–32px. | v2 §01 |
| B4 | 414×896 (iPhone Plus) | Inventory grid still 2-col — ~70px slack per cell wasted. | v2 §01 |
| B5 | 844×390 (phone landscape) | HUD shrinks aggressively; chain badge fork; NpcBubble 460px = full screen height. | v2 §01 |
| B6 | 768×1024 (iPad mini portrait) | Inherits mobile wholesale; side panel hidden though tablet has room. | v2 §01 |
| B7 | 1024×768 (iPad Pro / laptop) | 1024 inclusive boundary swaps layout on resize; max-w-[1280] caps everything wider. | v2 §01 |

### B.2 Tap-target census (24 elements)

| # | Element | Verdict | Fix | Reference |
|---|---------|---------|-----|-----------|
| B8 | Menu button 32×32 | Borderline | 44×44 hit area, 32px visual. | v2 §02 |
| B9 | DevButton (×2) 28×28 | Fail | Remove from prod (A1). | v2 §02 |
| B10 | Coin/Building pill ~24h | Borderline | Tappable → currency breakdown popover. | v2 §02 |
| B11 | Larder mini-bar 40×8 | Fail | Wrap 5 bars in 44h tappable container. | v2 §02 |
| B12 | Tide chip ~20h | Fail | Upgrade to ≥32h with tide-detail popover. | v2 §02 |
| B13 | Tool count badge | Fail | `pointer-events: none` (decoration). | v2 §02 |
| B14 | "ARMED" pill | Fail | Delete (covered by A7/A19). | v2 §02 |
| B15 | Portrait Tool button label 8px | Pass-borderline | Lift to 11px, card to ~74px. | v2 §02 |
| B16 | BottomSheet handle 40×4 | Fail | Either delete OR wire drag-down dismiss. | v2 §02 |
| B17 | TradeButton ~46×18 | Fail | Replace with inline stepper 32×32 min. | v2 §02 |
| B18 | Inventory order status tag | Fail | Move into cell flow (clips at 200px auto-fill). | v2 §02 |
| B19 | CompactOrders row ~32h | Borderline | py-2 = ~44h, promote icon to 20px. | v2 §02 |
| B20 | BottomNav item ~34h | Borderline | py-2.5 pb-3 + safe-area; top-edge accent. | v2 §02 |
| B21 | StoryModal close-via-Esc only | Fail | Add 32×32 close-X on continue-only beats. | v2 §02 |
| B22 | SeasonModal CTA landscape | Pass→Fail | Bump landscape py to 40 min. | v2 §02 |
| B23 | NpcBubble auto-dismiss only | Fail | Add tap-to-dismiss-early. | v2 §02 |
| B24 | ArmedToolBanner Cancel ~46×24 | Borderline | py-2 (44h). | v2 §02 |

### B.3 Gesture conflicts

| # | Conflict | Fix | Reference |
|---|---------|-----|-----------|
| B25 | Long-press overloaded (4 surfaces) | Standardize: long-press = inspect only. | v2 §03 |
| B26 | PortraitToolsBar h-scroll vs board drag | `touch-action: pan-x` bar, `none` board, 6px dead zone. | v2 §03 |
| B27 | Tooltip + tap-to-arm racy | <400ms = arm; >400ms hold = inspect. | v2 §03 |
| B28 | BottomSheet handle promises drag but none wired | Implement rubber-band pan-down. | v2 §03 |
| B29 | Scroll inside modal vs swipe-dismiss | Sticky bottom action bar so CTAs always visible. | v2 §03 |
| B30 | Phaser pointer vs React click | Banner wrapper `pointer-events: none`. | v2 §03 |
| B31 | Pinch-zoom disabled, no fallback | Settings → "Board scale" 100/110/125%. | v2 §03 |
| B32 | Haptics flag has no consumers | Wire `navigator.vibrate` on chain extend/threshold/commit. | v2 §03 |
| B33 | Double-tap unassigned | Double-tap tool = use without arming. | v2 §03 |
| B34 | Hover-only affordances on touch | Right-click on desktop = rich-description. | v2 §03 |

### B.4 Reuse-before-remake — 17 primitives

| # | Primitive | Currently scattered | Reference |
|---|-----------|---------------------|-----------|
| B35 | **`<Pill>`** (tone × variant × size, anchored option) | 8+ sites: Hud pills, Sandbox banner, TideChip, order-status tag, StoryPill, tool count badge, ARMED pill, BottomNav badges. | v2 §04 #01 |
| B36 | **`<ToolStrip layout={grid\|rail\|sheet}>`** | ToolsGrid + PortraitToolsBar + MobileDock rolled 3x. | v2 §04 #02 |
| B37 | **`<Stepper>`** with long-press accelerator + presets | BiomeEntryModal ± (24×24), TradeButton (qty=1 hardcoded). | v2 §04 #03 |
| B38 | **`<ParchmentDialog>` + `<StoryDialog>`** | 5+ modals. Free focus trap, Esc, safe-area, landscape overrides. | v2 §04 #04 |
| B39 | **`<BottomSheet>` with snap points + drag-to-dismiss** | Tools.jsx inline impl — extract. | v2 §04 #05 |
| B40 | **`<ResourceCell density>`** | InventoryCell, CompactOrders, LarderWidget, BiomeEntryModal provisions. | v2 §04 #06 |
| B41 | **`<TabBar density={dock\|nav}>`** | BottomNav (7-8) + MobileDock (2) are same widget. Reserves locked slots. | v2 §04 #07 |
| B42 | **`<Icon iconKey>`** with resolution: registry → SVG sprite → dev placeholder | 3 systems coexist. Emoji never appears. | v2 §04 #08 |
| B43 | **`<Button tone × size × variant>`** with leading, block, loading, disabled | 15+ inline buttons. | v2 §04 #09 |
| B44 | **`<Banner tone={info\|success\|warning\|danger}>`** | 5 sites. | v2 §04 #10 |
| B45 | **`<ChainBadge layout={side\|overlay-top\|inline}>`** | SidePanel + landscape overlay + Phaser badge. | v2 §04 #11 |
| B46 | **`<ProgressTrack style={bar\|pips\|ring}>`** | XP, Larder, Season, order percentage. | v2 §04 #12 |
| B47 | **`<Popover>`** with trigger × density (rich → sheet on phone) | Promote Tooltip. | v2 §04 #13 |
| B48 | **`<Screen>` scaffold** with Filters / Body / FooterBar | Each feature writes own outer shell. | v2 §04 #14 |
| B49 | **`<Toast>` + `useNotifier()`** queue | NpcBubble overwrites self; aria-live separate. | v2 §04 #15 |
| B50 | **Safe-area CSS vars** `--chrome-top` / `--chrome-bottom` / `--safe-bottom` | StoryBar `bottom:56` hard-coded. | v2 §04 #16 |
| B51 | **`tokens.css`** with parchment/iron/ink/ember/gold/moss/indigo/rose + spacing + type scale | Modals.jsx SC palette best-of-breed. | v2 §04 #17 |

### B.5 Per-surface findings

**Phone portrait (390×844)** — 10 findings:

| # | Change | Reference |
|---|--------|-----------|
| B52 | HUD grows 56→96px mid-game when larder mounts — reserve slot from start. | v2 §06 phone portrait #1 |
| B53 | PortraitToolsBar + MobileDock both visible at 390 portrait — pick one. | v2 §06 #2 |
| B54 | Trade actions → single inline stepper. | v2 §06 #3 |
| B55 | Inventory compact 2-col wastes 80px slack/cell — single full-width list. | v2 §06 #4 |
| B56 | Story bar covers 60% of landscape canvas — use BottomSheet on landscape. | v2 §06 #5 |
| B57 | ArmedToolBanner blocks chain drags — `pointer-events:none` wrapper. | v2 §06 #6 |
| B58 | NpcBubble tap-to-dismiss-early. | v2 §06 #7 |
| B59 | Tooltip flash-on-tap fix via 400ms timing. | v2 §06 #8 |
| B60 | BottomNav active state bg-flood crushes contrast — top-edge accent. | v2 §06 #9 |
| B61 | 1024 inclusive breakpoint flicker on browser resize. | v2 §06 #10 |

**Phone landscape** — 5 findings:

| # | Change | Reference |
|---|--------|-----------|
| B62 | HUD landscape shrink too aggressive — redistribute horizontally instead. | v2 §06 landscape #1 |
| B63 | Phaser chain badge clipping — make React overlay canonical. | v2 §06 #2 |
| B64 | Side panel hidden in landscape — keep slid-out drawer. | v2 §06 #3 |
| B65 | Tools 2 taps deep in landscape vs 1 in portrait — match depth. | v2 §06 #4 |
| B66 | Story bar + ArmedToolBanner can wedge chain badge between them. | v2 §06 #5 |

**Tablet (768–1024) — the missing breakpoint** — 5 findings:

| # | Change | Reference |
|---|--------|-----------|
| B67 | Add `md` (≥768px) band: bring back side panel. | v2 §06 tablet #1 |
| B68 | Inventory: lock cols phone=2, tablet=3, desktop=4+. | v2 §06 #2 |
| B69 | ToolStrip vertical rail mode for tablet landscape. | v2 §06 #4 |
| B70 | Aspect-ratio letterbox gated behind min-width. | v2 §06 #5 |

**Cross-surface touch hygiene** — 8 findings:

| # | Change | Reference |
|---|--------|-----------|
| B71 | `:active` scale(0.96) + opacity(0.85) 100ms on every primary button. | v2 §06 cross #1 |
| B72 | `:focus-visible` 2px ember outline + 2px offset globally. | v2 §06 #2 |
| B73 | `overscroll-behavior: contain` on every modal/sheet body. | v2 §06 #3 |
| B74 | Remove hover-only affordances. | v2 §06 #4 |
| B75 | (haptics — see B32) | v2 §06 #5 |
| B76 | Drag-from-edge 18px dead zone. | v2 §06 #6 |
| B77 | "Larger tiles" Settings option. | v2 §06 #7 |
| B78 | Chain stroke ≥4px / high-contrast halo setting. | v2 §06 #8 |

### B.6 Misc

| # | Change | Reference |
|---|--------|-----------|
| B79 | ESLint rule: forbid arbitrary `bg-[#…]` outside tokens.css. | v2 §07 Foundation |
| B80 | Deuteranopia simulator pass on inventory grid. | v2 §07 A11y |
| B81 | axe-core pass across every screen. | v2 §07 A11y |
| B82 | BottomNav badges (orders ready, new chronicle). | v2 §07 Polish |
| B83 | `/dev/system` page showing every primitive with API. | v2 §07 Docs |
| B84 | `docs/ux-conventions.md` (gestures, type scale, touch floor). | v2 §07 Docs |
| B85 | `docs/responsive.md` (breakpoints + mounts). | v2 §07 Docs |

### B.7 Consistency rubric (current scores)

| Surface | Score |
|---|---|
| HUD | 2 / 9 |
| Side panel | 4 / 9 |
| Tools (3 forks) | 2 / 9 |
| Inventory | 2 / 9 |
| Town view | 3 / 9 |
| SeasonModal | 5 / 9 |
| **StoryModal** | **8 / 9** (the bar) |
| BottomNav | 2 / 9 |
| MobileDock | 3 / 9 |
| NpcBubble | 3 / 9 |

---

## C. Redesigns + Round 2/3/4 mocks

### C.1 Five ground-up redesigns

| # | Redesign | Files / artboards |
|---|----------|-------------------|
| C1 | **Unified mobile chrome.** Current state annotated; new default with persistent resource strip + contextual action tray + drawer; long-press inspect-lens. | `screens-chrome.jsx`, `screens-details.jsx` |
| C2 | **Run-summary screen.** Parchment celebration with gains/chains/bonds/seal + best-moment replay. | `screens-summary.jsx`, `screens-details.jsx` |
| C3 | **Charter / Choice-log viewer.** Six pact terms with honor/violation states + record ribbon. | `screens-summary.jsx`, `screens-details.jsx` |
| C4 | **Pre-round loadout v2.** Tile-pool picker with "This pool powers" synthesis + tile-detail sheet. | `screens-loadout-v2.jsx`, `screens-wf.jsx` |
| C5 | **Keeper boss v2 (Drive-Out as outlast).** Stone-Knocker banner, claimed-columns hatching, threat card. | `screens-r3a.jsx`, `screens-wf.jsx` |

### C.2 Additions hi-fi

| # | Addition | Source |
|---|----------|--------|
| C6 | Map & cartography — hand-drawn parchment world map. | `screens-new.jsx` |
| C7 | Day transitions — dawn + sleep. | `screens-new.jsx` |
| C8 | Boss omen — atmospheric vision card. | `screens-new.jsx` |
| C9 | Ember's ritual (endgame) — 6 rune-stones ring. | `screens-new.jsx` |

### C.3 Round 3 expansions

| # | Addition | Source |
|---|----------|--------|
| C10 | Chain telegraph — mid-drag yield/threshold dial. | `screens-r3a.jsx` |
| C11 | Daily quests v2 (Mira's day) — carousel + bond ring + gift wishlist. | `screens-r3b.jsx` |
| C12 | Festival v2 (Lantern Night) — countdown ring + prep checklist. | `screens-r3b.jsx` |
| C13 | What-next synthesizer v2 — town silhouette + thread cards. | `screens-r3b.jsx` |
| C14 | Wayfarer screen — host/refuse/drive-off choices. | `screens-buildings.jsx` |

### C.4 Crafting building rooms (Round 3 static)

| # | Building | Source |
|---|----------|--------|
| C15 | Bakery — warm cave + glowing oven + recipe ribbon. | `screens-buildings.jsx` |
| C16 | Smithy — dark forge + anvil + sparks. | `screens-buildings.jsx` |
| C17 | Scriptorium — parchment desk + coastal map sketch. | `screens-buildings.jsx` |
| C18 | Tea House — checkered tiles + iron pot. | `screens-buildings.jsx` |

### C.5 Animated buildings v3 (Round 4)

| # | Building | Animations | Source |
|---|----------|-----------|--------|
| C19 | Bakery v3 | hl-flame, hl-rise, hl-haze + queue rows. | `screens-buildings-v3.jsx` |
| C20 | Smithy v3 | hl-hammer (1.3s), hl-spark, hl-glow, hl-anvil-flash. | `screens-buildings-v3.jsx` |
| C21 | Scriptorium v3 | hl-quill (3.5s), hl-write. | `screens-buildings-v3.jsx` |
| C22 | Tea House v3 | hl-steam wisps. | `screens-buildings-v3.jsx` |
| C23 | Shared QueueRow + QueuePanel primitive | progress shimmer, queue states, ETA, skip. | `screens-buildings-v3.jsx` |

### C.6 12 idea-wall cards

| # | Idea | Gist |
|---|------|------|
| C24 | Chain telegraph | (Now built — C10) |
| C25 | Heirlooms | Named artifacts that persist across runs. |
| C26 | Bond gift planner | Loves / stock / projected delta table. |
| C27 | Mystery events | Non-boss board modifiers. |
| C28 | Age stones | Cross-playthrough cairn meta-progression. |
| C29 | Hearth-compass | HUD dial pointing to current "next step". |
| C30 | Wayfarers | (Now built — C14) |
| C31 | Season's promises | Almanac as season-opener goal sheet. |
| C32 | Workshop room | (Now overlaps with C19-C22) |
| C33 | Audio palettes | Hearth/Coast/Deep/Silent loop sets. |
| C34 | NPC diaries | Bond 6+ unlocks Codex entries. |
| C35 | Boss tells | Dotted overlay on biased-fill tiles. |

### C.7 Icon library proposal

| # | Set | Count | Notes |
|---|-----|-------|-------|
| C36 | Tile icons | 12 | grass, hay, wheat, dirt, stone, ore, fish, horse, rune, fire, ice, pearl |
| C37 | Currency icons | 6 | coin, ember, ingot, gem, hearth-token, building-token |
| C38 | Tool icons | 8 | hoe, watering can, rake, firebreak, axe, pick, flee-stone, net |
| C39 | Building icons | 10 | bakery, smithy, scriptorium, tea house, kitchen, market, dock, silo, inn, stable |
| C40 | Hazard icons | 6 | rats, fire, frost, blight, storm, keeper |
| C41 | NPC busts | 5 | Mira, Bram, Liss, Tomas, Wren |

### C.8 Chat-3 added concepts

| # | Idea | Reference |
|---|------|-----------|
| C42 | Run-summary screen (post-round recap). | chat3.md A · built as C2 |
| C43 | Charter / Choice-log viewer. | chat3.md B · built as C3 |
| C44 | Daily quest pools per NPC. | chat3.md C · built as C11 |
| C45 | "What should I do next?" surface. | chat3.md D · built as C13 |
| C46 | Recurring festival. | chat3.md E · built as C12 |
| C47 | Keeper-as-hazard boss rounds. | chat3.md F · built as C5 |

### C.9 Caveats

| # | Caveat | Reference |
|---|--------|-----------|
| C48 | Endgame Ember Ritual presupposes Pact V finale. | chat3.md round-2 |
| C49 | Animations static in mocks. | chat3.md round-2 |
| C50 | Building rooms use SVG/CSS shapes — swap in real art later. | chat3.md round-3 |
| C51 | Loadout v2 tile-power synthesis is the most schematically valuable. | chat3.md round-3 |

---

## Suggested reading order

1. **A1–A10** — biggest visible wins, single-afternoon each
2. **B35–B51** — the 17 primitives (substrate)
3. **C1** — chrome redesign (designer's own pick)
4. **C24/C28/C30/C34** — bolder additions
