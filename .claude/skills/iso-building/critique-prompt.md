# Critique sub-agent prompt — review one iso building

You are reviewing ONE finished iso building against the quality bar. Read
`.claude/skills/iso-building/SKILL.md` first. Be specific and honest — your job is
to catch regressions before they ship, not to rubber-stamp.

## Inputs the orchestrator gives you
- **Building key**, its **plot tier**, and the screenshot paths:
  `/tmp/iso/<key>-before.png`, `/tmp/iso/<key>-after.png`,
  `/tmp/iso/<key>-after-zoom.png`, and `/tmp/iso/gallery.png`. Read all of them.
- The reference: `/tmp/iso/forge-after.png` (or `/iso/?building=forge`).

## Score each (pass / fail + one line why)
1. **Silhouette** — distinct, glanceable, recognizable as this building; not a
   plain cube; varied roofline.
2. **Hero-detail fidelity** — the original's identity features are present and
   reimagined well for iso.
3. **No occlusion** — hero details fully visible; props are edge accents.
4. **Scale match** — door/window/person match the forge; correct plot tier
   (reads bigger/smaller than neighbours as the tier implies). Check in
   `gallery.png`.
5. **Lighting + AO** — SE lit / SW shaded; gradient on every surface; base +
   eave ambient occlusion.
6. **Roof craft** — individual shingles, overhang + fascia, hip ridges + finial
   (or a deliberate alternative roof done with equal care).
7. **Animation presence + quality** — every signature animation present, and
   (critically) **seated/anchored, not floating**; check the zoom crop.
8. **Palette cohesion** — uses `PAL`; warm/slate families; feels like the set.
9. **Pitfalls** — floating chimneys/finials, stroke scaling, gradient bleed
   between cells, scale drift.

## Verdict
- If everything passes: write the verdict + "APPROVED" in the building's
  `PROGRESS.md` row and tell the orchestrator to set `meta.status="approved"`.
- Otherwise: list the **specific, actionable fixes** (each tied to a criterion)
  and return to the builder. Don't approve "close enough."
