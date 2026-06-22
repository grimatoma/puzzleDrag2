"""Drop one frame from a clip and renumber the rest so the sequence stays
contiguous (frame_00..frame_NN, no gap). Use after check_glow.py flags an
overshoot frame in an idle or transition loop. For a seamless first=last idle
loop the glow is usually the second-to-last frame; dropping it keeps the loop
seamless because the (new) last frame is still the rest frame.

Usage:
  python reference/tools/pixellab/drop_glow_frame.py <frames_dir> <index>
  e.g. python reference/tools/pixellab/drop_glow_frame.py .../anim/chicken-idle-summer 7
"""
import sys, os, glob

d, idx = sys.argv[1], int(sys.argv[2])
fs = sorted(glob.glob(os.path.join(d, 'frame_*.png')))
target = os.path.join(d, 'frame_%02d.png' % idx)
if target not in fs:
    print('no frame_%02d.png in %s' % (idx, d)); sys.exit(1)
os.remove(target)
# renumber every later frame down by one to close the gap
for f in fs:
    n = int(os.path.basename(f)[6:8])
    if n > idx:
        os.rename(f, os.path.join(d, 'frame_%02d.png' % (n - 1)))
print('dropped frame_%02d; %d frames remain (00..%02d)' % (idx, len(fs) - 1, len(fs) - 2))
