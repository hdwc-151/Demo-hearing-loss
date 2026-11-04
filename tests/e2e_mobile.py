"""E2E cho trải nghiệm di động (viewport iPhone 14, cảm ứng) trong Chromium thật: hướng dẫn an toàn lần đầu, màn Cài đặt,
chế độ chạy trong máy (không gọi mạng), rung nhẹ. Cần backend :8000 và frontend :5173 đang chạy (như e2e_browser.py)."""
import asyncio
import os
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:5173")
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
INIT = """
window.__starts = 0; window.__vib = 0;
const S = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function(...a){ window.__starts++; return S.apply(this, a); };
navigator.vibrate = function(){ window.__vib++; return true; };
"""
PLAY = "button[aria-label='Phát mô phỏng']"
TAB = {"sim": "button.nav-tab:has-text('Simulator')", "chat": "button.nav-tab:has-text('Chat')", "ag": "button.nav-tab:has-text('Audiogram')"}
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("PASS" if ok else "FAIL", name, detail)


async def new_page(browser, fresh=True):
    ctx = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)
    await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL, wait_until="networkidle")
    return ctx, pg, errs


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)
        ctx, pg, errs = await new_page(b)

        # M1/M2: hướng dẫn an toàn lần đầu, chặn thao tác phía sau, lưu lại sau khi chấp nhận
        dlg = pg.locator("[role=dialog]")
        await dlg.wait_for(timeout=8000)
        txt = await dlg.inner_text()
        check("M1 lần đầu hiện hướng dẫn an toàn (giáo dục thính giác, hạ âm lượng, dữ liệu trong máy)", all(k in txt for k in ("nền tảng giáo dục và nghiên cứu", "Hạ âm lượng", "trong máy")))
        await pg.click("button:has-text('Tôi hiểu')")
        await dlg.wait_for(state="detached", timeout=3000)
        await pg.reload(wait_until="networkidle"); await pg.wait_for_timeout(500)
        check("M2 sau khi chấp nhận, mở lại không hiện nữa (đã lưu)", await pg.locator("[role=dialog]").count() == 0)

        # M3: màn Cài đặt, chuyển sang chế độ trong máy
        await pg.click("button[aria-label='Cài đặt']")
        await pg.locator("#set-title").wait_for()
        check("M3a Cài đặt mở được; web dev mặc định dùng máy chủ", await pg.locator("input[name=mode]").nth(1).is_checked())
        probe_btn = pg.locator("button:has-text('Kiểm tra kết nối')")
        await pg.fill("input[aria-label='Địa chỉ máy chủ']", "/api")
        await probe_btn.click()
        await pg.locator("[role=status]").wait_for(timeout=8000)
        check("M3b Kiểm tra kết nối tới backend thật báo thành công", "Kết nối được" in await pg.locator("[role=status]").inner_text())
        reqs = []
        pg.on("request", lambda r: reqs.append(r.url) if "/api/" in r.url else None)
        await pg.locator("input[name=mode]").nth(0).check()
        await pg.wait_for_timeout(400)
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
        pill = await pg.locator(".status-dot").inner_text()
        check("M3c Chuyển sang chế độ trong máy: huy hiệu báo local", pill.strip().lower() == "local", pill)

        # M4: chế độ trong máy KHÔNG chạm mạng; chat vẫn trả lời (bộ GraphRAG trong máy) kèm câu miễn trừ
        reqs.clear()
        await pg.click(TAB["chat"]); await pg.wait_for_timeout(200)
        await pg.click("button.pill:has-text('Phân tích biểu đồ')")
        await pg.wait_for_function("document.querySelectorAll('.msg-bot:not(.typing)').length > 1", timeout=8000)
        last = (await pg.locator(".msg-bot:not(.typing)").last.inner_text())
        check("M4a chat trả lời ngay trong máy, có câu miễn trừ", "mô phỏng & sàng lọc" in last and len(last) > 80, last[:60])
        # M5: phát mô phỏng không tải nhiễu từ backend
        await pg.click(TAB["sim"]); await pg.wait_for_timeout(200)
        await pg.click(PLAY); await pg.wait_for_function("window.__starts >= 1", timeout=8000)
        check("M5 phát mô phỏng bằng nhiễu sinh trong máy (có nguồn âm thanh)", await pg.evaluate("window.__starts") >= 1)
        await pg.click("button[aria-label='Dừng']") if await pg.locator("button[aria-label='Dừng']").count() else None
        check("M4b/M5b chế độ trong máy không gọi /api lần nào", len(reqs) == 0, f"{len(reqs)} request: {reqs[:2]}")

        # M6: lưu bền qua tải lại
        await pg.reload(wait_until="networkidle"); await pg.wait_for_timeout(700)
        check("M6 chế độ trong máy được giữ sau khi tải lại", (await pg.locator(".status-dot").inner_text()).strip().lower() == "local")

        # M7: rung nhẹ khi dùng bàn phím trên audiogram (Vibration API trên web, Haptics trên app)
        await pg.click(TAB["ag"]); await pg.wait_for_timeout(300)
        await pg.locator("g.ag-node").first.focus()
        v0 = await pg.evaluate("window.__vib")
        await pg.keyboard.press("ArrowDown"); await pg.keyboard.press("ArrowDown")
        check("M7 mỗi bước ngưỡng có rung nhẹ", await pg.evaluate("window.__vib") - v0 >= 2)
        # M8: bố cục điện thoại không tràn ngang
        over = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("M8 không tràn ngang ở 390 px", over <= 0, f"dư {over}px")
        # M9: app xuống nền / tab bị ẩn -> dừng phát (không để âm thanh chạy ngoài tầm mắt người dùng)
        await pg.click(TAB["sim"]); await pg.wait_for_timeout(200)
        await pg.click(PLAY); await pg.wait_for_selector("button[aria-label='Dừng']", timeout=8000)
        await pg.evaluate("Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))")
        await pg.wait_for_selector(PLAY, timeout=4000)
        check("M9 ẩn app thì dừng phát nhiễu và giọng đọc", await pg.locator(PLAY).count() == 1)
        check("M0 không lỗi JS", not errs, str(errs[:2]))
        await ctx.close(); await b.close()

    ok = sum(results)
    print(f"\n{ok}/{len(results)} checks passed")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
