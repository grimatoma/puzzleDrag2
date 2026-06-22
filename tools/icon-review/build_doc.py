#!/usr/bin/env python3
"""Assemble the animated-canvas-icon review into one self-contained HTML gallery.

Reads the rendered assets under docs/canvas-tile-review/ (gifs/, category/,
contact-sheet.png, metrics.json) and the condensed per-icon critique + global
synthesis embedded below, and writes docs/canvas-tile-review/index.html.

Run from repo root:  python tools/icon-review/build_doc.py
The HTML references the co-located gifs/ & category/ images by relative path,
so keep index.html inside docs/canvas-tile-review/.
"""
from __future__ import annotations
import html, json, os

OUT = "docs/canvas-tile-review"

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL SYNTHESIS (authored from the 20 module reviews)
# ─────────────────────────────────────────────────────────────────────────────
VERDICT_INTRO = """
<p><strong>The static art is the strong part.</strong> All 159 icons share one disciplined
"glossy sticker" language — a dark outline, a consistent top-/top-left key light, gradient-shaded
bodies, and a soft elliptical ground-shadow — so at rest the library reads as one cohesive family.
The first-draft weakness is almost entirely <strong>motion</strong>. The set feels janky and cheap
not because the drawings are bad but because nearly every icon fakes life the same few ways — a
sliding glint, a glow pulse, a twinkle, some rising particles — laid over a body that never actually
moves, and because <em>none of the 12 animation principles</em> (anticipation, squash &amp; stretch,
overshoot, eased timing, follow-through, secondary motion) are applied. A minority of icons are
genuinely alive; they should become the benchmarks the rest are rebuilt against.</p>
"""

FINDINGS = [
    ("crit", "1 · &ldquo;Static body + animated overlay&rdquo; — the #1 systemic failure",
     "The object's geometry never deforms; life is faked with a glint/sheen sweep, a glow pulse, "
     "twinkles, or particles painted over a frozen shape. Pervasive across <b>ores</b> (all eight "
     "have a measured 0&nbsp;px body delta), <b>treasure</b>, <b>weapons</b> (glint-only), the "
     "<b>gem</b> trio, <b>drinks</b> (rigid vessels), <b>furniture</b> (lamp/table/mirror/bookshelf "
     "never move — only their light does), <b>nature</b> (light-cycling), <b>festive</b> "
     "(holly/candy-cane), and several <b>instruments</b>. <b>Fix:</b> animate the OBJECT first "
     "(breathe / squash / bob / tilt) and demote the overlay to a secondary accent."),
    ("crit", "2 · Rigid whole-sprite rotation (the brief's named failure)",
     "<b>spell_wind</b>, <b>reef_starfish</b>, <b>astral_galaxy</b>, <b>arcane_pentacle</b>, "
     "<b>instr_bell</b>, <b>instr_tambourine</b>, the weapon pendulums and <b>bld_windmill</b> "
     "(constant-velocity) all rotate the entire drawing about one pivot. It reads as a spinning "
     "logo/hubcap, not character — and on symmetric shapes (pentacle, starfish, galaxy) it's barely "
     "perceptible despite a high motion score. <b>Fix:</b> articulate (per-part motion, traveling "
     "waves, sensible pivots) instead of rotating the whole sprite."),
    ("crit", "3 · Dead / near-static icons (motion &lt; ~3)",
     "On the board these are indistinguishable from still images: <b>bld_tower</b> (0.1), "
     "<b>bld_barn</b> (0.17), <b>drink_milk</b> (0.57), <b>furn_bookshelf</b> (0.61), "
     "<b>ore_crystal_vein</b> (0.87), <b>festive_holly</b> (1.21), <b>cozy_mailbox</b> (1.22), "
     "<b>treasure_map</b> (1.63), <b>weapon_dagger</b> (1.69), <b>weapon_mace</b> (1.73), "
     "<b>arcane_potion_blue</b> (1.75), <b>gem_emerald</b>, <b>arcane_runestone</b>, "
     "<b>wtool_nail</b>. Several have animation code that is simply sub-perceptible at size."),
    ("crit", "4 · Blank rest frames — unusable as idle tiles",
     "<b>astral_shooting_star</b> and <b>weather_comet</b> are completely EMPTY at frame 0 — the "
     "subject only exists mid-flight as it streaks across and off the canvas. A tile must always "
     "show its subject at rest. <b>Fix:</b> park the subject in-frame and make the streak a "
     "periodic event."),
    ("warn", "5 · None of the 12 animation principles (the root cause of &ldquo;cheap&rdquo;)",
     "Almost every animation is a pure linear <code>Math.sin(t&middot;f)</code> with no eased "
     "in/out, no anticipation wind-up, no overshoot/settle, no follow-through/overlap, and no "
     "squash &amp; stretch. This single gap explains most of the &ldquo;janky&rdquo; feel. It is "
     "the highest-leverage thing to fix set-wide."),
    ("warn", "6 · Shadows don't react to motion",
     "Ground-shadow ellipses stay frozen while subjects bob, hop, and breathe, so contact is "
     "broken (pets, crops, drinks, &hellip;). <b>Fix:</b> couple shadow scale/offset inversely to "
     "vertical motion — the one cheap change that grounds everything."),
    ("warn", "7 · Framing / centering is inconsistent",
     "Everything is pinned to a <code>y=22</code> shadow baseline regardless of subject height, so "
     "short subjects float with dead air above: <b>treasure_gold_bars</b> (31&nbsp;u empty on top), "
     "<b>wtool_drill / saw / wrench</b> (off ~8&ndash;13&nbsp;u), <b>instr_fiddle</b> (off_x 9), "
     "<b>arcane_magic_dust</b> (off_x 7.1), <b>crop_peas</b> (off_y 8.4), <b>drink_tea</b> "
     "(off_y 9.1). <b>Fix:</b> center each subject's bounding box; don't pin to a shared baseline."),
    ("warn", "8 · Scale / visual-weight drifts within and across modules",
     "<b>bug_dragonfly</b> is a thin stick next to <b>bug_snail</b>'s boulder; <b>weapon_dagger</b> "
     "is half the mass of the shield; the coffee/tea saucers read ~50% bulkier than the narrow "
     "drink glasses. Establish a target footprint band so a mixed board reads evenly."),
    ("info", "9 · Motion-score caveat",
     "A high motion number is NOT proof of good motion — a rigid rotation or a bright sliding glint "
     "rectangle inflates pixel-change while reading as lifeless. Judge perceived character, not the "
     "metric. (The metric is still great for finding the <em>dead</em> end of the scale.)"),
    ("warn", "10 · Shared-helper bugs cause &ldquo;jank&rdquo; across many icons at once",
     "<b>treasure</b>'s <code>glintSweep()</code> emits a hard-edged rectangle that leaks past loose "
     "clips (a compositing-glitch look on coin_stack &amp; chest); <code>sweepPhase()</code> in "
     "<b>ores</b>/<b>treasure</b> is a triangle wave that hard-resets (a teleport, not an eased "
     "return); <b>buildings</b>' <code>flicker()</code> only swings alpha 0.82&ndash;1.0 — "
     "imperceptible, yet it's the <em>only</em> animation on tower &amp; barn. Fixing these helpers "
     "cleans up many icons in one move."),
    ("info", "11 · Loop seams",
     "Incommensurate sine frequencies or sawtooth resets break seamless looping (arcane_crystal_ball "
     "spin, the candle, several glint sweeps). <b>Fix:</b> drive loops off "
     "<code>phase = 2&pi;&middot;f/loopLen</code> so they tile exactly."),
    ("info", "12 · The overlay tricks are over-used as a crutch",
     "Glint-sweep + twinkle + glow-pulse appear in nearly every module, so even though the static "
     "art is nicely varied, the <em>approach to motion</em> feels samey across the whole set. "
     "Variety of <em>gesture</em> (peck, snip, ring, drip, flutter, jet) is what's missing."),
]

BENCHMARKS = ("crop_sunflower, pet_dog, pet_frog, bug_firefly, reef_jellyfish, weapon_staff, "
              "instr_drum, drink_water, bld_windmill, bld_watermill, cozy_wind_chime, "
              "cozy_birdhouse, furn_fireplace, furn_clock, spell_arcane_missile, "
              "spell_shield_bubble, weather_sun_cloud, astral_eclipse, arcane_candle, "
              "arcane_crystal_ball, gem_opal, dish_honey_pot")

