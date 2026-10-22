"""E2E trình duyệt (Chromium headless) cho Simulator, Audiogram, Chat.
Chạy khi backend :8000 và frontend :5173 đang bật. Xem README mục Kiểm thử."""
import asyncio
import os
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:5173")
INIT = """
window.__starts=0; window.__stops=0; window.__ctx=0;
const S = AudioBufferSourceNode.prototype.start, P = AudioBufferSourceNode.prototype.stop;
AudioBufferSourceNode.prototype.start = function(...a){ window.__starts++; return S.apply(this,a); };
AudioBufferSourceNode.prototype.stop  = function(...a){ window.__stops++;  return P.apply(this,a); };
const OrigAC = window.AudioContext || window.webkitAudioContext;
const Wrapped = function(...a){ window.__ctx++; return new OrigAC(...a); };
Wrapped.prototype = OrigAC.prototype;
window.AudioContext = Wrapped; window.webkitAudioContext = Wrapped;
"""
PLAY = "button[aria-label='Phát mô phỏng']"
PAUSE = "button[aria-label='Dừng']"
TAB = {"sim": "button.nav-tab:has-text('Simulator')",
       "chat": "button.nav-tab:has-text('Chat')",
       "ag": "button.nav-tab:has-text('Audiogram')"}
ANALYZE = "button.pill:has-text('Phân tích biểu đồ')"
results = []

def check(name, ok, detail=""):
    results.append(bool(ok))
    print("PASS" if ok else "FAIL", name, detail)

async def cnt(pg):
    return await pg.evaluate("({s: window.__starts, t: window.__stops, c: window.__ctx})")

async def count(pg, sel):
    return await pg.locator(sel).count()

