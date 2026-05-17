"""Generate Android launcher icons from resources/icon.png or a source path."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
MASTER_DIR = ROOT / "resources"

LEGACY = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def sample_background(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    samples: list[tuple[int, int, int]] = []
    for x, y in ((8, 8), (w - 9, 8), (8, h - 9), (w - 9, h - 9)):
        r, g, b, a = img.getpixel((x, y))
        if a > 128:
            samples.append((r, g, b))
    if not samples:
        return (255, 255, 255)
    return tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))  # type: ignore[return-value]


def paste_on_bg(im: Image.Image, size: int, color: tuple[int, int, int]) -> Image.Image:
    out = Image.new("RGBA", (size, size), color + (255,))
    scaled = im.resize((size, size), Image.Resampling.LANCZOS)
    out.paste(scaled, (0, 0), scaled)
    return out


def main(src: Path) -> None:
    img = Image.open(src).convert("RGBA")
    bg = sample_background(img)
    bg_hex = "#%02X%02X%02X" % bg

    MASTER_DIR.mkdir(exist_ok=True)
    master = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    master.save(MASTER_DIR / "icon.png", optimize=True, compress_level=9)

    for folder, size in LEGACY.items():
        d = RES / folder
        d.mkdir(parents=True, exist_ok=True)
        out = paste_on_bg(img, size, bg)
        rgb = out.convert("RGB")
        rgb.save(d / "ic_launcher.png", optimize=True)
        rgb.save(d / "ic_launcher_round.png", optimize=True)

    for folder, size in FOREGROUND.items():
        d = RES / folder
        d.mkdir(parents=True, exist_ok=True)
        scaled = img.resize((size, size), Image.Resampling.LANCZOS)
        scaled.save(d / "ic_launcher_foreground.png", optimize=True)

    values_path = RES / "values" / "ic_launcher_background.xml"
    values_path.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        f'    <color name="ic_launcher_background">{bg_hex}</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )

    print(f"background={bg_hex}")
    print(f"master_bytes={ (MASTER_DIR / 'icon.png').stat().st_size }")


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else MASTER_DIR / "icon.png"
    main(source)
