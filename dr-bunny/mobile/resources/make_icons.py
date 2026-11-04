"""Sinh biểu tượng và màn hình chờ của app (PIL, không cần phần mềm thiết kế).
Chạy:  python mobile/resources/make_icons.py   rồi:  cd frontend && npm run assets
Kết quả: icon-only.png (iOS + dự phòng), icon-foreground.png + icon-background.png (Android adaptive), splash.png, splash-dark.png."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

OUT = pathlib.Path(__file__).resolve().parent
SAGE, SAGE_D, CREAM, PINK, INK, ORANGE = (110, 130, 107), (75, 94, 72), (239, 245, 236), (240, 170, 170), (35, 43, 34), (200, 122, 81)
K = 2   # siêu lấy mẫu để nét mịn


def bunny(size, bg=None):
    """Vẽ chú thỏ đeo ống nghe, nghệ thuật nằm gọn trong 66 % giữa (vùng an toàn của icon thích ứng Android)."""
    s = size * K
    im = Image.new("RGBA", (s, s), bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = s / 1000.0
    def E(cx, cy, rx, ry, fill, outline=None, w=0):
        d.ellipse([(cx - rx) * u, (cy - ry) * u, (cx + rx) * u, (cy + ry) * u], fill=fill, outline=outline, width=int(w * u))
    # tai
    for dx in (-1, 1):
        E(500 + dx * 120, 330, 62, 175, (255, 255, 255, 255), SAGE_D, 6)
        E(500 + dx * 120, 345, 30, 125, PINK)
    # mặt
    E(500, 560, 215, 195, (255, 255, 255, 255), SAGE_D, 6)
    E(430, 540, 20, 24, INK); E(570, 540, 20, 24, INK)
    E(436, 532, 7, 8, (255, 255, 255, 255)); E(576, 532, 7, 8, (255, 255, 255, 255))
    E(500, 598, 22, 16, PINK)
    d.line([500 * u, 612 * u, 500 * u, 636 * u], fill=INK, width=int(7 * u))
    d.arc([455 * u, 622 * u, 500 * u, 660 * u], 20, 160, fill=INK, width=int(7 * u))
    d.arc([500 * u, 622 * u, 545 * u, 660 * u], 20, 160, fill=INK, width=int(7 * u))
    E(375, 600, 30, 20, (255, 205, 205, 160)); E(625, 600, 30, 20, (255, 205, 205, 160))
    # ống nghe: hai nhánh từ cổ, vòng chữ U và đầu nghe màu cam
    d.arc([330 * u, 640 * u, 670 * u, 900 * u], 8, 172, fill=INK, width=int(18 * u))
    for x in (331.7, 668.3):                                   # hai nhánh ống đi từ đầu tai nghe xuống vòng chữ U
        d.line([x * u, 700 * u, x * u, 788 * u], fill=INK, width=int(18 * u))
        E(x, 700, 15, 15, INK)
    d.line([500 * u, 900 * u, 500 * u, 935 * u], fill=INK, width=int(18 * u))
    E(500, 950, 40, 40, ORANGE, INK, 8)
    E(500, 950, 14, 14, (255, 255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)


def solid(size, color):
    return Image.new("RGBA", (size, size), color + (255,))


def scaled_center(art, canvas, scale):
    n = int(canvas.width * scale)
    a = art.resize((n, n), Image.LANCZOS)
    canvas.alpha_composite(a, ((canvas.width - n) // 2, (canvas.height - n) // 2))
    return canvas


def font(sz):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


art = bunny(1000)
# icon iOS/dự phòng: nền xanh xám toàn khung, thỏ chiếm ~86 %
icon = scaled_center(art, solid(1024, SAGE), 0.86)
icon.convert("RGB").save(OUT / "icon-only.png")
# Android adaptive: lớp trước trong suốt (thỏ trong vùng an toàn 66 %), lớp sau là màu nền
scaled_center(art, Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)), 0.66).save(OUT / "icon-foreground.png")
solid(1024, SAGE).convert("RGB").save(OUT / "icon-background.png")
# màn hình chờ: nền kem + thỏ + tên app
for name, bg, fg in (("splash.png", CREAM, SAGE_D), ("splash-dark.png", (35, 43, 34), (214, 232, 208))):
    sp = Image.new("RGBA", (2732, 2732), bg + (255,))
    scaled_center(art, sp, 0.30)
    d = ImageDraw.Draw(sp)
    f = font(150)
    t = "Dr. Bunny"
    w = d.textlength(t, font=f)
    d.text(((2732 - w) / 2, 1640), t, font=f, fill=fg)
    sp.convert("RGB").save(OUT / name)
print("đã sinh:", sorted(p.name for p in OUT.glob("*.png")))
