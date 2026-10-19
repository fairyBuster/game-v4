"""Map every atlas/prefab page to the sprites/assets it contains.

Cocos bundles assets into "packs": `config.packs` maps a pack name -> the indices
(of `config.uuids`) of the assets inside it, and the page itself was downloaded as
native/xx/<pack>.<hash>.png. So this tells you which image file holds which sprite.

    python atlas_index.py                # -> assets/_meta/packs.json
    python atlas_index.py --list wallet  # find which page holds a sprite
"""
import argparse
import json
import os

ROOT = r'C:\Project\dy01-clone\assets'
BUNDLES = ('hall', 'common', 'launcher', 'internal', 'main')


def native_page(bundle, stem):
    """The downloaded page (atlas/plist/font) for a pack, if we have it."""
    d = os.path.join(ROOT, bundle, 'native')
    for dp, _, fn in os.walk(d) if os.path.isdir(d) else ():
        for f in fn:
            if f.split('.')[0] == stem:
                return os.path.relpath(os.path.join(dp, f), ROOT).replace('\\', '/')
    return None


def build():
    out = {}
    for b in BUNDLES:
        cfgp = os.path.join(ROOT, b, 'meta', 'config.json')
        if not os.path.exists(cfgp):
            continue
        cfg = json.load(open(cfgp, encoding='utf-8'))
        uuids, paths, types = cfg['uuids'], cfg.get('paths') or {}, cfg.get('types') or []
        for pack, idxs in (cfg.get('packs') or {}).items():
            members = []
            for i in idxs:
                e = paths.get(str(i))
                if not e:
                    continue
                members.append({'name': e[0],
                                'type': types[e[1]] if e[1] < len(types) else '',
                                'uuid': uuids[i] if i < len(uuids) else ''})
            out.setdefault(b, {})[pack] = {'page': native_page(b, pack), 'members': members}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', metavar='SUBSTR')
    a = ap.parse_args()
    packs = build()

    if a.list is not None:
        hits = 0
        for b, ps in packs.items():
            for u, info in ps.items():
                for m in info['members']:
                    if a.list.lower() in m['name'].lower():
                        print(f"  {m['name']:62s} {m['type']:16s} {b}/{u}  {info['page']}")
                        hits += 1
        print(f'{hits} hits for {a.list!r}')
        return

    os.makedirs(os.path.join(ROOT, '_meta'), exist_ok=True)
    dst = os.path.join(ROOT, '_meta', 'packs.json')
    json.dump(packs, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    n = sum(len(v) for v in packs.values())
    m = sum(len(i['members']) for v in packs.values() for i in v.values())
    print(f'{n} packs, {m} member assets -> {dst}')
    for b, ps in packs.items():
        have = sum(1 for i in ps.values() if i['page'])
        print(f'  {b:9s} packs {len(ps):4d} (with a downloaded file: {have:4d})  '
              f'members {sum(len(i["members"]) for i in ps.values())}')


if __name__ == '__main__':
    main()
