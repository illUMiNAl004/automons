// Dev-only: drive a full battle and screenshot a few frames.
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173/?demo';
const OUT = '/tmp';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/battle-shop.png` });

await page.getByText('End turn', { exact: false }).click();

await page.waitForTimeout(1100);
await page.screenshot({ path: `${OUT}/battle-1.png` }); // intro / first clashes

await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/battle-2.png` }); // mid combat

// wait for the result banner (Continue button), then shoot it
try {
  await page.getByText('Continue', { exact: false }).waitFor({ timeout: 12000 });
} catch {}
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/battle-result.png` });

await browser.close();
console.log('battle shots written');
