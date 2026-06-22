# MODULE: crops — 6 icons
**Intra-module cohesiveness:** Strong. All six share one coherent gradient-sticker language — 2px dark outline, a single top-left specular highlight, the same warm/green palette family, and a soft `rgba(0,0,0,0.2–0.25)` ground-shadow ellipse at y≈22–23. Visual weight is consistent (fill 0.31–0.58) and most are well-centered. The break in cohesion is **motion energy, not art**: the set splits into "deform" icons (sunflower/wheat/peas genuinely move their silhouette) and "frozen-body + glint" icons (watermelon/pumpkin/corn barely move and rely on a sweeping highlight band). Light direction is consistent top/top-left across all six.
**Shared style/motion observations:** Common language = radial/linear gradient fills, clipped interior detail (kernels, ribs, stripes, seeds) behind a glossy highlight, dark closing stroke. The dominant motion pattern is a **single un-eased `Math.sin(t*freq)` sway or scale** plus a **linear translating glint band** (`(t*k)%range`). This is too samey *in approach* (every icon = one sine + maybe a glint) yet too timid *in amplitude* — there is no anticipation, no overshoot, no squash/stretch, and shadows are fully decoupled from the subject (they never react to sway/bob/breathe). The glint trick is reused on 3 of 6 and starts to read as a generic "shiny pass" rather than character.
**Worst offenders:** crop_watermelon (near-static, motion 3.47), crop_pumpkin (2% breathe is invisible)   **Best of module:** crop_sunflower (real head turn + petal shimmer), crop_peas (whole-pod bob+rotate)
**Top 3 priorities for this module:** 1) **Kill the "frozen body + sliding glint" pattern** on watermelon/pumpkin/corn — add real deformation (squash-on-settle, lobe bulge, cob nod with eased timing) instead of leaning on a translating highlight rectangle. 2) **Couple every shadow to its subject** — when a thing bobs/sways/breathes, the ground ellipse must scale/offset inversely (contact = grounding); right now all six shadows are dead-static. 3) **Fix vertical framing** on crop_peas (`off_y 8.4`) and crop_wheat (`off_y 4.2`) so they sit centered, and add eased in/out + a touch of overshoot to replace the linear/pure-sine timing across the set.

