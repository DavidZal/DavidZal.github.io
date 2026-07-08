"""Convert cow.jpg to cow.png — transparent outer bg, solid white cow body."""
from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent.parent / "public" / "images" / "cow.jpg"
DST = Path(__file__).resolve().parent.parent / "public" / "images" / "cow.png"


def is_grass(r, g, b):
    return g > 80 and g >= r and g > b and (g - r) < 55 and b < g - 10


def is_ink(r, g, b):
    return r < 70 and g < 70 and b < 70


def is_pink(r, g, b):
    return r > 200 and 120 < g < 200 and b > 120 and r > g + 15


def is_horn(r, g, b):
    return r > 170 and g > 130 and b < 90 and r > g > b


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


def normalize_cow_body(img):
    """Grass trapped inside the silhouette and off-white fill → solid white."""
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_ink(r, g, b) or is_pink(r, g, b) or is_horn(r, g, b):
                continue
            px[x, y] = (255, 255, 255, 255)


def trim_transparent(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def main():
    img = Image.open(SRC).convert("RGBA")
    flood_edge_grass(img)
    normalize_cow_body(img)
    img = trim_transparent(img)
    img.save(DST, "PNG")
    print(f"Wrote {DST} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
