"""Mirror the Cocos Creator asset bundles of h5.qwonf.pro (DY01 lobby) to local disk.

A Cocos 2.4 bundle is: config.json (index) + import/*.json (asset data) +
native/*.<ext> (the real textures / audio / fonts).

Two things make the URLs non-obvious:
  * the uuid in config.json is the 22-char *compressed* form -> decode it
    (5 chars kept + base64 -> hex) to get the real uuid used in file names;
  * assets are grouped in "packs", and a pack is one file for many assets
    (a whole texture atlas page in a single .png), named after the pack.

    python fetch_assets.py --probe      # sanity check, few files
    python fetch_assets.py              # everything
"""
import argparse
import concurrent.futures as cf
import json
import os
import sys
import threading
import urllib.error
import urllib.request

OUT = r'C:\Project\dy01-clone\assets'

BUNDLES = [
    # name, base url, config file
    ('hall', 'https://bundle6.wdvsc7.com/h5/lobby/hall_ct2/', 'config.5.2.3.1.6.json'),
    ('common', 'https://bundle5.wdvsc7.com/h5/lobby/common_ct2/', 'config.5.2.3.1.5.json'),
    ('launcher', 'https://h5.qwonf.pro/assets/launcher/', 'config.839d4.json'),
    ('main', 'https://h5.qwonf.pro/assets/main/', 'config.ef4e1.json'),
    ('internal', 'https://h5.qwonf.pro/assets/internal/', 'config.d0832.json'),
]

# cc type name -> candidate extensions, most likely first
EXT = {
    'cc.Texture2D': ['.png', '.jpg'],
    'cc.AudioClip': ['.mp3', '.wav'],
    'sp.SkeletonData': ['.json', '.atlas', '.png'],
    'cc.BitmapFont': ['.png', '.fnt', '.ttf'],
    'cc.ParticleAsset': ['.plist'],
    'cc.SpriteAtlas': ['.plist', '.png'],
    'cc.JsonAsset': ['.json'],
    'cc.EffectAsset': ['.json'],
    'cc.Material': ['.json'],
}
FALLBACK = ['.png', '.mp3', '.json', '.plist', '.ttf', '.wav', '.jpg', '.fnt', '.atlas']

BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
HEX = '0123456789abcdef'
UA = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://h5.qwonf.pro/'}

lock = threading.Lock()
manifest = {'import': {}, 'native': {}}
stats = {'ok': 0, 'miss': 0, 'err': 0, 'bytes': 0}
queued = set()


def decode_uuid(b64):
    """Cocos compressed uuid ('3d6oRn81VFt5tLpFWqdOY5') -> '3dea8467-f355-45b7-9b4b-a455aa74e639'."""
    if len(b64) != 22:
        return b64
    out = [b64[0], b64[1]]
    for i in range(2, 22, 2):
        l = BASE64.index(b64[i])
        r = BASE64.index(b64[i + 1])
        out.append(HEX[l >> 2])
        out.append(HEX[((l & 3) << 2) | (r >> 4)])
        out.append(HEX[r & 0xF])
    u = ''.join(out)
    return f'{u[:8]}-{u[8:12]}-{u[12:16]}-{u[16:20]}-{u[20:]}'


def get(url, timeout=40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def pairs(flat):
    """versions.import / versions.native are flat [key, hash, key, hash, ...]."""
    return list(zip(flat[0::2], flat[1::2]))


def safe(name):
    out = ''.join(c if c.isalnum() or c in '-_./' else '_' for c in name)
    return out.strip('/') or 'unnamed'


def load_config(bundle):
    name, base, cfgfile = bundle
    raw = get(base + cfgfile)
    cfg = json.loads(raw)
    d = os.path.join(OUT, name, 'meta')
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'config.json'), 'wb') as f:
        f.write(raw)
    return cfg


def plan(name, base, cfg):
    """-> (jobs, extras) ; job = (url, local relative path, kind, key)"""
    uuids = cfg['uuids']
    paths = cfg.get('paths') or {}
    types = cfg.get('types') or []
    packs = cfg.get('packs') or {}
    ver = cfg.get('versions') or {}
    jobs = []

    def type_of(idx):
        e = paths.get(str(idx))
        return types[e[1]] if e and len(e) > 1 and e[1] < len(types) else ''

    def name_of(idx):
        e = paths.get(str(idx))
        return e[0] if e else ''

    # 1. import data: packed -> <pack>.<hash>.json , single asset -> <uuid>.<hash>.json
    for key, h in pairs(ver.get('import', [])):
        stem = key if isinstance(key, str) else decode_uuid(uuids[key])
        jobs.append((f'{base}import/{stem[:2]}/{stem}.{h}.json',
                     f'{name}/meta/import/{stem}.{h}.json', 'import', stem))

    # 2. native files: same naming, extension depends on the asset type
    for key, h in pairs(ver.get('native', [])):
        if isinstance(key, str):                      # pack: one page for many assets
            stem = key
            members = packs.get(key, [])
            exts = []
            for i in members:
                for x in EXT.get(type_of(i), FALLBACK):
                    if x not in exts:
                        exts.append(x)
            if not exts:
                exts = FALLBACK
            dest = f'{name}/native/_pack/{stem}'
        else:
            stem = decode_uuid(uuids[key])
            exts = EXT.get(type_of(key), FALLBACK)
            pretty = name_of(key)
            dest = f'{name}/native/{safe(pretty) if pretty else "_asset/" + stem}'
        for x in exts:
            jobs.append((f'{base}native/{stem[:2]}/{stem}.{h}{x}', dest + x, 'native', stem))
    return jobs


def fetch(job):
    url, rel, kind, key = job
    dst = os.path.join(OUT, rel.replace('/', os.sep))
    with lock:
        if rel in queued:
            return
        queued.add(rel)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        with lock:
            stats['ok'] += 1
            manifest[kind].setdefault(key, []).append(rel)
        return
    try:
        data = get(url)
    except urllib.error.HTTPError as e:
        with lock:
            if e.code in (403, 404):
                stats['miss'] += 1
            else:
                stats['err'] += 1
                print('ERR', e.code, url, file=sys.stderr)
        return
    except Exception as e:
        with lock:
            stats['err'] += 1
        print('ERR', type(e).__name__, url, file=sys.stderr)
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as f:
        f.write(data)
    with lock:
        stats['ok'] += 1
        stats['bytes'] += len(data)
        manifest[kind].setdefault(key, []).append(rel)
        if stats['ok'] % 100 == 0:
            print(f"  {stats['ok']} files  {stats['bytes'] / 1048576:.1f} MB", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--probe', type=int, default=0)
    ap.add_argument('--workers', type=int, default=24)
    a = ap.parse_args()

    jobs = []
    for b in BUNDLES:
        name, base = b[0], b[1]
        cfg = load_config(b)
        j = plan(name, base, cfg)
        if a.probe:
            j = [x for x in j if '/native/' in x[0]][:a.probe] + [x for x in j if '/import/' in x[0]][:4]
        print(f'{name:9s} {len(j):5d} candidate files', flush=True)
        jobs += j

    with cf.ThreadPoolExecutor(a.workers) as ex:
        list(ex.map(fetch, jobs))

    os.makedirs(os.path.join(OUT, '_meta'), exist_ok=True)
    with open(os.path.join(OUT, '_meta', 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"\nOK {stats['ok']}  missing {stats['miss']}  errors {stats['err']}  "
          f"total {stats['bytes'] / 1048576:.1f} MB -> {OUT}")
    return 0 if stats['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
