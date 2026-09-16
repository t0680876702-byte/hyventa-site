/**
 * HYVENTA CONFIGURATOR — UI screenshots + Step 5 behaviour checks.
 * Renders desktop/mobile screenshots and asserts the 10 UX-refinement checks.
 * Dev harness only — not part of the product. Requires a static server:
 *   python3 -m http.server 8099   (from the hyventa-site root)
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://localhost:8099/configurator/configurator-demo.html';
const b = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox'] });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS', m); } else { fail++; console.log('  FAIL', m); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = (p, sel) => p.$eval(sel, (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)).catch(() => false);
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const submit = async (p) => { await p.click('.cfg-submit'); await wait(350); };

async function page(w, h) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  return p;
}

// ---- screenshots ----
async function shot(label, w, h, drive) {
  const p = await page(w, h);
  if (drive) await drive(p);
  await wait(300);
  await p.screenshot({ path: `/tmp/cfg5_${label}.png`, fullPage: true });
  await p.close();
}
await shot('desktop_empty', 1440, 900);
await shot('mobile_empty', 390, 844);
await shot('desktop_result', 1440, 900, async (p) => { await p.click('#i-sales'); await p.click('#c-webchat'); await submit(p); });
await shot('mobile_result', 390, 844, async (p) => { await p.click('#i-sales'); await p.click('#c-webchat'); await submit(p); });
await shot('desktop_custom', 1440, 900, async (p) => {
  await p.click('#i-sales'); await p.click('#c-webchat');
  await p.evaluate(() => { document.querySelector('details.cfg-disclose').open = true; });
  await p.type('#cfg-other-integration', 'our ERP'); await submit(p);
});

console.log('\n──── STEP 5 behaviour checks ────');

// 1. Step 2 friendly potential-employee hint
{
  const p = await page(1440, 900);
  await p.click('#i-sales'); await wait(150);
  const vis = await visible(p, '#cfg-match-hint');
  const txt = await p.$eval('#cfg-match-hint', (el) => el.textContent).catch(() => '');
  ok(vis && /sarah/i.test(txt), `1. Step 2 selected task shows friendly hint ("${txt.trim()}")`);
  await p.close();
}
// 2/3/4. Step 4 numeric visibility
{
  const p = await page(1440, 900);
  await p.click('#u-low'); await wait(100);
  ok(!(await visible(p, '#cfg-usage-number')), '2. Step 4 Low -> numeric input hidden');
  await p.click('#u-high'); await wait(100);
  ok(!(await visible(p, '#cfg-usage-number')), '3. Step 4 High -> numeric input hidden');
  await p.click('#u-exact'); await wait(100);
  ok(await visible(p, '#cfg-usage-number'), '4. Step 4 Exact -> numeric input visible');
  await p.close();
}
// 5. Step 5 collapsed / lighter by default
{
  const p = await page(1440, 900);
  const openCount = await p.$$eval('details.cfg-disclose', (ds) => ds.filter((d) => d.open).length);
  // A collapsed <details> keeps an intrinsic offsetHeight via content-visibility;
  // checkVisibility() is the reliable painted-visibility signal.
  const bodiesVisible = await p.$$eval('.cfg-disclose-body', (bs) => bs.filter((el) => el.checkVisibility && el.checkVisibility()).length);
  const summaries = await p.$$eval('details.cfg-disclose > summary', (ss) => ss.map((s) => s.textContent.trim()));
  ok(openCount === 0 && bodiesVisible === 0 && summaries.length === 2,
    `5. Step 5 collapsed default (open=${openCount}, bodiesPainted=${bodiesVisible}, groups=${JSON.stringify(summaries)})`);
  await p.close();
}
// 6. plain-language labels
{
  const p = await page(1440, 900);
  const lbl = (id) => p.$eval(`label[for="${id}"]`, (el) => el.textContent.trim());
  const webhook = await lbl('c-webhook');
  const internal = await lbl('c-internal');
  const api = await lbl('int-api');
  ok(webhook === 'Connect another system' && internal === 'For your team' && api === 'Connect another system',
    `6. Technical labels replaced (webhook="${webhook}", internal="${internal}", api="${api}")`);
  await p.close();
}
// 7. result portrait
{
  const p = await page(1440, 900);
  await p.click('#i-sales'); await p.click('#c-webchat'); await submit(p);
  const has = await p.$('.cfg-agent-portrait') != null;
  const loaded = await p.$eval('.cfg-agent-portrait', (el) => el.complete && el.naturalWidth > 0).catch(() => false);
  ok(has && loaded, `7. Result card shows existing employee portrait (present=${has}, loaded=${loaded})`);
  await p.close();
}
// 8. custom unchanged
{
  const p = await page(1440, 900);
  await p.click('#i-sales'); await p.click('#c-webchat');
  await p.evaluate(() => { document.querySelector('details.cfg-disclose').open = true; });
  await wait(80);
  await p.type('#cfg-other-integration', 'our ERP');
  await submit(p);
  const isCustom = await p.$('.cfg-custom') != null;
  const badge = await p.$eval('.cfg-custom .cfg-badge', (el) => el.textContent.trim()).catch(() => '');
  const noPortrait = await p.$('.cfg-custom .cfg-agent-portrait') == null;
  ok(isCustom && badge === 'Custom configuration' && noPortrait,
    `8. Custom result unchanged (badge="${badge}", noPortrait=${noPortrait})`);
  await p.close();
}
// 9. desktop overflow
{
  const p = await page(1440, 900);
  await p.click('#i-sales'); await p.click('#c-webchat'); await submit(p);
  ok((await overflow(p)) === 0, '9. Desktop 1440px has 0px horizontal overflow');
  await p.close();
}
// 10. mobile overflow
{
  const p = await page(390, 844);
  await p.click('#i-sales'); await p.click('#c-webchat'); await submit(p);
  ok((await overflow(p)) === 0, '10. Mobile 390px has 0px horizontal overflow');
  await p.close();
}

await b.close();
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
