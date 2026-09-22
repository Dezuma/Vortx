#!/usr/bin/env python3
"""Build favicons from the official VX master logo (readable at 16–32px)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / 'frontend' / 'public' / 'branding'
BRAND = ROOT / 'frontend' / 'public' / 'brand'
MASTER = BRAND / 'vortx-vx-master.png'

# Black tab background matches browser chrome in user screenshot
ICON_BG = (0, 0, 0, 255)
RENDER_SIZE = 1024
LOGO_FILL = 0.92


def trim_white(img: Image.Image, threshold: int = 248) -> Image.Image:
    rgba = img.convert('RGBA')
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (255, 255, 255, 0)
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def square_pad(img: Image.Image, margin_ratio: float = 0.04) -> Image.Image:
    w, h = img.size
    margin = int(max(w, h) * margin_ratio)
    w2, h2 = w + margin * 2, h + margin * 2
    side = max(w2, h2)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(img, ((side - w) // 2, (side - h) // 2))
    return canvas


def build_favicon(master: Image.Image, size: int = RENDER_SIZE) -> Image.Image:
    mark = square_pad(trim_white(master))
    canvas = Image.new('RGBA', (size, size), ICON_BG)
    target = int(size * LOGO_FILL)
    fitted = mark.copy()
    fitted.thumbnail((target, target), Image.Resampling.LANCZOS)
    canvas.alpha_composite(
        fitted,
        ((size - fitted.width) // 2, (size - fitted.height) // 2),
    )
    return canvas


def downscale(img: Image.Image, size: int) -> Image.Image:
    out = img.resize((size, size), Image.Resampling.LANCZOS)
    if size <= 48:
        out = out.filter(ImageFilter.UnsharpMask(radius=0.8, percent=130, threshold=2))
    return out


def save_ico(master: Image.Image, path: Path) -> None:
    sizes = [16, 32, 48]
    frames = [downscale(master, s) for s in sizes]
    frames[0].save(path, format='ICO', sizes=[(s, s) for s in sizes])


def main() -> None:
    BRANDING.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)
    if not MASTER.exists():
        raise SystemExit(f'Missing master logo: {MASTER}')

    master_img = Image.open(MASTER)
    favicon = build_favicon(master_img)

    favicon.save(BRANDING / 'favicon-512.png')
    favicon.save(BRANDING / 'favicon.png')
    favicon.save(BRAND / 'vortx-app-icon-512.png')

    downscale(favicon, 180).save(BRANDING / 'apple-touch-icon.png')
    downscale(favicon, 48).save(BRANDING / 'favicon-48.png')
    downscale(favicon, 32).save(BRANDING / 'favicon-32.png')
    downscale(favicon, 32).save(BRAND / 'vortx-app-icon.png')
    save_ico(favicon, BRANDING / 'favicon.ico')

    print(f'Built favicons from {MASTER.name}')
    print(f'Output: {BRANDING} and {BRAND}')


if __name__ == '__main__':
    main()
