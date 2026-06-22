"""Decode a saved data-URL into a PNG. A montage returned from preview_eval is too
large for the tool result and gets written to a file -- point this at that file.
Usage: python reference/tools/pixellab/decode_dataurl.py <saved-text-file> <out.png>
"""
import base64, sys
data = open(sys.argv[1], encoding='utf-8').read().strip().strip('"')
i = data.find('base64,')
open(sys.argv[2], 'wb').write(base64.b64decode(data[i + 7:] if i >= 0 else data))
print('wrote', sys.argv[2])
