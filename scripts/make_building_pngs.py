"""Convert building JPGs to PNGs with transparent grass backgrounds."""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public" / "images"

BUILDINGS = ("house", "mill", "castle", "rubbleHouse")


def is_grass(r, g, b):
    """Grass / green screen background in tile sprites."""
    # Windmill blades and other warm highlights are not grass.
    if r > 170 and g > 150 and b < 140 and r >= g - 20:
        return False
    return g > 75 and g >= r - 25 and g > b and (g - r) < 60 and b < g - 8


def remove_all_grass(img):
    """Remove any remaining grass-colored pixels (halos, trapped pockets)."""
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and is_grass(r, g, b):
                px[x, y] = (0, 0, 0, 0)


def flood_edge_grass(img):
    """Background grass touching image edges → transparent."""
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if not is_grass(r, g, b):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])


def trim_transparent(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def convert(name):
    src = ROOT / f"{name}.jpg"
    dst = ROOT / f"{name}.png"
    if not src.exists():
        print(f"Skip {name}: {src} not found")
        return
    img = Image.open(src).convert("RGBA")
    flood_edge_grass(img)
    remove_all_grass(img)
    img = trim_transparent(img)
    img.save(dst, "PNG")
    print(f"Wrote {dst} ({img.size[0]}x{img.size[1]})")


def main():
    for name in BUILDINGS:
        convert(name)


if __name__ == "__main__":
    main()
