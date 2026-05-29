# Iso Building Set — Progress Tracker

Per-building status for the isometric replacement set (see
`.claude/skills/iso-building/SKILL.md`). One file per building under
`src/iso/buildings/<key>.tsx`, auto-discovered by the gallery
(`/iso/`, default tab). Keep this table in sync with each file's `meta`.

**Status:** `todo` → `in_progress` → `review` → `approved`
**Plot tiers:** `S` ≈ 2×2 · `N` ≈ 3×3 (forge) · `L` ≈ 4×4 tiles.

The reference quality bar is the **forge** (`/iso/?building=forge`). Match it.

| Building | Plot | Original viewBox | Hero details / signature animations | Status | PR | Notes |
|---|---|---|---|---|---|---|
| forge | N | -64 -100 128 116 | brick smithy, glowing furnace + anvil, slate hip roof; furnace flicker, embers, lantern, smoke | **approved** | #714/#715 | Reference building. |
| lighthouse | S | -80 -144 160 160 | tall tapered tower + lamp room, rotating beam, sea; beam sweep, waves/splash, lamp glow | todo | — | Calibration batch (tall). |
| barn | L | -64 -108 128 124 | big gambrel roof, hayloft door, red boards; doors, hay, weather-vane | todo | — | Calibration batch (large). |
| bakery | N | -54 -90 108 106 | oven mouth glow, bread sign, chimney; oven flicker, steam/smoke | **approved** | #723 | Calibration (normal). Same footprint/scale as forge; differentiated by plaster walls + terracotta hip roof + glowing oven hero, bread sill, pretzel sign, chimney smoke, oven steam. |
| hearth | S | -50 -88 100 104 | central fireplace/hearth glow; fire flicker, smoke | todo | — | |
| mill | L | -70 -124 140 140 | watermill/windmill with rotating sails; windmill, pollen, smoke | todo | — | |
| inn | N | -60 -108 120 124 | multi-storey lodge, sign, warm windows; sign sway, smoke | todo | — | |
| granary | N | -50 -96 100 112 | tall grain store, vents; grainfall, dust | todo | — | |
| larder | S | -50 -88 100 104 | cold store, shutters; subtle steam | todo | — | |
| caravan_post | N | -60 -100 120 116 | tent/wagon + post, banner; banner sway, lantern | todo | — | |
| kitchen | N | -58 -100 116 116 | cooking range, pots, chimney; steam, fire flicker | todo | — | |
| workshop | N | -64 -104 128 120 | open workbench, tools, gears; gear turn, sparks | todo | — | |
| powder_store | N | -59 -102 118 118 | reinforced magazine, barrels; lantern, warning glow | todo | — | |
| portal | N | -52 -116 104 128 | arch with swirling energy; portal swirl/pulse, particles | todo | — | |
| housing | S | -46 -76 92 92 | cottage, chimney, garden; smoke, window glow | todo | — | Shared by housing2/housing3. |
| silo | S | -62 -108 124 124 | tall cylinder + conical cap; grainfall, vent | todo | — | |
| harbor_dock | L | -68 -120 136 136 | pier over water, moored boat, crane; waves/splash, boat bob, net sway | todo | — | |
| fishmonger | N | -58 -100 116 116 | stall, fish display, awning; awning sway, gull | todo | — | |
| smokehouse | S | -53 -90 106 106 | smoking hut, vent smoke; heavy smoke, ember glow | todo | — | |
| clock_tower | N | -69 -122 138 138 | tall tower + clock face + bell; hands sweep, bell swing, sway | todo | — | |
| apothecary | N | -53 -90 106 106 | shop with bottles, mortar sign; bubbling, glow | todo | — | |
| sawmill | N | -62 -108 124 124 | mill + saw blade, log ramp; blade spin, sawdust | todo | — | |
| watchtower | N | -61 -106 122 122 | timber tower + brazier + banner; torch flicker, guard walk, banner sway | todo | — | |
| stable | N | -56 -96 112 112 | long stable, dutch doors, hay; horse, hay sway | todo | — | |
| apiary | S | -44 -72 88 88 | hives, flowers; bees/pollen drift, sway | todo | — | |
| chapel | N | -68 -120 136 136 | nave + steeple + bell + stained glass; bell sway, candle glow | todo | — | |
| brewery | N | -56 -96 112 112 | brewhouse, vats, barrels; steam, drip, fire | todo | — | |
| observatory | L | -62 -108 124 124 | domed roof + telescope; dome/telescope rotate, star twinkle | todo | — | |

## Log

- **Infra (this branch):** isoKit + auto-discovery + Gallery tab + skill +
  tracker stood up. Forge wired as the approved reference. Calibration batch:
  lighthouse (tall) / barn (large) / bakery (normal) — to lock scale + tiers,
  then refine the skill.
