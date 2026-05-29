# Builder sub-agent prompt — one iso building

You are building ONE isometric building asset for the town's `/iso/` gallery.
Read `.claude/skills/iso-building/SKILL.md` in full first, then this.

## Inputs the orchestrator gives you
- **Building key** (e.g. `bakery`) — your file is `src/iso/buildings/<key>.tsx`.
- **Plot tier** (`small` | `normal` | `large`).
- **The original** at `src/ui/buildings/<key>.tsx` — read it; grep it for
  `animation:` to find its real signature animations and colors.
- The reference: `src/iso/buildings/forge.tsx` → `IsoForgePremium.tsx`. Open
  `/iso/?building=forge`. Match its finish.

## Your job
1. Read the original and the forge reference. Identify the building's **hero
   details** (the 2–3 features that make it instantly recognizable) and its
   **signature animations**.
2. **Reimagine it in iso** — don't trace the flat elevation. Decide the massing
   (vary it; not a cube), the roof type (vary it), where the hero details sit so
   they read in 3/4 view and are **never occluded**, and which shared props frame
   (not hide) the identity.
3. Build `src/iso/buildings/<key>.tsx` against the contract in the SKILL using
   `isoKit` primitives. Hold to `SCALE` and your `PLOT` tier. Namespace gradients
   with `useId`. Use `non-scaling-stroke`. Preserve the signature animations,
   reimagined in iso, and seat all moving/3D parts on real surfaces (no floating).
4. Set `meta = { status: "review", plot: "<tier>", notes: "<hero details +
   animations preserved>" }`.
5. Add/update this building's row in `docs/iso-buildings/PROGRESS.md`.
6. Self-review against the quality bar. Fix what you find.

## Output
Report: the file you wrote, the massing/roof/hero-detail decisions you made, the
animations you implemented, and any concerns. If `npm`/`git` are blocked in your
sandbox, say so and hand the file back — the orchestrator verifies and commits.

## Hard rules
- Do **not** occlude hero details. Props are edge accents.
- Do **not** ship a plain cube — vary massing + roofline so the silhouette is
  distinct from its neighbours.
- Match the reference scale (door/window/person same size as the forge).
- Every signature animation present and seated, verified mentally frame-by-frame.
