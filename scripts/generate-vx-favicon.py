#!/usr/bin/env python3
"""Generate glass-panel VX favicons aligned with the site UI (gold accent)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / 'frontend' / 'public' / 'brand'
BRANDING = ROOT / 'frontend' / 'public' / 'branding'

BG_TOP = (15, 23, 42)
BG_BOTTOM = (2, 6, 23)
BORDER = (148, 163, 184, 56)
HIGHLIGHT = (255, 255, 255, 20)
FG = (255, 236, 40, 255)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        '/usr/share/fonts/truetype/inter/Inter-Bold.ttf',
        '/usr/share/fonts/adobe-source-sans/SourceSans3-Bold.otf',
        '/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf',
        '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def glass_background(size: int) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), (*BG_BOTTOM, 255))
    px = canvas.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        for x in range(size):
            base = (
                lerp(BG_TOP[0], BG_BOTTOM[0], t),
                lerp(BG_TOP[1], BG_BOTTOM[1], t),
                lerp(BG_TOP[2], BG_BOTTOM[2], t),
            )
            gold = max(0.0, 1.0 - ((x - 0.14 * size) ** 2 + (y - 0.12 * size) ** 2) / (0.38 * size) ** 2)
            r = min(255, base[0] + int(gold * 36))
            g = min(255, base[1] + int(gold * 30))
            b = min(255, base[2] + int(gold * 4))
            px[x, y] = (r, g, b, 255)
    return canvas


def draw_glass_frame(draw: ImageDraw.ImageDraw, size: int) -> None:
    inset = max(1, size // 16)
    radius = max(3, size // 5)
    outer = [inset, inset, size - inset - 1, size - inset - 1]
    draw.rounded_rectangle(outer, radius=radius, outline=BORDER, width=max(1, size // 32))
    draw.line(
        [outer[0] + radius // 2, outer[1] + 1, outer[2] - radius // 2, outer[1] + 1],
        fill=HIGHLIGHT,
        width=1,
    )


def render_vx(size: int) -> Image.Image:
    canvas = glass_background(size)
    draw_glass_frame(ImageDraw.Draw(canvas), size)
    draw = ImageDraw.Draw(canvas)
    font_size = max(8, int(size * 0.44))
    font = load_font(font_size)
    text = 'VX'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] - max(0, int(size * 0.02))
    draw.text((x + 1, y + 1), text, font=font, fill=(48, 28, 0, 120))
    draw.text((x, y - max(1, size // 40)), text, font=font, fill=(255, 255, 200, 220))
    draw.text((x, y), text, font=font, fill=FG)
    return canvas


def save_png(path: Path, size: int) -> None:
    render_vx(size).save(path)


def save_ico(path: Path) -> None:
    sizes = [16, 32, 48]
    frames = [render_vx(s) for s in sizes]
    frames[0].save(path, format='ICO', sizes=[(s, s) for s in sizes])


def save_svg(path: Path) -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Vortx">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="vx" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff8a8"/>
      <stop offset="45%" stop-color="#ffee22"/>
      <stop offset="100%" stop-color="#ffb800"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#bg)"/>
  <rect x="1.5" y="1.5" width="29" height="29" rx="6.5" fill="none" stroke="#94a3b8" stroke-opacity="0.35"/>
  <line x1="8" y1="2.5" x2="24" y2="2.5" stroke="#ffffff" stroke-opacity="0.12"/>
  <text x="16" y="21" font-family="Inter,Segoe UI,system-ui,sans-serif" font-size="13.5" font-weight="700" fill="url(#vx)" text-anchor="middle">VX</text>
</svg>
"""
    path.write_text(svg, encoding='utf-8')


if __name__ == '__main__':
    BRAND.mkdir(parents=True, exist_ok=True)
    BRANDING.mkdir(parents=True, exist_ok=True)

    save_png(BRANDING / 'favicon-512.png', 512)
    save_png(BRANDING / 'favicon.png', 512)
    save_png(BRANDING / 'favicon-48.png', 48)
    save_png(BRANDING / 'favicon-32.png', 32)
    save_png(BRANDING / 'apple-touch-icon.png', 180)
    save_ico(BRANDING / 'favicon.ico')
    save_svg(BRANDING / 'favicon.svg')

    render_vx(512).save(BRAND / 'vortx-vx-master.png')
    print(f'Generated glass gold VX favicons in {BRANDING}')
