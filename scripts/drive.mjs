// Dev-only screenshot driver (not shipped). Drives the real UI via system Chrome.
//   node scripts/drive.mjs   (dev server must be running on :5173)
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173/';
const OUT = '/tmp';

const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// --- 1) curated demo team (deterministic) ---
await page.goto(BASE + '?demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/demo-team.png` });

// --- 2) hover a team card to reveal its ability tooltip ---
const slot0 = await page.locator('[data-slot="0"]').boundingBox();
const c0 = center(slot0);
await page.mouse.move(c0.x, c0.y);
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/tooltip.png` });

// --- 3) fresh run: drag a shop monster toward an empty slot (mid-drag frame) ---
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const cardBox = await page.getByTestId('shop-monster-0').boundingBox();
const slotBox = await page.locator('[data-slot="2"]').boundingBox();
const from = center(cardBox);
const to = center(slotBox);

await page.mouse.move(from.x, from.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) {
  await page.mouse.move(from.x + (to.x - from.x) * (i / 10), from.y + (to.y - from.y) * (i / 10));
  await page.waitForTimeout(18);
}
await page.waitForTimeout(160);
await page.screenshot({ path: `${OUT}/drag.png` }); // tilted overlay + slot highlight
await page.mouse.up();
await page.waitForTimeout(550);
await page.screenshot({ path: `${OUT}/after-buy.png` }); // card popped into slot

await browser.close();
console.log('shots written to', OUT);