DIRECTION = """
<p>The target is <strong>playful, characterful idle motion with Warcraft-3 unit-idle energy</strong>
— each idle a small <em>gesture</em> appropriate to the subject (a chicken pecks, a tree breezes, a
gem glints-and-sparkles, a fish bobs &amp; flicks, a bell rings). Idles need not be uniform, but they
must share one consistent <em>style and energy level</em>. Three rules turn this set from first-draft
to compelling:</p>
<ol>
<li><strong>Animate the body, not the light.</strong> Lead with real deformation (breathe, squash &amp;
stretch, bob, tilt, articulate); keep the glint/twinkle/glow as a <em>secondary accent</em>, never the
whole show.</li>
<li><strong>Apply the 12 principles.</strong> Every idle gets eased timing (not linear sine),
anticipation before a beat, an overshoot + settle after it, and a touch of secondary/overlapping
motion so parts trail the lead.</li>
<li><strong>Prefer event-driven beats over constant motion.</strong> A peck → rest → peck reads as
alive; a perpetual metronome sine reads as a machine. Give most icons a rest pose and a periodic
&ldquo;moment.&rdquo;</li>
</ol>
<p><strong>Shared standards to adopt set-wide:</strong> a small easing/helper library
(<code>easeInOut</code>, <code>easeOutBack</code> for overshoot); a &ldquo;shadow couples to vertical
motion&rdquo; rule; a centering + target-footprint pass; fixes to the shared <code>glintSweep</code> /
<code>sweepPhase</code> / <code>flicker</code> helpers; a &ldquo;never blank at rest&rdquo; rule; and a
&ldquo;loop by phase&rdquo; rule for seamless cycles.</p>
"""

ROADMAP = [
    ("P0 — Correctness (do first)",
     ["Fix the two <b>blank rest frames</b> (astral_shooting_star, weather_comet).",
      "Resurrect the <b>truly dead</b> icons (tower, barn, milk, bookshelf, crystal_vein, holly, "
      "mailbox, map, dagger, mace, both potions, runestone, nail) — each needs a real, visible idle.",
      "Fix the <b>shared-helper bugs</b> (glintSweep feather + tight clip + lower intensity; "
      "sweepPhase eased return; flicker amplitude) — high leverage, many icons at once.",
      "Fix the <b>worst framing</b> (gold_bars, drill, saw, wrench, fiddle, magic_dust, tea, peas)."]),
    ("P1 — Kill the anti-patterns",
     ["Replace <b>&ldquo;static body + overlay&rdquo;</b> with object deformation on the big offenders "
      "(all ores, most treasure, the drink vessels, furniture, the gem trio, nature's light-cyclers).",
      "Replace <b>rigid whole-sprite rotation</b> with articulation (wind, starfish, galaxy, pentacle, "
      "bell, tambourine, windmill)."]),
    ("P2 — 12-principles polish pass",
     ["Add anticipation + overshoot + eased timing + secondary motion to <em>every</em> idle.",
      "Convert constant sines into event-driven beats (peck / snip / ring / flash / drip).",
      "Couple all shadows to motion; normalize scale/visual-weight to a target band."]),
    ("Infra & verification",
     ["Build the shared easing + helper library and a centering/scale utility.",
      "Run a loop-seam audit (drive every loop by phase).",
      "Re-run the capture + montage/GIF review (this same pipeline) to verify the rebuild."]),
]

