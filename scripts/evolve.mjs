// Dev-only: capture title (with gem), shop (pips/evolved), and a combine→evolve burst.
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173/';
const OUT = '/tmp';
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// title (gem + wordmark)
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/e-title.png` });

// shop (evolution pips + evolved crown)
await page.goto(BASE + '?demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/e-shop.png` });

// drag the duplicate cinderpup (slot 4) onto the 2/3 cinderpup (slot 0) → EVOLVE
const dup = await page.locator('[data-slot="4"]').boundingBox();
const tgt = await page.locator('[data-slot="0"]').boundingBox();
if (dup && tgt) {
  const from = center(dup);
  const to = center(tgt);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * (i / 12), from.y + (to.y - from.y) * (i / 12));
    await page.waitForTimeout(14);
  }
  await page.mouse.up();
  await page.waitForTimeout(180); // catch the evolve burst
  await page.screenshot({ path: `${OUT}/e-evolve.png` });
  await page.waitForTimeout(600); // settled — now Infernhound art swapped in
  await page.screenshot({ path: `${OUT}/e-evolved.png` });
}

await browser.close();
console.log('evolve shots written');
