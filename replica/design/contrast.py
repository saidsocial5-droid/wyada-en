"""WCAG 2.x contrast check for every pair in tokens.json, both themes.
Usage: python3 contrast.py tokens.json   (exit 1 on any failure)"""
import json, sys

def rgb(h):
    h = h.lstrip('#')[:6]
    return [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]

def lum(h):
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in rgb(h)]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

t = json.load(open(sys.argv[1]))
fails = 0
for theme in ('light', 'dark'):
    pal = t['color'][theme]
    print(f'\n{theme}')
    for p in t['pairs']:
        r = ratio(pal[p['fg']], pal[p['bg']])
        ok = r >= p['min']
        fails += not ok
        print(f"  {'PASS' if ok else 'FAIL'} {r:5.2f} >= {p['min']:.1f}  {p['fg']} on {p['bg']}")
print('\nunit banners')
for k, v in t['color']['unit'].items():
    if k == 'note': continue
    r = ratio(v[1], v[0]); ok = r >= 4.5; fails += not ok
    print(f"  {'PASS' if ok else 'FAIL'} {r:5.2f} >= 4.5  {k}")
print(f'\n{fails} failure(s)')
sys.exit(1 if fails else 0)
