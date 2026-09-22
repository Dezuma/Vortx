from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 675

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

def F(path, size):
    return ImageFont.truetype(path, size)

def severity_palette(score):
    if score >= 80:
        return (255, 61, 61), (38, 8, 8)       # hot red, deep red-black bg tint
    elif score >= 50:
        return (255, 159, 28), (40, 24, 6)     # amber
    else:
        return (84, 214, 150), (6, 32, 24)     # green

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def make_bg(score_color, w, h):
    top = (8, 9, 11)
    bottom = lerp((8, 9, 11), score_color, 0.16)
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / h
        c = lerp(top, bottom, t)
        for x in range(w):
            px[x, y] = c
    return img

def wrap_to_width(draw, text, font, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def glow_text(base_img, text, font, fill, center_xy, blur=18, passes=3):
    glow_layer = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    w = gd.textlength(text, font=font)
    bbox = font.getbbox(text)
    h = bbox[3] - bbox[1]
    x = center_xy[0] - w / 2
    y = center_xy[1] - h / 2 - bbox[1]
    gd.text((x, y), text, font=font, fill=fill + (255,))
    for _ in range(passes):
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(blur))
    base_img.paste(Image.alpha_composite(Image.new("RGBA", base_img.size, (0,0,0,0)), glow_layer),
                    (0, 0), glow_layer)
    return x, y, w, h

def build_hero_card(headline, case_line, note, cta_text, score=90, label="HIGH FRICTION",
                     mode="urgency", filename="card.png"):
    score_color, bg_tint = severity_palette(score)
    img = make_bg(score_color, W, H).convert("RGBA")
    d = ImageDraw.Draw(img)

    f_kicker = F(FONT_BOLD, 20)
    f_logo = F(FONT_BOLD, 24)
    f_score_label = F(FONT_BOLD, 22)
    f_score_num = F(FONT_BOLD, 190)
    f_score_den = F(FONT_BOLD, 28)
    f_headline = F(FONT_BOLD, 34)
    f_meta = F(FONT_REG, 18)
    f_note = F(FONT_REG, 20)
    f_cta = F(FONT_BOLD, 25)
    f_footer = F(FONT_REG, 15)

    margin = 50

    # Top row: logo + kicker
    d.text((margin, 34), "VORTX", font=f_logo, fill=(235, 238, 240))
    kicker = "PUBLIC RECORD ALERT"
    kw = d.textlength(kicker, font=f_kicker)
    d.text((W - margin - kw, 40), kicker, font=f_kicker, fill=(150, 158, 164))

    # HERO: giant glowing score, centered
    score_str = str(score)
    center_x = W // 2
    score_cy = 225

    # glow pass (blurred, additive feel)
    glow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    bbox = f_score_num.getbbox(score_str)
    sw = gd.textlength(score_str, font=f_score_num)
    sh = bbox[3] - bbox[1]
    sx = center_x - sw / 2
    sy = score_cy - sh / 2 - bbox[1]
    gd.text((sx, sy), score_str, font=f_score_num, fill=score_color + (255,))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(20))
    img = Image.alpha_composite(img, glow_layer)
    d = ImageDraw.Draw(img)

    # sharp number on top
    d.text((sx, sy), score_str, font=f_score_num, fill=score_color)

    # "/100" small, to the right of the number, baseline aligned
    den_x = sx + sw + 12
    den_y = sy + sh - 24
    d.text((den_x, den_y), "/100", font=f_score_den, fill=(150, 158, 164))

    # label above number
    label_w = d.textlength(label, font=f_score_label)
    d.text((center_x - label_w / 2, score_cy - sh / 2 - 50), label, font=f_score_label, fill=score_color)

    y = score_cy + sh / 2 + 22

    # divider
    d.line((margin, y, W - margin, y), fill=(50, 56, 62), width=1)
    y += 28

    # Headline (the stake) — centered, wraps
    max_w = W - margin * 2 - 40
    h_lines = wrap_to_width(d, headline, f_headline, max_w)
    for line in h_lines:
        lw = d.textlength(line, font=f_headline)
        d.text((center_x - lw / 2, y), line, font=f_headline, fill=(240, 242, 244))
        y += 42
    y += 8

    # meta line
    meta_w = d.textlength(case_line, font=f_meta)
    d.text((center_x - meta_w / 2, y), case_line, font=f_meta, fill=(140, 150, 156))
    y += 32

    # note
    note_lines = wrap_to_width(d, note, f_note, max_w)
    note_color = score_color if mode == "urgency" else (84, 214, 150)
    for line in note_lines:
        nw = d.textlength(line, font=f_note)
        d.text((center_x - nw / 2, y), line, font=f_note, fill=note_color)
        y += 27

    # CTA — flows dynamically after note, never overlaps
    y += 18
    d.line((margin, y, W - margin, y), fill=(50, 56, 62), width=1)
    y += 22
    cta_w = d.textlength(cta_text, font=f_cta)
    d.text((center_x - cta_w / 2, y), cta_text, font=f_cta, fill=score_color)
    y += 46

    footer = "VORTXMKT.COM  ·  RESEARCH ONLY, NOT LEGAL ADVICE"
    fw = d.textlength(footer, font=f_footer)
    d.text((center_x - fw / 2, max(y, H - 40)), footer, font=f_footer, fill=(110, 118, 124))

    img.convert("RGB").save(filename)
    return filename

build_hero_card(
    headline="RV Mechanical LLC has a bankruptcy docket moving.",
    case_line="Civil docket · filed Jun 22, 2026 · business bankruptcy",
    note="Subscribers had this filing, the source, and the timeline the day it was recorded.",
    cta_text="SEE THE FULL FILING  ->",
    score=90,
    label="HIGH FRICTION",
    mode="relief",
    filename="/home/claude/vortx_hero_relief.png",
)

build_hero_card(
    headline="If you do business with RV Mechanical LLC, your exposure window just opened.",
    case_line="Civil docket · filed Jun 22, 2026 · business bankruptcy",
    note="Filed today. The longer this sits unread, the less time you have to react.",
    cta_text="CHECK YOUR EXPOSURE  ->",
    score=90,
    label="HIGH FRICTION",
    mode="urgency",
    filename="/home/claude/vortx_hero_urgency.png",
)

print("done")
