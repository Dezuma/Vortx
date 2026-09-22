#!/usr/bin/env python3
"""Build the 1200x630 Open Graph / iMessage card to match the live Vortx desk."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'frontend' / 'public'
BRANDING = PUBLIC / 'branding'
OUT_PNG = PUBLIC / 'social-card.png'
OUT_SVG = PUBLIC / 'social-card.svg'

WIDTH, HEIGHT = 1200, 630
CYAN = (125, 211, 252)
CYAN_DEEP = (2, 132, 199)
GREEN = (134, 239, 172)
GREEN_BG = (10, 61, 40)
INK = (248, 250, 252)
MUTED = (148, 163, 184)
SLATE = (51, 65, 85)

FONT_CANDIDATES = {
    'bold': [
        '/usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf',
        '/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    ],
    'regular': [
        '/usr/share/fonts/liberation-sans-fonts/LiberationSans-Regular.ttf',
        '/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ],
}


def load_font(size: int, weight: str = 'bold') -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES[weight]:
        if Path(path).exists():
            font = ImageFont.truetype(path, size)
            probe = font.getbbox('VORTX')
            if probe[2] - probe[0] > size * 2.4:
                return font
    raise SystemExit('No usable TTF found; refusing bitmap fallback (it makes iPhone previews unreadable).')


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def paint_background() -> Image.Image:
    top = (2, 6, 23)
    bottom = (7, 17, 31)
    canvas = Image.new('RGB', (WIDTH, HEIGHT), top)
    px = canvas.load()
    for y in range(HEIGHT):
        t = y / max(HEIGHT - 1, 1)
        row = lerp(top, bottom, t)
        for x in range(WIDTH):
            cyan = max(0.0, 1.0 - ((x - 980) ** 2 + (y - 160) ** 2) / (460**2))
            green = max(0.0, 1.0 - ((x - 220) ** 2 + (y - 520) ** 2) / (380**2))
            r = min(255, row[0] + int(cyan * 18) + int(green * 8))
            g = min(255, row[1] + int(cyan * 48) + int(green * 36))
            b = min(255, row[2] + int(cyan * 72) + int(green * 22))
            px[x, y] = (r, g, b)
    return canvas.convert('RGBA')


def draw_globe(layer: Image.Image, cx: int, cy: int, radius: int) -> None:
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - radius - 36, cy - radius - 36, cx + radius + 36, cy + radius + 36), fill=(56, 189, 248, 38))
    layer.alpha_composite(glow.filter(ImageFilter.GaussianBlur(22)))

    draw = ImageDraw.Draw(layer)
    bbox = (cx - radius, cy - radius, cx + radius, cy + radius)
    draw.ellipse(bbox, fill=(2, 6, 23, 210), outline=CYAN + (220,), width=3)

    highlight = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.ellipse((cx - radius + 18, cy - radius + 12, cx - 20, cy + 10), fill=(125, 211, 252, 40))
    layer.alpha_composite(highlight.filter(ImageFilter.GaussianBlur(16)))

    draw = ImageDraw.Draw(layer)
    for i in range(-2, 3):
        squeeze = int(radius * (0.22 + abs(i) * 0.16))
        draw.ellipse((cx - squeeze, cy - radius, cx + squeeze, cy + radius), outline=(125, 211, 252, 90), width=2)
    for frac in (0.28, 0.5, 0.72):
        yy = cy - radius + int(radius * 2 * frac)
        half = int(math.sin(math.pi * frac) * radius)
        draw.arc((cx - half, yy - 10, cx + half, yy + 10), 0, 180, fill=(125, 211, 252, 110), width=2)

    pins = [(cx + 38, cy - 52), (cx - 64, cy + 18), (cx + 12, cy + 70)]
    for px, py in pins:
        draw.ellipse((px - 11, py - 11, px + 11, py + 11), fill=(134, 239, 172, 70))
        draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill=GREEN + (255,))


def rounded_mark(mark: Image.Image, size: int, radius: int) -> Image.Image:
    fitted = mark.convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(fitted, (0, 0), mask)
    return out


def draw_pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.ImageFont, fill, color) -> int:
    pad_x, pad_y = 22, 12
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    w, h = tw + pad_x * 2, th + pad_y * 2
    x, y = xy
    draw.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=fill)
    draw.text((x + pad_x - bbox[0], y + pad_y - bbox[1]), text, font=font, fill=color)
    return w


def build_png() -> None:
    mark_path = BRANDING / 'favicon-512.png'
    if not mark_path.exists():
        raise SystemExit(f'Missing favicon mark: {mark_path}')

    canvas = paint_background()
    draw_globe(canvas, 980, 318, 196)

    # Fine scanlines, same energy as the live desk HUD
    scan = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scan)
    for y in range(0, HEIGHT, 4):
        sd.line((0, y, WIDTH, y), fill=(2, 6, 23, 28))
    canvas.alpha_composite(scan)

    draw = ImageDraw.Draw(canvas)
    kicker = load_font(22, 'bold')
    brand = load_font(36, 'bold')
    title = load_font(72, 'bold')
    pill_font = load_font(22, 'bold')
    footer = load_font(24, 'bold')

    mark = rounded_mark(Image.open(mark_path), 92, 22)
    canvas.alpha_composite(mark, (72, 54))
    draw = ImageDraw.Draw(canvas)
    draw.text((184, 62), 'VORTX', font=brand, fill=INK)
    draw.text((184, 108), 'PUBLIC FILINGS DESK', font=kicker, fill=CYAN)

    draw.text((72, 198), 'See Congress and', font=title, fill=INK)
    draw.text((72, 286), 'insider stock trades', font=title, fill=CYAN)

    x = 72
    y = 400
    x += draw_pill(draw, (x, y), 'CONGRESS', pill_font, (12, 61, 92, 255), CYAN) + 14
    x += draw_pill(draw, (x, y), 'INSIDERS', pill_font, (12, 61, 92, 255), CYAN) + 14
    x += draw_pill(draw, (x, y), 'LAYOFFS', pill_font, (12, 61, 92, 255), CYAN) + 14
    draw_pill(draw, (x, y), 'BUY / SELL', pill_font, GREEN_BG + (255,), GREEN)

    draw.text((72, 488), 'Public filings. One live feed.', font=footer, fill=MUTED)
    draw.text((72, 534), 'vortxmkt.com', font=footer, fill=CYAN)

    rgb = canvas.convert('RGB')
    probe = title.getbbox('See Congress and')
    if probe[2] - probe[0] < 420:
        raise SystemExit('Headline rendered too small for iPhone link previews')
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(OUT_PNG, format='PNG', optimize=True)
    print(f'Wrote {OUT_PNG} ({OUT_PNG.stat().st_size} bytes) {rgb.size[0]}x{rgb.size[1]}')


def build_svg() -> None:
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="Vortx: see Congress and insider stock trades">
  <defs>
    <radialGradient id="glow" cx="82%" cy="28%" r="55%">
      <stop offset="0" stop-color="#7dd3fc" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb" cx="32%" cy="28%" r="70%">
      <stop offset="0" stop-color="#7dd3fc"/>
      <stop offset="0.28" stop-color="#0284c7"/>
      <stop offset="0.62" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#020617"/>
    </radialGradient>
  </defs>
  <rect width="{WIDTH}" height="{HEIGHT}" fill="#020617"/>
  <rect width="{WIDTH}" height="{HEIGHT}" fill="url(#glow)"/>
  <circle cx="980" cy="318" r="196" fill="url(#orb)" stroke="#7dd3fc" stroke-width="3"/>
  <circle cx="1018" cy="266" r="7" fill="#86efac"/>
  <circle cx="916" cy="336" r="7" fill="#86efac"/>
  <circle cx="992" cy="388" r="7" fill="#86efac"/>
  <text x="184" y="92" fill="#f8fafc" font-family="Liberation Sans,DejaVu Sans,sans-serif" font-size="36" font-weight="700">VORTX</text>
  <text x="184" y="126" fill="#7dd3fc" font-family="Liberation Sans,DejaVu Sans,sans-serif" font-size="22" font-weight="700" letter-spacing="3">PUBLIC FILINGS DESK</text>
  <text x="72" y="258" fill="#f8fafc" font-family="Liberation Sans,DejaVu Sans,sans-serif" font-size="72" font-weight="700">See Congress and</text>
  <text x="72" y="346" fill="#7dd3fc" font-family="Liberation Sans,DejaVu Sans,sans-serif" font-size="72" font-weight="700">insider stock trades</text>
  <text x="72" y="512" fill="#94a3b8" font-family="Liberation Sans,DejaVu Sans,sans-serif" font-size="24" font-weight="700">Public filings. One live feed.</text>
  <text x="72" y="558" fill="#7dd3fc" font-family="Liberation Sans,DejaVu Sans,sans-serif" font-size="24" font-weight="700">vortxmkt.com</text>
</svg>
"""
    OUT_SVG.write_text(svg, encoding='utf-8')
    print(f'Wrote {OUT_SVG}')


if __name__ == '__main__':
    build_png()
    build_svg()