# ─────────────────────────────────────────────────────────────────────────────
# PER-ICON CONDENSED CRITIQUE
# icon = (key, verdict, quality, motion, reads, note)
#   verdict ∈ Ship|Minor|Major|Replace   motion ∈ Great|Good|Weak|Rigid|Dead
# ─────────────────────────────────────────────────────────────────────────────
MODULES = [
 dict(name="crops", title="Crops & Produce", group="Farm & Flora", board=True,
  summary="Coherent gradient-sticker art; the split is motion energy — sunflower/wheat/peas deform, "
          "while watermelon/pumpkin/corn are near-frozen bodies under a sliding glint.",
  priorities="Kill the frozen-body+glint pattern (melon/pumpkin/corn) · couple every shadow to the "
             "subject · fix peas/wheat framing and add eased overshoot.",
  icons=[
   ("crop_sunflower","Minor",7,"Good","Yes","Head shears off the stem (two sway pivots) and the bee-sparkle reads as a glitch; anchor the head to the stem tip, add eased overshoot + a petal-fan wave."),
   ("crop_wheat","Minor",6,"Good","Marginal","Sits low with starburst awns that look like noise and a rigid clump sway; re-center, curve the awns, add a per-stalk traveling-wave bend."),
   ("crop_corn","Major",7,"Rigid","Yes","Cob near-frozen; only a hard glint rectangle slides over it. Replace with an eased nod + a fake axial roll of the kernel grid."),
   ("crop_peas","Minor",7,"Good","Marginal","Whole pod rigidly bobs/tilts and floats low (off_y 8.4); raise it, animate the pod opening/closing at the hinge with overshoot."),
   ("crop_watermelon","Major",8,"Dead","Yes","Beautiful art, 100% static except a sliding glint + tiny sparkles; add a springy wobble-and-plop (squash/overshoot) and demote the glint."),
   ("crop_pumpkin","Major",8,"Weak","Yes","2% breathe is invisible and the rib glint slides over a frozen body; add a heavy squash-settle that bulges the ribs and drives the highlights."),
  ]),
 dict(name="nature", title="Nature Bits", group="Farm & Flora", board=True,
  summary="Calm/sleepy and too samey — 6 of 8 are light-cycling on a static body with no real "
          "deformation; leaf & cattail rotate as one welded piece.",
  priorities="Replace light-sweeps with real deformation · articulate the leaf/cattail (pivot + "
             "follow-through) · unify one light direction + a shared sparkle accent.",
  icons=[
   ("nature_leaf","Major",6,"Weak","Yes","Pivots from its center (wags, doesn't flutter) with stuck-on highlights; pivot at the stem base, add a cantilever tip-curl + leaf twist."),
   ("nature_feather","Major",6,"Rigid","Yes","A smooth balloon vane that tips/slides as one piece; part the edge into barbs and run a traveling ripple down the vane with an edge-on flip."),
   ("nature_clover","Minor",7,"Weak","Yes","Leaflets are frozen; only a wash moves. Make each leaflet pop in sequence as the wash reaches it, ending on the lucky-sparkle."),
   ("nature_dewdrop","Minor",7,"Good","Yes","Good drip cycle, but the body barely jiggles and never necks/pinches; add squash-stretch + a real surface-tension pinch + a ripple."),
   ("nature_spiderweb","Minor",7,"Weak","Marginal","Rigid octagon that scale-shimmers as one ring; ripple a traveling wobble out from the hub and twang a strand when a dewdrop drops."),
   ("nature_cattail","Minor",7,"Good","Yes","Head/reed/blades sway as one rigid body; lag the heavy head behind the reed (follow-through) and shed fluff at the sway peaks."),
   ("nature_mushroom_cluster","Minor",7,"Weak","Yes","2% breathe is invisible and it sits low; give each cap a staggered squash-bob and an occasional spore puff."),
   ("nature_seashell","Major",6,"Dead","Yes","Body is 100% static under a flat sheen wipe; make it a living clam that opens/closes at the hinge with the rim lobes rippling."),
  ]),
 dict(name="critters", title="Critters (bugs)", group="Creatures", board=True,
  summary="Strong cohesive static, but motion splits into busy (bee/butterfly) vs essentially "
          "static (ladybug/caterpillar/ant) — and the 'busy' ones are width-scale flaps or rigid "
          "translation, not articulation. Amplitudes tuned far too small.",
  priorities="Triple every motion amplitude & stop translating whole sprites · fix the bee fuzz-fence "
             "· re-center/re-scale the dragonfly.",
  icons=[
   ("bug_bee","Minor",7,"Good","Yes","Wing 'flap' is a width-only squish and the fuzz tufts render as a beige barcode fence; rotate the wings, fix the fuzz, add a hover squash."),
   ("bug_butterfly","Major",6,"Rigid","Marginal","Wings flatten horizontally like a venetian blind (collapses to a sliver) and the palette is one muddy orange; foreshorten with tip-rotation, lift the wing roots."),
   ("bug_ladybug","Major",8,"Dead","Yes","Gorgeous static, but the shell-open is crushed to invisible and a spot tears at the seam; commit to a real wing-flash + fix the per-half spot/gloss."),
   ("bug_snail","Minor",7,"Weak","Marginal","Whole snail slides in place and the rigid shell wrongly squashes; confine squash/stretch to the foot, keep the shell rigid, add a traveling shell shimmer."),
   ("bug_dragonfly","Major",5,"Rigid","No","A 3px-thin body that darts as a rigid stick and sits low (detached shadow); thicken/raise/re-center it, render wings as ghosted blur, dart with anticipation."),
   ("bug_firefly","Minor",7,"Good","Marginal","Best motion (breathing glow) but the body just translates, the glow is off-center from the bug, and a missing shadow floats it; pump the abdomen with the glow + a flash spike."),
   ("bug_ant","Major",7,"Dead","Yes","The sophisticated tripod gait is invisible (thin dark legs on a jiggling body); thicken/brighten the legs, exaggerate the swing, bob the body with the gait."),
   ("bug_caterpillar","Major",8,"Dead","Yes","The most charming static, but the hump wave lifts only 1.6/64u (perceptually frozen) and the eyes are asymmetric; add a real bunch-and-stretch inchworm accordion."),
  ]),
 dict(name="pets", title="Pets & Baby Animals", group="Creatures", board=True,
  summary="Excellent, disciplined chibi craft; motion is the weak, samey part — every mammal is the "
          "same recipe: a rigid whole-body vertical bob + one wiggling appendage, with no torso "
          "squash, anticipation, or overshoot. Several bodies are fully frozen.",
  priorities="Kill the rigid whole-body translate — add torso squash & stretch · animate the frozen "
             "bodies (lamb/piglet/goat/hedgehog) · make shadows react + add eased beats.",
  icons=[
   ("pet_cat","Minor",7,"Weak","Yes","Sub-pixel breathe + a tiny tail; lead with a slow eased tail-flick (slow lift, snap, settle) + a real breathing torso."),
   ("pet_dog","Minor",7,"Good","Yes","Genuinely alive (fast tail wag) but the body rigidly bobs and the floppy ears read as horns; add a panting torso squash + bursty wag + head-tilt."),
   ("pet_rabbit","Major",7,"Rigid","Yes","Textbook rigid bob — the whole rabbit translates ±6px with only 10% squash; rebuild as a real hop (crouch anticipation → stretch launch → overshoot land)."),
   ("pet_chick","Minor",7,"Good","Yes","Good fuzz/wing life, but the peck is the whole body dropping with no anticipation; add a peck-and-perk with squash on contact + a wing shimmy."),
   ("pet_duckling","Minor",7,"Rigid","Yes","Waddle is a rigid rock+slide of the whole body; replace with an alternating-foot weight shift (plant one foot, step the other)."),
   ("pet_lamb","Major",7,"Weak","Yes","Dead wool body (1% breathe) with a talking head; add a deforming wool jiggle + a graze dip + a wool-shake."),
   ("pet_piglet","Major",7,"Weak","Yes","Frozen torso with a wiggling head; lead with the curly tail, add a breathing/bouncing body + a snout snuffle."),
   ("pet_goat_kid","Major",5,"Weak","Marginal","Worst composition (head jammed into the body, cross-eyed) on a dead torso with a loose-bobbing head; fix the art first, then a head-butt tease."),
   ("pet_hedgehog","Major",8,"Dead","Yes","Best static craft, near-zero motion (only spike tips lengthen 1.2px); add a breathing dome + a nose sniff + a startled spike-bristle beat."),
   ("pet_frog","Minor",7,"Good","Yes","One of two with real squash/stretch (the crouch); deepen/vary it, add eye swivels + a telegraphed mini-hop with overshoot."),
  ]),
 dict(name="reef", title="Reef & Sea", group="Creatures", board=True,
  summary="Two sub-families (warm crustaceans + cool jelly/octopus) that mostly move via a global "
          "transform of a rigid body; only the jellyfish truly deforms. No easing/anticipation anywhere.",
  priorities="Kill the rigid transforms (starfish spin, body translates) · add the 12-principles "
             "vocabulary · fix the lighthouse beam + give the jellyfish a shadow.",
  icons=[
   ("reef_jellyfish","Minor",7,"Good","Yes","Best deformation in module (bell squash + tentacle wave) but metronomic + missing a shadow; make it an eased jet-propulsion pulse, add a shadow for cohesion."),
   ("reef_octopus","Minor",7,"Weak","Yes","Most character, but tentacles barely move (<20% tip deflection), the head-gloss reads as a horn, and it sits low; amplify + curl the arms, fix the gloss, re-center."),
   ("reef_crab","Major",6,"Rigid","Yes","Whole crab rigidly slides side-to-side with buzzing flailing legs; replace with a tilt+alternating-leg gait + a staggered single-claw threat display."),
   ("reef_seahorse","Major",6,"Weak","Marginal","Dead body that rocks like a center-hinged metronome while the fin buzzes at freq 14 (8× too fast); flex the S-spine, slow the fin to a wave, animate the tail."),
   ("reef_starfish","Major",6,"Rigid","Yes","Pure rigid 360° spin (a pinwheel) burying a nice twinkle wave; kill the spin, add per-arm curl + a slow tilt so the twinkle shows."),
   ("reef_lighthouse","Major",6,"Rigid","Yes","Beam is two flat triangles flapping like bat-wings (khaki, not light) with a z-order bug over the roof + doubled static beams; rebuild as one front-sweeping beacon flash synced to the lamp."),
  ]),
 dict(name="ores", title="Ores & Minerals", group="Earth, Gems & Treasure", board=True,
  summary="Strong craft but FIVE are recolors of one grey ball, and all eight have a measured 0px "
          "body delta — every 'animation' is a glint wipe + sparkles painted on a statue.",
  priorities="Animate the body (a breathing scale + settle so the silhouette moves) · fix the "
             "floating overlay cracks · differentiate the idle per material.",
  icons=[
   ("ore_coal","Major",6,"Rigid","Marginal","Body 0px motion; the ember is a slow bruise-pulse and the cracks float on top as sticks; add a breathing ember + a crackle pop, drop the twinkle-stars."),
   ("ore_iron","Major",6,"Rigid","Yes","0px body, only a glint wipe; pulse the rust veins in a traveling wave that flares each specular, add a breathing scale."),
   ("ore_copper","Major",6,"Rigid","Yes","0px body; the nice verdigris shimmer is buried; bloom the patina organically + breathe the body + flare veins on the sweep."),
   ("ore_gold_nugget","Minor",7,"Weak","Yes","Liveliest ore (dual sweeps + wandering twinkle) but pillow-shaded bumps + 0px body; fix to one light, add a squash-jiggle, make the twinkle a 'ping'."),
   ("ore_silver","Major",6,"Rigid","Marginal","0px body, low contrast; flash the streaks as the mirror-bright sweep crosses them + add a breathing scale + a cool rim."),
   ("ore_obsidian","Major",7,"Rigid","Yes","0px body; the sheen teleports at the seam; add an eased tilt-sway of the shard + a caustic tip-flare + a refractive second sheen."),
   ("ore_sulfur","Major",7,"Weak","Yes","Crystals 0px (only a glow throb + tip twinkles); push the per-crystal shimmer into a traveling wave + breathe + a drifting spark; re-render the muddy base."),
   ("ore_crystal_vein","Major",7,"Dead","Yes","Deadest ore (0.87) — only the cavity glow breathes; make the geode 'awaken' (glow bleed onto the rim + shard shimmer + caustic flare) + a 1.02 body breathe."),
  ]),
 dict(name="gemsDishes", title="Gems & Dishes", group="Earth, Gems & Treasure", board=True,
  strips=["gems","dishes"],
  summary="Really two mini-sets that don't share a language. The gem trio (ruby/sapphire/emerald) is "
          "near-static glint-only; opal/amethyst & the food dishes are more characterful.",
  priorities="Give the gem trio a dip→snap→overshoot 'show-off' with a glint FLASH · fix soup steam "
             "(invisible) + stew's soap-ring bubbles · unify gem vs dish visual weight.",
  icons=[
   ("gem_ruby","Minor",7.5,"Weak","Yes","2.5% breathe is invisible; the only motion is a slow crawling sheen + a centerline stripe-facet; add a dip→snap→overshoot 'show-off' with a hard glint flash."),
   ("gem_sapphire","Minor",7.5,"Weak","Yes","Same as ruby, but the dark-bottom gradient swallows the faint sheen; raise the shine intensity + add the show-off rig (out of phase with ruby)."),
   ("gem_emerald","Major",7,"Dead","Yes","Deadest gem — a faint sheen sliding over a flat green table; add a ±5° rock + a sequential step-facet flash."),
   ("gem_amethyst","Minor",8,"Good","Yes","Has a glow pulse but never 'does' anything (and the glow is a circle on a tall cluster); race a pulse up each prism tip + a per-prism sway; clip the glow."),
   ("gem_opal","Minor",8,"Great","Marginal","Best motion (drifting hue-shift flecks) but the flecks read as soap bubbles + rainbow-disco hue; tighten to small angular flecks, constrain hue, add a periodic fire-flash."),
   ("dish_soup","Major",6.5,"Weak","Marginal","Steam is invisible (alpha 0.5, ~9% coverage) and the bits/ripple are sub-pixel; use fat soft steam plumes + a visible surface undulation + a simmer bubble."),
   ("dish_stew","Major",7,"Good","Yes","Bubbles render as hollow soap-rings (dark-edged) and steam is invisible; fill bubbles bright with a pop-ring, undulate the molten surface, add plumes."),
   ("dish_honey_pot","Minor",8.5,"Great","Yes","Best dish — a great stretch-drip, but the strand snaps back at the loop seam; pinch it off cleanly + a pool ripple on detach; let the dipper participate."),
   ("dish_cake","Minor",8,"Weak","Yes","Cake body is 100% static with an orphan candle-glow floating over the cherry; add a fresh-baked jiggle + either draw the candle or drop the glow."),
  ]),
 dict(name="treasure", title="Treasure & Loot", group="Earth, Gems & Treasure", board=False,
  summary="Lovely gold gloss, but the shared glintSweep is a hard rectangle that leaks past loose "
          "clips, everything is pinned to y=22 (short subjects float), and bodies are static.",
  priorities="Re-anchor vertical framing (don't pin to y=22) · fix the glintSweep helper (feather + "
             "tight clip + lower intensity) · add real body motion (settle/bob/tilt).",
  icons=[
   ("treasure_chest_open","Minor",7,"Good","Yes","Most alive (glow + sparkles) but the coins are bubble-wrap and the glint clip shows hard rectangular seams over them; clip per-coin circles + jostle the coins."),
   ("treasure_coin_stack","Major",5,"Rigid","Marginal","The glint clip is a loose rect that hangs off into empty space (dirty-rect glitch) and the stack is off-center; tighten the clip + recenter + wobble the top/lean coin."),
   ("treasure_gold_key","Minor",6,"Rigid","Yes","The glint washes the gold to chrome and the bow is a flat disc; lower the glint intensity, model the bow as a torus, dangle/turn the key."),
   ("treasure_crown","Minor",8,"Weak","Yes","Static body with blinking gems, floats a bit high; add a majestic bob+tilt with the ruby flaring at the top."),
   ("treasure_ring","Minor",8,"Good","Yes","Best idea — a glint that traces the band — but the body is static and sits low; rock the ring to show the stone, sync the gem bloom to the band-glint."),
   ("treasure_goblet","Minor",8,"Weak","Yes","Best gloss, but the drink bob is sub-pixel and it floats low/undersized; slosh the liquid surface (tilt + roll) and scale up."),
   ("treasure_gold_bars","Major",6,"Rigid","Marginal","31u of dead air on top (worst framing) on a glint-only dead pile; recenter, add a top-bar drop-and-settle that nudges the pair."),
   ("treasure_gem_pile","Major",6,"Weak","Marginal","Reads as an inverted fan, not a pile, and sits low; re-cluster into a heap, sweep one shared light across firing each gem, add a settle jitter."),
   ("treasure_map","Replace",4,"Dead","No","Reads as a lumpy sack/ravioli (only the red X reads) and the flutter puffs it like a balloon; redesign as a flat unfurled sheet that ripples like paper, ping the X."),
  ]),
 dict(name="drinks", title="Drinks", group="Food & Drink", board=False,
  summary="Disciplined glass language, but the vessels are 100% rigid — only the contents move, and "
          "energy ranges from genuinely alive (water) to dead (milk).",
  priorities="Give every vessel a subtle bob/tilt so none reads as a statue · make milk actually "
             "animate (its shimmer is occluded) · normalize footprint + boost contents-motion size.",
  icons=[
   ("drink_coffee","Minor",8,"Good","Yes","Best steam but parallel ribbons + a comma-handle + a static body; offset/curl the wisps, add a heat-breath bob, close/thicken the handle."),
   ("drink_tea","Minor",7.5,"Good","Marginal","A single wisp leaves a dead seam (no steam at frame 0) + a barely-swinging tag; add a 2nd wisp + a real pendulum tea-bag with follow-through; sits low."),
   ("drink_beer","Minor",8,"Good","Yes","Bubbles + foam motion are sub-pixel; enlarge/accelerate the bubbles with foam-puff pops + a creeping head + a mug bob."),
   ("drink_juice","Major",8,"Weak","Yes","Near-dead (garnish bob 0.5px, glass rigid); make the orange-slice nod like it's sliding + a sweeping straw glint + bigger bubbles."),
   ("drink_smoothie","Minor",8.5,"Good","Yes","Lively (jiggle + orbiting flecks + sparkle) but the flecks swim too fast/wide; re-time to a settle, slow the seeds near the bottom, one sparkle per loop."),
   ("drink_water","Ship",8.5,"Great","Yes","Gold standard (independent ice clink + bubbles + sweep); only add an ice→surface ripple cause/effect + a 2nd ice-cube face tone."),
   ("drink_wine","Major",8,"Rigid","Yes","Slosh is one rigid disc rotating in place (all on the same sine) + it pokes past the glass walls; phase-lag a wall-climbing slosh, clip to the bowl, tilt the glass."),
   ("drink_milk","Major",8,"Dead","Yes","Deadest drink (0.57) — the milk shimmer is occluded by the opaque fill; add a settling bob + a visible cream meniscus + a real shoulder glint + cap jiggle."),
  ]),
 dict(name="buildings", title="Buildings", group="Town & Decor", board=False,
  summary="Cohesive storybook craft, but motion is bimodal — windmill/watermill/stall are lively "
          "while tower(0.1)/barn(0.17)/church/castle are effectively frozen with one twitching ornament.",
  priorities="Resurrect the dead buildings (tower, barn) · make flicker() actually read · add a shared "
             "subtle 'building breathing' under the ornament accents.",
  icons=[
   ("bld_cottage","Minor",8,"Good","Yes","Best-built smoke loop; add a slow cozy-breath squash + a visible warm window flicker."),
   ("bld_windmill","Minor",8,"Great","Yes","Best motion-read but a constant-velocity rigid spin (strobing cross); ease it into gusts + per-blade motion-smear + a tower lean."),
   ("bld_watermill","Minor",8,"Good","Yes","The wheel lost its crisp rim and the chute is a blue plank; restore the rim, scroll water in the race, make the paddles 'catch' + splash."),
   ("bld_church","Major",7,"Dead","Marginal","The bell tip moves ~1px (invisible) and the bell/door glows merge into a gold column; ring the bell for real (±25°) with expanding sound rings."),
   ("bld_castle","Major",8,"Rigid","Yes","Only the flag moves; the entire keep is frozen; slow the flag to a grand billow + add living window/torch glows."),
   ("bld_tent","Minor",8,"Good","Yes","Only the hem ripples (apex pinned) and the pennant flutters nervously; make a full-canopy traveling wave easing to the apex + slow the pennant."),
   ("bld_market_stall","Minor",7,"Good","Marginal","Bottom-heavy/undersized and the sparkle teleports at the seam; recenter+upscale, fade the sparkle ends, add a bread/apple settle."),
   ("bld_barn","Major",8,"Dead","Yes","Effectively dead (0.17) — the weathervane is sub-pixel; add hay-dust motes + a breathing loft + a real vane + a door creak."),
   ("bld_tower","Major",7,"Dead","Yes","Deadest icon (0.1) — literally nothing moves; give the candle a real flicker + flame-lean + halo pulse and a readable finial vane."),
  ]),
 dict(name="cozyDecor", title="Cozy Decor", group="Town & Decor", board=False,
  summary="Strong, cohesive craft; the dominant idle is a single timid pendulum sway reused on four "
          "icons (too samey, too small), with two genuine wins (wind chime, the birdhouse bird-peek).",
  priorities="Make the mailbox actually do something · un-rigidify the street lamp (real moth + head "
             "creak) · raise sway amplitude + add anticipation/overshoot across the pendulums.",
  icons=[
   ("cozy_lantern","Minor",8,"Good","Yes","Good flame flicker but a too-timid 4° sway; make it a breeze-gust pendulum (anticipation→overshoot→damped settle) with the flame lagging."),
   ("cozy_street_lamp","Major",7,"Rigid","Marginal","Post 100% static — motion is glow + a tiny orbiting moth-dot; make the moth a real fluttering character that bumps the glow + a faint head creak."),
   ("cozy_fountain","Minor",7,"Good","Yes","Water 'breathes' rather than flows + a z-order issue at the spout; sell a pulsing jet with cascading beads + landing ripples; fix the column z-order."),
   ("cozy_wind_chime","Minor",8,"Great","Yes","Best motion (per-tube phase swing) but same-freq tubes realign + the clapper never strikes; vary freq by tube length + gust-driven + a real ting on contact."),
   ("cozy_mailbox","Major",8,"Dead","Yes","Best static, deadest motion (1.22) — the nudge fires 10% of the time & is sub-perceptible; make the flag snap up (anticipation→overshoot→flutter) + a box settle + a peeking letter."),
   ("cozy_flower_pot","Minor",7,"Weak","Marginal","Stiff-rod stem sway, top-heavy; make a traveling-wave bend with lagging blooms + a visiting bee/butterfly; light the leaves."),
   ("cozy_birdhouse","Minor",8,"Good","Yes","Best idea (the emerging bird peek) but a linear pop + a too-timid house sway; spring the bird with anticipation/overshoot + look-arounds + a reactive house sway."),
  ]),
 dict(name="furniture", title="Furniture", group="Town & Decor", board=False,
  summary="Strong static, but only point-light effects move — the furniture itself never breathes, "
          "settles, or deforms. Half the module is effectively dead.",
  priorities="Give the dead pieces (bookshelf, mirror) a real object idle · add object-level secondary "
             "motion to the flame icons · unify into one 'cozy-room breathing' energy.",
  icons=[
   ("furn_fireplace","Minor",8,"Good","Yes","Best motion (out-of-phase flames) but blobby flame tips + embers don't loop seamlessly; sharpen the tips, base-anchor the flames, add a settle+flare beat."),
   ("furn_lamp","Major",7,"Weak","Yes","Only the glow ring moves (lamp 100% static) + a hard halo edge + a ternary color-snap stutter; add a filament flicker + a shade-tilt sway + feather the halo."),
   ("furn_clock","Minor",8,"Good","Yes","Real eased pendulum (good) but a dead minute-hand + no bob lag; add bob follow-through + a case counter-rock + a stepped ticking minute-hand."),
   ("furn_table","Major",7,"Weak","Marginal","Only the candle flame moves (table+candle frozen) + an ambiguous 2-leg silhouette; add a flame lean + a tabletop glow pool + a wax-drip; add a pedestal."),
   ("furn_mirror","Major",8,"Dead","Yes","Best static, dead motion (1.44) — a near-invisible sheen wipe; make the glint a real event (calm→fast sweep + star-pop) + an easel rock; restore the two static sheens."),
   ("furn_bookshelf","Major",8,"Dead","Yes","Deadest (0.61) — an 8%-opacity shimmer + a sub-pixel mote; add a book tip-and-right with neighbor jostle OR a swaying plant + a visible firefly + a real spine glint."),
  ]),
 dict(name="festive", title="Festive / Holiday", group="Town & Decor", board=False,
  summary="Tight palette and clean craft; motion energy is uneven (snowman/bell/gingerbread lively, "
          "holly/candy-cane dead) and the twinkle-overlay is carrying icons with no real motion.",
  priorities="Give holly & candy-cane real deformation · fix the gift's dead-time (60% frozen) · add "
             "anticipation/overshoot to the pendulum icons.",
  icons=[
   ("festive_snowman","Minor",8,"Good","Yes","Good breathing bob + snow, but the scarf-tail fringe floats detached like legs + the neck-wrap is rigid; drive the whole scarf from one phase + a weight-shift lean."),
   ("festive_gift","Major",7,"Weak","Yes","Dead ~60% of the loop (a buzz-shake every 2.4s) with no squash; make a continuous can't-wait wiggle (squash/hop/overshoot) with no dead frames."),
   ("festive_wreath","Minor",8,"Weak","Yes","Ring is fully static (only lights twinkle + bow tails sway); add a hanging-door sway + a plush breathing scale."),
   ("festive_bell","Minor",8,"Good","Yes","Best-realized (swing+clapper+waves) but a linear metronome; add anticipation/overshoot + dome squash + lag the holly/ribbon; ring on alternating swings."),
   ("festive_ornament","Minor",8,"Good","Yes","Good pendulum + specular sweep, but linear + the hook doesn't track the swing; add overshoot/settle + fix the hook + sync the sparkle to the sweep."),
   ("festive_candy_cane","Major",8,"Dead","Yes","Effectively static (2.15) — a glint on a frozen cane; add a balance bob-and-lean + a lagging hook wobble; align the glint to the tilted axis."),
   ("festive_gingerbread","Minor",8,"Good","Yes","Good dance idea but a fast double-freq bob that strobes + rigid limbs; slow the bob to match the rock, add squash + counter-swinging arms."),
   ("festive_holly","Major",8,"Dead","Yes","Dead (1.21) — the leaf rotate is a CONSTANT (no time term); add counter-swaying leaves with tip-curl + a berry-cluster jiggle; nudge up/scale."),
  ]),
 dict(name="weather", title="Weather", group="Sky & Weather", board=False,
  summary="Cloud-based icons cohere; particles do all the work while the hero bobs ±1px. Three icons "
          "(rainbow/crescent/fog) are pure shimmer with no character, and comet is blank at rest.",
  priorities="Fix comet's blank frame-0 + rebuild its head/tail · add real deformation to the dead "
             "icons · unify scale + fix the broken end-clouds.",
  icons=[
   ("weather_rain_cloud","Minor",7,"Good","Yes","Cloud bob is 1.2px (frozen); only rain moves; add a swell-and-pour cycle (squash/darken → burst) with splashes."),
   ("weather_snow_cloud","Minor",7,"Good","Marginal","Flakes are sub-threshold asterisks; make 3-4 bigger hexagonal tumbling flakes + a cloud 'shiver' puff."),
   ("weather_lightning","Minor",6,"Good","Yes","The bolt never re-strikes (a lit decal that brightness-strobes) + crude geometry; make a real discharge cycle (anticipation→snap→afterglow) with a re-randomized jag."),
   ("weather_comet","Major",4,"Rigid","No","BLANK at frame 0 (flies off-screen) + the head is a magnifying-glass ring + a flat-quad tail; anchor it in-frame, bloom the head (no ring), flicker a tapering tail."),
   ("weather_sun_cloud","Ship",8,"Good","Yes","Best in module (eased rays + sun breathe + cloud drift); only polish — sync the ray-pulse to the sun breathe + arc the cloud drift."),
   ("weather_rainbow","Major",5,"Weak","Marginal","End-clouds are broken (highlight strokes cross the interior as X's) + a dead opacity shimmer; rebuild the clouds + a draw-on shimmer-sweep with bouncing end-clouds."),
   ("weather_crescent_moon","Major",6,"Weak","Yes","The highlight is on the wrong (dark) edge + a dead body (only the halo breathes); fix the lit-limb highlight + a sleepy nod + staggered star-bursts."),
   ("weather_fog","Minor",6,"Good","Marginal","Solid horizontal parallax but purely a conveyor slide (no billow); add vertical breathing + undulating bands + a faint silhouette behind to sell 'fog'."),
  ]),
 dict(name="celestial", title="Celestial", group="Sky & Weather", board=False,
  summary="Cohesive top-left-lit bodies; the dominant idle is a glow-pulse + a slow global rotate, so "
          "most read as 'rigid' (galaxy/planet) and the field-disc icons muddy at size. One blank-at-rest.",
  priorities="Fix shooting_star's empty rest frame · make the galaxy actually spiral (differential "
             "rotation) · add eased multi-beat motion to the breathe-and-spin idles.",
  icons=[
   ("astral_sun","Minor",8,"Good","Yes","Slow rigid ray-spin with tiny shimmer; make the rays ease-pop in a traveling wave + a unified pulse + a specular wink."),
   ("astral_full_moon","Minor",7,"Weak","Yes","Static disc + glow pulse + a flat shimmer wipe; add a libration wobble (drift the gradient) + crater glints."),
   ("astral_ringed_planet","Major",7,"Rigid","Marginal","The moon orbits on a wire (drawn always-on-top, breaking depth) over a static planet; scroll the planet bands (spin) + a ring-tilt breathe + depth-sort the moon."),
   ("astral_shooting_star","Major",4,"Rigid","No","BLANK at frame 0 (a straight-line fly-by) — unusable at rest; park a twinkling star, then an arced+eased shoot with squash & a trail, settling on the rest twinkle."),
   ("astral_constellation","Minor",6,"Weak","Marginal","A translucent field-disc muddies the read; only nodes twinkle; drop/darken the field + run a light pulse along the lines igniting each node."),
   ("astral_galaxy","Major",5,"Rigid","No","Arms read as a beaded oval ring, not a spiral, and a rigid rotate is imperceptible; rebuild as log-spiral arms + differential rotation (inner faster)."),
   ("astral_north_star","Minor",7,"Weak","Marginal","Low-contrast white-on-pale + an in-place pulse; add a beacon bloom (spike overshoot + cross-flare) + streaking lens-flare beads + a deeper-blue rim."),
   ("astral_eclipse","Minor",8,"Good","Yes","Best motion (staggered prominence flares) but a wobbling diamond-bead + 4 uncoordinated sines; lock to one master pulse + one decisive bead flash."),
  ]),
 dict(name="arcane", title="Arcane", group="Magic", board=False,
  summary="Strong cohesive jewel-tone craft; motion splits into a lively candle/orb vs three "
          "near-static pieces (potions, runestone). The default is 'static body + animated overlay'.",
  priorities="Kill the frozen-body pattern (potions/runestone/dust) · re-conceive the pentacle (no "
             "rigid spin) · fix magic_dust framing + standardize a stronger glow-pulse.",
  icons=[
   ("arcane_candle","Minor",8,"Great","Yes","Real flame deformation (benchmark); the layered sines don't loop cleanly — retune to integer multiples + add a gust-gutter-recover beat."),
   ("arcane_potion_red","Major",7,"Weak","Yes","Frozen flask; only tiny bubbles + a sub-pixel surface wave; add a bob+rock with a lagging liquid slosh + a bubble-pop sparkle beat."),
   ("arcane_potion_blue","Major",7,"Dead","Yes","Deadest (1.75) + a bottom-heavy half-empty cone; raise the liquid, stream a fizzing column, add a reaction-surge squash; re-center up."),
   ("arcane_crystal_ball","Minor",8,"Good","Yes","Genuine internal swirl, but the spin (t*0.5) won't loop and the claws are faint scratches; phase-lock the spin + a scrying-pulse + thicken the claws."),
   ("arcane_runestone","Major",7,"Dead","Yes","Near-dead (2.48) — the stone is frozen, runes only brightness-pulse; float the tablet + ignite the runes stroke-by-stroke with sparks; make the sweep visible."),
   ("arcane_magic_dust","Major",7,"Weak","Yes","Worst framing (off_x 7.1, all action upper-right) on a frozen pouch; re-center, tilt-and-pour a real dust stream with a squash, pop sparkles along it."),
   ("arcane_pentacle","Major",7,"Rigid","Yes","Rigid 360° spin of a 5-fold-symmetric sigil (a hubcap); counter-rotate the rings + a ritual draw-on/pulse with sequential point-ignite."),
  ]),
 dict(name="spells", title="Spell FX", group="Magic", board=False,
  summary="Cohesive single-hue glow-disc FX; only two icons move the subject at all (wind = rigid "
          "rotation; arcane_missile = real ring tilt). Five never deform their core shape.",
  priorities="Kill the rigid rotation on wind (traveling gusts instead) · add real shape life to the "
             "five static FX · normalize motion energy to a shared mid-tempo beat.",
  icons=[
   ("spell_fireball","Major",6,"Rigid","Yes","Rigid orb (sub-pixel breathe) + a muddy brown tail + stiff triangular tongues; recolor the fire, breathe/flare the orb asymmetrically, stream the tail as a wave."),
   ("spell_ice_shard","Major",6,"Dead","Yes","100% static crystals + a hard center 'zipper' line; add a per-facet shimmer-sweep + a recrystallize pop + a frost burst."),
   ("spell_lightning","Major",5,"Rigid","Marginal","The bolt never changes path (a lit decal) + a white-core registration bug (scale 0.7 left-shifts it) + a lollipop dot; a periodic discharge with a re-randomized jag."),
   ("spell_heal","Minor",7,"Weak","Yes","Static cross with a glow throb (alpha, not scale); make it a heartbeat breath (scale, lub-dub) emitting motes on each beat."),
   ("spell_shield_bubble","Minor",8,"Good","Yes","Cleanest craft + good shimmer, but the dome never deforms; add a breathing membrane + a periodic impact ripple/squash."),
   ("spell_poison","Major",6,"Weak","Yes","Rigid blob (only the glow pulses) + a tiny floats-down drip; jiggle/slosh the blob (surface tension) + a bigger gravity-accelerated drip; re-center up."),
   ("spell_wind","Major",5,"Rigid","No","The brief's #1 failure — the whole glyph rigidly rotates (a spinning logo, doesn't read as wind); replace with L→R traveling gust streaks + tumbling leaves."),
   ("spell_arcane_missile","Minor",7,"Good","Yes","Best motion (a real ring tilt) but the orb is a rigid circle + a slight right-lean; add a propulsion squash-stretch + eased ring overshoot + a streaming tail; re-center."),
  ]),
 dict(name="instruments", title="Instruments", group="Tools, Music & Arms", board=False,
  summary="The most cohesive-looking set in the library; motion energy is 18× spread (dead fiddle → "
          "wildly-swinging bell) and the default is a static body with a cosmetic overlay.",
  priorities="Kill the static-body+overlay default (give each instrument its own small deformation) · "
             "re-center fiddle (off_x 9) + normalize bell/tambourine energy · add follow-through.",
  icons=[
   ("instr_lute","Major",7,"Weak","Yes","Static body + a 22Hz string buzz that reads as noise; add a lazy-strum (anticipation dip → strum → damped string wave + overshoot)."),
   ("instr_drum","Minor",8,"Good","Yes","Benchmark (real strike + head squash + ripple) but symmetric/metronomic; add anticipation + an asymmetric snap + a dum-tak rhythm with a settle jiggle."),
   ("instr_flute","Major",7,"Weak","Yes","Static tube + a thin linear glint; add a breath-bob + finger trills with note recoil."),
   ("instr_horn","Major",7,"Weak","Marginal","Inert tube — only sound arcs + a glint move; add an inhale/flare squash on the bell synced to the arcs + a lagging cord swing; re-center."),
   ("instr_fiddle","Major",7,"Dead","Yes","Worst centering (off_x 9) + the body never moves while the bow slides on rails; recenter, arc the bow with eased reversals + a body weight-shift."),
   ("instr_bell","Major",8,"Rigid","Yes","The whole assembly rigidly swings (highest score, rigid) + the clapper is invisible; add easing/overshoot + lag the dome (squash) + a visible striking clapper."),
   ("instr_pan_flute","Major",7,"Weak","Marginal","Tubes static; the nice L→R note glissando has no matching motion; tilt toward the sounding tube + a breath sweep; thicken the speculars."),
   ("instr_tambourine","Minor",7,"Rigid","Yes","The whole frame jitters at 30+Hz (a buzz, won't loop) over a nice per-disc rattle; convert to a shake-shake-rest rhythm with eased tilts + disc follow-through."),
  ]),
 dict(name="weapons", title="Weapons & Armor", group="Tools, Music & Arms", board=False,
  summary="The most consistent static craft in the project, but the dominant idle is a glint-sweep on "
          "a rigid body; only bow/crossbow (string twang) and staff/helmet have real motion.",
  priorities="Give every weapon a body idle (float/bob + a pommel/base-pivot sway) · keep the glint as "
             "a secondary accent · normalize visual weight (dagger/spear are too thin) + recenter bow/axe.",
  icons=[
   ("weapon_sword","Minor",7,"Weak","Yes","Glint-only on a static blade + a blown-out fuller; add a pommel-pivot sway with the glint timed to the apex."),
   ("weapon_shield","Minor",7.5,"Weak","Yes","Static body + a 'selected'-style emblem pulse; rock the shield on its point with the star twinkling only as the glint passes."),
   ("weapon_bow","Minor",6.5,"Good","Marginal","Real string twang (good) but rigid limbs + off-center left; recenter, flex the limbs with the twang."),
   ("weapon_axe","Minor",7,"Weak","Yes","Glint-only + off-center left; pendulum the head with weighted easing (slow rise, fast fall, overshoot)."),
   ("weapon_staff","Ship",8.5,"Good","Yes","Top-tier caster idle (glow breathe + orbiting sparks); add a slow shaft sway and slow the spark orbit."),
   ("weapon_dagger","Major",7,"Dead","Yes","Provably 0px motion (a glint on a frozen blade) + the thinnest mass; add a twitchy flip-wobble + scale it up."),
   ("weapon_spear","Minor",7,"Weak","Marginal","Glint-only on a 70%-empty shaft; sway from the butt like a grounded sentry spear + widen the tip."),
   ("weapon_mace","Major",7,"Dead","Yes","Static head + flat unshaded spikes; pendulum the top-heavy head with weighted easing + shade the spikes."),
   ("weapon_helmet","Minor",7.5,"Good","Yes","Good plume flutter but a hard sticker-like specular + dead steel; add a slow head-nod with the plume lagging + soften the gloss."),
   ("weapon_crossbow","Major",5.5,"Weak","No","Muddiest silhouette (a doubled black limb + a bolt impaling the bow); rebuild the limb as a filled crescent, route the string behind, recenter, flex the limbs with the twang."),
  ]),
 dict(name="workshopTools", title="Workshop Tools", group="Tools, Music & Arms", board=False,
  summary="Best-in-class static craft, but six of eight are a global rotate/slide of the whole tool "
          "with zero articulation, and framing is all over the place (drill/saw/wrench float).",
  priorities="Re-center drill/saw/wrench · replace rigid rotation with articulation (pivot the moving "
             "part, add anticipation + a work-moment recoil) · give the nail a real idle + make the drill spin.",
  icons=[
   ("wtool_hammer","Minor",7,"Rigid","Yes","Best concept but pivots from the icon center (flailing) with no recoil + a mis-placed spark; pivot at the handle base — anticipation-lift → snap → recoil bounce, spark on the rotated face."),
   ("wtool_saw","Major",6,"Good","Marginal","Badly off-center (off_y 8.8), the blade slides off-frame, sawdust floats off the cut; recenter on the kerf + push/draw asymmetry + a catch-judder + dust from the teeth."),
   ("wtool_drill","Major",5,"Rigid","No","Worst framing (lopsided) + a fake spin (flutes only scroll, nothing rotates) + a floating spark; recenter, sell real rotation (rotating blur arcs), jitter the bit not the body."),
   ("wtool_scissors","Minor",7.5,"Good","Yes","Best framing + real articulation, but the snip barely opens + no snap/overshoot; widen the spread, snap shut fast with a recoil + a pivot glint."),
   ("wtool_wrench","Major",6,"Rigid","Marginal","Off-center + a rigid whole-tool rotation (swings like a lever) with no bolt-grip; recenter, keep the hex fixed — torque → hard-stop recoil, flex the jaw."),
   ("wtool_screwdriver","Minor",7,"Rigid","Yes","Best gloss but a whole-tool tilt (not an axial twist) + invisible tip-ticks; sell axial rotation via cycling handle ribs + a thick tip-tick ring + press anticipation."),
   ("wtool_paintbrush","Minor",7.5,"Good","Yes","Good bristle splay but a symmetric wiggle + a detached floor smear; commit a directional stroke with the smear anchored under the tip + asymmetric speed."),
   ("wtool_nail","Major",7,"Dead","Yes","Near-dead (2.55) — a glint on a frozen nail + a mis-placed head spark; add a periodic drive-down tap (anticipation→dip→recoil) with the spark on the head + shadow squash."),
  ]),
]

