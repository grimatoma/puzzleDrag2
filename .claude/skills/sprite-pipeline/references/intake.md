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

## Offer a preset first (skip re-specifying)

Before the interview, check for a saved **preset** — a reusable bundle of generation settings
(canvas/fps/candidates/humanApproval + advisory idle/transition frame-count defaults) so the user
doesn't re-answer the same setup every time they add tiles:

```bash
node .claude/skills/sprite-pipeline/scripts/pipeline-patch.mjs preset-list
```

If a saved preset fits the request, **offer it** — "reuse preset `<name>` (32px, fps 10, 4 candidates,
gated)?" — and on yes apply it before drafting `items[]`:

```bash
node .claude/skills/sprite-pipeline/scripts/pipeline-patch.mjs preset-apply <name>
```

`preset-apply` copies the preset's `canvas`/`fps`/`candidates`/`humanApproval` into the global
`settings`; its `idleFrames`/`transitionFrames` are **advisory defaults** you use when drafting
`animations[]` (they are not `settings` fields). After you've configured a *new* family the user is
happy with, **offer to save it** for next time:

```bash
node .claude/skills/sprite-pipeline/scripts/pipeline-patch.mjs preset-save <name> --desc "<text>" --idle-frames 8 --transition-frames 20
```

Presets are an **opt-in convenience** — they do **not** license silently assuming settings. Even with a
preset on the table, the questions below are still **asked**; a preset just pre-fills the answers the
user can confirm or override.

## The interview — ASK, don't assume

**The defining parameters are ASKED, never silently defaulted.** Do not assume a 32px canvas, a frame
rate, which variants the user wants, or which of them animate — these are exactly the decisions the
user complained about being made for them. Prefer batched `AskUserQuestion` calls (2–4 questions each;
fire 2–4 calls in parallel so the user answers everything in one card) over a slow back-and-forth, but
the point is that each of the following is a **real question put to the user**, not an inferred default.
The goal is to fill out the new `items[]` entry (and the global `settings`, first run) per
`references/manifest-schema.md`.

Ask, at minimum:

| # | Question (ASK this) | Drives | Fallback ONLY if they decline |
|---|---------------------|--------|-------------------------------|
| 1 | **Resolution / canvas size?** What pixel dimensions — 32×32, 48×48, 64×64, …? (Do **not** silently use 32.) | `settings.canvas` (first run) / item `canvas` override | The preset's / existing global `canvas` if one is set; otherwise re-ask — don't guess |
| 2 | **Frame rate (fps)?** Playback rate for any idles/transitions. | `settings.fps` / item `fps` override | The preset's / existing global `fps`; otherwise re-ask |
| 3 | **Which keyframes?** The **master** + exactly which children/variants — seasons? damage states? growth stages? **Enumerate them**, don't assume a set. | the `master` + `children[]` ids/prompts | None — this is the request itself; if unclear, ask |
| 4 | **Which animations?** Which keyframes get a looping **idle**, and which **pairs** get a **transition** tween? (Enumerate; static-only is a valid answer, but it must be the user's answer.) | `animations[]` (`kind: idle` / `kind: transition`), frame counts | The preset's `idleFrames`/`transitionFrames` for counts; whether each animates is the user's call |
| 5 | **One item or several?** One cohesive family (one `master` + its `children`) or distinct families (several `items[]`)? Item `id`(s)? | one-or-many `items[]`, item `id`, master/children split | One item, id from the subject |
| 6 | **Cohesion priors?** Which already-shipped tiles should the new members visually match? (point at existing PNGs under `godot/assets/tiles/`) | item `priors[]` | The closest siblings in the same family on disk; if none, omit |
| 7 | **Candidates per step, and human-gated vs autonomous?** How many candidate seeds per step — `1`, `2`, or `4`? Human gate on (you review in pixelGen), or autonomous (LLM self-audit decides)? | `settings.candidates`, `humanApproval`, `autonomous` | The preset's values; otherwise `candidates: 4`, `humanApproval: true`, `autonomous: false` |

The "Fallback ONLY if they decline" column is exactly that — a value to use **when the user declines to
answer or defers to a preset**, not a default you apply without asking. When a preset was applied above,
present its values as the pre-filled answer the user confirms or changes; that's how a preset shortens
the interview without skipping the ask.

For each requested tile, decide whether it's the **master** (the base every sibling derives from —
usually the fullest / most canonical variant) or a **child** (derived from the approved master).
Give each a stable `id` (the on-disk filename stem — match the project's naming, e.g.
`tile_<family>_<variant>`), a one-line distinct `prompt`, and hoist the shared parts into the item
`basePrompt`. Seed every keyframe as `{ id, prompt, selected: null, selectedPath: null }` with **no
`candidates` key** — those slots fill in during the build. Candidates are **not** authored at intake
and do **not** live in `pipeline.json`: they accumulate in the separate `pipeline.history.json`
sidecar during generation (a brand-new set starts that sidecar as `{}`). For animated requests, draft
`animations[]` entries: `{ kind: "idle",
for, frames, motion }` and `{ kind: "transition", from, to, frames, physics }`, each with
`status: "pending"`. The `motion`/`physics` strings are the motion briefs the animator executes, so
make them physical ("leaves loosen and fall staggered at terminal velocity"), not vague
("animate it").

