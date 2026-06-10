# Intake — list tiles → proposal (the front door)

The intake is the **authoring step before any spend**. The user starts a session and names the
sprites they want ("5 new crop tiles: wheat, corn, pumpkin, …"); you interview them, **write the
config** — a new `items[]` entry (and, first time only, the global `settings`) in the single
`godot/assets/tiles/v2/pipeline.json` — and **rebuild the pixelGen viewer** so the proposal is
reviewable. Every requested asset shows as a *pending placeholder card* with its prompt/motion
note. Nothing is generated and **no credits are spent** until the user reviews the proposal and
says "run it".

This sits **before Stage 1**: Stage 1 (plan the set) diffs `pipeline.json` against disk by shape.
Intake is the front door; the four stages are the build. (Updating Godot with the produced frames
is a separate, on-demand step after the build — `npm run godot:update-tiles` — not a pipeline stage.)

> **Pre-flight once, before any tool call:** the Aseprite + PixelLab MCP tools are usually
> **deferred** (schemas not loaded → a direct call fails `InputValidationError`). Bulk-load them up
> front with `ToolSearch "aseprite"` and `ToolSearch "pixellab"` so every later call has its schema.
> See SKILL.md §"Tool routing" and the cheat-sheet in `references/aseprite-execution.md`.

```
 user lists tiles ─▶ INTERVIEW ─▶ edit pipeline.json ─▶ rebuild pixelGen ─▶ user reviews ─▶ "run it" ─▶ Stage 1…4
                     (questions)   (settings + items[])  (the proposal doc)   (approve)        (the spend)
```

## When to run intake

- The user describes **a group of sprites/tiles they want made** ("make me N tiles …", "I want a
  fish set", "add a raining variant to the birch") and `pipeline.json` has **no item** for it yet,
  or the existing item is missing the things they're asking for.
- If `pipeline.json` already has an item covering exactly what they want, **skip intake** — go
  straight to Stage 1 (gap-fill) and the proposal is just rebuilding pixelGen against the existing
  `pipeline.json`.

## The interview

Ask only what you can't infer from their prompt. Prefer a single batched `AskUserQuestion`
(2–4 questions) over a slow back-and-forth. The goal is to fill out the new `items[]` entry (and the
global `settings`, first run) per `references/manifest-schema.md`; defaults below keep it short.

| # | Question | Drives | Default if unanswered |
|---|----------|--------|-----------------------|
| 1 | **One item or several?** Is this one cohesive family (e.g. one tree's four seasons — a `master` + its `children`) or distinct families (several `items[]`)? What's the item `id`? | one-or-many `items[]`, item `id`, master/children split | One item, id from the subject |
| 2 | **Animated or static?** Static stills only, or do some keyframes get a looping **idle**, and/or do pairs get a **transition** tween? | whether `animations[]` (`kind: idle` / `kind: transition`) exist | Static stills only (master + children, no animations) |
| 3 | **Cohesion priors.** Which already-shipped tiles should the new members visually match? (point at existing PNGs under `godot/assets/tiles/`) | item `priors[]` | The closest siblings in the same family on disk; if none, omit |
| 4 | **Size / FPS / seeds.** Use the global `settings.canvas` (32px) and `settings.fps`, or override `canvas` / `fps` for this item? How many candidate seeds per step — `1`, `2`, or `4`? Human gate on, or autonomous? | item `canvas`/`fps` overrides; global `settings.candidates`, `humanApproval`, `autonomous` | Inherit global `canvas`/`fps`; `candidates: 4`; `humanApproval: true`; `autonomous: false` |

For each requested tile, decide whether it's the **master** (the base every sibling derives from —
usually the fullest / most canonical variant) or a **child** (derived from the approved master).
Give each a stable `id` (the on-disk filename stem — match the project's naming, e.g.
`tile_<family>_<variant>`), a one-line distinct `prompt`, and hoist the shared parts into the item
`basePrompt`. Seed every keyframe with an **empty `candidates: []`** and `selected: null` — those
fill in during the build. For animated requests, draft `animations[]` entries: `{ kind: "idle",
for, frames, motion }` and `{ kind: "transition", from, to, frames, physics }`, each with
`status: "pending"`. The `motion`/`physics` strings are the motion briefs the animator executes, so
make them physical ("leaves loosen and fall staggered at terminal velocity"), not vague
("animate it").

## Write the config

1. Open `godot/assets/tiles/v2/pipeline.json`. **First run** (file absent): create it with a global
   `settings` block — `styleSpec: "_style-spec.json"`, `canvas` (32px tile size — note this lives
   here, **not** in the style spec), `fps`, `candidates`, `humanApproval`, `autonomous` — and an
   empty `items: []`.
2. **Append a new `items[]` entry** for the family: `{ id, basePrompt, priors, master, children,
   animations }`. Master/children each get `{ id, prompt, selected: null, candidates: [] }`.
   Validate against `references/manifest-schema.md`: every keyframe `id` unique + stable; each
   animation's `for` / `from` / `to` references a real keyframe id; relative `styleSpec`, `priors`,
   and (later) `path`/`gif` paths resolve from the `pipeline.json` dir (`godot/assets/tiles/v2/`).
3. **Growing an existing family?** Append the new `children` / `animations` to its existing `items[]`
   entry instead of adding a new item — gap-fill only touches the new ids, and the shipped siblings
   become priors automatically.

## Build the proposal (= rebuild the pixelGen viewer)

The proposal surface is the pixelGen viewer in **all-pending** state — no separate doc:

```bash
node .claude/skills/sprite-pipeline/scripts/build_viewer.mjs   # default out: godot/assets/tiles/v2/pixelGen
```

Then serve it and point the user at **http://localhost:8100/pixelGen/**. **Prefer the control server
`node scripts/serve_viewer.mjs`** (background) over a plain static server: it spawns
`build_viewer.mjs --watch`, so the page updates **live** as the run progresses (the static
`python -m http.server 8100 --directory godot/assets/tiles/v2` only shows a snapshot). Start it here,
at intake, and **leave it running for the whole session** so the same page is the proposal now and
the live progress monitor during the build. Every requested asset renders as a placeholder card
showing its id + prompt + motion/physics — that *is* the proposal. Post a short chat summary too
(item id, N keyframes [master + children] / idles / transitions, the priors, and that the next step
spends PixelLab credits).

## The approval gate

**Stop here and wait.** Intake produces config + the proposal view only — it never generates art.
The user reviews pixelGen, tweaks prompts (edit `pipeline.json`) or comments, and re-builds until the
plan reads right. Only when they explicitly approve ("run it") do you proceed to Stage 1 → 4, where
generation and animation spend PixelLab credits + Aseprite ops. After the run, the **same** pixelGen
cards fill with real art — proposal and output share one surface.
