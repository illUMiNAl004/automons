// Dev-only: capture the polished title + shop scenes.
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173/';
const OUT = '/tmp';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// title screen (fresh load)
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/p-title.png` });

// shop scene (demo team)
await page.goto(BASE + '?demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/p-shop.png` });

// mid-drag (fresh)
await page.goto(BASE + '?demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const card = await page.getByTestId('shop-monster-0').boundingBox();
const slot = await page.locator('[data-slot="2"]').boundingBox();
if (card && slot) {
  const from = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
  const to = { x: slot.x + slot.width / 2, y: slot.y + slot.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + (to.x - from.x) * (i / 10), from.y + (to.y - from.y) * (i / 10)), await page.waitForTimeout(16);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/p-drag.png` });
  await page.mouse.up();
}

await browser.close();
console.log('polish shots written');
