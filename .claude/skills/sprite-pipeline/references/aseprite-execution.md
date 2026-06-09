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
  the Gate-3 critique — frame count `N`, fps, per-frame motion;
- the **keyframe still(s)** (`keyframes/<id>.png`), and for a transition, both endpoints;
- the **style spec** (`<assets>/_style-spec.json`) for canvas size, palette ramps, fps.

You leave with, written into the set directory (see `godot-integration.md` for the full layout):
- `frames/<id>/NN.png` — one PNG per animation frame (`00.png`, `01.png`, …), the Godot input;
- `previews/<id>.gif` — a looping preview GIF (the Gate-4 montage / viewer input);
- optionally a horizontal sprite-sheet PNG (+ its `.json` sidecar) for quick inspection.

Each frame's pixels can be **imported** from a per-frame PNG (if you rendered cels elsewhere) or
**drawn directly** in Aseprite with the draw tools. Either way the *assembly + timing + export*
below is identical.

---

## The frame-assembly recipe

The Aseprite MCP is a stateless CLI: each call re-opens the file, acts, and saves in place. So the
**first** thing is to give the sprite a stable path; everything after operates on that path.

1. **`create_canvas`** — width/height from `_style-spec.json` (`canvas.width`×`canvas.height`,
   default 90×90), RGB color mode (preserves RGBA/transparency). It opens at a **temp path**.
2. **`save_as`** — immediately save to a STABLE working path, e.g.
   `…/sets/<set>/_work/<id>.aseprite`. From here on, pass that path to every call.
3. **`add_frame` × (N−1)** — the canvas starts with frame 1; add the rest. Each `add_frame` takes a
   `duration_ms` (= `round(1000 / fps)`, e.g. 100 ms at 10 fps). Consecutive calls append in order
   (frame 2, 3, … N).
4. **`import_image` × N** — map each source PNG to its frame (`frame_number` 1…N), reusing the same
   `layer_name` across frames so they land as cels on one layer. *Or* skip this and **draw
   directly** per frame with `draw_pixels` / `draw_line` / `draw_circle` / `draw_rectangle` /
   `fill_area` / `draw_with_dither`.
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

Then hand off to `godot-integration.md`: import the PNGs, run `assemble_tres.gd`, get the `.tres`.

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
