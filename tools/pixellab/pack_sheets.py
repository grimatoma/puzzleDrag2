"""Pack a subject's animation frame dirs into transparent horizontal spritesheets
that the game loads from public/seasonal-tiles/<subject>/ -- one PNG per clip,
native frame size, NO background, NO upscale (these are the game assets, distinct
from the green-bg review GIFs).

Convention:
  anim/<subject>-idle-<season>/  -> idle-<season>.png
  anim/<subject>-<from>-<to>/     -> trans-<from>-<to>.png
For a deciduous two-segment autumn->winter, concatenate the segments and de-dup
the shared hinge frame, skipping the two source dirs:
  --concat autumn-baremound+baremound-winter=trans-autumn-winter

Usage:
  python tools/pixellab/pack_sheets.py chicken
  python tools/pixellab/pack_sheets.py willow --concat autumn-baremound+baremound-winter=trans-autumn-winter
  python tools/pixellab/pack_sheets.py carrot --decimate 64 --static-idle spring,winter

--decimate N      generate at 128 but pack the GAME sheets at N px (clean 2:1 box downscale).
--static-idle S   pack idle-<season>.png from the season STILL as a 1-frame hold (for seasons
                  whose motion blooms badly, e.g. snow/pastel) instead of the anim dir.
"""
import os, glob, argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('subject')
ap.add_argument('--assets', default='docs/seasonal-tile-system/assets')
ap.add_argument('--out', default='public/seasonal-tiles')
ap.add_argument('--concat', action='append', default=[], help='A+B=sheetname (hinge de-duped)')
ap.add_argument('--decimate', type=int, default=0, help='downscale packed frames to N px (e.g. 64)')
ap.add_argument('--static-idle', default='', help='comma seasons packed static from the still')
a = ap.parse_args()

anim = os.path.join(a.assets, 'anim')
outdir = os.path.join(a.out, a.subject)
os.makedirs(outdir, exist_ok=True)
pre = a.subject + '-'


def frames(dirname, drop_first=False):
    fs = sorted(glob.glob(os.path.join(anim, dirname, 'frame_*.png')))
    if drop_first:
        fs = fs[1:]
    return [Image.open(f).convert('RGBA') for f in fs]


def write_sheet(imgs, name):
    if not imgs:
        print('  (empty, skipped)', name); return
    if not name.endswith('.png'):
        name += '.png'
    w, h = imgs[0].size
    s = Image.new('RGBA', (w * len(imgs), h), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        s.paste(im, (i * w, 0))
    if a.decimate and h != a.decimate:  # clean 2:1-style box downscale of the whole strip
        s = s.resize((max(1, round(s.width * a.decimate / h)), a.decimate), Image.BOX)
    s.save(os.path.join(outdir, name))
    print('  %-28s %2d frames @%dpx' % (name, len(imgs), s.height))


skip = set()
# Static idles: pack the season still as a 1-frame hold and skip its anim dir.
for season in [x for x in a.static_idle.split(',') if x]:
    still = os.path.join(a.assets, '%s-%s.png' % (a.subject, season))
    write_sheet([Image.open(still).convert('RGBA')], 'idle-' + season)
    skip.add(pre + 'idle-' + season)

for spec in a.concat:
    srcs, name = spec.split('=')
    imgs = []
    for i, p in enumerate(srcs.split('+')):
        imgs += frames(pre + p, drop_first=(i > 0))
        skip.add(pre + p)
    write_sheet(imgs, name)

for d in sorted(glob.glob(os.path.join(anim, pre + '*'))):
    base = os.path.basename(d)
    if not os.path.isdir(d) or base in skip:
        continue
    rest = base[len(pre):]
    write_sheet(frames(base), rest + '.png' if rest.startswith('idle-') else 'trans-' + rest + '.png')
print('packed ->', outdir)
