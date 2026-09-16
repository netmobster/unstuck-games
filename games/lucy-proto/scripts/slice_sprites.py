"""Slice the red team's Lucy sprite sheet (transparent PNG) into centre-aligned frames.

Usage: python scripts/slice_sprites.py "<sheet.png>"
Writes public/sprites/top_<name>_<n>.png (512x512) and reports/sprite-contact.png.
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

SHEET = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)
(ROOT / "reports").mkdir(exist_ok=True)

img = Image.open(SHEET).convert("RGBA")
W, H = img.size
px = img.load()

def ink(r, g, b):
    # anything that isn't paper-white counts (cream fur is ~235,215,175 so it survives)
    return min(r, g, b) < 232 or (max(r, g, b) - min(r, g, b)) > 22

# 1. connected components of ink on a 2x-downscaled mask (fast enough in pure python)
S = 2
mw, mh = W // S, H // S
mask = bytearray(mw * mh)
for y in range(mh):
    for x in range(mw):
        if px[x * S, y * S][3] > 40:
            mask[y * mw + x] = 1
# dilate a little so whiskers and tail tips join their ferret
dil = bytearray(mask)
for y in range(1, mh - 1):
    for x in range(1, mw - 1):
        if mask[y * mw + x]:
            for dy in (-2, -1, 0, 1, 2):
                for dx in (-2, -1, 0, 1, 2):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < mh and 0 <= xx < mw:
                        dil[yy * mw + xx] = 1

seen = bytearray(mw * mh)
boxes = []
for y in range(mh):
    for x in range(mw):
        i = y * mw + x
        if not dil[i] or seen[i]:
            continue
        q = deque([i]); seen[i] = 1
        x0 = x1 = x; y0 = y1 = y; n = 0
        while q:
            c = q.popleft(); cx, cy = c % mw, c // mw; n += 1
            x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < mw and 0 <= ny < mh:
                    j = ny * mw + nx
                    if dil[j] and not seen[j]:
                        seen[j] = 1; q.append(j)
        boxes.append((x0 * S, y0 * S, (x1 + 1) * S, (y1 + 1) * S, n))

# ferrets are big blobs; captions and titles are small letters
ferrets = [b for b in boxes if b[4] > 1500 and (b[3] - b[1]) > 90]
ferrets.sort(key=lambda b: (b[1] // 200, b[0]))
print(f"sheet {W}x{H}: {len(boxes)} components, {len(ferrets)} ferret-sized")
for b in ferrets:
    print("  box", b[:4], "area", b[4])

# rows by vertical centre, then left-to-right, mapped to the layout on the sheet
rows = {}
for b in ferrets:
    cy = (b[1] + b[3]) / 2
    key = 0 if cy < H * 0.34 else 1 if cy < H * 0.68 else 2
    rows.setdefault(key, []).append(b)
for k in rows:
    rows[k].sort(key=lambda b: b[0])
names = {
    0: ["walk_1", "walk_2", "walk_3", "walk_4", "zoom_1", "zoom_2", "zoom_3", "zoom_4"],
    1: ["sniff_1", "sniff_2", "wardance_1", "wardance_2", "wardance_3"],
    2: ["curl_1", "curl_2", "hide"],
}
for k, want in names.items():
    got = len(rows.get(k, []))
    if got != len(want):
        sys.exit(f"row {k}: expected {len(want)} ferrets, found {got}. Check thresholds.")

def cutout(box):
    x0, y0, x1, y1, _ = box
    pad = 6
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    crop = img.crop((x0, y0, x1, y1)).convert("RGBA")
    # the sheet already ships transparent: keep its alpha, drop near-invisible dust
    a = crop.getchannel("A").point(lambda v: 0 if v < 12 else v)
    crop.putalpha(a)
    return crop

def centroid(im):
    a = im.getchannel("A").load()
    w, h = im.size
    sx = sy = n = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if a[x, y] > 128:
                sx += x; sy += y; n += 1
    return (sx / n, sy / n) if n else (w / 2, h / 2)

CELL, FIT = 512, 440
sets = {"walk": [], "zoom": [], "sniff": [], "wardance": [], "curl": [], "hide": []}
for k, want in names.items():
    for name, box in zip(want, rows[k]):
        sets[name.split("_")[0]].append((name, cutout(box)))

written = []
# one scale for the whole sheet: every pose is the same ferret at the same size
biggest = max(max(f.size) for frames in sets.values() for _, f in frames)
scale = FIT / biggest
for group, frames in sets.items():
    for name, f in frames:
        f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
        cx, cy = centroid(f)
        cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell.alpha_composite(f, (round(CELL / 2 - cx), round(CELL / 2 - cy)))
        path = OUT / f"top_{name}.png"
        cell.save(path)
        written.append((path, cell))
        print("wrote", path.relative_to(ROOT))

# contact sheet on a checkerboard so transparency problems are visible
cols = 6
thumb = 180
rows_n = (len(written) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * thumb, rows_n * thumb), (255, 255, 255, 255))
for i, (_, cell) in enumerate(written):
    tile = Image.new("RGBA", (thumb, thumb))
    for ty in range(0, thumb, 15):
        for tx in range(0, thumb, 15):
            c = (205, 225, 205, 255) if (tx // 15 + ty // 15) % 2 else (120, 150, 120, 255)
            tile.paste(c, (tx, ty, tx + 15, ty + 15))
    tile.alpha_composite(cell.resize((thumb, thumb), Image.LANCZOS))
    sheet.alpha_composite(tile, ((i % cols) * thumb, (i // cols) * thumb))
sheet.save(ROOT / "reports" / "sprite-contact.png")
print("contact sheet: reports/sprite-contact.png")
