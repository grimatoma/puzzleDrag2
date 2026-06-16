"""Verify a board tile's ground-pad size and position against a reference tile.

The pad is the small round ground patch every tile shares. We measure its bottom
row, its width, and its horizontal center from the alpha silhouette, then compare
to a reference (normally the season anchor):

  - position drift (bottom / center beyond --postol) -> SHIFT: with --fix we
    translate the tile back into alignment (cheap, lossless for a 1-2px nudge).
  - size drift (pad width beyond --wtol) -> REJECT: a shift can't fix a different
    pad size, and it visibly jumps in animation, so the tile should be regenerated.

Pad signature is sampled from the bottom `--band` rows ONLY -- the ground rim --
because that is the one place seasonal dressing that sits *on* the pad (leaf
mounds, snow piles, dry grass, fallen fruit) does not reach. The old metric took
the single widest row anywhere in the lower tile, so an autumn leaf-mound spread
wider than the pad and triggered a false REJECT (width +4, cx -3) when the pad
itself was perfectly aligned. Median across the band shrugs off one raised or
tapered row.

Usage:
  python check_pad.py --ref willow-summer.png --check wf-spring.png wf-autumn.png [--fix]
Exit code is non-zero if any tile is EMPTY or REJECT.
"""
import sys, argparse, os
from PIL import Image


def pad_metrics(path, band=5):
    im = Image.open(path).convert('RGBA'); W, H = im.size; px = im.load()
    rows = {}
    for y in range(H):
        xs = [x for x in range(W) if px[x, y][3] > 128]
        if xs:
            rows[y] = (xs[0], xs[-1])
    if not rows:
        return None
    bottom = max(rows)
    band_rows = [rows[y] for y in range(bottom - band + 1, bottom + 1) if y in rows]
    widths = sorted(r[1] - r[0] + 1 for r in band_rows)
    centers = sorted((r[0] + r[1]) / 2.0 for r in band_rows)
    pad_w = widths[len(widths) // 2]
    pad_cx = centers[len(centers) // 2]
    return dict(bottom_y=bottom, pad_w=pad_w, pad_cx=pad_cx, size=(W, H))


def realign(path, dx, dy, out):
    im = Image.open(path).convert('RGBA')
    canvas = Image.new('RGBA', im.size, (0, 0, 0, 0))
    canvas.paste(im, (int(round(dx)), int(round(dy))))
    canvas.save(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--ref', required=True)
    ap.add_argument('--check', nargs='+', required=True)
    ap.add_argument('--fix', action='store_true', help='shift position drift into alignment, in place')
    ap.add_argument('--postol', type=int, default=1, help='allowed position drift in px')
    ap.add_argument('--wtol', type=int, default=2, help='allowed pad-width drift in px')
    ap.add_argument('--band', type=int, default=5, help='rows up from the bottom to sample as the pad rim')
    a = ap.parse_args()

    r = pad_metrics(a.ref, a.band)
    print('ref %s: bottom=%d width=%d cx=%.1f' % (os.path.basename(a.ref), r['bottom_y'], r['pad_w'], r['pad_cx']))
    bad = 0
    for c in a.check:
        m = pad_metrics(c, a.band)
        if not m:
            print('%s: EMPTY' % os.path.basename(c)); bad += 1; continue
        dB = m['bottom_y'] - r['bottom_y']; dW = m['pad_w'] - r['pad_w']; dX = m['pad_cx'] - r['pad_cx']
        if abs(dW) > a.wtol:
            status = 'REJECT (width %+d > %dpx; regenerate)' % (dW, a.wtol); bad += 1
        elif abs(dB) > a.postol or abs(dX) > a.postol:
            status = 'SHIFT (dx=%+d dy=%+d)' % (round(-dX), -dB)
        else:
            status = 'OK'
        print('%s: bottom=%d(%+d) width=%d(%+d) cx=%.1f(%+.1f) -> %s' % (
            os.path.basename(c), m['bottom_y'], dB, m['pad_w'], dW, m['pad_cx'], dX, status))
        if a.fix and status.startswith('SHIFT'):
            realign(c, r['pad_cx'] - m['pad_cx'], r['bottom_y'] - m['bottom_y'], c)
            m2 = pad_metrics(c, a.band)
            print('   realigned -> bottom=%d width=%d cx=%.1f' % (m2['bottom_y'], m2['pad_w'], m2['pad_cx']))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
