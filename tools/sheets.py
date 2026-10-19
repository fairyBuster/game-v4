"""Contact sheets over the cloned art: atlas pages (labeled with what's inside) + big textures.

    python sheets.py
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = r'C:\Project\dy01-clone\assets'
OUT = os.path.join(ROOT, '_meta')


def label_for(packs, pack):
    """Readable caption: the pack's member names if known, else the pack id."""
    info = packs.get(pack)
    if not info or not info.get('members'):
        return f'atlas page {pack}'
    names = [m['name'].rsplit('/', 1)[-1] for m in info['members']][:2]
    return f'{pack} = ' + ', '.join(names)


def sheet(items, dst, title, cols=6, cell=250):
    rows = (len(items) + cols - 1) // cols
    im = Image.new('RGB', (cols * cell, rows * (cell + 26) + 24), (24, 24, 30))
    d = ImageDraw.Draw(im)
    d.text((6, 6), title, fill=(245, 190, 60))
    for i, (p, label) in enumerate(items):
        try:
            s = Image.open(p).convert('RGBA')
        except Exception:
            continue
        s.thumbnail((cell - 8, cell - 8), Image.LANCZOS)
        x = (i % cols) * cell + (cell - s.width) // 2
        y = (i // cols) * (cell + 26) + 24 + (cell - s.height) // 2
        im.paste(s, (x, y), s)
        d.text(((i % cols) * cell + 4, (i // cols) * (cell + 26) + cell + 28),
               label[:38], fill=(150, 150, 165))
        d.text(((i % cols) * cell + 4, (i // cols) * (cell + 26) + cell + 40),
               os.path.basename(p)[:38], fill=(90, 90, 105))
    im.save(dst, quality=88)
    print('->', dst, im.size)


def main():
    pf = os.path.join(OUT, 'packs.json')
    packs = {}
    if os.path.exists(pf):
        raw = json.load(open(pf, encoding='utf-8'))
        packs = {k: v for b in raw.values() for k, v in b.items()}

    pages, tex = [], []
    for dp, _, fn in os.walk(ROOT):
        for f in fn:
            if os.path.splitext(f)[1].lower() not in ('.png', '.jpg'):
                continue
            p = os.path.join(dp, f)
            stem = f.split('.')[0]
            # auto-atlas pages are the ones named with a bare short id (no dashes, no path)
            ispage = 'dyn' not in stem and 'res' not in stem and '-' not in stem and len(stem) < 12
            rec = (p, label_for(packs, stem) if ispage else os.path.relpath(p, ROOT))
            (pages if ispage else tex).append(rec)

    pages.sort(key=lambda r: os.path.getsize(r[0]), reverse=True)
    tex.sort(key=lambda r: os.path.getsize(r[0]), reverse=True)
    os.makedirs(OUT, exist_ok=True)
    sheet(pages[:30], os.path.join(OUT, 'sheet_atlas_pages.png'),
          f'atlas pages - biggest 30 of {len(pages)}  (caption = pack + the sprites inside)')
    sheet(tex[:30], os.path.join(OUT, 'sheet_textures.png'),
          f'standalone textures/images - biggest 30 of {len(tex)}')
    print('pages', len(pages), 'textures', len(tex))


if __name__ == '__main__':
    main()
