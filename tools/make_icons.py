"""Generate the Bio Dynamx Music icon set.

Deterministic, dependency-light (Pillow only), and safe to re-run: it overwrites
www/icons/*.png with the same output every time.

The mark is a downward-pointing guitar pick with a three-bar waveform cut out of
it — cyan at the top fading to lime at the tip, on the BioDynamX navy.

Run: python tools/make_icons.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "www", "icons")
os.makedirs(OUT, exist_ok=True)

NAVY = (11, 29, 58)
NAVY_DEEP = (5, 15, 31)
CYAN = (0, 212, 255)
LIME = (157, 255, 92)


def pick_polygon(cx, cy, r):
    """A guitar pick: triangle with the point facing down."""
    pts = []
    for i in range(3):
        ang = math.radians(90 + i * 120)
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def rounded_shape_mask(size, polygon, corner_radius):
    """Fill a polygon, then round its corners by blurring and re-thresholding."""
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).polygon(polygon, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(corner_radius))
    return m.point(lambda v: 255 if v > 140 else 0)


def vertical_gradient(size, top, bottom):
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    for y in range(size):
        t = y / max(1, size - 1)
        d.line(
            [(0, y), (size, y)],
            fill=(
                int(top[0] + (bottom[0] - top[0]) * t),
                int(top[1] + (bottom[1] - top[1]) * t),
                int(top[2] + (bottom[2] - top[2]) * t),
                255,
            ),
        )
    return g


def draw_icon(size, *, padded=False):
    """Render one icon at `size`; `padded` shrinks the art for maskable safe zones."""
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    radius = int(S * 0.22)
    ImageDraw.Draw(img).rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=NAVY)

    # Radial glow behind the mark
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gc = (S * 0.5, S * 0.34)
    for i in range(20, 0, -1):
        rr = S * (0.10 + i * 0.024)
        gd.ellipse([gc[0] - rr, gc[1] - rr, gc[0] + rr, gc[1] + rr], fill=(0, 212, 255, 9))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.035))
    img.alpha_composite(glow)

    # The mark: downward pick, cyan -> lime
    art = S * (0.72 if padded else 0.84)
    cx, cy = S / 2, S / 2
    r = art * 0.58
    poly = pick_polygon(cx, cy, r)
    pick_mask = rounded_shape_mask(S, poly, max(1.0, S * 0.02))

    body = vertical_gradient(S, CYAN, LIME)
    body.putalpha(pick_mask)

    # Three waveform bars punched out of the pick, clipped to the pick mask so
    # nothing spills outside the shape.
    slots = Image.new("L", (S, S), 0)
    sd = ImageDraw.Draw(slots)
    bw = art * 0.075
    gap = art * 0.15
    heights = [0.30, 0.50, 0.38]
    for i, h in enumerate(heights):
        x = cx + (i - 1) * gap
        hh = art * h
        y0 = cy - hh / 2 - art * 0.10
        y1 = cy + hh / 2 - art * 0.10
        y0 = max(y0, cy - r * 0.46)
        y1 = min(y1, cy + r * 0.34)
        sd.rounded_rectangle([x - bw / 2, y0, x + bw / 2, y1], radius=bw / 2, fill=255)

    clipped = Image.new("L", (S, S), 0)
    clipped.paste(slots, (0, 0), pick_mask)
    body = Image.composite(Image.new("RGBA", (S, S), NAVY + (255,)), body, clipped)

    img.alpha_composite(body)
    if not padded:
        img.putalpha(rounded_mask(S, radius))
    return img


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), "PNG", optimize=True)
    print(f"  {name}  {size}x{size}")


print(f"Writing icons to {OUT}")
base = draw_icon(1024)
save(base, "icon-192.png", 192)
save(base, "icon-512.png", 512)

mask = draw_icon(1024, padded=True)
save(mask, "maskable-512.png", 512)
save(mask, "maskable-192.png", 192)

# iOS home screen icon: no transparency, iOS applies its own corner mask.
apple = Image.new("RGB", (180, 180), NAVY_DEEP)
apple.paste(draw_icon(180).convert("RGB"), (0, 0))
apple.save(os.path.join(OUT, "apple-touch-icon.png"), "PNG", optimize=True)
print("  apple-touch-icon.png  180x180")

save(base, "favicon-32.png", 32)
print("Done.")
