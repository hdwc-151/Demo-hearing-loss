"""E2E bổ sung cho đợt rà soát (AUDIT-xx): kiểm các hành vi MỚI trong trình duyệt thật (Chromium).
Chạy khi backend :8000 và frontend :5173 đang bật (giống e2e_browser.py). Trên bản gốc các mục H1–H8
đều ĐỎ; trên bản đã vá đều XANH. H9 chỉ cần Chromium (mở index.html bằng file://)."""
import asyncio
import json
import os
import pathlib
import re
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:5173")
# đếm số lần đặt "dốc biên độ" (linearRamp) -> phát hiện tiếng bíp có bao hình (AUDIT-10)
INIT = """
try { localStorage.setItem("drbunny.settings", JSON.stringify({ onboarded: true })); } catch (e) {}
window.__ramps = 0;
const R = AudioParam.prototype.linearRampToValueAtTime;
AudioParam.prototype.linearRampToValueAtTime = function(...a){ window.__ramps++; return R.apply(this, a); };
"""
PLAY = "button[aria-label='Phát mô phỏng']"
TAB = {"sim": "button.nav-tab:has-text('Simulator')",
       "chat": "button.nav-tab:has-text('Chat')",
       "ag": "button.nav-tab:has-text('Audiogram')"}
ANALYZE = "button.pill:has-text('Phân tích biểu đồ')"
COUNTER = "span[aria-live='polite']"
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("PASS" if ok else "FAIL", name, detail)


async def open_page(browser):
    ctx = await browser.new_context()
    await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL, wait_until="networkidle")
    await pg.wait_for_selector(PLAY)
    return ctx, pg, errs


