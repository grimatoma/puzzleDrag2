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
| hearth | N | thatch cottage + big stone chimney-breast (smoke), porch + warm window + date-stone niche; flagstone, garden bush, warm spill | **approved** | #749 / redo |
| lighthouse | S | tapered striped tower + lamp room; rotating beam, waves/splash, lamp + portholes, bobbing dinghy | **approved** | #721 |
| barn | L | gambrel roof, X-brace doors + loft on lit gable; hay-dust bob, weather-vane, fence | **approved** | #722 |
| bakery | N | beehive bread-oven hero + brick chimney (smoke), gable roof + dormer, bread display window, pretzel sign; oven flicker, steam | **approved** | #723 / redo |
| mill | L | tower windmill — stone cylinder + conical cap; turning lattice sails, flour pollen, sacks | **approved** | #725 |
| inn | N | jettied two-storey coaching inn; many warm windows, two smoking chimneys + dormers, hanging tankard sign + lantern, ale barrel | **approved** | #726 / redo |
| chapel | N | bell tower (rose window + swinging bell + spire/cross), nave; lancet candle glow, ♪ notes | **approved** | #727 |
| silo | S | corrugated metal cylinder + dome; GRAIN band, ladder; grainfall chute, sacks | **approved** | #728 |
| watchtower | N | round keep + crenellated battlement; patrolling guard, pennant, torches + brazier; curtain stubs | **approved** | #729 |
| observatory | L | stone drum + slit dome + tilted telescope; twinkling stars, shooting star, ringed planet | **approved** | #730 |
| clock_tower | N | square tower + legible clock (sweeping hands) + belfry bell; pyramid roof + weathervane, doves | **approved** | #731 |
| brewery | N | oast-house kiln (tapering brick cylinder + tipping cowl, steam) + attached brewhouse w/ glowing door; climbing hops, barrels | **approved** | #732 / redo |
| stable | N | long stable; Dutch-door stalls with bobbing horse heads (one dapple-grey) + sliding door + horseshoe over the door; trough ripple, hay, pitchfork, swallow | **approved** | #733 / touch-up #762 |
| housing | S | L-plan cross-gable thatch cottage; ridge-seated chimney (smoke), warm windows; swaying laundry line, potted plant, stepping stones | **approved** | #734 / redo |
| harbor_dock | L | plank pier on pilings over water; harbor shack, bobbing sailboat, crane + crate, gulls | **approved** | #735 |
| portal | N | rune pillars + arch + glowing portal; spinning rune ring, floating motes, pulsing core | **approved** | #736 |
| apothecary | N | crooked jettied witch-hat tower (crescent-moon finial); glowing potion-bottle window, mortar/pestle sign, rising potion bubbles | **approved** | #737 / redo |
| kitchen | N | open-sided cook-house; spit-roast over glowing fire-pit under a tapering smoke-hood (smoke); stacked plates, water basin | **approved** | #738 / redo |
| workshop | N | open-fronted carpenter's barn; projecting hoist gantry + hook, open workbench, stacked lumber + sawhorses | **approved** | #739 / redo |
| fishmonger | N | open-air market stall; striped gabled awning over an iced fish counter (fish + lemons + crab), swaying hung fish, brine barrels, scale, CATCH slate, gulls | **approved** | #740 / redo #760 |
| smokehouse | S | tall tapering charred-plank smoke cone; capped vent puffing smoke + embers, ember-glow door, swaying curing rack, woodpile | **approved** | #741 / redo |
| granary | N | round stone-banded tower + conical terracotta roof; grain dust sift, stacked sacks | **approved** | #742 |
| sawmill | N | riverside shed; spinning saw blade through log + sparks; turning water-wheel + splash, lumber | **approved** | #743 |
| apiary | S | building IS a giant coiled-straw skep (domed beehive) + finial; arched flight-hole + landing board, bees streaming (pollen), hive boxes, sunflower, honey jar | **approved** | #744 / redo #763 |
| larder | S | turf-mound root cellar; grassy earth dome + vent pipe, stone-framed arched doorway into a preserve-jar interior, crock pot, herbs | **approved** | #745 / redo |
| caravan_post | L | covered merchant wagon (canvas tilt + spoked wheels, hero) beside an open goods-canopy of crates/barrels/sacks; banner pole + pennant, lantern, notices board | **approved** | #746 / redo #761 |
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
- **Deluxe redo pass (#750–#763):** the first-gen builds leaned on a shared
  "box + hip/gable" massing — too samey. Redrew every box-shaped shop so the
  **silhouette itself tells the purpose** (no label needed): bakery beehive
  oven, brewery oast-kiln + cowl, apothecary crooked witch-hat tower, jettied
  coaching inn, chimney-breast hearth cottage, open spit-roast kitchen,
  turf-mound larder, tapering smoke-cone smokehouse, L-plan cross-gable
  housing, open hoist-gantry workshop, open-awning fishmonger stall,
  covered-wagon caravan depot, and a giant straw-**skep** apiary. Stable got a
  legibility touch-up (dapple-grey horse + horseshoe over the door). Followed
  by a zoom-in fine-tooth pass for depth/realism and floating/occlusion bugs
  (re-seated chimneys, un-occluded heroes). The towers/landmarks (lighthouse,
  mill, chapel, clock_tower, observatory, watchtower, granary, silo, sawmill,
  harbor_dock, barn, portal, powder_store, forge) already had distinctive
  non-box forms and were kept.
