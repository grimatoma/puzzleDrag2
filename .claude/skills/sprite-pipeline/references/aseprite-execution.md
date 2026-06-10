# Executing a storyboard in Aseprite (the animation executor)

**Aseprite is the only thing that animates in this pipeline.** PixelLab (or a hand-drawn
keyframe) gives you a base **still**; every moving frame is built here, via the **pixel-plugin
Aseprite MCP** (tools named `mcp__plugin_pixel-plugin_aseprite__*`). Pillow is *only* review glue
(`scripts/montage.py`) — never a frame generator. This doc is the concrete recipe for turning a
filled `assets/storyboard.template.md` into the per-frame PNGs + preview GIF the Godot step packs.

> Why Aseprite and not procedural Pillow: real motion is hand/AI-authored cels (the storyboard's
> per-frame "pixel-level change" column), not a parametric shear. The `pixel-art-animation` skill
> explains *why a slide reads as dead*; Aseprite is *where* you draw the genuine re-form.

---

## Inputs and outputs

You arrive here with:
- a **storyboard** (`storyboards/<id>.md`, from `assets/storyboard.template.md`) that has passed
  the Gate-3 critique and was written **against the generated still** — frame count `N`, fps,
  per-frame motion citing real coordinates;
- the **approved keyframe still(s)** (the selected candidate PNG), and for a transition, both
  endpoints;
- the **style spec** (`<assets>/_style-spec.json`) for palette ramps — but **canvas size + fps come
  from `pipeline.json` `settings` (or per-item overrides), which supersede the style spec's
  `canvas` / `animation.fps`**.

You leave with, written into the output directory (see `godot-integration.md` for the full layout):
- `frames/<id>/NN.png` — one PNG per animation frame (`00.png`, `01.png`, …), the Godot input;
- `previews/<id>.gif` — a looping preview GIF (the Gate-4 montage / viewer input);
- optionally a horizontal sprite-sheet PNG (+ its `.json` sidecar) for quick inspection.

Each frame's pixels can be **imported** from a per-frame PNG (if you rendered cels elsewhere) or
**drawn directly** in Aseprite with the draw tools. Either way the *assembly + timing + export*
below is identical.

---

## Tool param cheat-sheet (load schemas first)

