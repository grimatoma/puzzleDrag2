"""Per-frame luminance check to catch the bright interpolation-overshoot frame
("glow") that PixelLab sometimes inserts near the end of an idle/transition clip.

Pass one or more frame directories. For each, prints the mean luminance of every
frame and flags any frame whose luma exceeds the clip median by more than --thresh
-- that frame is the glow and should be removed with drop_glow_frame.py, then the
clip reassembled/repacked.

Usage:
  python tools/pixellab/check_glow.py docs/seasonal-tile-system/assets/anim/chicken-idle-summer
  python tools/pixellab/check_glow.py <dir> [<dir2> ...] [--thresh 4]
"""
import sys, glob, os, argparse, statistics
from PIL import Image


def mean_luma(path):
    im = Image.open(path).convert('RGBA'); px = im.load(); W, H = im.size
    tot = n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 128:
                tot += (r + g + b) / 3; n += 1
    return tot / n if n else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dirs', nargs='+')
    ap.add_argument('--thresh', type=float, default=4.0)
    a = ap.parse_args()
    flagged = 0
    for d in a.dirs:
        fs = sorted(glob.glob(os.path.join(d, 'frame_*.png')))
        if not fs:
            print('no frames in', d); continue
        lumas = [mean_luma(f) for f in fs]
        med = statistics.median(lumas)
        print('==', os.path.basename(d), '(median %.1f) ==' % med)
        for f, l in zip(fs, lumas):
            hot = l - med > a.thresh
            flagged += hot
            print('  %-14s luma=%6.1f%s' % (os.path.basename(f), l, '   <-- GLOW: drop this frame' if hot else ''))
    sys.exit(1 if flagged else 0)


if __name__ == '__main__':
    main()
