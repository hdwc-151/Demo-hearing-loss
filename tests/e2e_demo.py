"""E2E cho bản DEMO MỘT FILE (demo/index.html) mở bằng file:// trong Chromium thật: không cần máy chủ, không gọi mạng.
Dùng: python tests/e2e_demo.py [đường-dẫn-tới-index.html]"""
import asyncio
import os
import pathlib
import sys
from playwright.async_api import async_playwright

PATH = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[1] / "demo" / "index.html"
INIT = """
window.__starts = 0;
const S = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function(...a){ window.__starts++; return S.apply(this, a); };
"""
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("PASS" if ok else "FAIL", name, detail)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        await ctx.add_init_script(INIT)
        pg = await ctx.new_page()
        errs, external = [], []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("request", lambda r: external.append(r.url) if r.url.startswith(("http://", "https://", "ws://", "wss://")) else None)
        await pg.goto(PATH.resolve().as_uri(), wait_until="load")
        await pg.locator("[role=dialog]").wait_for(timeout=8000)
        check("D1 mở bằng file://, hiện hướng dẫn an toàn", "mô phỏng giáo dục" in await pg.locator("[role=dialog]").inner_text())
        await pg.click("button:has-text('Tôi hiểu')")
        check("D2 banner DEMO và huy hiệu local", "NGOẠI TUYẾN" in await pg.locator(".demo-banner").inner_text() and (await pg.locator(".status-dot").inner_text()).strip().lower() == "local")
        await pg.click("button[title='Moderate']"); await pg.wait_for_timeout(200)
        counter = await pg.locator("span[aria-live='polite']").first.inner_text()
        check("D3 Simulator làm rụng chữ theo mức", counter.startswith("Mất"), counter)
        await pg.click("button[aria-label='Phát mô phỏng']"); await pg.wait_for_function("window.__starts >= 1", timeout=8000)
        check("D4 phát được nhiễu sinh trong trình duyệt", await pg.evaluate("window.__starts") >= 1)
        await pg.click("button[aria-label='Dừng']")
        await pg.click("button.nav-tab:has-text('Chat')"); await pg.click("button.pill:has-text('Phân tích biểu đồ')")
        await pg.wait_for_function("document.querySelectorAll('.msg-bot:not(.typing)').length > 1", timeout=8000)
        check("D5 chat trả lời trong máy kèm câu miễn trừ", "mô phỏng & sàng lọc" in await pg.locator(".msg-bot:not(.typing)").last.inner_text())
        await pg.click("button.nav-tab:has-text('Audiogram')"); await pg.wait_for_timeout(300)
        for i in range(6):
            await pg.locator("g.ag-node").nth(i).focus()
            for _ in range(3): await pg.keyboard.press("PageDown")
        label = await pg.locator("b:has-text('Mức:')").first.inner_text()
        check("D6 kéo audiogram thì mức gần nhất đổi theo", "gần nhất: Severe" in label, label[:50])
        check("D7 không gọi mạng ra ngoài lần nào", not external, str(external[:3]))
        check("D8 không lỗi JavaScript", not errs, str(errs[:2]))
        await ctx.close(); await b.close()
    ok = sum(results)
    print(f"\n{ok}/{len(results)} checks passed")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
