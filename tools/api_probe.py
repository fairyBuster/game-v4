"""Probe the DY01 platform API the way its own client does.

The launcher encrypts AES-256-ECB (Node, PKCS#7) with the key baked into its JS and
posts the ciphertext as application/octet-stream, then decrypts the response with the
same key. That is what blocks a plain curl.

    python api_probe.py
"""
import json
import urllib.error
import urllib.request

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

KEY = b'hszQLXtXqQZ9I+vBvLllMgXbhiGnUDRo'      # 32 bytes -> AES-256
BASE = 'https://api.gvdfdd7.com/maintain'
HDR = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    'Origin': 'https://h5.qwonf.pro',
    'Referer': 'https://h5.qwonf.pro/',
    'Accept': '*/*',
}
AID = 'b1f9a2c4-6d3e-4a55-9c88-2f1a4e7b0d31'


def aes(data: bytes) -> bytes:
    pad = 16 - len(data) % 16                      # PKCS#7, same as Node's default
    data = data + bytes([pad]) * pad
    c = Cipher(algorithms.AES(KEY), modes.ECB())
    e = c.encryptor()
    return e.update(data) + e.finalize()


def unaes(data: bytes) -> bytes:
    c = Cipher(algorithms.AES(KEY), modes.ECB())
    d = c.decryptor()
    out = d.update(data) + d.finalize()
    return out[:-out[-1]] if out and out[-1] <= 16 else out


def post(path, body, encrypted):
    raw = json.dumps(body).encode()
    payload = aes(raw) if encrypted else raw
    h = dict(HDR)
    h['Content-Type'] = 'application/octet-stream' if encrypted else 'application/json'
    req = urllib.request.Request(BASE + path, data=payload, headers=h, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = r.read()
            code = r.status
    except urllib.error.HTTPError as e:
        data, code = e.read(), e.code
    out = {'code': code, 'raw': data[:120].decode('utf-8', 'replace')}
    if encrypted and data.strip().startswith(b'{') is False:
        try:
            out['decrypted'] = unaes(data).decode('utf-8', 'replace')[:600]
        except Exception as ex:
            out['decrypted'] = f'fail: {ex}'
    else:
        out['decrypted'] = data.decode('utf-8', 'replace')[:600]
    return out


def main():
    cases = [
        ('/maintain/app_info', {'chn': 'web', 'cvc': '1', 'aid': AID, 'user_id': ''}, True),
        ('/maintain/v3/entrance', {'cvn': '5.2.3.1', 'cvc': '5231', 'aid': AID, 'user_id': '', 'cchn': ''}, True),
        ('/maintain/v3/entrance', {'cvn': '5.2.3.1', 'cvc': '5231', 'aid': AID, 'user_id': '', 'cchn': ''}, False),
        ('/maintain/v3/entrance', {'cvn': '5.2.3.1', 'cvc': '5231', 'aid': AID, 'ch': 'DY7777'}, True),
        ('/maintain/common_conf_info', {'chn': 'web', 'cvn': '5.2.3.1', 'cvc': '5231', 'aid': AID, 'user_id': '', 'cchn': ''}, False),
    ]
    for path, body, enc in cases:
        r = post(path, body, enc)
        tag = 'AES ' if enc else 'json'
        print(f'{tag} {path:26s} -> {r["code"]}  {r["decrypted"][:300]}')


if __name__ == '__main__':
    main()
