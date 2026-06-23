"""Numeric envelope check: compare each season still's silhouette to the summer
anchor's. Reports the bounding-box top / width / height delta and the side-reach
(lowest opaque row in the left+right thirds, outside the centre pad). A season
whose subject grew, shrank, drifted taller, or (for deciduous trees) whose bare
branches sprawled past the summer envelope shows up as a non-zero delta.

Note: the bbox can read identical even when the *interior* distribution changed
(the willow bare-branch case) -- so always pair this with the visual gridline
montage from assemble_gifs.py. This script is the cheap numeric gate; the montage
is the real catch.

Usage:
  python reference/tools/pixellab/check_envelope.py chicken [--assets DIR] [--seasons spring,summer,autumn,winter]
"""
import os, argparse
from PIL import Image


def bbox(path):
    im = Image.open(path).convert('RGBA'); px = im.load(); W, H = im.size
    x0, x1, y0, y1, found = W, 0, H, 0, False
    side_lo = 0
    side_cols = list(range(0, W // 3)) + list(range(W - W // 3, W))
    for y in range(H):
        row_side = False
        for x in range(W):
            if px[x, y][3] > 128:
                found = True
                x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
                if x in side_cols:
                    row_side = True
        if row_side:
            side_lo = y
    if not found:
        return None
    return dict(top=y0, w=x1 - x0 + 1, h=y1 - y0 + 1, side=side_lo)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('subject')
    ap.add_argument('--assets', default='reference/docs/seasonal-tile-system/assets')
    ap.add_argument('--seasons', default='spring,summer,autumn,winter')
    a = ap.parse_args()
    ref = bbox(os.path.join(a.assets, '%s-summer.png' % a.subject))
    if not ref:
        print('no summer anchor for', a.subject); return
    print('envelope vs summer (top<0=taller, w>0=wider, side>0=droops lower):')
    for s in a.seasons.split(','):
        p = os.path.join(a.assets, '%s-%s.png' % (a.subject, s))
        if not os.path.exists(p):
            print('  %-10s (missing)' % s); continue
        b = bbox(p)
        print('  %-10s top=%3d(%+d)  w=%3d(%+d)  h=%3d  side=%3d(%+d)' % (
            s, b['top'], b['top'] - ref['top'], b['w'], b['w'] - ref['w'], b['h'], b['side'], b['side'] - ref['side']))


if __name__ == '__main__':
    main()
