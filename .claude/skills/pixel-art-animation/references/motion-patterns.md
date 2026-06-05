# Motion patterns — recipes

Code recipes for each kind of pixel-art motion. All assume the helpers from
`assets/anim_starter.py` (`Buf`/`put`, `disc`, `poly`, `outline`, `lit`, `sphere_t`,
`wind`, `envl`, `cantilever`) and a per-frame `p = 2*math.pi*f/N`. Everything is driven by
`p` so the loop is seamless.

Each recipe ends with **Organic notes** — the small choices that decide whether it reads
as alive or as a sliding block. Read those; they're the whole point.

## Contents
1. [Cantilever bend (sway)](#1-cantilever-bend-sway)
2. [Applying a bend to a filled body vs a thin part](#2-applying-a-bend-to-a-filled-body-vs-a-thin-part)
3. [Articulation (parts moving)](#3-articulation-parts-moving)
4. [Rotating a part about a pivot](#4-rotating-a-part-about-a-pivot)
5. [Pendulum vs settle](#5-pendulum-vs-settle)
6. [Traveling wave (swim)](#6-traveling-wave-swim)
7. [Pulse / glow](#7-pulse--glow)
8. [Glint sweep](#8-glint-sweep)
9. [Overlays: sparkle, bubbles, spores, falling leaf](#9-overlays)
10. [Hinge open/close](#10-hinge-openclose)
11. [Breathing (bloom in/out)](#11-breathing-bloom-inout)

---

## 1. Cantilever bend (sway)
**For:** grass, fronds, husks, hair, tails, a tree canopy treated as a mass — any flexible
part anchored at one end.

```python
# s = 0 at the anchor, 1 at the free tip. cantilever() lives in anim_starter.py:
#   amp * s**exp * wind(p - lag*s + phase) * envl(p)
for bx, fh, lean, ph in blades:                 # ph = per-blade phase offset
    for i in range(fh * 4 + 1):                  # march s finely so the line never gaps
        s = i / (fh * 4)
        yy = base_y - s * fh
        xx = bx + lean*(s**1.4)*fh*0.16 + cantilever(s, p, amp=4.0, phase=ph)
        buf.put(xx, yy, lit(GREEN, 0.85 if s > 0.6 else 0.45))
```

**Organic notes:**
- `exp≈1.6–1.8`: the curve. Lower → stiffer/straighter; higher → whippier tip.
- `lag≈1.0–1.3`: the tip lags the base. **This is the single most important value** — at
  `lag=0` the part swings as a rigid stick; raise it until the tip clearly trails.
- `phase` spread across elements (e.g. `i*0.9`) makes a gust roll across the group.
- Keep the anchor row fixed (s=0 contributes ~0 offset) so it stays rooted.

## 2. Applying a bend to a filled body vs a thin part
A **thin** part (a blade) is drawn by marching `s` and placing one pixel — see above.
A **filled** part (a stalk, a cob you DO want to bend) is drawn row-by-row, shifting each
row by the bend at its height. Because `put` rounds half-up, the row stays contiguous:

```python
for y in range(top, base + 1):
    s = (base - y) / (base - top)                # 0 at base, 1 at top
    dx = cantilever(s, p, amp=3.5)
    span = half_width_at(y)
    for x in range(int(cx - span), int(cx + span) + 1):
        buf.put(x + dx, y, color_at(x, y))       # whole row shifted by the same dx
```
If you ever see a **dashed/speckled line** appear at the max-shift frames, you used
banker's `round()` somewhere instead of `floor(x+0.5)`. Fix the rounding, not the art.

## 3. Articulation (parts moving)
**For:** a head pecking, a limb, an ear/tail twitch, a wing flap. Draw each part as its own
shape at a per-frame **offset**. The key difference from a slide: the parts move *relative
to each other* and each is re-drawn in place, so the creature re-poses.

```python
bob = math.sin(p) * 1.3                                   # whole-body idle
pk  = max(0.0, math.sin((f-5)/5*math.pi)) if 4 <= f <= 10 else 0.0  # a peck PULSE (once/loop)
hdx, hdy = -pk*4, pk*11                                   # head dives down + forward
blink = f in (13, 14)
draw_body(buf, y=28+bob)
draw_head(buf, x=17+hdx, y=19+hdy+bob)                    # separate part, own offset
if not blink: draw_eye(buf, ...)
```

**Organic notes:**
- Make actions **pulses**, not continuous — a peck/blink/twitch happens once per loop with
  easing in and out (`max(0, sin(...))` over a frame window), then rests. Constant motion
  reads as nervous/robotic.
- Layer a small whole-body **bob** under everything so even the "still" frames breathe.
- Secondary follow-through: let a tail or wattle lag the body by a frame (reuse the bend's
  phase-lag idea on the offset).

## 4. Rotating a part about a pivot
**For:** a shell lid, a lever, a swinging sign, a turning facet. Rotate each of the part's
points about a pivot, then fill the rotated outline with `poly`.

```python
def rot(px, py, cx, cy, a):
    ca, sa = math.cos(a), math.sin(a)
    dx, dy = px - cx, py - cy
    return (cx + dx*ca - dy*sa, cy + dx*sa + dy*ca)

ang = max(0.0, math.sin(p)) * 0.5                          # 0..0.5 rad open/close
pts = [rot(x, y, hinge_x, hinge_y, ang) for (x, y) in part_outline]
poly(buf, pts, lambda x, y: shell_color(x, y))
```
Rotation can leave 1px gaps if the outline is sparse — sample the outline densely (or fill
from a local pre-rendered buffer and inverse-sample). For small angles a horizontal shear
(top row shifted, bottom fixed) is a cheap, hole-free approximation of a nod.

## 5. Pendulum vs settle
Decide what's physical (see "rigid vs soft" in SKILL.md):
- **Hanging** object (fruit on a branch, a lantern): pivots from the **top**; displacement
  grows **downward**: `dx(y) = A*sin(p) * (y - pivot_y)/height`. Bottom swings most.
- **Resting** object (a picked fruit, an egg, a loaf): does **not** swing. Give it a tiny
  **settle** — `bob = sin(p)*0.9`, maybe `sway = sin(p-0.6)*1.0` — and let a light
  appendage (leaf) flutter + a glint travel. Over-swinging a resting object is the #2
  nonsense result after bending a rigid one.

## 6. Traveling wave (swim)
**For:** fish, eels, snakes, banners, ribbons. A sine wave travels along the body axis;
amplitude grows toward the free end (tail). Build the body column-by-column around a
wavy centerline.

```python
x0, x1, cy = 9, 36, 25                                     # head .. tail-base
L = x1 - x0
def wave(s): return 2.6*(0.18+s)*math.sin(2*math.pi*(0.85*s) - p)   # travels tail-ward
for x in range(x0, x1+1):
    s = (x - x0)/L
    h = body_half_height(s)
    yc = cy + wave(s)
    for y in range(int(yc-h), int(yc+h)+1):
        buf.put(x, y, body_color(s, (y-yc)/h))
# the tail FIN attaches at s≈1 and inherits the largest wave offset (it whips)
```

**Organic notes:** the `(0.18+s)` envelope keeps the head steady and the tail loose. The
`- p` (not `+ p`) sends the wave from head to tail, which is how fish actually swim. Fins
and eye sit on the wavy centerline so they ride the body.

## 7. Pulse / glow
**For:** gems, embers, runes, bioluminescent spots, magic. Don't move geometry — move the
**lightness**. Add a pulse term to the `t` you feed `lit(ramp, t)`:

```python
pulse = 0.5 + 0.5*math.sin(p)                              # 0..1
col = lit(RAMP, base_t + 0.18*pulse)
# multiple emitters out of phase read richer:
for sx, sy, ph in spots:
    g = 0.5 + 0.5*math.sin(p + ph)
    disc(buf, sx, sy, 1.7 + 0.5*g, ..., lambda nx,ny: lit(SPOT, 0.4 + 0.6*g))
```

## 8. Glint sweep
**For:** metal, crystal, glass, glossy skin. A bright streak slides across the surface.
Use a Gaussian falloff along a diagonal coordinate whose center moves with `p`:

```python
rx, ry = (x-cx)/R, (y-cy)/R
glint = 0.55 * math.exp(-((rx - ry) - 1.4*math.sin(p))**2 / 0.10)
col = lit(RAMP, base_t + glint)
```

## 9. Overlays
Small independent elements layered on top, each on its own phase/loop. They do a lot of the
"alive" work for little cost.

```python
# Sparkle (4-point twinkle):
sv = math.sin(p + 1.0)
if sv > 0.2:
    buf.put(sx, sy, WHITE)
    if sv > 0.6:
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)): buf.put(sx+dx, sy+dy, WHITE)

# Rising bubbles / drifting spores (loop with phase offsets so they stagger):
g = (f % N) / N
for k, ph in enumerate((0.0, 0.5)):
    t = (g + ph) % 1.0
    buf.put(bx - t*2, by - t*14, BUBBLE)            # rises and resets

# Falling leaf (drift down + sideways, sinusoidal wobble):
g = (f % N) / N
ly = top + g*span
lx = startx - g*7 + math.sin(g*6)*2
if ly < ground: buf.put(lx, ly, LEAF)
```

## 10. Hinge open/close
**For:** clams, books, chests, beaks, jaws. One half is fixed; the other rotates about the
hinge (see §4). Reveal an interior + a payload (pearl/coin) only while open.

```python
op = max(0.0, math.sin(p))                          # 0 closed .. 1 open .. 0
ang = op * 0.5
if op > 0.06:
    draw_interior(buf, openness=op)                 # darker, only visible in the gap
    draw_pearl(buf, openness=op)                    # + a glint when op is high
draw_lower_half(buf, ang=0)                         # fixed
draw_upper_half(buf, ang=ang)                       # rotates open about the hinge
```
Draw the interior/payload **before** the shells so the shells overlap it as they close.

## 11. Breathing (bloom in/out)
**For:** flowers, jellyfish, anything idle that should feel soft. Oscillate a radius or the
spacing of sub-parts.

```python
breathe = 0.5 + 0.5*math.sin(p)
rad = 5.2 + breathe*1.3                             # petals push out and draw back in
for ang in PETAL_ANGLES:
    px = cx + math.cos(ang)*rad
    py = cy + math.sin(ang)*rad*0.9
    disc(buf, px, py, petal_r, ..., petal_color)
```

---

### Composing
Real tiles usually layer 2–3 of these: a **rigid body** + one **soft moving part** (bend or
articulation) + an **overlay** (glint/sparkle/spore). Example combos that worked well:
corn = rigid cob + husk bend + kernel glint; mushroom = body bob + spot pulse + spore
drift; gem = glint sweep + glow pulse + corner sparkle + tiny hover; chicken = body bob +
head peck + blink. Pick the smallest set that makes the object feel alive without fighting
its material.
