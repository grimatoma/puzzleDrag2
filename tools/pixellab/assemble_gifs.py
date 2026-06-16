"""Build the human-review artifacts for a subject: a looping GIF for every
animation clip, a frame STRIP for each (to eyeball interpolation artifacts /
glow), and a gridline montage of the four season stills (the single most useful
consistency/envelope check -- it's what catches an off-model season or a sprawled
bare crown that the numeric checks miss).

Composites on the board bg (#d7e7c0) at 3x nearest. GIFs go to anim/ (handy
previews); strips + the stills montage go to --review (review-only, gitignore it).

Usage:
  python tools/pixellab/assemble_gifs.py chicken
  python tools/pixellab/assemble_gifs.py willow --review docs/seasonal-tile-system/assets/_review
"""
import os, glob, argparse
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('subject')
ap.add_argument('--assets', default='docs/seasonal-tile-system/assets')
ap.add_argument('--review', default='docs/seasonal-tile-system/assets/_review')
ap.add_argument('--seasons', default='spring,summer,autumn,winter')
ap.add_argument('--scale', type=int, default=3)
a = ap.parse_args()

BG = (215, 231, 192)
anim = os.path.join(a.assets, 'anim')
os.makedirs(a.review, exist_ok=True)
S = a.scale
pre = a.subject + '-'


def load(d):
    out = []
    for f in sorted(glob.glob(os.path.join(d, 'frame_*.png'))):
        im = Image.open(f).convert('RGBA')
        c = Image.new('RGBA', im.size, BG + (255,)); c.alpha_composite(im)
        out.append(c.convert('RGB').resize((im.width * S, im.height * S), Image.NEAREST))
    return out


# 1. per-clip loop GIFs + strips
for d in sorted(glob.glob(os.path.join(anim, pre + '*'))):
    if not os.path.isdir(d):
        continue
    fr = load(d)
    if not fr:
        continue
    name = os.path.basename(d)
    dur = 130 if 'idle' in name else 90
    fr[0].save(os.path.join(anim, name + '.gif'), save_all=True, append_images=fr[1:], duration=dur, loop=0, disposal=2)
    sel = fr[::2]
    strip = Image.new('RGB', (sum(f.width for f in sel), sel[0].height), BG)
    x = 0
    for f in sel:
        strip.paste(f, (x, 0)); x += f.width
    strip.save(os.path.join(a.review, name + '-strip.png'))
    print('clip', name, len(fr), 'frames')

# 2. gridline stills montage (the consistency / envelope eyeball)
stills = []
for s in a.seasons.split(','):
    p = os.path.join(a.assets, '%s-%s.png' % (a.subject, s))
    if os.path.exists(p):
        im = Image.open(p).convert('RGBA')
        c = Image.new('RGBA', im.size, BG + (255,)); c.alpha_composite(im)
        stills.append((s, c.convert('RGB').resize((im.width * S, im.height * S), Image.NEAREST)))
if stills:
    fw, fh = stills[0][1].size
    LBL, GRID = 16, 8
    m = Image.new('RGB', (len(stills) * (fw + 8) + 8, fh + LBL + 8), BG)
    d = ImageDraw.Draw(m); x = 8
    for s, im in stills:
        m.paste(im, (x, LBL))
        for gy in range(0, fh, GRID * S):
            d.line([(x, LBL + gy), (x + fw, LBL + gy)], fill=(150, 170, 130))
        d.text((x + 2, 2), s, fill=(20, 20, 20)); x += fw + 8
    out = os.path.join(a.review, a.subject + '-stills.png')
    m.save(out); print('stills montage ->', out)
