"""Slice the red team's Lucy mood board (transparent PNG, 4 on top, 3 below) into post-run portraits.

Usage: python scripts/slice_moods.py "<board.png>"
Every connected blob (a ferret, a motion line, a zzz, a water drop) goes to the mood whose grid cell holds its
centre, so effects stay with their ferret and neighbours don't leak in. Blobs that span two cells (wired's paws
touch dozy's tail) are split pixel-wise at the cell line. One shared scale, feet on a shared floor line.
Writes public/sprites/mood_<name>.png (512x512) and reports/mood-contact.png.
"""
import sys
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sprites"
img = Image.open(sys.argv[1]).convert("RGBA")
W, H = img.size
fx, fy = W / 1536, H / 1024
ROW = 500 * fy
CELLS = [  # name, x0, x1, top row?
    ("curious", 0, 360, True), ("wired", 360, 776, True), ("dozy", 776, 1205, True), ("grudgy", 1205, 1536, True),
    ("damp", 0, 545, False), ("asleep", 545, 1036, False), ("proud", 1036, 1536, False),
]
def cell_of(x, y):
    for name, x0, x1, top in CELLS:
        if (y < ROW) == top and x0 * fx <= x < x1 * fx:
            return name
    return CELLS[-1][0]

A = img.getchannel("A")
a = A.load()
# full-resolution 8-connected labelling
label = [0] * (W * H)
blobs = []  # (xmin, xmax, ymin, ymax, sumx, sumy, n)
for y in range(H):
    for x in range(W):
        i = y * W + x
        if a[x, y] <= 12 or label[i]:
            continue
        lid = len(blobs) + 1
        label[i] = lid
        q = deque([(x, y)])
        x0 = x1 = x; y0 = y1 = y; sx = sy = n = 0
        while q:
            cx, cy = q.popleft()
            x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
            sx += cx; sy += cy; n += 1
            for nx in (cx - 1, cx, cx + 1):
                for ny in (cy - 1, cy, cy + 1):
                    if 0 <= nx < W and 0 <= ny < H:
                        j = ny * W + nx
                        if not label[j] and a[nx, ny] > 12:
                            label[j] = lid; q.append((nx, ny))
        blobs.append((x0, x1, y0, y1, sx / n, sy / n, n))

owner = []
for (x0, x1, y0, y1, cx, cy, n) in blobs:
    w = x1 - x0
    if n < 80 or (n < 400 and abs(cy - ROW) < 30):  # dust specks, and stray marks sitting on the row line
        owner.append("drop"); continue
    if w > 600 * fx:  # only the merged wired+dozy blob is wider than one ferret: split it between its two cells
        owner.append(("split", cell_of(x0 + w * 0.25, cy), cell_of(x1 - w * 0.25, cy))); continue
    owner.append(cell_of(cx, cy))

layers = {name: Image.new("RGBA", (W, H)) for name, *_ in CELLS}
px = img.load()
lp = {k: v.load() for k, v in layers.items()}
for y in range(H):
    for x in range(W):
        lid = label[y * W + x]
        if not lid:
            continue
        o = owner[lid - 1]
        if o == "drop":
            continue
        if isinstance(o, tuple):
            left = next(c for c in CELLS if c[0] == o[1])
            o = o[1] if x < left[2] * fx else o[2]
        lp[o][x, y] = px[x, y]

crops = {}
for name, *_ in CELLS:
    box = layers[name].getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    crops[name] = layers[name].crop(box)

scale = 470 / max(max(c.size) for c in crops.values())
thumb = 200
sheet = Image.new("RGBA", (len(crops) * thumb, thumb), (160, 190, 160, 255))
for i, (name, c) in enumerate(crops.items()):
    c = c.resize((round(c.width * scale), round(c.height * scale)), Image.LANCZOS)
    cell = Image.new("RGBA", (512, 512))
    cell.alpha_composite(c, ((512 - c.width) // 2, 512 - 20 - c.height))
    cell.save(OUT / f"mood_{name}.png")
    sheet.alpha_composite(cell.resize((thumb, thumb), Image.LANCZOS), (i * thumb, 0))
    print("wrote", f"public/sprites/mood_{name}.png", c.size)
(ROOT / "reports").mkdir(exist_ok=True)
sheet.save(ROOT / "reports" / "mood-contact.png")