# ─────────────────────────────────────────────────────────────────────────────
V_COLOR = {"Ship": "#3fb950", "Minor": "#2dd4bf", "Major": "#f0a020", "Replace": "#f85149"}
M_COLOR = {"Great": "#3fb950", "Good": "#7ee787", "Weak": "#f0a020", "Rigid": "#fb8c3b", "Dead": "#f85149"}
GROUP_ORDER = ["Farm & Flora", "Creatures", "Earth, Gems & Treasure", "Food & Drink",
               "Town & Decor", "Sky & Weather", "Magic", "Tools, Music & Arms"]


def esc(s):
    return html.escape(str(s))


def main():
    metrics = json.load(open(f"{OUT}/metrics.json")).get("metrics", {})

    def icon_card(key, verdict, q, motion, reads, note):
        m = metrics.get(key, {})
        mscore = m.get("motion")
        dead = isinstance(mscore, (int, float)) and mscore < 3
        chips = []
        if mscore is not None:
            cls = "chip danger" if dead else "chip"
            chips.append(f'<span class="{cls}" title="objective motion score (pixels changed/frame); &lt;3 ≈ reads static">⟳ {mscore}</span>')
        offx, offy = m.get("off_x", 0), m.get("off_y", 0)
        if abs(offx) > 6 or abs(offy) > 6:
            chips.append(f'<span class="chip warn" title="subject offset from frame center (design units)">⊹ off {offx:+g},{offy:+g}</span>')
        if m.get("blank"):
            chips.append('<span class="chip danger" title="frame 0 is empty">∅ blank rest</span>')
        return f"""
      <div class="card" id="{esc(key)}">
        <div class="gifwrap"><img loading="lazy" src="gifs/{esc(key)}.gif" alt="{esc(key)}"></div>
        <div class="cardbody">
          <div class="key">{esc(key)}</div>
          <div class="badges">
            <span class="badge" style="--c:{V_COLOR.get(verdict,'#888')}">{esc(verdict)}</span>
            <span class="badge" style="--c:{M_COLOR.get(motion,'#888')}">{esc(motion)} motion</span>
            <span class="qual">{esc(q)}/10</span>
            <span class="reads reads-{reads.lower()}">{esc(reads)} @56px</span>
          </div>
          <div class="chips">{''.join(chips)}</div>
          <p class="note">{esc(note)}</p>
        </div>
      </div>"""

    # group modules
    by_group = {}
    for mod in MODULES:
        by_group.setdefault(mod["group"], []).append(mod)

    findings_html = "".join(
        f'<div class="finding {tag}"><h3>{title}</h3><p>{body}</p></div>'
        for tag, title, body in FINDINGS)

    roadmap_html = "".join(
        f'<div class="phase"><h3>{esc(t)}</h3><ul>{"".join(f"<li>{b}</li>" for b in items)}</ul></div>'
        for t, items in ROADMAP)

    nav_html = ""
    body_html = ""
    for g in GROUP_ORDER:
        mods = by_group.get(g, [])
        if not mods:
            continue
        nav_links = " ".join(f'<a href="#mod-{m["name"]}">{esc(m["title"])}</a>' for m in mods)
        nav_html += f'<div class="navgroup"><span class="navg">{esc(g)}</span>{nav_links}</div>'
        body_html += f'<h2 class="grouphead">{esc(g)}</h2>'
        for mod in mods:
            strips = mod.get("strips", [mod["name"]])
            strip_imgs = "".join(f'<img class="strip" loading="lazy" src="category/{s}.png" alt="{s}">' for s in strips)
            board = '<span class="boardtag" title="appears on / maps to a farming-board resource type">board-relevant</span>' if mod.get("board") else ""
            cards = "".join(icon_card(*ic) for ic in mod["icons"])
            n = len(mod["icons"])
            body_html += f"""
    <section class="module" id="mod-{mod['name']}">
      <div class="modhead">
        <h3>{esc(mod['title'])} <span class="count">{n} icons</span> {board}</h3>
        <p class="summary">{esc(mod['summary'])}</p>
        <p class="priorities"><b>Top priorities:</b> {esc(mod['priorities'])}</p>
        <div class="stripwrap">{strip_imgs}</div>
      </div>
      <div class="grid">{cards}</div>
    </section>"""

    total = sum(len(m["icons"]) for m in MODULES)
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Animated Canvas-Icon Review — puzzleDrag2</title>
<style>
  :root {{ --bg:#0d1117; --panel:#161b22; --panel2:#1c2330; --ink:#e6edf3; --sub:#9aa4b2; --line:#2a3038; --accent:#7ee787; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.62 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }}
  a {{ color:#7ee787; text-decoration:none; }} a:hover {{ text-decoration:underline; }}
  code {{ background:#0a0e14; border:1px solid var(--line); border-radius:4px; padding:.05em .35em; font-size:.86em; }}
  .wrap {{ max-width:1280px; margin:0 auto; padding:0 22px 80px; }}
  header.hero {{ padding:46px 22px 30px; background:radial-gradient(120% 120% at 0% 0%, #18202c 0%, #0d1117 60%);
    border-bottom:1px solid var(--line); }}
  header.hero .wrap {{ padding-bottom:0; }}
  h1 {{ font-size:30px; margin:0 0 6px; letter-spacing:-.5px; }}
  .kicker {{ color:var(--accent); font-weight:600; letter-spacing:.14em; text-transform:uppercase; font-size:12px; }}
  .lead {{ color:var(--sub); max-width:80ch; }}
  .statbar {{ display:flex; flex-wrap:wrap; gap:10px; margin:20px 0 4px; }}
  .stat {{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 14px; min-width:120px; }}
  .stat b {{ display:block; font-size:22px; }} .stat span {{ color:var(--sub); font-size:12px; }}
  h2 {{ font-size:21px; margin:42px 0 14px; padding-bottom:8px; border-bottom:1px solid var(--line); }}
  h2.grouphead {{ margin-top:54px; font-size:24px; color:#fff; }}
  .panel {{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:20px 24px; margin:16px 0; }}
  .verdict p {{ font-size:16px; }}
  .findings {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:14px; }}
  .finding {{ background:var(--panel); border:1px solid var(--line); border-left-width:4px; border-radius:10px; padding:14px 16px; }}
  .finding h3 {{ margin:0 0 6px; font-size:15px; }} .finding p {{ margin:0; color:var(--sub); font-size:13.5px; }}
  .finding.crit {{ border-left-color:#f85149; }} .finding.warn {{ border-left-color:#f0a020; }} .finding.info {{ border-left-color:#388bfd; }}
  .roadmap {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }}
  .phase {{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }}
  .phase h3 {{ margin:0 0 8px; font-size:15px; color:var(--accent); }} .phase ul {{ margin:0; padding-left:18px; color:var(--sub); font-size:13.5px; }}
  .phase li {{ margin:5px 0; }}
  nav.toc {{ position:sticky; top:0; z-index:5; background:rgba(13,17,23,.92); backdrop-filter:blur(8px);
    border-bottom:1px solid var(--line); padding:10px 0; margin-bottom:8px; }}
  nav.toc .wrap {{ padding-bottom:0; display:flex; flex-wrap:wrap; gap:8px 18px; }}
  .navgroup {{ font-size:12.5px; }} .navg {{ color:#fff; font-weight:700; margin-right:8px; }}
  nav.toc a {{ color:var(--sub); margin-right:10px; }}
  .module {{ margin:26px 0 8px; }}
  .modhead h3 {{ font-size:18px; margin:0 0 4px; }} .modhead .count {{ color:var(--sub); font-weight:400; font-size:13px; }}
  .boardtag {{ font-size:10.5px; background:#10341f; color:#7ee787; border:1px solid #1c5733; border-radius:20px; padding:2px 9px; vertical-align:middle; }}
  .summary {{ color:var(--ink); margin:4px 0; max-width:96ch; }}
  .priorities {{ color:var(--sub); margin:4px 0 10px; max-width:96ch; font-size:13.5px; }}
  .stripwrap {{ overflow-x:auto; padding-bottom:6px; margin-bottom:10px; }}
  img.strip {{ height:150px; border:1px solid var(--line); border-radius:8px; background:#11151c; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:14px; }}
  .card {{ background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; }}
  .card:hover {{ border-color:#3a4658; }}
  .gifwrap {{ background:
      conic-gradient(#1b2230 90deg,#161b22 0 180deg,#1b2230 0 270deg,#161b22 0) 0 0/22px 22px;
      display:flex; align-items:center; justify-content:center; padding:10px; }}
  .gifwrap img {{ width:150px; height:150px; image-rendering:auto; }}
  .cardbody {{ padding:11px 13px 13px; }}
  .key {{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12.5px; color:#cbd5e1; margin-bottom:7px; word-break:break-all; }}
  .badges {{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:7px; }}
  .badge {{ font-size:11px; font-weight:700; color:#0d1117; background:var(--c); border-radius:5px; padding:2px 7px; }}
  .qual {{ font-size:11px; color:var(--sub); border:1px solid var(--line); border-radius:5px; padding:2px 6px; }}
  .reads {{ font-size:11px; border-radius:5px; padding:2px 6px; border:1px solid var(--line); }}
  .reads-yes {{ color:#7ee787; }} .reads-marginal {{ color:#f0a020; }} .reads-no {{ color:#f85149; border-color:#5a2024; }}
  .chips {{ display:flex; flex-wrap:wrap; gap:5px; margin-bottom:7px; }}
  .chip {{ font-size:10.5px; color:var(--sub); background:#0a0e14; border:1px solid var(--line); border-radius:5px; padding:1px 6px; }}
  .chip.danger {{ color:#f85149; border-color:#5a2024; }} .chip.warn {{ color:#f0a020; border-color:#5a4420; }}
  .note {{ margin:0; color:var(--sub); font-size:13px; }}
  footer {{ color:var(--sub); font-size:12.5px; border-top:1px solid var(--line); padding:20px 0; margin-top:40px; }}
  .legend {{ display:flex; flex-wrap:wrap; gap:14px; color:var(--sub); font-size:12.5px; margin-top:8px; }}
  .legend b {{ color:var(--ink); }}
</style></head>
<body>
<header class="hero"><div class="wrap">
  <div class="kicker">puzzleDrag2 · art review</div>
  <h1>Animated Canvas-Icon Review</h1>
  <p class="lead">A critical, per-icon evaluation of all {total} animated canvas tiles (the procedurally
  drawn <code>(ctx,t)</code> icons previewed in the Dev Panel <em>Icons</em> tab), plus a global look at
  cohesiveness and a roadmap to higher-quality, playful, WC3-style idles. Each was rendered headlessly
  (Playwright → the real browser canvas), reviewed by a per-module art-director agent at 8–12× zoom
  against the source, and cross-checked with objective motion/centering metrics.</p>
  <div class="statbar">
    <div class="stat"><b>{total}</b><span>animated icons</span></div>
    <div class="stat"><b>20</b><span>modules</span></div>
    <div class="stat"><b>strong</b><span>static craft / cohesion</span></div>
    <div class="stat"><b>weak</b><span>motion (the fix target)</span></div>
  </div>
  <div class="legend">
    <span><b>Verdict:</b> Ship · Minor · Major · Replace</span>
    <span><b>Motion:</b> Great · Good · Weak · Rigid · Dead</span>
    <span><b>⟳</b> objective motion score (&lt;3 ≈ static)</span>
    <span><b>⊹</b> off-center · <b>∅</b> blank rest frame</span>
  </div>
</div></header>

<nav class="toc"><div class="wrap">{nav_html}</div></nav>

<div class="wrap">
  <h2>The verdict</h2>
  <div class="panel verdict">{VERDICT_INTRO}</div>

  <h2>Cross-cutting findings</h2>
  <p class="lead">The patterns that repeat across modules — fix these once and dozens of icons improve.</p>
  <div class="findings">{findings_html}</div>

  <h2>What already works — the benchmarks</h2>
  <div class="panel"><p>A minority of icons hit the bar and should be the reference for the rebuild:</p>
  <p style="color:var(--sub)">{esc(BENCHMARKS)}</p></div>

  <h2>The bar &amp; direction</h2>
  <div class="panel">{DIRECTION}</div>

  <h2>Prioritized roadmap</h2>
  <div class="roadmap">{roadmap_html}</div>

  <h2>Cohesiveness at a glance</h2>
  <div class="panel"><p class="lead" style="margin-top:0">Every icon's rest frame, grouped by module —
  the static set reads as one family (shared outline, gloss, top-left light, ground shadow). Motion
  energy is what varies and what to unify.</p>
  <img src="contact-sheet.png" alt="all icons contact sheet" style="width:100%; border:1px solid var(--line); border-radius:10px;"></div>

  <h2>Per-icon evaluation</h2>
  <p class="lead">Live looping previews. Each card: verdict · motion class · quality/10 · 56px
  readability · objective chips · the key defect → fix. Two modules (crops, nature) also have full
  source-line deep-dives saved under <code>reports/</code>.</p>
  {body_html}

  <footer>
    Generated by <code>tools/icon-review/build_doc.py</code> from
    <code>capture.mjs</code> (Playwright render) + <code>build_review.py</code> (montages/GIFs/metrics)
    + 20 per-module art-director agent reviews. GIFs play at ~9fps sampled over 4s; the real idles run
    continuously. Keep this file in <code>docs/canvas-tile-review/</code> so the image paths resolve.
  </footer>
</div>
</body></html>"""

    with open(f"{OUT}/index.html", "w", encoding="utf-8") as f:
        f.write(page)
    print(f"wrote {OUT}/index.html  ({total} icons across {len(MODULES)} modules)")


if __name__ == "__main__":
    main()
