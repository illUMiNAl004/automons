// Dev-only: screenshot the LIVE deployed site to verify the real CDN build.
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.argv[2] || 'https://automonz.netlify.app';
const OUT = '/tmp';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`REQ FAIL ${r.url()} — ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/live-title.png` });

await page.goto(URL + '/?demo', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/live-shop.png` });

await browser.close();
console.log('errors/failed requests:', errors.length ? '\n - ' + errors.join('\n - ') : 'none');
console.log('shots: /tmp/live-title.png, /tmp/live-shop.png');