## crop_sunflower
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Good
- **Reads at ~56px?** Yes — strong dark-center-on-gold-ring silhouette; the most readable icon in the set.
- **Art defects:** (cite frame # / region / source line)
  - Seed face is a flat very-dark disc (`categories/crops.ts:223–242`, center radial `#7a5418→#231804`); the 36 spiral dots (line 236) are nearly invisible against `#231804`, so at 56px the center reads as a muddy black hole rather than a seeded Fibonacci pattern. Lighten the dot color or the base.
  - Petal ring is geometrically perfect/static in shape — 14 identical teardrops on an exact circle (`animations/crops.ts:67–93`); slight per-petal length/width variance would kill the "stamped" look.
  - The two stem leaves (line 38–53) are small and sit far below the bloom, leaving a thin stalk; visually bottom-light vs the heavy head.
- **Animation defects:** (freqs/amps/pivot)
  - Sway is `sin(t*0.9)*0.08 rad` applied at *two different pivots* — stem at `rotate(sway*0.4)` (line 21) and head at `rotate(sway*0.55)` (line 61) about y=24, plus a head `turn = sin(t*0.35)*0.06` about its own center (line 11/64). The diff heatmap confirms the whole outline genuinely shifts (good, real motion), but the two sway multipliers (0.4 vs 0.55) mean the head and stem-top rotate by *different* amounts about the *same* pivot — the head visibly detaches/shears from the stem top. Make the head ride the stem's tip transform, then add `turn` on top.
  - All motion is pure sine — no eased hold at the sway extremes, so it drifts mechanically with no "settle."
  - The "bee sparkle" (`bp=(t*0.18)%1`, line 123) travels a flat horizontal line with a 3-lobe vertical wobble; it's a tiny cross that reads as a render glitch at 56px, not a bee. Either commit to a real tiny bee or drop it.
  - Shadow uses `sway*8` x-offset (line 14) — good, it's the *one* shadow in the module that reacts; but it only translates, never scales.
- **Cohesion vs the set:** Tallest subject (`subj_h 52`, `off_y 0.5`) — well-centered, slightly top-heavy. Palette/gloss and shadow match the set. Motion energy is at the top end of the module (correctly).
- **Playful idle redesign concept:** Heliotrope "wake-up." ~3.5s loop: (0–0.4s) anticipation — head dips ~4° and petals contract inward ~3%; (0.4–1.2s) bloom lifts and rotates ~7° toward the light with an eased overshoot past target, petals fan out (length +6%) in a traveling wave around the ring; (1.2–2.2s) gentle settle-back with one small counter-wobble (follow-through); (2.2–3.5s) slow breathing of the seed-face (radius ±3%) while two leaves flutter on offset phases. Shadow scales ±8% inverse to head height. Keep the shimmer wave but tie its phase to the turn direction.

## crop_wheat
- **Verdict:** Minor fixes
- **Quality:** 6/10   **Motion:** Good
- **Reads at ~56px?** Marginal — the three grain heads clump into one gold mass; the long radiating awns (whiskers) read as noise/spikes and the thin lower stem nearly disappears.
- **Art defects:** (cite frame # / region / source line)
  - `off_y 4.2`: subject sits LOW — heads crowd the top third while a long empty stalk + twine occupy the bottom (montage hero). Lots of dead canvas above the awns. Re-center: raise the whole bundle ~4u or shorten the stem.
  - Awns are straight radiating lines (`animations/crops.ts:197–202`) that splay beyond the silhouette and look like a starburst glitch at small size; curve them and shorten, or reduce to 2 per head.
  - Grain ellipses (line 182–192) are a flat gold gradient with thin strokes; densely overlapped they muddy into a blob. Stronger per-grain highlight or a slightly larger gap would clarify the "paired grains" structure.
  - Twine (line 206–217) is a tiny brown arc — fine, but it's the only dark anchor and it's small.
- **Animation defects:** (freqs/amps/pivot)
  - `breeze = sin(t*1.1)`, `gust = sin(t*1.1+0.6)*0.3` (line 148–149). The two terms share the *same* frequency, so "gust" is just a fixed-phase scaling of breeze — it adds amplitude, not genuine secondary motion. Give gust a different freq (e.g. ×1.7) for real overlap.
  - `headBend = (breeze+gust)*(3.2+si*0.4)*0.6` (line 160): heads translate side-to-side; per-stalk `si` term gives only a tiny stagger. The diff heatmap shows the cluster moving as one rigid clump — no per-grain follow-through, no whip at the tips.
  - The whole thing is bottom-anchored at the twine (good) but **the shadow never moves** while the heads sway hard — disconnected.
  - `tipY = -10 - abs(headBend)*0.15` (line 162) gives a faint bob, but pure-sine timing means no eased settle.
- **Cohesion vs the set:** Lowest fill (0.311) → visually lightest/sparsest icon in the strip; the empty top makes it feel smaller than neighbors. Palette and shadow match. Motion energy fits the "sway" half of the set.
- **Playful idle redesign concept:** Wind-gust ripple. ~3s loop: a gust enters from the left — (0–0.3s) heads anticipate by leaning slightly *into* the wind, (0.3–1.0s) the bundle bows right with the **tips lagging the bases** (traveling wave up each stalk, outer stalks leading inner by phase offset), awns trail; (1.0–1.8s) eased recoil past vertical with a small overshoot, grains jostle; (1.8–3s) calm micro-sway. Shadow widens ~10% as the bundle leans. This needs real per-grain phase delay, not a single rigid clump translate.

## crop_corn
- **Verdict:** Major rework (motion)
- **Quality:** 7/10   **Motion:** Rigid
- **Reads at ~56px?** Yes — strong vertical gold cob with green husk-leaf base; clean silhouette.
- **Art defects:** (cite frame # / region / source line)
  - Art is genuinely nice — the clipped kernel grid (`animations/crops.ts:287–305`) with per-kernel radial gradients is the best interior detail in the module. Minor: the static white highlight ellipse (line 327–330) sits *under* the moving glint band and double-stacks into a hot blob mid-cob.
  - Silk tuft at the tip (line 317–325) is three thin tan strokes — nearly invisible at 56px; reads as fuzz.
- **Animation defects:** (freqs/amps/pivot)
  - Body sway is `sin(t*1.0)*0.05 rad` about y=18 (line 224, 258) — that's ~2.9° peak. The diff heatmap shows the cob outline barely moves; this is effectively static.
  - The dominant visible motion is the **glint band** `glintY = -24 + (t*10)%50` (line 307) — a hard `fillRect` sweeping top→bottom over the clipped kernels. It's a translating highlight on a frozen cob = the exact "rigid + sliding shine" failure. `motion 10.33` is inflated by this bright rectangle, not by deformation.
  - Husk-leaf flutter `1+sin(t*2.4+hi*1.9)*0.08` (line 234) is fine and is the only real shape change, but it's at the base where it's least noticed.
  - Glint band has hard rectangular top/bottom edges clipped to the cob — at the cob's narrow tip the band can show a visible straight cutoff.
- **Cohesion vs the set:** `subj_h 53` (tall), `off_x/off_y ≈ 0` — best-centered tall icon. Palette/gloss/shadow consistent. But its *motion* belongs to the "glint-only" failure group despite a high motion score.
- **Playful idle redesign concept:** Cob "nod & shimmy." ~2.8s loop: (0–0.4s) anticipation dip, (0.4–1.2s) the cob nods forward and does a slow ~5° axial roll so the kernel grid appears to rotate around the ear (fake the roll by horizontally phase-shifting the kernel `offset` + shifting the highlight), husk leaves peel outward (follow-through); (1.2–2.0s) eased return with a small counter-nod; (2.0–2.8s) silk tuft wiggles and one kernel-row glint *only* as a secondary accent. Replace the full-cob glint rectangle with the roll illusion so the shine reads as form, not a passing light.

## crop_peas
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Good
- **Reads at ~56px?** Marginal — the open pod is wide and flat (`subj_w 50.8 × subj_h 35.1`); the five peas read, but the pod-vs-flesh contrast is all mid-greens and can muddy.
- **Art defects:** (cite frame # / region / source line)
  - `off_y 8.4` — the **worst centering in the module**: the pod floats well below frame center with a big empty top (montage hero). The `rotate(-0.25)` (line 347) + downward bob pushes it low. Raise it ~6–8u.
  - Five peas are near-identical spheres (`animations/crops.ts:365`); slight size variation (back peas smaller) would add depth.
  - Front-lip highlight (line 403–408) is a thin pale stroke that nearly merges with the pod top.
- **Animation defects:** (freqs/amps/pivot)
  - `bob = sin(t*1.4)*1.6` px vertical + `rotate(-0.25 + sin(t*1.2)*0.03)` (line 337, 347): the entire pod translates up/down and tilts as a **rigid body** — the diff heatmap confirms the whole outline glows uniformly. The pod never opens/closes or flexes, which is the obvious characterful move for a pea pod.
  - Bob and rotate run at *different* freqs (1.4 vs 1.2) so the loop is long/quasi-periodic — but both are pure sine, no easing.
  - Pea shimmer `0.5+0.5*sin(t*2.4+pi*1.1)` + highlight drift `cos/sin(t*1.6+pi)*0.5` (line 367, 380) is the nicest detail — genuine per-pea secondary motion. Keep it.
  - `tipWag = sin(t*2.6)*1.4` on the stem tip (line 337, 415) — good small follow-through, but it's a single endpoint moving, so the stem looks like it telescopes rather than bends.
  - Shadow is fixed while the pod bobs 1.6px and tilts — they visibly separate.
- **Cohesion vs the set:** Only horizontal/landscape subject in the module (everything else is portrait) — that's fine for variety, but combined with `off_y 8.4` it reads as "sinking." Palette/gloss/shadow consistent.
- **Playful idle redesign concept:** Pod "giggle." ~2.6s loop: (0–0.5s) the front lip eases *open* a few degrees (rotate the front-lip path about the left hinge) while peas brighten in sequence left→right; (0.5–1.2s) lip springs shut with a small overshoot (squash the peas down 4% on impact, follow-through); (1.2–2.6s) gentle whole-pod bob ±1.5px with the stem tip trailing on a lag. Tie shadow scale to bob. The open/close flex is the missing real deformation — replace the rigid translate-bob with it.

## crop_watermelon
- **Verdict:** Major rework (motion)
- **Quality:** 8/10   **Motion:** Dead
- **Reads at ~56px?** Yes — the two-element composition (striped globe + red wedge) is the most appealing art in the set; red-on-green pops hard at small size.
- **Art defects:** (cite frame # / region / source line)
  - Art is excellent — clipped stripes (`animations/crops.ts:451–456`), white+green rind layers on the wedge (line 490–502), eased flesh gradient. Almost nothing to fix. Minor: `off_y 6.5` sits a touch low; the wedge's seeds (line 508) are evenly spaced and could scatter slightly.
- **Animation defects:** (freqs/amps/pivot)
  - **This is the module's #1 failure.** `motion 3.47` — the body, wedge, stripes, rind, and shadow are 100% static. The diff heatmap shows ONLY: a glint band on the globe (`gp=(t*0.22)%1`, line 458, a `fillRect` diagonal sweep) and 3–4 tiny flesh sparkle dots (`sparkPts` twinkle `sin(t*3.2+ph)`, line 521–529).
  - There is **zero deformation, bob, sway, or squash** — both halves are frozen and a highlight slides over them. This is the textbook "rigid + glint" anti-pattern the brief calls out.
  - The globe glint is a straight diagonal `fillRect(gx-8,-18,16,36)` clipped to the circle (line 460–465) — its leading/trailing edges are hard parallel lines, so it reads as a passing rectangle of light, not a curved specular on a sphere.
- **Cohesion vs the set:** `fill 0.462`, well-sized, palette/gloss/shadow fully consistent — fits the set's *art* perfectly. But its *motion* (essentially none) is the outlier low end and drags the module's "alive" feel down.
- **Playful idle redesign concept:** "Wobble & plop." ~2.4s loop: (0–0.3s) the whole melon squashes slightly (scale Y 0.96 / X 1.04) and the wedge tips toward the globe — anticipation; (0.3–0.9s) it springs up with overshoot (scale Y 1.04), the wedge rocks away and back like it was just set down (follow-through), shadow squashes wide then narrows on the rebound; (0.9–1.6s) a 2° counter-rock; (1.6–2.4s) settle, and *then* let one curved specular arc sweep the globe + a single seed-sparkle as a secondary accent. The point: lead with springy body deformation; demote the glint from "the animation" to "a flourish."

## crop_pumpkin
- **Verdict:** Major rework (motion)
- **Quality:** 8/10   **Motion:** Weak
- **Reads at ~56px?** Yes — wide ribbed orange globe with a green stem; excellent, instantly-readable silhouette and the richest fill (0.583) in the set.
- **Art defects:** (cite frame # / region / source line)
  - Art is strong — vertical rib bezels (`animations/crops.ts:576–589`) with dark grooves + light highlights give real volume; chunky curved stem (line 614–627). Minor: the rib-highlight glint (line 582–589) + the static specular ellipse (line 602–605) can stack into one over-bright lobe on the upper-left rib.
- **Animation defects:** (freqs/amps/pivot)
  - `breathe = 1 + sin(t*1.2)*0.02` (line 543) — a **2% uniform scale**. At 56px that's sub-pixel; the diff heatmap shows only a hair-thin outline glow. Effectively invisible breathing. Bump to ~5–6% and, better, make it non-uniform (squash, not scale) so it reads as a pumpkin settling, not a balloon.
  - Dominant visible motion is again the **rib glint sweep** `gp=(t*0.2)%1`, `gx=-26+gp*52` (line 591–598) — a translating `fillRect` of light over frozen ribs. Same "sliding shine on a rigid body" pattern as watermelon/corn.
  - Stem flutter `lean = sin(t*1.8)*0.06` about y=-10 (line 609–613) is genuine but tiny and isolated at the top; the body it's attached to doesn't react, so the stem looks independently jittery.
  - Shadow fully static while the body "breathes."
- **Cohesion vs the set:** Heaviest/widest subject, `off_x/off_y ≈ 0` (well-centered). Palette/gloss/shadow match. Motion energy is in the weak/glint group.
- **Playful idle redesign concept:** "Heavy settle + jiggle." ~3s loop: (0–0.4s) the pumpkin squashes down (Y 0.95 / X 1.05) as if weighty — the ribs bulge outward at the equator (widen the outer rib bezier control points), shadow widens; (0.4–1.0s) eased rebound with overshoot (Y 1.04), stem whips back on a lag (follow-through) and the leaf flutters; (1.0–2.0s) one smaller counter-jiggle; (2.0–3.0s) rest with a slow ±5% breathe and the stem settling. Drive the rib highlights *from* the squash (grooves compress when squashed) instead of a passing glint rectangle — that turns the shine into form, the missing deformation the icon needs.
