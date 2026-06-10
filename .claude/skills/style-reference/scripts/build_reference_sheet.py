#!/usr/bin/env python3
"""Build the consolidated *style-reference sheet* from a few sample assets.

This is the front door to the sprite-pipeline's Stage 0: it ingests 2-4 "hero"
exemplars (+ optional animation sheets and a locked palette) and lays them out
into ONE legible reference image — the durable picture of the look the whole
generated set will be scored against. It is the visual companion to the prose
`_style-reference.md` and the machine-readable `_style-spec.json`.

It is Pillow-only review/build glue (matching the sprite-pipeline's `montage.py`
conventions): no AI calls, no network, deterministic. All it does is composite
existing PNGs and quantize them for a palette swatch row.

Two input shapes, mutually exclusive:

  # 1) a MANIFEST (recommended) — describes exemplars, sheets, palette, title, notes
  python build_reference_sheet.py --manifest manifest.json --out _style-reference.png

  # 2) positional images — quick ad-hoc sheet, one cell per file, auto labels
  python build_reference_sheet.py a.png b.png c.png --out sheet.png

Manifest format (JSON). Every key is optional except `exemplars`:

  {
    "title": "Hearth tile style reference",
    "notes": "Light upper-left, selective outline, soft drop shadow, 3/4 top-down.",
    "palette": "auto",                       // "auto" (quantize exemplars) or a path
    "exemplars": [
      { "src": "tile_tree_oak.png",  "label": "oak (detailed)" },
      { "src": "tile_tree_fir.png",  "label": "fir" },

      // a SHEET: slice a grid of frames out of one PNG
      { "src": "birch_idle_sheet.png", "label": "birch idle",
        "frame": [90, 90], "grid": [8, 1] },

      // a sheet, but only specific cells (0-based, row-major)
      { "src": "birch_idle_sheet.png", "label": "birch idle (1,4,7)",
        "frame": [90, 90], "grid": [8, 1], "cells": [1, 4, 7] },

      // a row of already-sliced frames laid out as an animation strip
      { "frames": ["frames/idle/00.png", "frames/idle/04.png", "frames/idle/07.png"],
        "label": "birch idle frames" }
    ]
  }

An exemplar entry is one of:
  - single image:  { "src": "<path>", "label": "<text>" }
  - sheet:         { "src": "<path>", "label": "...", "frame": [w,h], "grid": [cols,rows], "cells": [..] }
  - frame strip:   { "frames": ["<path>", ...], "label": "..." }

A sheet or a frame-strip is laid out as a single ROW of frames (so the motion reads
left-to-right); a single image takes one cell. Each cell is upscaled by an integer
factor (--scale, or auto-picked so cells land ~96-128px) over a checker board so
transparency reads, captioned with its label.

The sheet also carries a TITLE strip, a PALETTE SWATCH ROW (quantized from all
exemplars, or read from a .gpl / .hex palette file), and a FOOTER with the
canvas size + exemplar count.

Dependency-light: Pillow only (>=10 for Image.Resampling).  pip install Pillow
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

# ---- layout constants (all in OUTPUT px; deterministic) ---------------------
_PAD = 18              # outer margin
_GAP = 14              # gap between cells
_TITLE_H = 64          # title strip height
_LABEL_H = 22          # per-cell label band height
_SWATCH = 34           # palette swatch square edge
_SWATCH_LABEL_H = 16   # hex caption under each swatch
_FOOTER_H = 26
_CHECKER = 8           # checker square edge (in output px)
_CHECKER_A = (96, 98, 104)
_CHECKER_B = (78, 80, 86)
_BG = (40, 41, 46)
_INK = (232, 230, 224)
_INK_DIM = (158, 156, 150)
_PALETTE_COLORS = 24   # max swatches when quantizing


def _fail(msg):
    print(f"build_reference_sheet: {msg}", file=sys.stderr)
    raise SystemExit(2)


def _font(size):
    """A best-effort TrueType font, falling back to Pillow's bitmap default."""
    for name in ("DejaVuSans.ttf", "Arial.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


_FONT_TITLE = None
_FONT_LABEL = None
_FONT_SMALL = None


def _fonts():
    global _FONT_TITLE, _FONT_LABEL, _FONT_SMALL
    if _FONT_TITLE is None:
        _FONT_TITLE = _font(28)
        _FONT_LABEL = _font(13)
        _FONT_SMALL = _font(11)
    return _FONT_TITLE, _FONT_LABEL, _FONT_SMALL


def _text_w(draw, text, font):
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        return r - l
    except AttributeError:  # very old Pillow
        return draw.textsize(text, font=font)[0]


def _load_rgba(path):
    if not os.path.isfile(path):
        _fail(f"file not found: {path}")
    try:
        return Image.open(path).convert("RGBA")
    except Exception as e:  # noqa: BLE001 - surface any decode failure clearly
        _fail(f"could not read image {path}: {e}")


def _slice_sheet(path, frame, grid, cells):
    """Cut a grid of frames out of one sheet PNG; return [RGBA, ...]."""
    sheet = _load_rgba(path)
    fw, fh = int(frame[0]), int(frame[1])
    cols, rows = int(grid[0]), int(grid[1])
    if fw <= 0 or fh <= 0 or cols <= 0 or rows <= 0:
        _fail(f"{path}: frame {frame} and grid {grid} must all be positive")
    need_w, need_h = fw * cols, fh * rows
    if sheet.width < need_w or sheet.height < need_h:
        _fail(
            f"{path}: grid {cols}x{rows} of {fw}x{fh} needs {need_w}x{need_h}px "
            f"but the sheet is only {sheet.width}x{sheet.height}px"
        )
    total = cols * rows
    idx = list(range(total)) if not cells else list(cells)
    out = []
    for i in idx:
        if i < 0 or i >= total:
            _fail(f"{path}: cell index {i} out of range 0..{total - 1}")
        cx, cy = (i % cols) * fw, (i // cols) * fh
        out.append(sheet.crop((cx, cy, cx + fw, cy + fh)))
    return out


def _exemplar_frames(entry):
    """Normalize one manifest entry -> (label, [RGBA frame, ...])."""
    label = str(entry.get("label", "")).strip()
    if "frames" in entry:
        paths = entry["frames"]
        if not isinstance(paths, list) or not paths:
            _fail(f"entry {label!r}: 'frames' must be a non-empty list")
        return label, [_load_rgba(p) for p in paths]
    src = entry.get("src")
    if not src:
        _fail(f"entry {label!r}: needs 'src' (single image / sheet) or 'frames' (strip)")
    if "frame" in entry or "grid" in entry:
        if "frame" not in entry or "grid" not in entry:
            _fail(f"entry {label!r} ({src}): a sheet needs BOTH 'frame':[w,h] and 'grid':[cols,rows]")
        return label, _slice_sheet(src, entry["frame"], entry["grid"], entry.get("cells"))
    return label or os.path.splitext(os.path.basename(src))[0], [_load_rgba(src)]


# ---- palette extraction -----------------------------------------------------
def _hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])


