"""Chụp ảnh cửa hàng đúng kích cỡ yêu cầu từ ứng dụng THẬT: iPhone 6.7" (1290×2796) và Android phone (1080×2400).
Cần backend :8000 + frontend :5173 đang chạy (hoặc APP_URL). Chạy: python mobile/store/make_screenshots.py"""
import asyncio
import os
import pathlib
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:5173")
OUT = pathlib.Path(__file__).resolve().parent / "screenshots"
TARGETS = {"ios-6.7": {"width": 430, "height": 932}, "android-phone": {"width": 360, "height": 800}}   # x3 = 1290×2796 và 1080×2400


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)
        for name, vp in TARGETS.items():
            d = OUT / name; d.mkdir(parents=True, exist_ok=True)
            ctx = await b.new_context(viewport=vp, device_scale_factor=3, is_mobile=True, has_touch=True)
            pg = await ctx.new_page()
            await pg.goto(URL, wait_until="networkidle")
            await pg.locator("[role=dialog]").wait_for()
            await pg.click("button:has-text('Tôi hiểu')")
            await pg.click("button[aria-label='Cài đặt']"); await pg.locator("#set-title").wait_for()
            await pg.locator("input[name=mode]").nth(0).check(); await pg.wait_for_timeout(300)
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
            await pg.click("button[title='Moderate']"); await pg.wait_for_timeout(400)
            await pg.screenshot(path=d / "1_simulator.png")
            await pg.click("button.nav-tab:has-text('Audiogram')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=d / "2_audiogram.png")
            await pg.click("button.nav-tab:has-text('Chat')"); await pg.click("button.pill:has-text('Phân tích biểu đồ')")
            await pg.wait_for_function("document.querySelectorAll('.msg-bot:not(.typing)').length > 1"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=d / "3_chat.png")
            await pg.click("button[aria-label='Cài đặt']"); await pg.locator("#set-title").wait_for(); await pg.wait_for_timeout(300)
            await pg.screenshot(path=d / "4_settings.png")
            await ctx.close()
        await b.close()
    print("đã ghi", sorted(str(p.relative_to(OUT)) for p in OUT.rglob("*.png")))


asyncio.run(main())
