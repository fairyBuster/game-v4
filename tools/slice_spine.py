"""Slice a spine/libgdx .atlas sheet into individual sprites, one per file.

The lobby entry icons are spine animations: each `<name>.png` is a texture sheet holding
several pieces spread over the atlas, so the sheet itself is useless as an icon.

Three things the naive "crop the rect" gets wrong, and this does right:
  * `rotate: true` regions are stored turned 90 deg — crop then rotate back;
  * `size` is the *trimmed* box, `orig`+`offset` say where it sits in the real frame,
    so each sprite is padded back onto its own `orig` canvas (otherwise every sprite
    ends up hanging off a different corner once the game scales it);
  * optional `--square` then centres the trimmed content in a square frame with a small
    margin, so all symbols end up visually the same size and dead centre.

    python slice_spine.py <atlas> <outdir> [--square]
    python slice_spine.py --all-entries [--square]
"""
import argparse
import os
import re
import sys

from PIL import Image

ENTRY = r'C:\Project\dy01-clone\assets\hall\native\skin\ct2\res\animation\hall\entry'
OUT = r'C:\Project\dy01-clone\web\public\dy01\entry'
MARGIN = 0.06                                   # of the square side, --square only

REGION = re.compile(r'^(?P<name>[^\s:][^\n]*)\n(?P<body>(?:\s{2}\w+:.*\n)+)', re.M)
KV = re.compile(r'(\w+):\s*([-\d]+)\s*,\s*([-\d]+)')


def parse(atlas_text):
    first = atlas_text.splitlines()[0].strip()
    page = first if first.lower().endswith(('.png', '.jpg', '.jpeg')) else ''
    out = []
    for m in REGION.finditer(atlas_text):
        body = m.group('body')
        if 'xy:' not in body or 'size:' not in body:
            continue
        vals = {k: (int(a), int(b)) for k, a, b in KV.findall(body)}
        out.append({
            'name': m.group('name').strip(), 'page': page,
            'x': vals['xy'][0], 'y': vals['xy'][1],
            'w': vals['size'][0], 'h': vals['size'][1],
            'ow': vals.get('orig', (vals['size'][0], vals['size'][1]))[0],
            'oh': vals.get('orig', (vals['size'][1], vals['size'][0]))[1],
            'ox': vals.get('offset', (0, 0))[0], 'oy': vals.get('offset', (0, 0))[1],
            'rotate': 'rotate: true' in body,
        })
    return out


def cut_region(sheet, r):
    """Crop one region and bring it back to its untrimmed, unrotated frame."""
    top = sheet.height - r['y'] - r['h']              # atlas rects use a bottom-left origin
    cut = sheet.crop((r['x'], top, r['x'] + r['w'], top + r['h']))
    if r['rotate']:
        # libgdx stores rotated regions turned; -90 (PIL: clockwise) is the direction that
        # reads right for the ones in this bundle. Every rotated region here is a symmetric
        # sparkle particle, so the direction is not verifiable from the art — revisit if a
        # real asymmetric rotated region ever shows up.
        cut = cut.rotate(-90, expand=True)
    frame = Image.new('RGBA', (r['ow'], r['oh']), (0, 0, 0, 0))
    frame.alpha_composite(cut, (r['ox'], r['oh'] - r['oy'] - cut.height))
    return frame


def to_square(img, margin=MARGIN):
    """Trim the empty frame away, then re-centre the content in a square canvas."""
    box = img.getchannel('A').getbbox()
    content = img.crop(box) if box else img
    side = max(content.width, content.height)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(content, ((side - content.width) // 2, (side - content.height) // 2))
    if margin:
        inner = max(1, int(side * (1 - 2 * margin)))
        canvas.thumbnail((inner, inner), Image.LANCZOS)
        pad = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        pad.alpha_composite(canvas, ((side - canvas.width) // 2, (side - canvas.height) // 2))
        canvas = pad
    return canvas


def slice_atlas(atlas_path, outdir, square=False):
    text = open(atlas_path, encoding='utf-8').read()
    regions = parse(text)
    d = os.path.dirname(atlas_path)
    png = os.path.join(d, regions[0]['page']) if regions and regions[0]['page'] else None
    if not png or not os.path.isfile(png):
        stem = os.path.basename(atlas_path)[:-6]
        cands = [f for f in os.listdir(d) if f.endswith('.png')]
        png = os.path.join(d, stem + '.png' if stem + '.png' in cands else (cands[0] if cands else ''))
    if not os.path.isfile(png):
        return 0, 'no texture page'

    sheet = Image.open(png).convert('RGBA')
    os.makedirs(outdir, exist_ok=True)
    n = 0
    for r in regions:
        img = cut_region(sheet, r)
        if square:
            img = to_square(img)
        img.save(os.path.join(outdir, f'{r["name"].replace("/", "_")}.png'))
        n += 1
    return n, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('atlas', nargs='?')
    ap.add_argument('outdir', nargs='?')
    ap.add_argument('--all-entries', action='store_true')
    ap.add_argument('--square', action='store_true')
    a = ap.parse_args()

    if a.all_entries:
        total = 0
        for d in sorted(os.listdir(ENTRY)):
            p = os.path.join(ENTRY, d)
            atlas = [f for f in os.listdir(p) if f.endswith('.atlas')] if os.path.isdir(p) else []
            if not atlas:
                continue
            n, err = slice_atlas(os.path.join(p, atlas[0]), os.path.join(OUT, d), a.square)
            print(f'{d:16s} {n:3d} sprites' + (f'   ({err})' if err else ''))
            total += n
        print('total', total)
        return 0

    if not a.atlas:
        print(__doc__)
        return 1
    n, err = slice_atlas(a.atlas, a.outdir or '.', a.square)
    print(n, 'sprites', err or '')
    return 0 if n else 1


if __name__ == '__main__':
    sys.exit(main())
