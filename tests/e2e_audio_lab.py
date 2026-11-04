"""Smoke test for offline Audio Lab A/B listening and file validation (Playwright)."""
import asyncio
import io
import math
import os
import struct
import wave
from playwright.async_api import async_playwright

URL = os.getenv("APP_URL", "http://localhost:5173")

def wav_sample():
    data = io.BytesIO()
    with wave.open(data, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(16000)
        out.writeframes(b"".join(
            struct.pack("<h", round(4000 * math.sin(2 * math.pi * 500 * i / 16000)))
            for i in range(16000)
        ))
    return data.getvalue()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.getenv("CHROME_PATH") or None)
        context = await browser.new_context()
        await context.add_init_script("""
        localStorage.setItem('drbunny.settings', JSON.stringify({onboarded:true, apiBase:'offline'}));
        window.__audioStarts = 0;
        const original = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function(...args) {
          window.__audioStarts++; return original.apply(this,args);
        };
        """)
        page = await context.new_page()
        errors, requests = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda req: requests.append(req.url) if "/api/" in req.url else None)
        await page.goto(URL, wait_until="networkidle")
        await page.locator("button.nav-tab[aria-label='Audio Lab']").click()
        await page.get_by_role("heading", name="Audio Lab").wait_for()
        await page.get_by_role("button", name="Phát âm thanh gốc").click()
        await page.get_by_text("Đang phát: tín hiệu gốc").wait_for()
        await page.get_by_role("button", name="Dừng Audio Lab").click()
        assert await page.evaluate("window.__audioStarts") == 1
        await page.get_by_role("button", name="Phát mô phỏng theo audiogram").click()
        await page.get_by_text("Đang phát: mô phỏng suy giảm theo audiogram").wait_for()
        await page.get_by_role("region", name="Đặc trưng tín hiệu").wait_for()
        await page.get_by_role("button", name="Dừng Audio Lab").click()
        assert await page.evaluate("window.__audioStarts") == 2
        await page.locator("#lab-file").set_input_files({
            "name": "voice.wav", "mimeType": "audio/wav", "buffer": wav_sample()
        })
        await page.get_by_text("Nguồn: voice.wav").wait_for()
        await page.get_by_role("button", name="Phát mô phỏng theo audiogram").click()
        await page.get_by_text("Đang phát: mô phỏng suy giảm theo audiogram").wait_for()
        await page.get_by_role("button", name="Dừng Audio Lab").click()
        assert await page.evaluate("window.__audioStarts") == 3
        await page.locator("#lab-file").set_input_files({
            "name": "too-large.wav", "mimeType": "audio/wav",
            "buffer": b"0" * (12 * 1024 * 1024 + 1)
        })
        await page.get_by_role("alert").wait_for()
        assert not requests, requests
        assert not errors, errors
        await page.locator("button.nav-tab[aria-label='Audiogram']").click()
        await page.get_by_role("slider", name="Ngưỡng tại 4000 Hz").focus()
        await page.keyboard.press("ArrowDown")
        await page.locator("button.nav-tab[aria-label='Audio Lab']").click()
        await page.get_by_role("heading", name="Audio Lab").wait_for()
        await page.get_by_role("combobox", name="Kiểu mô phỏng thính giác").select_option("erb")
        await page.get_by_role("button", name="Phát mô phỏng theo audiogram").click()
        await page.get_by_role("region", name="Đặc trưng tín hiệu").wait_for()
        await page.get_by_role("button", name="Dừng Audio Lab").click()
        assert await page.evaluate("window.__audioStarts") == 4
        assert not errors, errors
        await context.close()
        await browser.close()
        print("Audio Lab E2E: 8 smoke checks passed")

asyncio.run(main())
