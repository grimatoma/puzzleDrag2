# MODULE: nature  — 8 icons
**Intra-module cohesiveness:** Mixed — Scale and visual weight are reasonably consistent (subj_h 42–56, fill 0.32–0.59), and centering is good across the board (every icon |off_x|≤1.6, |off_y|≤4.5 except cattail at off_y −2.7). Light direction is the main inconsistency: leaf/clover/dewdrop/seashell key top-left highlights, but the feather's sheen runs straight down the rachis (no directional key) and the spiderweb/mushroom use ambient glow with no clear key light. Shadow treatment is shared (a flat dark ellipse at y≈22) for the grounded subjects, with sensible exceptions (web = vignette, feather = drifting shadow), so that language is coherent. Palette is the weak seam — three distinct families (greens, blues, browns) with no shared accent or rim-light convention tying them together.
**Shared style/motion observations:** Common language is a thick dark outline + a single linear/radial body gradient + one or two white specular blobs, which is consistent and on-brand for the "glossy sticker" look. The dominant motion pattern is the module's core problem: **light-cycling on a static body** (glint/sheen/shimmer/twinkle) carries 6 of 8 icons, with the actual geometry either rigid or shifted as one welded piece. Leaf and cattail add a whole-sprite rotation; dewdrop adds a real drip particle; cattail/mushroom add drifting particles. There is almost no *deformation* anywhere — no blade curl, no vane flex, no rim flex, no traveling wave. The energy level is uniformly "calm/sleepy," which is too low and too samey versus the WC3-idle bar.
**Worst offenders:** nature_seashell, nature_feather   **Best of module:** nature_dewdrop, nature_cattail
**Top 3 priorities for this module:** 1) Replace light-sweeps-on-static-bodies with real deformation — at minimum a per-element bend/breathe so the silhouette changes frame to frame (seashell, feather, clover, leaf all fail this). 2) Make the two whole-sprite rotations (leaf, cattail) *articulate* — give the cattail head follow-through that lags the reed, give the leaf a pivot at the stem base + a curl, not a center-rotate. 3) Establish one shared light direction (top-left) and a shared rim-light/sparkle accent so the three color families read as one set.