## Write the config

The set is driven by **three side-by-side files** in `godot/assets/tiles/v2/` (see
`references/manifest-schema.md`): `pipeline.json` (the spec + current state you edit here),
`pipeline.history.json` (the candidate/attempt log sidecar — starts `{}`, ready-to-copy starter at
`assets/manifest.history.template.json`, populated by generation, not hand-authored), and
`pipeline.schema.json` (the formal JSON Schema every script validates against —
it **refuses** to proceed on invalid data, and a stray `candidates` key on a keyframe fails its
`additionalProperties: false`). Intake only writes `pipeline.json`.

1. Open `godot/assets/tiles/v2/pipeline.json`. **First run** (file absent): create it with a global
   `settings` block — `styleSpec: "_style-spec.json"`, `canvas` (32px tile size — note this lives
   here, **not** in the style spec), `fps`, `candidates`, `humanApproval`, `autonomous` — and an
   empty `items: []`. (The `pipeline.history.json` sidecar starts as `{}` — or may be left absent and
   read as `{}`; you don't hand-author it.)
2. **Append a new `items[]` entry** for the family: `{ id, basePrompt, priors, master, children,
   animations }`. Master/children each get `{ id, prompt, selected: null, selectedPath: null }` —
   **no `candidates` key** (that would make `pipeline.json` schema-invalid; candidates live in the
   history sidecar). Validate against `references/manifest-schema.md` (the canonical schema reference)
   / `pipeline.schema.json`: every keyframe `id` unique + stable; each animation's `for` / `from` /
   `to` references a real keyframe id; relative `styleSpec`, `priors`, and (later) `selectedPath`/`gif`
   paths resolve from the `pipeline.json` dir (`godot/assets/tiles/v2/`).
3. **Growing an existing family?** Append the new `children` / `animations` to its existing `items[]`
   entry instead of adding a new item — gap-fill only touches the new ids, and the shipped siblings
   become priors automatically.

## Build the proposal (= rebuild the pixelGen viewer)

The proposal surface is the pixelGen viewer in **all-pending** state — no separate doc:

```bash
npm run pixelgen:build    # = build_viewer.mjs; out: godot/assets/tiles/v2/pixelGen
```

Then serve it and point the user at **http://localhost:8100/pixelGen/**. **Prefer the control server
`npm run pixelgen:serve`** (= `node scripts/serve_viewer.mjs`, run in the background) over a plain
static server: it spawns `build_viewer.mjs --watch`, so the page updates **live** as the run progresses
(a plain static server only shows a snapshot). Start it here, at intake, and **leave it running for the
whole session** so the same page is the proposal now and the live progress monitor + human-gate surface
during the build.

> **Health-check for a stale server first.** If a server is already up (from another worktree/checkout)
> it serves the **wrong** `pipeline.json` and holds port 8100, so your new run can't bind it. Confirm
> what it's bound to:
> ```bash
> curl -s localhost:8100/api/health    # → {"ok":true,"pipelinePath":"…","port":8100,"startedAt":"…"}
> ```
> If `pipelinePath` is not this worktree's `godot/assets/tiles/v2/pipeline.json`, kill the stale node
> and restart with `npm run pixelgen:serve`. (With no server up, the viewer drops into a calm
> **read-only mode** — "Decisions and comments won't be saved" — instead of silently dropping clicks.)

Every requested asset renders as a placeholder card showing its id + prompt + motion/physics — that
*is* the proposal. Post a short chat summary too (item id, N keyframes [master + children] / idles /
transitions, the priors, and that the next step spends PixelLab credits if PixelLab is a chosen
keyframe source).

## The approval gate (and the per-gate protocol during the run)

**Stop here and wait.** Intake produces config + the proposal view only — it never generates art. The
user reviews pixelGen, tweaks prompts (in the viewer or by editing `pipeline.json`) or comments, and
re-builds until the plan reads right. Only when they explicitly approve ("run it") do you proceed to
Stage 1 → 4, where generation and animation spend PixelLab credits (if PixelLab is a chosen source) +
Aseprite ops. After the run, the **same** pixelGen cards fill with real art — proposal and output share
one surface.

**During the run, every human-approval checkpoint is browser-driven — the user never types in chat.**
At each gate the orchestrator broadcasts `pipeline-patch.mjs run-state waiting "…"` and then **blocks on
`pipeline-patch.mjs await-review`**; the user reviews in pixelGen (approve/select, "Reject all",
comment, edit a prompt, reject/comment an animation) and clicks **"Done reviewing — resume run"**, which
unblocks the orchestrator. The full closed-loop protocol (consume the `AWAIT_REVIEW_RESULT` diff,
re-run gap-fill for rejects, act-on-then-`clear-comment` feedback) lives in **SKILL.md §"The
viewer-driven human gate"** — intake just sets up the surface; the gate itself runs there.

**Publishing into the game is NOT part of the run.** The pipeline ends at the produced frames + preview
GIF. Pushing tiles into Godot (`npm run godot:update-tiles`) is a **separate, manual step the user runs
in another session** — never automatically by the pipeline (see SKILL.md §"Publishing to the game is a
separate MANUAL session").
