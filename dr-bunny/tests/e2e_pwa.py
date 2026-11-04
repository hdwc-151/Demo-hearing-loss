"""E2E PWA: bản build thường (vite preview) phải cài được service worker và MỞ ĐƯỢC KHI MẤT MẠNG, với đủ chức năng nhờ
bộ máy chạy trong máy. Dùng: (cd frontend && npm run build && npx vite preview --port 4173) rồi python tests/e2e_pwa.py"""
import asyncio
import json
import os
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:4173")
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("PASS" if ok else "FAIL", name, detail)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)
        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        await ctx.add_init_script('try { localStorage.setItem("drbunny.settings", JSON.stringify({ onboarded: true })); } catch (e) {}')
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until="networkidle")
        await pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
        await pg.reload(wait_until="networkidle")           # lần tải thứ hai: trang đã được service worker kiểm soát
        check("P1 service worker đã kích hoạt và kiểm soát trang", await pg.evaluate("!!navigator.serviceWorker.controller"))
        man = await pg.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r => r.json())")
        check("P2 manifest hợp lệ (standalone, biểu tượng 192/512/maskable)", man["display"] == "standalone" and len(man["icons"]) == 3, json.dumps(man["icons"][0]))
        await ctx.set_offline(True)
        await pg.reload(wait_until="domcontentloaded")
        await pg.wait_for_selector("button[aria-label='Phát mô phỏng']", timeout=8000)
        check("P3 mất mạng vẫn mở được ứng dụng từ bộ nhớ đệm", True)
        await pg.click("button[title='Moderate']")
        check("P4 offline: Simulator vẫn làm rụng chữ", (await pg.locator("span[aria-live='polite']").first.inner_text()).startswith("Mất"))
        await pg.click("button.nav-tab:has-text('Chat')"); await pg.click("button.pill:has-text('Phân tích biểu đồ')")
        await pg.wait_for_function("document.querySelectorAll('.msg-bot:not(.typing)').length > 1", timeout=8000)
        last = await pg.locator(".msg-bot:not(.typing)").last.inner_text()
        check("P5 offline: Bác sĩ Thỏ vẫn trả lời (bộ tri thức trong máy)", "mô phỏng & sàng lọc" in last, last[:50])
        await ctx.close(); await b.close()
    ok = sum(results)
    print(f"\n{ok}/{len(results)} checks passed")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