async def ask(pg, handler):
    """Chặn /api/graphrag bằng `handler`, bấm câu hỏi nhanh, trả về chữ của tin nhắn bot mới nhất."""
    await pg.route("**/api/graphrag", handler)
    n0 = await pg.locator(".msg-bot:not(.typing)").count()
    await pg.click(ANALYZE)
    await pg.wait_for_function("n => document.querySelectorAll('.msg-bot:not(.typing)').length > n", arg=n0, timeout=15000)
    txt = (await pg.locator(".msg-bot:not(.typing)").last.inner_text()).strip()
    await pg.unroute("**/api/graphrag")
    return txt


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)

        # H1 (AUDIT-06): kéo audiogram -> Simulator phải đổi theo (trước đây bị bỏ qua)
        ctx, pg, errs = await open_page(b)
        await pg.click(TAB["ag"]); await pg.wait_for_timeout(300)
        for i in range(6):
            await pg.locator("g.ag-node").nth(i).focus()
            for _ in range(3):
                await pg.keyboard.press("PageDown")        # +20 dB mỗi lần -> ~[70,70,70,75,75,75]
        label = await pg.locator("b:has-text('Mức:')").first.inner_text()
        check("H1a Audiogram báo mức gần nhất sau khi kéo", "gần nhất: Severe" in label, label[:50])
        # H3 (AUDIT-15): legend không còn ghi ngược quy ước ○/✕
        ag_text = await pg.locator("section").inner_text()
        check("H3 legend audiogram: không còn '✕ Phải', có ghi chú 1 đường cong", "✕ Phải" not in ag_text and "chưa tách tai trái/phải" in ag_text)
        # H8 (AUDIT-10): bấm 1 âm thanh nghe được -> có bao hình biên độ
        await pg.locator("g.ag-node").first.blur()
        r0 = await pg.evaluate("window.__ramps")
        items = pg.locator(".sound-item:not(.inaudible)")
        n_items = await items.count()
        if n_items:
            await items.first.click(); await pg.wait_for_timeout(120)
        r1 = await pg.evaluate("window.__ramps")
        check("H8 tiếng bíp có bao hình lên/xuống (không tách)", n_items > 0 and r1 - r0 >= 2, f"ramps {r0}->{r1}, item nghe được={n_items}")
        await pg.click(TAB["sim"]); await pg.wait_for_timeout(300)
        counter = await pg.locator(COUNTER).first.inner_text()
        check("H1b Simulator mô phỏng theo audiogram đã kéo (không còn 'Nghe đủ chữ')", counter.startswith("Mất"), counter)
        check("H1c Simulator nói rõ đang dùng mức gần nhất", await pg.locator("text=Bạn đã tự kéo audiogram").count() == 1)
        # H6 (AUDIT-14): lời mô tả nút phát không còn nói sai "giọng qua bộ lọc DSP"
        helper = await pg.locator("p:has-text('Bấm ▶')").inner_text()
        check("H6 mô tả trung thực: giọng đọc không đi qua bộ lọc", "qua bộ lọc DSP" not in helper and "không cho lọc giọng đọc" in helper, helper[:60])
        await ctx.close()

        # H4 (AUDIT-01): tiếng Anh Severe — bố cục không xê dịch, bộ đếm = số chữ cái bị ẩn thật
        ctx, pg, errs4 = await open_page(b)
        await pg.click("button[aria-label='Đổi ngôn ngữ']")
        original = await pg.locator(".viz-box").evaluate("e => e.textContent")
        await pg.click("button[title='Severe']"); await pg.wait_for_timeout(200)
        severe = await pg.locator(".viz-box").evaluate("e => e.textContent")
        check("H4a EN Severe: ghép các ô lại vẫn ra đúng văn bản gốc", severe == original)
        m = re.match(r"Mất (\d+)/(\d+) chữ cái", await pg.locator(COUNTER).first.inner_text())
        hidden = await pg.evaluate("() => (Array.from(document.querySelectorAll('.ch-hide')).map(e => e.textContent).join('').match(/\\p{L}/gu) || []).length")
        check("H4b EN: bộ đếm = số chữ cái thực sự bị ẩn", bool(m) and int(m.group(1)) == hidden, f"UI={m.group(1) if m else None} thực={hidden}")
        # H5 (AUDIT-16): Ctrl+2 không được cướp phím của trình duyệt
        await pg.click("button[title='Normal']")
        await pg.keyboard.press("Control+2"); await pg.wait_for_timeout(200)
        check("H5a Ctrl+2 không đổi tab", await pg.locator("#chat-title").count() == 0)
        await pg.keyboard.press("2"); await pg.wait_for_timeout(300)
        check("H5b phím 2 (không modifier) vẫn chuyển sang Chat", await pg.locator("#chat-title").count() == 1)
        await ctx.close()

        # H2/H7 (AUDIT-09, 07, 18): lịch sử chat, phân loại lỗi, giữ xuống dòng
        ctx, pg, errs7 = await open_page(b)
        await pg.click(TAB["chat"]); await pg.wait_for_timeout(200)
        t422 = await ask(pg, lambda r: r.fulfill(status=422, content_type="application/json", body='{"detail":"x"}'))
        check("H7a HTTP 422 -> tự trả lời từ tri thức trong máy", "trong máy" in t422 and "từ chối" not in t422, t422[:70])
        t503 = await ask(pg, lambda r: r.fulfill(status=503, content_type="application/json", body="{}"))
        check("H7b HTTP 503 -> trả lời dự phòng trong máy", "trong máy" in t503, t503[:70])
        toff = await ask(pg, lambda r: r.abort())
        check("H7c mất mạng -> trả lời bằng bộ tri thức trong máy", "trong máy" in toff, toff[:70])
        # Regression for the exact user-reported 4xx error on a care-seeking question.
        await pg.route("**/api/graphrag", lambda r: r.fulfill(status=422, content_type="application/json", body='{"detail":"x"}'))
        n_before_care = await pg.locator(".msg-bot:not(.typing)").count()
        await pg.get_by_role("textbox", name="Câu hỏi").fill("Tôi có nên đi khám bác sĩ không?")
        await pg.get_by_role("button", name="Gửi").click()
        await pg.wait_for_function(
            "n => document.querySelectorAll('.msg-bot:not(.typing)').length > n",
            arg=n_before_care, timeout=15000)
        care_text = await pg.locator(".msg-bot:not(.typing)").last.inner_text()
        check("H7e hỏi có nên khám, có dẫn nguồn hoặc fallback hữu ích",
              ("trong máy" in care_text or "Nguồn tham khảo" in care_text) and ("khám" in care_text.lower()) and "từ chối dữ liệu" not in care_text,
              care_text[:90])
        await pg.unroute("**/api/graphrag")
        tml = await ask(pg, lambda r: r.fulfill(status=200, content_type="application/json",
                        body=json.dumps({"answer": "dòng 1\ndòng 2", "mode": "hardcoded", "nodes": []})))
        ws = await pg.locator(".msg-bot:not(.typing)").last.evaluate("e => getComputedStyle(e).whiteSpace")
        check("H7d tin nhắn nhiều dòng giữ xuống dòng (pre-wrap)", ws == "pre-wrap" and "\n" in tml, f"white-space={ws}")
        n_before = await pg.locator(".msg:not(.typing)").count()
        await pg.click(TAB["sim"]); await pg.wait_for_timeout(200)
        await pg.click(TAB["chat"]); await pg.wait_for_timeout(300)
        n_after = await pg.locator(".msg:not(.typing)").count()
        check("H2 hội thoại còn nguyên sau khi đổi tab", n_after == n_before and n_after >= 9, f"{n_before}->{n_after}")
        check("H0 không lỗi JS", not (errs + errs4 + errs7), str((errs + errs4 + errs7)[:2]))
        await ctx.close()

        # H9 (AUDIT-24): prototype index.html — chuỗi người dùng gõ phải được escape (trước đây chạy được script)
        legacy = pathlib.Path(__file__).resolve().parents[1] / "legacy" / "index.html"
        if legacy.exists():
            lp = await b.new_page()
            await lp.goto(legacy.as_uri())
            await lp.click("#nav-chat")
            await lp.fill("#chatInput", '<img src=x onerror="window.__xss=(window.__xss||0)+1">')
            await lp.click(".send-btn"); await lp.wait_for_timeout(300)
            ran = await lp.evaluate("window.__xss || 0")
            check("H9 prototype index.html: không chạy script do người dùng gõ (DOM-XSS)", ran == 0, f"script chạy {ran} lần")
            await lp.close()
        await b.close()

    ok = sum(results)
    print(f"\n{ok}/{len(results)} checks passed")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