async def open_page(browser, slow_ms=0):
    ctx = await browser.new_context()
    await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    errs, reqs, hits = [], [], []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("request", lambda r: reqs.append(r.url) if "/api/noise" in r.url else None)
    if slow_ms:
        async def slow(route):
            hits.append(1)
            await asyncio.sleep(slow_ms / 1000)
            await route.continue_()
        await pg.route("**/api/noise**", slow)
    await pg.goto(URL, wait_until="networkidle")
    await pg.wait_for_selector(PLAY)
    return ctx, pg, errs, reqs, hits

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)

        # A. cache buffer + start/stop
        ctx, pg, errs, reqs, _ = await open_page(b)
        await pg.click(PLAY); await pg.wait_for_selector(PAUSE, timeout=10000)
        await pg.click(PAUSE); await pg.wait_for_selector(PLAY)
        await pg.click(PLAY); await pg.wait_for_selector(PAUSE, timeout=10000)
        c = await cnt(pg)
        check("A1 /api/noise chỉ gọi 1 lần cho 2 lần phát (buffer cache)", len(reqs) == 1, f"requests={len(reqs)}")
        check("A2 mỗi lần phát tạo đúng 1 nguồn", c["s"] == 2, str(c))
        check("A3 dừng có gọi src.stop", c["t"] >= 1, str(c))
        await pg.click(PAUSE); await pg.wait_for_selector(PLAY)

        # B. đổi mức khi đang phát: chỉ đổi bộ lọc, không tạo nguồn mới
        await pg.click(PLAY); await pg.wait_for_selector(PAUSE, timeout=10000)
        s0 = (await cnt(pg))["s"]
        await pg.click("button[title='Severe']"); await pg.wait_for_timeout(300)
        s1 = (await cnt(pg))["s"]
        check("B đổi mức khi phát: không tạo nguồn mới", s0 == s1, f"{s0}->{s1}")

        # C. đổi kịch bản khi đang phát: restart đúng +1 nguồn, vẫn đang phát
        await pg.select_option("select[aria-label='Kịch bản']", "crowd")
        await pg.wait_for_timeout(700)
        s2 = (await cnt(pg))["s"]
        playing = (await count(pg, PAUSE)) == 1
        check("C đổi kịch bản khi phát: restart +1 nguồn, vẫn phát", s2 == s1 + 1 and playing, f"{s1}->{s2} playing={playing}")

        # D. rời tab khi đang phát: phải dừng nguồn; quay lại không được tự phát
        t0 = (await cnt(pg))["t"]
        await pg.click(TAB["chat"]); await pg.wait_for_timeout(200)
        await pg.click(TAB["sim"]); await pg.wait_for_timeout(400)
        t1 = (await cnt(pg))["t"]
        check("D rời tab khi đang phát: dừng nguồn", t1 > t0, f"stops {t0}->{t1}")
        check("D quay lại: hiện ▶, không tự phát", (await count(pg, PLAY)) == 1)

        # E. một AudioContext dùng chung cho Simulator + tone Audiogram
        await pg.click(TAB["ag"]); await pg.wait_for_timeout(300)
        items = pg.locator(".sound-item:not(.inaudible)")
        n_items = await items.count()
        for i in range(min(3, n_items)):
            await items.nth(i).click(); await pg.wait_for_timeout(150)
        await pg.click(TAB["sim"]); await pg.wait_for_timeout(300)
        await pg.click(PLAY); await pg.wait_for_selector(PAUSE, timeout=10000)
        ce = await cnt(pg)
        check("E một AudioContext duy nhất (có bấm tone)", n_items > 0 and ce["c"] == 1,
              f"AudioContext={ce['c']} tone_clicks={min(3, n_items)}")
        await pg.click(PAUSE); await pg.wait_for_selector(PLAY)
        check("E0 không lỗi JS (phiên chính)", not errs, str(errs[:2]))
        await ctx.close()

        # F. RACE: rời tab khi nhiễu đang tải -> không được phát sau khi tải xong
        ctx2, pg2, errs2, _, hits2 = await open_page(b, slow_ms=900)
        await pg2.click(PLAY); await pg2.wait_for_timeout(150)
        await pg2.click(TAB["chat"])
        await pg2.wait_for_timeout(1800)
        cf = await cnt(pg2)
        check("F0 route chậm đã chạy (fetch thật đang treo)", len(hits2) >= 1, f"hits={len(hits2)}")
        check("F1 RACE: rời tab lúc đang tải -> không phát sau đó", cf["s"] == 0, f"starts={cf['s']}")
        await pg2.click(TAB["sim"]); await pg2.wait_for_timeout(300)
        await pg2.click(PLAY); await pg2.wait_for_selector(PAUSE, timeout=10000)
        cf2 = await cnt(pg2)
        check("F2 phát lại bình thường sau race (đúng 1 nguồn)", cf2["s"] == 1, str(cf2))
        check("F3 không lỗi JS (race)", not errs2, str(errs2[:2]))
        await ctx2.close()

        # G. chat: gọi backend thật, UI hiển thị đúng nội dung backend trả về
        ctx3, pg3, errs3, _, _ = await open_page(b)
        await pg3.click(TAB["chat"]); await pg3.wait_for_timeout(200)
        n0 = await pg3.locator(".msg-bot:not(.typing)").count()
        async with pg3.expect_response(lambda r: "/api/graphrag" in r.url, timeout=25000) as info:
            await pg3.click(ANALYZE)
        resp = await info.value
        body = await resp.json()
        check("G1 /graphrag HTTP 200 có answer", resp.status == 200 and bool(body.get("answer")), f"status={resp.status}")
        await pg3.wait_for_function("n => document.querySelectorAll('.msg-bot:not(.typing)').length > n",
                                    arg=n0, timeout=25000)
        last = (await pg3.locator(".msg-bot:not(.typing)").last.inner_text()).strip()
        first = body["answer"].split("\n")[0][:25]
        check("G2 UI hiển thị đúng nội dung backend", first in last, repr(first))
        check("G0 không lỗi JS (chat)", not errs3, str(errs3[:2]))
        await ctx3.close()
        await b.close()

    ok = sum(results)
    print(f"\n{ok}/{len(results)} checks passed")
    raise SystemExit(0 if ok == len(results) else 1)

asyncio.run(main())
