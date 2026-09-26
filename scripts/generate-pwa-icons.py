from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "public"
BG = (15, 23, 42, 255)
BLUE = (91, 140, 255, 255)
BLUE_LT = (122, 163, 255, 255)
BAR = (232, 237, 247, 255)
GREEN = (34, 197, 142, 255)
GREEN_DK = (26, 168, 116, 255)
VEIN = (15, 23, 42, 255)


def _xy(s: float, box: tuple[float, float, float, float]) -> list[float]:
    k = s / 512
    x0, y0, x1, y1 = box
    return [x0 * k, y0 * k, x1 * k, y1 * k]


def _poly(s: float, points: list[tuple[float, float]]) -> list[float]:
    k = s / 512
    coords: list[float] = []
    for x, y in points:
        coords.extend((x * k, y * k))
    return coords


def draw_icon(size: int, rounded: bool = False) -> Image.Image:
    scale = 2
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    if rounded:
        radius = int(s * 0.21)
        draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BG)
    else:
        draw.rectangle([0, 0, s, s], fill=BG)

    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    pad = s * 0.18
    gdraw.ellipse([pad, pad, s - pad, s - pad], fill=(91, 140, 255, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=s * 0.08))
    layer = Image.alpha_composite(layer, glow)
    draw = ImageDraw.Draw(layer)

    draw.rounded_rectangle(_xy(s, (78, 176, 132, 336)), radius=s * 18 / 512, fill=BLUE)
    draw.rounded_rectangle(_xy(s, (122, 200, 168, 312)), radius=s * 14 / 512, fill=BLUE_LT)
    draw.rounded_rectangle(_xy(s, (160, 232, 352, 280)), radius=s * 14 / 512, fill=BAR)
    draw.rounded_rectangle(_xy(s, (344, 200, 390, 312)), radius=s * 14 / 512, fill=BLUE_LT)
    draw.rounded_rectangle(_xy(s, (380, 176, 434, 336)), radius=s * 18 / 512, fill=BLUE)

    leaf = _poly(
        s,
        [
            (286, 304),
            (318, 296),
            (356, 304),
            (388, 328),
            (398, 358),
            (378, 372),
            (336, 360),
            (300, 336),
            (284, 316),
        ],
    )
    draw.polygon(leaf, fill=GREEN)
    inner = _poly(
        s,
        [
            (296, 320),
            (330, 314),
            (360, 328),
            (374, 350),
            (352, 356),
            (320, 344),
            (298, 328),
        ],
    )
    draw.polygon(inner, fill=GREEN_DK)
    draw.line(
        _xy(s, (304, 328, 354, 368)),
        fill=VEIN,
        width=max(2, int(s * 6 / 512)),
    )

    img = Image.alpha_composite(img, layer)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def save_ico(path: Path) -> None:
    images = [draw_icon(size, rounded=True) for size in (16, 32, 48)]
    images[0].save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=images[1:])


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    draw_icon(192).save(ROOT / "pwa-192x192.png")
    draw_icon(512).save(ROOT / "pwa-512x512.png")
    draw_icon(180).save(ROOT / "apple-touch-icon.png")
    save_ico(ROOT / "favicon.ico")
    print("generated pwa icons in", ROOT)


if __name__ == "__main__":
    main()