## nature_leaf
- **Verdict:** Major rework
- **Quality:** 6/10   **Motion:** Weak
- **Reads at ~56px?** Yes — bold teardrop silhouette, clear midrib, good contrast.
- **Art defects:** (cite frame # / region / source line)
  - Lower-right of the blade goes muddy/near-black where the gradient end-stop `#27560e` (anim L39) meets the dark outline — the form crowds into a dark wedge with no shape read (hero, bottom-right lobe).
  - The two fixed white highlights (anim L87-94: the `arc(-4,-8)` disc + the `ellipse(5,-12)` streak) sit *on top of* the side veins and read as stuck-on stickers, not surface gloss; they never move with the rock so they break the lighting on the tipped frames.
  - Stem is a stiff near-straight `quadraticCurveTo(-1,12,0,4)` (L33) — too short and rigid to sell a leaf "in a breeze."
- **Animation defects:** (cite construction)
  - Rock is `sin(t*1.6)*0.1 + sin(t*2.7)*0.04` (L16) → peak ≈ 0.14 rad ≈ 8°, applied via `ctx.rotate` about the **icon origin (0,0)** before the shadow (L20). The blade pivots from roughly its own center, not the stem base, so it wags rather than flutters. Across f0/f4/f8/f12 the silhouette barely changes (motion 4.82 — second-lowest in module).
  - The "flutter" is a pure rigid rotation: no blade curl, no asymmetric edge lift, no follow-through on the tip. A leaf in wind should twist (one edge lifts toward camera) — there's zero z-axis suggestion.
  - The traveling glint `gy = -3 - ((t*7)%22)` (L76) jumps a hard sawtooth: it resets instantly at the top with no fade at the seam, so it reads as a band teleporting back, not a continuous shimmer. Pair it with an alpha envelope (fade near both ends) or it pops every loop.
- **Cohesion vs the set:** Scale/weight fine (subj 31×48, fill 0.367). Centering good (off_x −1.6). Gloss style matches clover/dewdrop. Pivot-from-center is shared with the feather's similar flaw.
- **Playful idle redesign concept:** Anchor the pivot at the stem base (translate to y≈22, rotate, translate back) and drive a 3 s loop: a slow eased lean one way (anticipation hold at the extreme ~0.3 s), then a quicker rock back through center with a small overshoot, blade *tip* lagging the base (cantilever bend — bend the two tip bézier control points by `sin(t)` so the silhouette curls). Layer a subtle leaf-twist by scaling x of the blade ±4% out of phase with the rock so one edge "catches light," and slide the specular blob with that twist. Let one dew bead swell-and-release down the midrib on a long 4 s sub-cycle for a focal sparkle.

## nature_feather
- **Verdict:** Major rework
- **Quality:** 6/10   **Motion:** Rigid
- **Reads at ~56px?** Yes — clean plume silhouette and bright rachis read well.
- **Art defects:** (cite frame # / region / source line)
  - The vane is a closed bézier blob (L120-126) with **no parted/feathery edge** — the outline is a smooth balloon, so it reads more like a blue leaf or paddle than a feather. The barbs are faint internal hairlines (L141-150, alpha 0.45) that don't break the rim.
  - Light direction is undefined: the sheen runs *down* the quill (L152-158) while the body gradient runs top-left→bottom-right (L115). No single key light.
  - Quill tip `lineTo(3,24)` (L178) pokes out as a tiny stub that, at the bottom of the rotation, sits oddly close to the drifting shadow.
- **Animation defects:** (cite construction)
  - This is the module's textbook **whole-sprite rigid transform**: `translate(driftX,floatY)` + `rotate(0.32+tilt)` (L106-107) move the entire feather as one welded piece. tilt = `sin(t*0.9)*0.14 + sin(t*1.7)*0.05` (≈0.19 rad max). In the zoom f0→f12 the oval just tips and slides — zero vane flex (motion 16.75 is almost entirely position change, not shape change).
  - A feather's whole appeal is the soft, laggy barb flutter — none exists. The barbs are static lines inside a rigid clip; they should ripple.
  - The shadow uses `22 - floatY` (L112) but the feather's *rotation* isn't reflected in the shadow shape, so on tilted frames the cast shadow points the wrong way.
- **Cohesion vs the set:** Smallest footprint width (subj_w 25.9) but height matches — OK. The rigid-rotation flaw is shared with leaf/cattail; this is the purest offender.
- **Playful idle redesign concept:** Keep a gentle drift+rotate, but add a **traveling wave down the vane**: offset each barb's outer endpoint by `sin(t*2 - i*0.4)` so a ripple runs tip→base (follow-through), and flex the two side bézier control points of the vane outline by the same wave so the *silhouette* breathes (one edge ruffles out, then settles). Add a slow z-flip illusion: scale-x the whole vane by `0.9 + 0.1*cos(t*0.7)` so it turns edge-on briefly, with the sheen sweeping across at the thin moment. 3–4 s loop, eased, drifting like it's caught on a thread.

## nature_clover
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Weak
- **Reads at ~56px?** Yes — the strongest silhouette in the module; four fat hearts + stem are instantly legible.
- **Art defects:** (cite frame # / region / source line)
  - The four leaflets are drawn identically and overlap at hard edges around the center node (L241-244) — at the seams the dark outlines stack into a slightly muddy cross. A touch of size variation or a back-pair darkening would add depth.
  - Center node (L247-250) is a flat dark dot with no highlight; it's the focal join and currently dead.
- **Animation defects:** (cite construction)
  - Leaflet `wobble = sin(t*1.8 - phase)*0.05` (L205) ≈ 3° — imperceptible. In the f0/f4/f8/f12 zoom the geometry is frozen; only the shimmer blob moves. So the "leaflets shimmer in sequence" is real but it's a *light* sequence on static petals, not motion.
  - The shimmer (L204) and the corner sparkle `sin(t*3.1)` (L253) run on unrelated frequencies, so the lucky-sparkle cross-flare (L259-268) fires arbitrarily rather than as a payoff at the end of the shimmer sweep.
- **Cohesion vs the set:** Excellent — fill 0.336, centered (off 0.1/4.5), gloss matches leaf/dewdrop. Greenest anchor of the module alongside leaf.
- **Playful idle redesign concept:** Make the shimmer a *physical* perk: stagger each leaflet to do a tiny eased "pop" — scale 1.0→1.08→1.0 about its outer tip — as the bright wash reaches it, so the wash visibly *lifts* each heart in sequence (overlap/follow-through around the cross). End the 2.4 s loop with the corner sparkle cross-flare timed to the 4th leaflet's pop (anticipation → payoff). Add one slow whole-plant breathing tilt (±3° at the stem base) under it so it's never fully still.

## nature_dewdrop
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Good
- **Reads at ~56px?** Yes — classic teardrop, glossy, unmistakable.
- **Art defects:** (cite frame # / region / source line)
  - The inner refraction arc `arc(0,9,9, 0.2π..0.8π)` (L313-314) plus the two lower highlight dots (L323-330) line up as a **smiley face** in the zoom (f0-f14). If intentional that's charming; if not, rotate/offset the arc so it doesn't read as a mouth.
  - On detach frames the falling drop (L334-351) is a separate teardrop that appears slightly below the body with a visible gap — fine, but the parent's bottom rim doesn't neck/pinch as it releases, so the physics reads as "spawn" not "drip."
- **Animation defects:** (cite construction)
  - The body `wobble = sin(t*2.0)*0.6` (L276) is only a 0.6-unit x-translate — sub-pixel at 56px and invisible in the zoom. The drop isn't jiggly, just sliding a hair.
  - The drip cycle is the best real motion in the module (swell L281 → detach/fall/fade L334-351, seamless). Good. But the swell uses `min(phase,0.4)` clamped to a half-sine — the bead grows then snaps to gone at phase 0.4 with no surface-tension pinch; add a 1–2 frame neck.
- **Cohesion vs the set:** Good — fill 0.333, dead-centered, the blue anchor matching feather/spiderweb. Gloss language consistent.
- **Playful idle redesign concept:** Keep the drip cycle; upgrade it to squash & stretch. Between drips, let the whole bead breathe — squash wide then stretch tall (`scaleY 1.0→1.06`, conserve area) with the highlight sliding opposite (jiggle). As a drip forms: anticipation (bead bulges down + body squashes), a real **neck pinch** (narrow the bottom bézier for 2 frames), release with the parent recoiling up (overshoot) and a tiny ring ripple on the ground shadow. 2.4 s loop, eased throughout.

## nature_spiderweb
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Weak
- **Reads at ~56px?** Marginal — the 0.7–0.9px threads are gossamer; against the vignette they read at hero size, but at 56px the spiral nearly vanishes and only the dew beads + hub survive. That's arguably fine for a web, but it's the least "solid" silhouette in the set.
- **Art defects:** (cite frame # / region / source line)
  - Octagonal, not round: 8 straight spoke-to-spoke chords (L389-405) give a hard polygon. Real orb webs sag in catenary curves *toward the hub*; the `*0.86` midpoint pull (L401) is too subtle, so it looks geometric/CAD, not organic.
  - The vignette backdrop (L361-367) is a dark disc that, on the checker, reads as a faint grey bubble around the web — slightly muddy. The hub knot (L408) is a tiny dot with no radiating thread-thickening.
- **Animation defects:** (cite construction)
  - `sway = sin(t*1.3)*0.04` (≈2.3°) + `breathe = 1 + sin(t*1.0)*0.015` (L357-358) → the whole web rotates/scales as one rigid ring. The structure never *flexes* — threads don't bounce. Motion 12.94 is mostly the global scale shimmer + dew twinkle.
  - The thread alpha shimmer (`shimmer = 0.6 + 0.18*sin(t*2.0)`, L375) pulses *all threads in unison*, which reads as a global brightness flicker, not light catching strands. The three dew twinkles (L414-432, staggered phases) are the only convincing motion.
- **Cohesion vs the set:** Outlier by design — no body fill, no ground shadow, largest footprint (49×49). Dew beads tie it to dewdrop's blue gloss. Acceptable as the "ethereal" member.
- **Playful idle redesign concept:** Sell elasticity: when a (implied) breeze hits, ripple a **traveling wobble outward from the hub** — displace each ring's radius by `sin(t*3 - ring*0.8)*small` so the web springs and settles (overshoot), spokes staying anchored at the rim. Add one scripted beat per ~4 s loop: a dewdrop swells, then *drops* off a lower thread (reuse the dewdrop fall), making the bottom strand twang (a quick damped oscillation on that spoke). Keep the per-bead twinkle. That turns a CAD ring into a living, tensioned web.

## nature_cattail
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Good
- **Reads at ~56px?** Yes — the brown sausage head on a reed is distinctive; tallest subject (subj_h 56) so it fills the cell well.
- **Art defects:** (cite frame # / region / source line)
  - The head gradient is a flat **left→right linear** `#a06a2e→#3a2006` (L490-493) — it shades the head like a vertical cylinder lit from the left, but the highlight ellipse (L522) is also on the left, doubling up; the right third just goes dark/dead with no form turn.
  - Velvety striations are flat horizontal lines (L514-518); they don't follow the head's curvature, so the "velvet nap" reads as a barcode on the lower half.
  - At small size the three blades + reed + tip spike merge into a green scribble below the head; the back blade (`drawBlade(-0.5,46)`) pokes awkwardly past the head on tilted frames.
- **Animation defects:** (cite construction)
  - Pivot is correct (translate to base y=22, rotate, translate back — L448-451), good. But `sway = sin(t*1.4)*0.07 + sin(t*2.3)*0.025` (≈5.6°) rotates head + reed + blades as **one rigid body**. The head should *lag* the reed tip (the heavy head has inertia) — there's no differential, so it's a stiff metronome, not a reed bending.
  - The blades get extra lean via `l = lean + sway*4` (L455) — nice touch, the only differential in the module — but the head doesn't, so the blades and head move inconsistently.
  - Fluff seeds (L535-560) are the main motion (drives motion 33.85, highest in module) and loop cleanly via `sin(p*π)` fade. Good. But they spawn from fixed offsets on a still head; tie their release to the sway extremes so the breeze "shakes them loose."
- **Cohesion vs the set:** Good — centered (off_x 0), brown anchor matching mushroom/seashell. Particle treatment shared with mushroom spores.
- **Playful idle redesign concept:** Add follow-through: drive the reed sway, then apply a phase-delayed, slightly larger rotation to the *head only* (head lags reed by ~0.15 s and overshoots) so the heavy head whips and settles — classic overlapping action. Bend the reed as a curve (move the `quadraticCurveTo` control point with the sway) instead of pivoting straight. Release a fluff puff at each sway peak (anticipation: head dips, then a burst of 2–3 seeds drifts off downwind). 3 s eased loop; the seeds give the sparkle/charm.

## nature_mushroom_cluster
- **Verdict:** Minor fixes
- **Quality:** 7/10   **Motion:** Weak
- **Reads at ~56px?** Yes — three brown caps on a green mound; clear and cozy, good footprint (fill 0.41).
- **Art defects:** (cite frame # / region / source line)
  - Caps are plain brown domes with a thin highlight band (L644-649) and two tiny pale spots (L651-655) — they read more like generic mushrooms than charming toadstools. The spots are small and asymmetric; a classic Amanita-style ring of dots would add appeal and pop.
  - The mossy mound (L586-593) and the cap browns are close in value where they meet the stems, so the front-left stem base muddies into the moss.
  - off_y 5.9 — the cluster sits noticeably low in the cell (the glow halo eats the top third), so the subject feels bottom-heavy.
- **Animation defects:** (cite construction)
  - `breathe = 1 + sin(t*1.2)*0.02` (L567) → a 2% non-uniform scale applied per toadstool about its base (L608-612). At 56px this is invisible (motion 7.66, mostly the spores). The cluster looks static in the f-grid.
  - The glow `0.12 + 0.1*(...)` (L568) pulses the whole halo uniformly — a faint global breathe, not light from a source. The spores (L662-674) are the only real motion and they're tiny (r 0.8, alpha ≤0.6), barely visible at size.
  - Nothing is *characterful* — toadstools in a cozy game beg for a squash-and-stretch bob or a cap wobble.
- **Cohesion vs the set:** Good — brown/green anchor bridging cattail and the greens; particle (spore) language matches cattail. Widest mound footprint reads as the module's "base/ground" motif.
- **Playful idle redesign concept:** Give the caps personality: each toadstool does an offset, eased **squash-and-stretch bob** (squash on the down-beat, stretch + slight cap-overhang jiggle on the up), staggered so the cluster "breathes" in a wave (overlap). On the biggest cap, occasionally pop a spore puff from the gills with a tiny anticipation dip. Add a slow firefly-style glow drift (a soft highlight that wanders across the caps) instead of a uniform halo pulse. 3 s loop; keep it gentle but make the silhouette actually move.

## nature_seashell
- **Verdict:** Major rework
- **Quality:** 6/10   **Motion:** Dead
- **Reads at ~56px?** Yes — bold fan scallop, strong radiating ridges, clear hinge.
- **Art defects:** (cite frame # / region / source line)
  - The scalloped top rim (L696-704) is subtle — the `sin(tt*π)*4` bumps + alternating `+2.5` offset barely register, so the top edge reads nearly flat/round rather than scalloped. Push the lobes.
  - Ridge strokes (L724-730) all originate from a single point `(0,17)` and fan to the rim, but they're uniform thin lines (1.3px, alpha 0.5) — no thickening at the rim, no valleys/peaks shading, so the shell looks like a flat fan with pinstripes, not a ribbed 3D shell.
  - Two pearly highlight ellipses (L753-759) are stuck-on and asymmetric; combined with the central seam they don't establish a consistent top-left key.
- **Animation defects:** (cite construction)
  - **The shell body is 100% static.** The only motion is the sheen rectangle sweeping `cx = -28 + ph*56` (L731-740) clipped to the shell, plus a sparkle riding ahead (L763-779). In the f0/f4/f8/f12 zoom the geometry never moves a pixel — motion 3.75 is the module floor and it's all light. This is the purest "dead body, moving light" failure in nature.
  - The sheen is a plain linear band with no falloff curve matching the shell's convex form, so it reads as a flat wipe across a sticker, not light raking over ribs.
  - The sparkle x uses `((t%period)/period)*20` over `-10..10` (L765) while the sheen spans `-28..28` — they drift apart, so the "sparkle riding ahead of the sheen" claim doesn't hold; the sparkle lags inside while the sheen exits.
- **Cohesion vs the set:** Scale/weight fine (40×46, fill 0.454), centered. Warm palette matches cattail/mushroom. But its total lack of body motion makes it the energy outlier (alongside feather's rigidity).
- **Playful idle redesign concept:** Make it a living shell: a slow, eased **clam "breathe"** — the fan opens a few degrees at the hinge (rotate the top half ±3° about the hinge knob, ribs splaying slightly) then eases closed, like it's gently respiring. Add a tiny settle bob and let the rim lobes flex by `sin(t - lobe)` so the scalloped edge ripples. Time the pearly sheen + a single bright sparkle to sweep across at the *open* extreme as the payoff. For extra charm, occasionally let one small bubble rise and pop above the hinge. 3–4 s loop, eased open/closed with a hold at the open pose.
