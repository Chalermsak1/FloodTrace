const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyCompactLegends() {
  console.log('Testing compact & closable legends on MapPage and HomeMapPreview...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    // 1. MapPage - Initial View
    console.log('[1] Navigating to /map...');
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2500);

    const shot1 = path.join(ARTIFACT_DIR, 'compact_legends_expanded.png');
    await page.screenshot({ path: shot1 });
    console.log('Captured:', shot1);

    // 2. Collapse both legends ("ย่อ")
    console.log('[2] Collapsing legends via "ย่อ" buttons...');
    const collapseButtons = await page.$$('button');
    for (const btn of collapseButtons) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text === 'ย่อ') {
        await btn.click();
        await sleep(300);
      }
    }
    await sleep(500);
    const shot2 = path.join(ARTIFACT_DIR, 'compact_legends_collapsed.png');
    await page.screenshot({ path: shot2 });
    console.log('Captured:', shot2);

    // 3. Expand again, then Close via 'X' buttons
    console.log('[3] Closing legends via "X" buttons...');
    // Re-expand first
    const expandButtons = await page.$$('button');
    for (const btn of expandButtons) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text === 'ขยาย') {
        await btn.click();
        await sleep(300);
      }
    }
    await sleep(500);

    // Now click close buttons
    const closeButtons = await page.$$('button[title="ปิด"], button[title="ปิดคำอธิบายสัญลักษณ์"]');
    for (const btn of closeButtons) {
      await btn.click();
      await sleep(300);
    }
    await sleep(500);
    const shot3 = path.join(ARTIFACT_DIR, 'compact_legends_closed_pills.png');
    await page.screenshot({ path: shot3 });
    console.log('Captured:', shot3);

    // 4. Test reopen pills
    console.log('[4] Clicking reopen pills...');
    const reopenLegendBtn = await page.$('button[title*="คำอธิบายสัญลักษณ์"]');
    if (reopenLegendBtn) await reopenLegendBtn.click();
    const reopenHydroBtn = await page.$('button[title*="เกณฑ์เตือนภัย"]');
    if (reopenHydroBtn) await reopenHydroBtn.click();
    await sleep(500);

    const shot4 = path.join(ARTIFACT_DIR, 'compact_legends_reopened.png');
    await page.screenshot({ path: shot4 });
    console.log('Captured:', shot4);

    // 5. Test Homepage Preview Legend
    console.log('[5] Testing Homepage / ...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);
    // Scroll down to map preview section
    await page.evaluate(() => {
      window.scrollTo(0, 750);
    });
    await sleep(1000);

    const shot5 = path.join(ARTIFACT_DIR, 'home_compact_legend.png');
    await page.screenshot({ path: shot5 });
    console.log('Captured:', shot5);

    console.log('All legend tests completed successfully!');
  } finally {
    await browser.close();
  }
}

verifyCompactLegends().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
