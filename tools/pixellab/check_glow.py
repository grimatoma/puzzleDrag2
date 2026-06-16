"""Per-frame luminance check for the two ways a clip goes too bright:

1. SPIKE -- a single overshoot frame PixelLab sometimes inserts near the end of an
   idle/transition (luma exceeds the clip MEDIAN by > --thresh). Drop it with
   drop_glow_frame.py and repack.
2. BLOOM -- a sustained warm bloom across several mid-clip frames, brighter than BOTH
   endpoints (the summer->autumn white-out glow), which the median test MISSES (the bloom
   drags the median up with it, so no single frame stands out). animate-with-text over-
   brightens mid-transition when tweening toward a bright endpoint; a frame drop can't fix
   a multi-frame bloom. THE FIX IS THE PROMPT, but the opposite of what you'd guess: a
   transition action that mentions light AT ALL feeds the bloom. Measured on grass
   summer->autumn -- verbose action naming "golden" + a NO-glow/NO-bloom negation "lock"
   peaked +58 over the endpoints; the SAME morph described as a plain colour change with
   NO light/exposure words at all peaked +15. So keep transition actions to colour + shape
   only (see categories.mjs); never name light, glow, exposure or brightness, positive OR
   negative (naming an artifact to forbid it summons it).

   --bloom default 25 is calibrated to the white-out: a natural warm/golden peak from a
   minimal prompt measures <=~18 and passes; a desaturated white-out flare measured 45-110
   and fails. Lower --bloom to audit, but do not regenerate a <=20 warm peak chasing 0 --
   the bright autumn endpoint legitimately raises the tail.

Usage:
  python tools/pixellab/check_glow.py docs/seasonal-tile-system/assets/anim/chicken-idle-summer
  python tools/pixellab/check_glow.py <dir> [<dir2> ...] [--thresh 4] [--bloom 25]
Exit code is non-zero if any SPIKE or BLOOM is flagged.
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
    ap.add_argument('--thresh', type=float, default=4.0, help='single-frame SPIKE over the clip median')
    ap.add_argument('--bloom', type=float, default=25.0, help='sustained interior peak over the brighter endpoint')
    a = ap.parse_args()
    flagged = 0
    for d in a.dirs:
        fs = sorted(glob.glob(os.path.join(d, 'frame_*.png')))
        if not fs:
            print('no frames in', d); continue
        lumas = [mean_luma(f) for f in fs]
        med = statistics.median(lumas)
        print('==', os.path.basename(d), '(median %.1f) ==' % med)
        for i, (f, l) in enumerate(zip(fs, lumas)):
            # SPIKE = an INTERIOR frame brighter than BOTH neighbours (a true local
            # overshoot). NOT "brighter than the median": a transition legitimately ramps
            # from a dark to a bright still, so half its frames beat the median without a
            # spike. Endpoints (first/last) are the fixed source/target stills -- never a
            # droppable spike, even if the target still is the brightest frame.
            interior = 0 < i < len(lumas) - 1
            hot = interior and l - max(lumas[i - 1], lumas[i + 1]) > a.thresh
            flagged += hot
            print('  %-14s luma=%6.1f%s' % (os.path.basename(f), l, '   <-- SPIKE: drop this frame' if hot else ''))
        # Sustained-bloom check: brightest INTERIOR frame vs the brighter ENDPOINT.
        if len(lumas) >= 3:
            interior = lumas[1:-1]
            peak = max(interior); pk = 1 + interior.index(peak)
            base = max(lumas[0], lumas[-1])
            bloom = peak - base
            if bloom > a.bloom:
                flagged += 1
                print('  BLOOM: frame %d luma %.1f exceeds both endpoints (%.1f / %.1f) by +%.1f  <-- regenerate (prompt fix)'
                      % (pk, peak, lumas[0], lumas[-1], bloom))
            else:
                print('  bloom ok (interior peak %.1f vs endpoints %.1f / %.1f, +%.1f)'
                      % (peak, lumas[0], lumas[-1], bloom))
    sys.exit(1 if flagged else 0)


if __name__ == '__main__':
    main()