The Aseprite tools are **deferred** — bulk-load their schemas with `ToolSearch "aseprite"` before
the first call (a direct call without the schema fails `InputValidationError`). The params that bite
(verified against the live server — don't guess these):

| Tool | Key params (exact names) | Gotcha |
|---|---|---|
| `analyze_reference` | `reference_path`, `target_width`, `target_height`, `palette_size?` | it's `reference_path`, **not** `image_path`. Returns palette + brightness/edge maps. |
| `create_canvas` | `width`, `height`, `color_mode` (`"rgb"`) | returns a **TEMP** path; `save_as` to your stable `_work/<id>.aseprite` immediately, then use that path everywhere. |
| `save_as` | `sprite_path`, `output_path` | — |
| `add_frame` | `sprite_path`, `duration_ms` | canvas starts with frame 1; call `add_frame`×(N−1). `duration_ms = round(1000/fps)`. |
| `add_layer` | `sprite_path`, `layer_name` | — |
| `import_image` | `sprite_path`, `image_path`, `layer_name`, `frame_number`, `position?{x,y}` | reuse one `layer_name` across frames to keep cels on one layer; `position` defaults to 0,0. |
| `draw_pixels` | `sprite_path`, `layer_name`, `frame_number`, `pixels:[{x,y,color}]`, `use_palette?` | `color` is `#RRGGBB` or `#RRGGBBAA`; **alpha `00` erases** (see above). Batches many pixels per call. |
| `get_pixels` | `sprite_path`, `layer_name`, `frame_number`, `x`, `y`, `width`, `height`, `cursor?` | paginated (page_size default 1000); read the base still's real coords before you storyboard over them. |
| `create_tag` | `sprite_path`, `tag_name`, `from_frame`, `to_frame`, `direction` (`"forward"`) | name it the spec's idle tag (`"idle"`); 1-based inclusive. |
| `export_sprite` | `sprite_path`, `output_path`, `format` (`png`/`gif`), `frame_number` | **`frame_number: 0` = ALL frames** (animated GIF); a positive N exports just that one frame → per-frame PNGs. |

> **Forward-slash paths only** in every call (a Windows backslash makes the Go server throw
> `invalid character 'U' in string escape code`). Only the tools named here (and the rest of
> `mcp__plugin_pixel-plugin_aseprite__*`) exist — don't invent tool names.

---

## The frame-assembly recipe

The Aseprite MCP is a stateless CLI: each call re-opens the file, acts, and saves in place. So the
**first** thing is to give the sprite a stable path; everything after operates on that path.

1. **`create_canvas`** — width/height from `pipeline.json` `settings.canvas` (the 32px tile size;
   it supersedes the style spec's `canvas`), RGB color mode (preserves RGBA/transparency). It opens
   at a **temp path**.
2. **`save_as`** — immediately save to a STABLE working path you **own** (never shared with a
   sibling builder), e.g. `…/items/<itemId>/_work/<id>.aseprite` (legacy birch used
   `…/sets/birch/_work/<id>.aseprite`). From here on, pass that path to every call.
3. **`add_frame` × (N−1)** — the canvas starts with frame 1; add the rest. Each `add_frame` takes a
   `duration_ms` (= `round(1000 / fps)`, e.g. 100 ms at 10 fps). Consecutive calls append in order
   (frame 2, 3, … N).
4. **`import_image` × N** — map each source PNG to its frame (`frame_number` 1…N), reusing the same
   `layer_name` across frames so they land as cels on one layer. *Or* skip this and **draw
   directly** per frame with `draw_pixels` / `draw_line` / `draw_circle` / `draw_rectangle` /
   `fill_area` / `draw_with_dither`. **Default to the additive-overlay pattern** (below): import the
   base still on a base layer at every frame, then add motion on a separate `fx` layer — each call
   carrying an explicit `frame_number` + `layer_name`, **no selection ops**.
5. **`set_frame_duration`** — override timing on specific frames for **endpoint holds** (a
   transition holds its first and last frame a beat; an idle's extremes get a slow-out beat). This
   is the storyboard's "held" easing made literal.
6. **`create_tag`** — tag the range `1…N`, direction **forward** (looping idle) — name it to match
   the style spec's `animation.idleAnimationName` (`"idle"`).
7. **`export_sprite`**, format **gif**, **`frame_number: 0`** — `0` means *all frames* → an
   animated GIF. Write it to `previews/<id>.gif`. (A non-zero `frame_number` exports just that one
   frame — see below.)
8. **`export_spritesheet`**, layout **horizontal** — optional, a flat strip for eyeballing all
   frames at once. It also writes a `<name>.json` frame-metadata sidecar (harmless, and useful if
   you ever import the strip as a sheet).

## Per-frame export (the Godot pipeline input)

Godot's `assemble_tres.gd` packs **individual frame PNGs**, not a GIF. So after assembly, export
each frame to its own file:

- **`export_sprite`**, format **png**, **`frame_number: i`** → `frames/<id>/NN.png`, once per
  frame `i` in `0…N−1`. Two-digit zero-padded names (`00.png`, `01.png`, …) so they sort in order
  (`assemble_tres.gd` sorts by filename).

That is where the **pixel pipeline ends** — at the exported frame PNGs + preview GIF. Getting them
into the engine is a **separate, on-demand step** (see `godot-integration.md`): run
`npm run godot:update-tiles` (it imports the PNGs, packs via `assemble_tres.gd`, and verifies via
`verify_sf.gd` — one command), **not** as part of the pipeline run itself.

---

## Additive overlay — the default, parallel-safe method

Build motion by **adding explicit pixels per frame**, never by selecting and moving a region. Two
layers per sprite:

- a **base layer** (`tree` by convention): the approved keyframe still, **imported onto every
  frame** (`import_image`, one `layer_name`, explicit `frame_number`). The static foundation.
- an **`fx` layer**: the motion, drawn per frame with `import_image` (a pre-rendered cel),
  `draw_pixels`, or `fill_area` — each call carrying an explicit `frame_number`.

**Subtracting is part of "additive" — erase with alpha-`00`.** "Additive overlay" doesn't only mean
*adding* pixels; re-forming a silhouette (a leaf detaching, canopy thinning, a vine tip flexing to a
new position, frost replacing rind) means **removing** pixels too. The mechanic: `draw_pixels` with
a fully-transparent color **`#00000000`** (`#RRGGBBAA` with alpha `00`) **sets that pixel
transparent** — it erases. Two rules make it work:

- **Erase on the BASE layer, not the `fx` layer.** The base is the bottom layer, so a transparent
  pixel there reveals the canvas (true removal). Painting transparent on `fx` (which sits *above* the
  base) does nothing visible — you just see the base pixel underneath. So to *move* or *remove* a
  base-layer pixel (flex a vine tip, detach a clump, recolor rind for frost), edit the **base** layer
  at that `frame_number`: erase the old pixels (`#00000000`) and draw the new ones. This is exactly
  the **flexing-base** recipe below — re-forming the silhouette per frame without any selection op.
- **It's still stateless / parallel-safe.** Each erase names its `frame_number` + `layer_name` like
  any other `draw_pixels`; no hidden selection. (This is the additive analogue of "re-draw the form,
  don't slide it" from the **pixel-art-animation** skill — you re-form by erase+redraw, never by
  `move_selection`.)

**The parallel-safety rule (why this is the default):** every call is **stateless** — it names the
exact `frame_number` + `layer_name` it touches, so nothing depends on a hidden cursor or selection
carried between calls. That is what lets the orchestrator fan **one builder per gap animation out in
parallel**, each owning its own `_work/<id>.aseprite` file. **Never** use
`select_rectangle` / `move_selection` / `select_all` / `deselect` / `copy_selection` /
`cut_selection` / `paste_clipboard` in a pipeline animation: they rely on an implicit selection
state (which breaks parallel-safety) and they *slide a region* instead of *re-forming the shape*
(the cardinal animation sin the gates reject).

### Flexing-base recipe (livelier idles)

A static imported base means the silhouette never breathes — fine for a falling leaf / glint /
drifting snow over a still tree, but a *whole-canopy sway* reads flat. To make the silhouette itself
move, **pre-render 2–3 base poses** (e.g. canopy leaned left / neutral / right) as separate stills,
then **cycle them across the frames** on the base layer:

1. Produce the 2–3 pose PNGs (draw or generate them as variants of the approved keyframe).
2. On the base layer, `import_image` the appropriate pose to **each** `frame_number` (e.g.
   neutral → left → neutral → right → neutral for a sway loop), so the base breathes frame to frame.
3. Add the `fx`-layer overlay (leaf, glint, snow) on top exactly as in the static case.

This is **still additive** — each pose is imported to an explicit `frame_number`; **no selection
ops** — so it stays parallel-safe and stateless. The tradeoff is the extra base-pose art; reach for
it only when a static base reads dead.

---

## Style-conformance helpers (keep output on the style spec)

The critique gates score every frame against `_style-spec.json`. These Aseprite tools help you
*land* on-style instead of failing the gate, and to lift an imported still up to the family look:

| Tool | Use it to… |
|---|---|
| `analyze_reference` | Read a hero exemplar's dims/palette/style — seed canvas + palette from the references (also used at Stage 0). |
| `get_palette` | Pull a file's exact indexed palette — the authoritative ramp hexes. |
| `analyze_palette_harmonies` | Group colors into harmonious ramps; informs the spec's hue-shift. |
| `quantize_palette` | Snap an imported/AI still to the **locked palette** so it stops drifting off-ramp (the #1 cohesion failure). |
| `apply_auto_shading` / `apply_shading` | Add one-light form shading (cool shadow / warm highlight) instead of flat fills — the craft the still-critique checks. |
| `suggest_antialiasing` | Find jaggy edges to smooth selectively (never 45°/straight runs). |
| `apply_outline` | Lay the selective/solid outline the style spec's `outline.rule` calls for. |
| `get_palette` / `set_palette` / `sort_palette` | Inspect and order the working palette. |

Craft rationale (hue-shifted ramps, no pillow-shading, selective anti-aliasing, outlines) lives in the
**pixel-art-craft** skill; motion rationale (arcs, follow-through, staggered release) in the
**pixel-art-animation** skill. Use those as the rubric; use these tools to comply.

> Only the tools named above (and the rest of `mcp__plugin_pixel-plugin_aseprite__*`) exist — do
> not invent tool names. If a capability isn't a real tool, draw it with the primitives.

---

## Windows / path gotchas (hard-won — read before your first call)

- **ALWAYS use forward-slash paths.** A Windows backslash path (`C:\Users\…`) makes the Go server
  throw `invalid character 'U' in string escape code` (it re-parses the arg as JSON and `\U` is an
  invalid escape). Pass `C:/Users/…` everywhere.
- **`create_canvas` returns a TEMP path** (under `%LOCALAPPDATA%\Temp\pixel-mcp\sprite-<nanos>.aseprite`,
  one frame, layer "Layer 1"). `save_as` to your stable path **first**, then operate on that — every
  op saves in place, so state persists between calls.
- **Same-message calls run SEQUENTIALLY, in order.** You can **batch** the whole build in one turn:
  `add_frame`×(N−1), then `import_image`×N, then `set_frame_duration`s, `create_tag`, and all the
  exports — they apply in sequence. A bad path fails only *that* call; the rest still run (so
  isolate risky per-frame paths to avoid gapping the animation).
- **`import_image` places a PNG as a new layer/cel** at a given frame; reuse `layer_name` to keep
  them on one layer. RGB mode preserves RGBA → crisp 1-bit GIF transparency and clean tile edges.
- **`export_spritesheet` always writes a `<name>.json` sidecar** even if you didn't ask for one —
  harmless, sometimes useful. The GIF/PNG exports don't.

### Plugin setup gotcha (Windows; reverts on plugin update)

The pixel-plugin's `.mcp.json` ships a bash-wrapper `command` that won't spawn on Windows
(`ENOENT`), so the server shows "✗ Failed to connect" out of the box. The working config:
- `command` → the absolute `…/bin/pixel-mcp-windows-amd64.exe` (not the wrapper),
- env `PIXEL_MCP_CONFIG` → an **absolute** path to `config.json` (the `${HOME}`/`${...}` forms are
  unreliable on Windows),
- and that `config.json` (holding `aseprite_path`) **must be UTF-8 without a BOM** — the Go server
  rejects a BOM with `invalid character 'ï'`.

These edits live in the version-pinned plugin cache dir, so **a plugin update reverts them** and
re-breaks the server — re-apply after any `plugin update`. Verify with `claude mcp list` (expect
`plugin:pixel-plugin:aseprite ✓ Connected`).