def _read_palette_file(path):
    """Read a Lospec .hex (one hex per line, with or without a leading '#') or a GIMP .gpl
    palette -> [(r,g,b), ...]. Lospec's canonical .hex export has NO '#' prefix, so a bare
    3/6-digit hex token is accepted too."""
    if not os.path.isfile(path):
        _fail(f"palette file not found: {path}")
    cols = []
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.strip()
            # Skip blanks and GPL header lines ('GIMP Palette', 'Name:', 'Columns:').
            if not line or line.lower().startswith(("gimp", "name:", "columns:")):
                continue
            # A hex color, bare or '#'-prefixed (a GPL '#' comment is longer and fails the
            # 3/6-digit check below, so it falls through and is dropped by the triple branch).
            token = line.lstrip("#")
            if len(token) in (3, 6) and all(c in "0123456789abcdefABCDEF" for c in token):
                if len(token) == 3:
                    token = "".join(c * 2 for c in token)
                cols.append((int(token[0:2], 16), int(token[2:4], 16), int(token[4:6], 16)))
                continue
            # GPL "r g b   name" triple.
            parts = line.split()
            if len(parts) >= 3 and all(p.isdigit() for p in parts[:3]):
                cols.append((int(parts[0]), int(parts[1]), int(parts[2])))
    if not cols:
        _fail(f"no colors parsed from palette file {path}")
    # de-dup, preserve order
    seen, uniq = set(), []
    for c in cols:
        if c not in seen:
            seen.add(c)
            uniq.append(c)
    return uniq


