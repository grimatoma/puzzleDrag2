# Iso Building Set — Progress Tracker

Per-building status for the isometric replacement set (see
`.claude/skills/iso-building/SKILL.md`). One file per building under
`src/iso/buildings/<key>.tsx`, auto-discovered by the gallery
(`/iso/`, default tab). Each file's `meta` is the source of truth; this table
mirrors it.

**Status:** `todo` → `in_progress` → `review` → `approved`
**Plot tiers:** `S` ≈ 2×2 · `N` ≈ 3×3 (forge) · `L` ≈ 4×4 tiles.

🎉 **The set is complete — all 28 town buildings have an approved iso replacement.**
The reference quality bar is the **forge** (`/iso/?building=forge`).

| Building | Plot | Hero details / signature animations | Status | PR |
|---|---|---|---|---|
| forge | N | brick smithy, glowing furnace + anvil, slate hip roof; furnace flicker, embers, lantern, smoke | **approved** | #714/#715 |
| lighthouse | S | tapered striped tower + lamp room; rotating beam, waves/splash, lamp + portholes, bobbing dinghy | **approved** | #721 |
| barn | L | gambrel roof, X-brace doors + loft on lit gable; hay-dust bob, weather-vane, fence | **approved** | #722 |
| bakery | N | plaster + terracotta; glowing oven hero, bread sill, pretzel sign; oven flicker, steam, smoke | **approved** | #723 |
| mill | L | tower windmill — stone cylinder + conical cap; turning lattice sails, flour pollen, sacks | **approved** | #725 |
| inn | N | two-storey timber frame; arched double-door, warm windows; mug sign sway, chimney smoke | **approved** | #726 |
| chapel | N | bell tower (rose window + swinging bell + spire/cross), nave; lancet candle glow, ♪ notes | **approved** | #727 |
| silo | S | corrugated metal cylinder + dome; GRAIN band, ladder; grainfall chute, sacks | **approved** | #728 |
| watchtower | N | round keep + crenellated battlement; patrolling guard, pennant, torches + brazier; curtain stubs | **approved** | #729 |
| observatory | L | stone drum + slit dome + tilted telescope; twinkling stars, shooting star, ringed planet | **approved** | #730 |
| clock_tower | N | square tower + legible clock (sweeping hands) + belfry bell; pyramid roof + weathervane, doves | **approved** | #731 |
| brewery | N | Tudor brewhouse; copper kettle bay over fire + steam; hops vine, barrels + dripping tap, tankard sign | **approved** | #732 |
| stable | N | long stable; Dutch-door stalls with bobbing horse heads + sliding door; trough ripple, hay, swallow | **approved** | #733 |
| housing | S | thatch cottage; round door, flower-box window; swaying laundry, chimney smoke, garden bush | **approved** | #734 |
| harbor_dock | L | plank pier on pilings over water; harbor shack, bobbing sailboat, crane + crate, gulls | **approved** | #735 |
| portal | N | rune pillars + arch + glowing portal; spinning rune ring, floating motes, pulsing core | **approved** | #736 |
| apothecary | N | teal timber frame; glowing bottle bay-window; mortar/pestle sign + bubbles, dormer, cat, mist | **approved** | #737 |
| kitchen | N | cook-house; open hearth bay + hanging cauldron + steam; pots, herb bundles, chimney smoke | **approved** | #738 |
| workshop | N | carpenter's; plank walls + frame, open workbench; wiggling hung tools, sawdust pollen, logs | **approved** | #739 |
| fishmonger | N | fish stall; striped awning over iced fish counter; swaying hung fish, scale, price board, gull | **approved** | #740 |
| smokehouse | S | charred hut; roof vents puffing smoke + embers; iron-door glow slot, hanging meats, woodpile | **approved** | #741 |
| granary | N | round stone-banded tower + conical terracotta roof; grain dust sift, stacked sacks | **approved** | #742 |
| sawmill | N | riverside shed; spinning saw blade through log + sparks; turning water-wheel + splash, lumber | **approved** | #743 |
| apiary | S | beekeeper cottage + green roof; row of beehive boxes; bee pollen drift, sunflower, honey jar | **approved** | #744 |
| larder | S | stone cold-store + quoins; iron-strap arched door; cold jar window, swaying herb bundles | **approved** | #745 |
| caravan_post | N | trading post; striped awning + hanging lantern, shop window; waving flag, crates, wagon wheel | **approved** | #746 |
| powder_store | N | block-stone magazine + berm + lead vault; iron blast door + hazard chevrons + skull; lightning spark, X-barrels | **approved** | #747 |

`housing2` / `housing3` reuse the `housing` iso asset (same as the originals).

## Log

- **Infra (#720):** isoKit + auto-discovery + Gallery tab + skill + tracker.
- **Calibration batch (#721–#723):** lighthouse / barn / bakery locked the scale,
  the plot tiers, the cylinder + gambrel techniques, and the
  differentiate-by-material rule; folded into the skill (v2, #724).
- **Production (#725–#747):** the remaining 23 buildings, each its own
  auto-discovered file (parallel-safe, no shared-registry edits), screenshot-
  verified against the quality bar and merged with a merge commit.
- **Set complete:** open `/iso/` (Gallery) to see all 28 before/after pairs at a
  consistent scale.
