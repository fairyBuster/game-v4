"""Undo the bundle's image encryption.

Taken from the game's own downloader hook (AssetExtension in main/index.js): every
image native file is prefixed with a 16-byte magic and then, per byte:
    v = byte ^ key1[i%5] ^ key2[i%5];  out = (v>>4 | v<<4)   # nibble swap

    python decrypt_assets.py            # decrypt in place, verify with PIL
    python decrypt_assets.py --dry-run
"""
import argparse
import io
import os
import sys

ROOT = r'C:\Project\dy01-clone\assets'
MAGIC = bytes([171, 63, 199, 145, 93, 110, 34, 138, 31, 180, 211, 124, 158, 17, 66, 250])
KEYS = (bytes([90, 241, 183, 201, 61]), bytes([226, 23, 155, 79, 136]))
IMG = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}


def decrypt(data):
    if data[:16] != MAGIC:
        return data
    body = data[16:]
    out = bytearray(len(body))
    for i, v in enumerate(body):
        for k in KEYS:
            v ^= k[i % len(k)]
        out[i] = ((v & 0xF0) >> 4) | ((v & 0x0F) << 4)
    return bytes(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--check', action='store_true', help='only report what is still encrypted')
    a = ap.parse_args()
    from PIL import Image

    enc = ok = bad = skipped = 0
    for dp, _, fn in os.walk(ROOT):
        for f in fn:
            if os.path.splitext(f)[1].lower() not in IMG:
                continue
            p = os.path.join(dp, f)
            raw = open(p, 'rb').read()
            if raw[:16] != MAGIC:
                skipped += 1
                continue
            enc += 1
            if a.check:
                continue
            plain = decrypt(raw)
            try:
                im = Image.open(io.BytesIO(plain))
                im.load()
            except Exception as e:
                bad += 1
                print('still broken after decrypt:', p, e, file=sys.stderr)
                continue
            if not a.dry_run:
                with open(p, 'wb') as fh:
                    fh.write(plain)
            ok += 1

    print(f'encrypted {enc}   decrypted+verified {ok}   broken {bad}   already plain {skipped}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