def _quantize_palette(all_frames, k):
    """Deterministic dominant-color extraction across every exemplar frame.

    Composite each frame's opaque pixels onto one tall strip, quantize the strip
    to k colors (median-cut, deterministic), and return the palette sorted by
    luminance so ramps read dark -> light. Fully transparent pixels are dropped.
    """
    swatches = []
    for fr in all_frames:
        # keep only reasonably opaque pixels so the board bg / halo doesn't pollute
        px = fr.load()
        for y in range(fr.height):
            for x in range(fr.width):
                r, g, b, a = px[x, y]
                if a >= 128:
                    swatches.append((r, g, b))
    if not swatches:
        return []
    strip = Image.new("RGB", (len(swatches), 1))
    strip.putdata(swatches)
    q = strip.quantize(colors=min(k, max(2, len(set(swatches)))), method=Image.MEDIANCUT)
    pal = q.getpalette()
    used = sorted(set(q.tobytes()))  # palette indices actually used
    cols = [(pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2]) for i in used]
    cols.sort(key=lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2])
    return cols


# ---- rendering --------------------------------------------------------------
def _checker_cell(w, h):
    cell = Image.new("RGB", (w, h), _CHECKER_A)
    d = ImageDraw.Draw(cell)
    for yy in range(0, h, _CHECKER):
        for xx in range(0, w, _CHECKER):
            if ((xx // _CHECKER) + (yy // _CHECKER)) % 2:
                d.rectangle([xx, yy, xx + _CHECKER - 1, yy + _CHECKER - 1], fill=_CHECKER_B)
    return cell


def _draw_cell(frame, scale, cell_px):
    """Upscale one frame (nearest) centered on a checker tile of cell_px square."""
    up = frame.resize((frame.width * scale, frame.height * scale), Image.Resampling.NEAREST)
    tile = _checker_cell(cell_px, cell_px)
    ox = (cell_px - up.width) // 2
    oy = (cell_px - up.height) // 2
    tile.paste(up, (ox, oy), up if up.mode == "RGBA" else None)
    return tile


def _pick_scale(frames, target=112):
    """Integer scale so the largest frame lands ~target px (clamped 2..12)."""
    biggest = max((max(f.width, f.height) for f in frames), default=32)
    s = max(1, round(target / max(1, biggest)))
    return max(2, min(12, s))


def build_sheet(exemplars, palette_cols, title, notes, scale, out_path):
    """exemplars = [(label, [frame, ...]), ...]; palette_cols = [(r,g,b), ...]."""
    fonts = _fonts()
    f_title, f_label, f_small = fonts

    all_frames = [fr for _, frames in exemplars for fr in frames]
    if not all_frames:
        _fail("no exemplar frames to render")
    if scale <= 0:
        scale = _pick_scale(all_frames)
    cell_px = max(max(f.width, f.height) for f in all_frames) * scale

    # one ROW per exemplar entry; a row is its frames laid left-to-right.
    row_widths = []
    for _, frames in exemplars:
        row_widths.append(len(frames) * cell_px + (len(frames) - 1) * _GAP)
    content_w = max(row_widths)
    grid_w = content_w + 2 * _PAD

    # palette row geometry
    pal_cols_per_row = max(1, (content_w + _GAP) // (_SWATCH + _GAP))
    pal_rows = (len(palette_cols) + pal_cols_per_row - 1) // max(1, pal_cols_per_row) if palette_cols else 0
    pal_block_h = pal_rows * (_SWATCH + _SWATCH_LABEL_H + 6) if pal_rows else 0

    row_h = cell_px + _LABEL_H
    grid_h = (
        _TITLE_H
        + len(exemplars) * (row_h + _GAP)
        + (_GAP + 18 + pal_block_h if pal_block_h else 0)
        + _FOOTER_H
        + 2 * _PAD
    )

    canvas = Image.new("RGB", (grid_w, grid_h), _BG)
    d = ImageDraw.Draw(canvas)

    # title strip
    d.rectangle([0, 0, grid_w, _TITLE_H], fill=(28, 29, 33))
    d.text((_PAD, 14), title or "Style reference", font=f_title, fill=_INK)
    if notes:
        d.text((_PAD, _TITLE_H - 18), notes[:140], font=f_small, fill=_INK_DIM)

    y = _TITLE_H + _PAD
    for label, frames in exemplars:
        x = _PAD
        for fr in frames:
            canvas.paste(_draw_cell(fr, scale, cell_px), (x, y))
            x += cell_px + _GAP
        # label band under the row
        ly = y + cell_px + 4
        d.text((_PAD, ly), label, font=f_label, fill=_INK_DIM)
        # native px size hint at the row's right edge
        sz = f"{frames[0].width}x{frames[0].height}"
        d.text((_PAD + content_w - _text_w(d, sz, f_small), ly + 1), sz, font=f_small, fill=(120, 118, 114))
        y += row_h + _GAP

    # palette swatch row
    if palette_cols:
        d.text((_PAD, y), "palette", font=f_label, fill=_INK_DIM)
        y += 18
        for i, c in enumerate(palette_cols):
            col = i % pal_cols_per_row
            row = i // pal_cols_per_row
            sx = _PAD + col * (_SWATCH + _GAP)
            sy = y + row * (_SWATCH + _SWATCH_LABEL_H + 6)
            d.rectangle([sx, sy, sx + _SWATCH - 1, sy + _SWATCH - 1], fill=c, outline=(20, 20, 22))
            d.text((sx, sy + _SWATCH + 2), _hex(c), font=f_small, fill=_INK_DIM)
        y += pal_block_h + _GAP

    # footer
    footer = f"{len(exemplars)} exemplar group(s) | {len(all_frames)} frame(s) | source canvas {all_frames[0].width}x{all_frames[0].height}px | scale x{scale}"
    d.text((_PAD, grid_h - _FOOTER_H), footer, font=f_small, fill=_INK_DIM)

    out_dir = os.path.dirname(os.path.abspath(out_path))
    if out_dir and not os.path.isdir(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    canvas.save(out_path)
    return out_path, canvas.size


def _load_manifest(path):
    if not os.path.isfile(path):
        _fail(f"manifest not found: {path}")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as e:
        _fail(f"manifest {path} is not valid JSON: {e}")
    if not isinstance(data, dict):
        _fail("manifest must be a JSON object")
    entries = data.get("exemplars")
    if not isinstance(entries, list) or not entries:
        _fail("manifest needs a non-empty 'exemplars' array")
    base = os.path.dirname(os.path.abspath(path))
    # resolve relative src/frames paths against the manifest's own directory
    def _resolve(p):
        return p if os.path.isabs(p) else os.path.join(base, p)
    norm = []
    for e in entries:
        e = dict(e)
        if "src" in e:
            e["src"] = _resolve(e["src"])
        if "frames" in e:
            e["frames"] = [_resolve(p) for p in e["frames"]]
        norm.append(e)
    pal = data.get("palette", "auto")
    if isinstance(pal, str) and pal != "auto":
        pal = _resolve(pal)
    return {
        "title": data.get("title", ""),
        "notes": data.get("notes", ""),
        "palette": pal,
        "exemplars": norm,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Build a consolidated style-reference sheet (exemplars + palette + labels) "
        "from sample assets, for the sprite-pipeline.",
        epilog="See the module docstring for the manifest format and examples.",
    )
    ap.add_argument("images", nargs="*", help="image paths (used when --manifest is omitted)")
    ap.add_argument("--manifest", default="", help="path to a JSON manifest describing exemplars")
    ap.add_argument("--out", required=True, help="output PNG path for the reference sheet")
    ap.add_argument("--title", default="", help="title strip text (overrides the manifest title)")
    ap.add_argument("--notes", default="", help="one-line art-direction note under the title")
    ap.add_argument(
        "--palette", default="",
        help="'auto' to quantize the exemplars, or a path to a .gpl/.hex palette "
        "(overrides the manifest palette)",
    )
    ap.add_argument(
        "--scale", type=int, default=0,
        help="integer upscale per frame (default: auto, so a cell lands ~112px)",
    )
    a = ap.parse_args(argv)

    if a.manifest:
        m = _load_manifest(a.manifest)
        title = a.title or m["title"]
        notes = a.notes or m["notes"]
        pal_spec = a.palette or m["palette"]
        raw_entries = m["exemplars"]
    elif a.images:
        title = a.title or "Style reference"
        notes = a.notes
        pal_spec = a.palette or "auto"
        raw_entries = [{"src": p} for p in a.images]
    else:
        ap.error("provide --manifest <json> or one or more positional image paths")

    exemplars = [_exemplar_frames(e) for e in raw_entries]
    all_frames = [fr for _, frames in exemplars for fr in frames]

    if pal_spec == "auto" or not pal_spec:
        palette_cols = _quantize_palette(all_frames, _PALETTE_COLORS)
    else:
        palette_cols = _read_palette_file(pal_spec)

    out_path, size = build_sheet(exemplars, palette_cols, title, notes, a.scale, a.out)
    print(f"{len(exemplars)} group(s), {len(all_frames)} frame(s) -> {out_path}  ({size[0]}x{size[1]})")


if __name__ == "__main__":
    main()
