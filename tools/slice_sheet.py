"""Cut a sheet of icons into its individual icons.

Icon sheets (payment logos, medals, chests, jokers) are a grid of complete objects, but
they touch each other and have stray sparkle pixels, so splitting on empty rows/columns
does not work. This labels the alpha mask into connected components instead, then trims
each component to its own box and (with --square) normalises it onto a square canvas so
every icon renders at the same visual weight.

    python slice_sheet.py <sheet.png> <outdir> [--square] [--min 60] [--max 400]
                          [--names a,b,c] [--area 400]
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

MARGIN = 0.05


def to_square(img, margin=MARGIN):
    side = max(img.width, img.height)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(img, ((side - img.width) // 2, (side - img.height) // 2))
    inner = max(1, int(side * (1 - 2 * margin)))
    canvas.thumbnail((inner, inner), Image.LANCZOS)
    pad = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    pad.alpha_composite(canvas, ((side - canvas.width) // 2, (side - canvas.height) // 2))
    return pad


def find_icons(img, minpx, maxpx, min_area):
    """-> [(x, y, w, h)] in reading order (top band first, then left to right)."""
    mask = np.array(img.getchannel('A')) > 16
    lab, n = ndimage.label(mask)
    out = []
    for sl in ndimage.find_objects(lab):
        if sl is None:
            continue
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        w, h = x1 - x0, y1 - y0
        if not (minpx <= max(w, h) <= maxpx):
            continue
        if int(mask[sl].sum()) < min_area:
            continue
        out.append((x0, y0, w, h))
    rows = {}
    for box in out:                                  # group into bands of 40px by centre
        rows.setdefault((box[1] + box[3] // 2) // 40, []).append(box)
    ordered = []
    for key in sorted(rows):
        ordered += sorted(rows[key], key=lambda b: b[0])
    return ordered


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet')
    ap.add_argument('outdir')
    ap.add_argument('--square', action='store_true')
    ap.add_argument('--min', type=int, default=60, dest='minpx')
    ap.add_argument('--max', type=int, default=400, dest='maxpx')
    ap.add_argument('--area', type=int, default=600, help='ignore specks below this many opaque pixels')
    ap.add_argument('--names', default='')
    a = ap.parse_args()

    img = Image.open(a.sheet).convert('RGBA')
    found = find_icons(img, a.minpx, a.maxpx, a.area)
    names = [n for n in a.names.split(',') if n]
    os.makedirs(a.outdir, exist_ok=True)
    for i, (x, y, w, h) in enumerate(found):
        cut = img.crop((x, y, x + w, y + h))
        if a.square:
            cut = to_square(cut)
        name = names[i] if i < len(names) else f'icon{i:02d}'
        cut.save(os.path.join(a.outdir, f'{name}.png'))
        print(f'{name:12s} ({x:4d},{y:4d}) {w:4d}x{h:<4d} -> {cut.width}x{cut.height}')
    print(f'{len(found)} icons -> {a.outdir}')
    return 0 if found else 1


if __name__ == '__main__':
    sys.exit(main())
