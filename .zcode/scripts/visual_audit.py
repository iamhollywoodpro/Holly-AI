import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_visual_audit():
    print("📸 [ZCode Guard] Initiating headless browser runtime for UI visual audit...")
    target_url = os.getenv("LOCAL_DEV_URL", "http://localhost:3000")
    screenshot_dir = ".zcode/telemetry/screenshots"
    os.makedirs(screenshot_dir, exist_ok=True)
    screenshot_path = f"{screenshot_dir}/latest_layout_state.png"

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 1440, "height": 900})
            print(f"📡 Navigating tracking layer to target context: {target_url}")
            await page.goto(target_url, timeout=10000, wait_until="networkidle")
            await asyncio.sleep(2)
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"✅ Visual matrix captured successfully at: {screenshot_path}")
            await browser.close()
            print("🤖 [Signal] Invoking @VisionParser pipeline for automated layout verification...")
        except Exception as e:
            print(f"❌ Playwright execution exception: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_visual_audit())
