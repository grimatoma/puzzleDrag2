# Intake — list tiles → proposal (the front door)

The intake is the **authoring step before any spend**. The user starts a session and names the
sprites they want ("5 new crop tiles: wheat, corn, pumpkin, …"); you interview them, **write the
config** (`sets/<set>/manifest.json`), and **rebuild the pixelGen viewer** so the proposal is
reviewable — every requested asset shows as a *pending placeholder card* with its prompt/motion
note. Nothing is generated and **no credits are spent** until the user reviews the proposal and
says "run it".

This sits **before Stage 1**: Stage 1 (plan the set) diffs the manifest you write here against
disk. Intake is the front door; the five stages are the build.

```
 user lists tiles ─▶ INTERVIEW ─▶ write manifest.json ─▶ rebuild pixelGen ─▶ user reviews ─▶ "run it" ─▶ Stage 1…5
                     (questions)   (the config)          (the proposal doc)   (approve)        (the spend)
```

## When to run intake

- The user describes **a group of sprites/tiles they want made** ("make me N tiles …", "I want a
  fish set", "add a raining variant to the birch") and **no manifest exists yet** for it, or the
  manifest is missing the things they're asking for.
- If a manifest already covers exactly what they want, **skip intake** — go straight to Stage 1
  (gap-fill) and the proposal is just rebuilding pixelGen against the existing manifest.

## The interview

Ask only what you can't infer from their prompt. Prefer a single batched `AskUserQuestion`
(2–4 questions) over a slow back-and-forth. The goal is to fill every manifest field
(`references/manifest-schema.md`); defaults below keep it short.

| # | Question | Drives | Default if unanswered |
|---|----------|--------|-----------------------|
| 1 | **One set or several?** Is this one cohesive set (e.g. one tree's four seasons) or distinct sets? What's the set name? Any `group` labels to bucket keyframes (e.g. `seasons`)? | `set`, one-or-many manifests, `keyframes[].group` | One set named from the subject; no groups |
| 2 | **Animated or static?** Static stills only, or do some keyframes get a looping **idle**, and/or do pairs get a **transition** tween between them? | whether `idles[]` / `transitions[]` exist | Static stills only (keyframes, no idles/transitions) |
| 3 | **Cohesion priors.** Which already-shipped tiles should the new members visually match? (point at existing PNGs under `godot/assets/tiles/`) | `priors[]` | The closest siblings in the same family you can find on disk; if none, omit |
| 4 | **Inherit the look?** Use the committed project `_style-spec.json` (canvas, palette, light, project FPS), or override `fps` / `framesDefault` for this set? | `styleSpec`, `fps`, `framesDefault` | Inherit: `styleSpec: "../../_style-spec.json"`, `fps: null`, `framesDefault: 8` |
| 5 | **Generator.** PixelLab from a prompt (default), or hand-authored/edited stills? | `keyframes[].generator` | `pixellab` |

For each requested tile, draft a **keyframe** with a stable `id` (the on-disk filename stem — match
the project's naming, e.g. `tile_<family>_<variant>`), a one-line distinct `prompt`, and the shared
parts hoisted into the set-level `basePrompt`. For animated requests, draft the `idles` (`for`,
`frames`, plain-language `motion`) and `transitions` (`from`, `to`, `frames`, plain-language
`physics`) — these strings are the motion briefs the animator executes, so make them physical
("leaves loosen and fall staggered at terminal velocity"), not vague ("animate it").

## Write the config

1. Create `godot/assets/tiles/v2/sets/<set>/` and write `manifest.json` from
   `assets/manifest.template.json`, filled per the interview. Validate it against
   `references/manifest-schema.md` (every `id` unique + stable; `idles[].for` /
   `transitions[].from`/`.to` reference real keyframe ids; relative `styleSpec` + `priors` paths
   resolve from the set dir).
2. **Growing an existing set?** Append the new `keyframes`/`idles`/`transitions` to its existing
   manifest instead — gap-fill only touches the new ids, and the shipped siblings become priors
   automatically.

## Build the proposal (= rebuild the pixelGen viewer)

The proposal surface is the pixelGen viewer in **all-pending** state — no separate doc:

```bash
node .claude/skills/sprite-pipeline/scripts/build_viewer.mjs   # default out: godot/assets/tiles/v2/pixelGen
```

Then serve it (launch config `pixelGen`, or `python -m http.server 8100 --directory
godot/assets/tiles/v2`) and point the user at **http://localhost:8100/pixelGen/**. Every requested
asset renders as a placeholder card showing its id + prompt + motion/physics — that *is* the
proposal. Post a short chat summary too (set name, N keyframes / idles / transitions, the priors,
and that the next step spends PixelLab credits).

## The approval gate

**Stop here and wait.** Intake produces config + the proposal view only — it never generates art.
The user reviews pixelGen, tweaks prompts (edit the manifest) or comments, and re-builds until the
plan reads right. Only when they explicitly approve ("run it") do you proceed to Stage 1 → 5, where
generation and animation spend PixelLab credits + Aseprite ops. After the run, the **same** pixelGen
cards fill with real art — proposal and output share one surface.
