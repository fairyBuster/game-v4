"""Build a browsable gallery.html over everything cloned by fetch_assets.py.

    python make_gallery.py            # -> assets/_meta/gallery.html
"""
import html
import os

ROOT = r'C:\Project\dy01-clone\assets'
IMGS = {'.png', '.jpg', '.jpeg', '.webp'}
OUT = os.path.join(ROOT, '_meta', 'gallery.html')


def main():
    groups = {}
    for dp, _, fn in os.walk(os.path.join(ROOT, 'hall', 'native')):
        for f in sorted(fn):
            if os.path.splitext(f)[1].lower() not in IMGS:
                continue
            full = os.path.join(dp, f)
            rel = os.path.relpath(full, ROOT).replace('\\', '/')
            top = os.path.relpath(dp, os.path.join(ROOT, 'hall', 'native')).split(os.sep)[0]
            groups.setdefault(top, []).append((rel, f))

    parts = ["""<!doctype html><meta charset="utf-8"><title>DY01 clone - assets</title>
<style>
 body{background:#141419;color:#ddd;font:13px/1.4 Segoe UI,sans-serif;margin:0;padding:16px}
 h2{margin:24px 0 8px;font-size:15px;color:#f5be3c}
 .g{display:flex;flex-wrap:wrap;gap:6px}
 figure{margin:0;background:#1e1e26;border:1px solid #2c2c38;border-radius:6px;padding:4px;width:132px}
 img{width:124px;height:96px;object-fit:contain;background:
   repeating-conic-gradient(#2a2a33 0 25%,#23232b 0 50%) 0 0/12px 12px;border-radius:4px}
 figcaption{font-size:10px;color:#8b8b9a;word-break:break-all;margin-top:3px;max-height:28px;overflow:hidden}
</style>"""]
    total = 0
    for top in sorted(groups):
        items = groups[top]
        total += len(items)
        parts.append(f'<h2>{html.escape(top)} <span style="color:#666">({len(items)})</span></h2><div class="g">')
        for rel, f in items:
            parts.append(f'<figure><img loading="lazy" src="../{rel}" title="{html.escape(rel)}">'
                         f'<figcaption>{html.escape(os.path.basename(rel))}</figcaption></figure>')
        parts.append('</div>')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(parts))
    print(f'{total} images in {len(groups)} groups -> {OUT}')


if __name__ == '__main__':
    main()
