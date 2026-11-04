"""Chụp các màn hình THẬT của app (viewport iPhone 14) và ghép thành storyboard thiết kế.
Cần backend :8000 + frontend :5173 đang chạy (hoặc đặt APP_URL). Chạy: python docs/design/make_storyboard.py"""
import asyncio
import os
import pathlib
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:5173")
OUT = pathlib.Path(__file__).resolve().parent
SCREENS = OUT / "screens"
INK, SAGE, CREAM = (35, 43, 34), (75, 94, 72), (239, 245, 236)


async def shoot():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until="networkidle")
        await pg.locator("[role=dialog]").wait_for()
        await pg.screenshot(path=SCREENS / "1_onboarding.png")
        await pg.click("button:has-text('Tôi hiểu')")
        await pg.click("button[aria-label='Cài đặt']"); await pg.locator("#set-title").wait_for()
        await pg.locator("input[name=mode]").nth(0).check(); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SCREENS / "5_settings.png")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
        await pg.click("button[title='Moderate']"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SCREENS / "2_simulator.png")
        await pg.click("button.nav-tab:has-text('Audiogram')"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=SCREENS / "3_audiogram.png")
        await pg.click("button.nav-tab:has-text('Chat')"); await pg.click("button.pill:has-text('Phân tích biểu đồ')")
        await pg.wait_for_function("document.querySelectorAll('.msg-bot:not(.typing)').length > 1")
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=SCREENS / "4_chat.png")
        await b.close()


def font(sz, bold=False):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",):
        if pathlib.Path(f).exists():
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


def compose():
    items = [("1_onboarding.png", "1. Hướng dẫn an toàn", "Lần đầu mở app: mô phỏng giáo dục,\nhạ âm lượng, dữ liệu ở trong máy."),
             ("2_simulator.png", "2. Simulator", "Chữ rụng theo tần số, nhiễu nền,\nthanh trượt 4 mức nghe kém."),
             ("3_audiogram.png", "3. Audiogram", "Kéo ngưỡng bằng ngón tay hoặc phím,\nicon âm thanh xám khi không nghe được."),
             ("4_chat.png", "4. Bác sĩ Thỏ", "Hỏi đáp dựa trên audiogram,\nchạy offline, luôn kèm miễn trừ."),
             ("5_settings.png", "5. Cài đặt", "Trong máy (mặc định) hoặc máy chủ;\nrung nhẹ; xem lại hướng dẫn.")]
    w, h, pad = 390, 844, 44
    W = len(items) * (w + pad) + pad
    H = h + 250
    sb = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(sb)
    d.text((pad, 22), "Dr. Bunny — storyboard app iOS / Android (Capacitor)", font=font(30, True), fill=SAGE)
    for i, (f, title, cap) in enumerate(items):
        x = pad + i * (w + pad)
        shot = Image.open(SCREENS / f).convert("RGB").resize((w, h), Image.LANCZOS)
        d.rounded_rectangle([x - 12, 76, x + w + 12, 76 + h + 24], radius=44, fill=(30, 36, 30))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, w, h], radius=34, fill=255)
        sb.paste(shot, (x, 88), mask)
        d.text((x, 88 + h + 22), title, font=font(20, True), fill=INK)
        d.multiline_text((x, 88 + h + 52), cap, font=font(14), fill=(80, 90, 78), spacing=4)
    sb.save(OUT / "storyboard.png")
    print("đã ghi", OUT / "storyboard.png", sb.size)


if __name__ == "__main__":
    SCREENS.mkdir(exist_ok=True)
    asyncio.run(shoot())
    compose()
