"""Build hordeDragon.png from the dragon sprite reference sheet."""
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent.parent / "public" / "images" / "dragon_source.png"
DST = Path(__file__).resolve().parent.parent / "public" / "images" / "hordeDragon.png"
FRAME = 80

# Approximate row bands in the 1011x1024 source (y0, y1)
ROWS = {
    "stand": (30, 130),
    "walk": (150, 250),
    "swoop": (270, 360),
    "hover": (380, 480),
    "fly_up": (500, 600),
    "attack": (620, 720),
    "hurt": (740, 820),
    "jump": (840, 930),
    "fire": (950, 1020),
}


def is_white(r, g, b, a):
    return a < 10 or (r > 235 and g > 235 and b > 235)


def trim(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def normalize_frame(img):
    img = trim(img)
    canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    scale = min((FRAME - 8) / img.width, (FRAME - 8) / img.height)
    w = max(1, int(img.width * scale))
    h = max(1, int(img.height * scale))
    resized = img.resize((w, h), Image.Resampling.LANCZOS)
    ox = (FRAME - w) // 2
    oy = FRAME - h - 4
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def extract_row_frames(src, y0, y1, max_frames=4):
    row = src.crop((0, y0, src.width, y1))
    px = row.load()
    w, h = row.size

    columns = []
    in_sprite = False
    start = 0
    for x in range(w):
        col_has_pixel = any(
            not is_white(px[x, y][0], px[x, y][1], px[x, y][2], px[x, y][3])
            for y in range(h)
        )
        if col_has_pixel and not in_sprite:
            in_sprite = True
            start = x
        elif not col_has_pixel and in_sprite:
            in_sprite = False
            if x - start > 20:
                columns.append((start, x))
    if in_sprite and w - start > 20:
        columns.append((start, w))

    frames = []
    for x0, x1 in columns[:max_frames]:
        crop = row.crop((x0, 0, x1, h)).convert("RGBA")
        cpx = crop.load()
        for y in range(crop.height):
            for x in range(crop.width):
                r, g, b, a = cpx[x, y]
                if is_white(r, g, b, a):
                    cpx[x, y] = (0, 0, 0, 0)
        frames.append(normalize_frame(crop))
    return frames


def main():
    import shutil

    ref = Path(__file__).resolve().parent.parent.parent / (
        "assets/c__Users_davidza_AppData_Roaming_Cursor_User_workspaceStorage_"
        "dfcbddfc31e0d770f87d83736f7ba722_images_image-23419066-6397-46a9-a4b9-"
        "498aaa2a538d.png"
    )
    if not SRC.exists() and ref.exists():
        shutil.copy(ref, SRC)

    src = Image.open(SRC).convert("RGBA")
    hover = extract_row_frames(src, *ROWS["hover"], max_frames=4)
    attack = extract_row_frames(src, *ROWS["attack"], max_frames=4)
    stand = extract_row_frames(src, *ROWS["stand"], max_frames=2)
    hurt = extract_row_frames(src, *ROWS["hurt"], max_frames=1)

    fly = hover[:4] if len(hover) >= 4 else hover
    land = stand[:1] if stand else fly[:1]
    atk = (hover[2:4] + hover[0:2]) if len(hover) >= 4 else fly
    dmg = hurt[:1] if hurt else land

    while len(fly) < 4:
        fly.append(fly[-1].copy())
    while len(atk) < 4:
        atk.append(atk[-1].copy())

    sheet = Image.new("RGBA", (FRAME * 4, FRAME * 3), (0, 0, 0, 0))
    for i, frame in enumerate(fly[:4]):
        sheet.paste(frame, (i * FRAME, 0))
    sheet.paste(land[0], (0, FRAME))
    for i, frame in enumerate(atk[:4]):
        sheet.paste(frame, (i * FRAME, FRAME * 2))

    sheet.save(DST, "PNG")
    print(f"Wrote {DST} ({sheet.size[0]}x{sheet.size[1]})")


if __name__ == "__main__":
    main()
