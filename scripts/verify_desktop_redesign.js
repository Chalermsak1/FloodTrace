const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- Starting Desktop Redesign Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // Collect console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 1. Desktop 1440x900
    console.log('1. Testing Desktop at 1440x900...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000);

    const overflow1440 = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth
      };
    });
    console.log('1440x900 Overflow Check:', overflow1440);

    const p1440 = path.join(ARTIFACT_DIR, 'desktop_redesign_1440x900.png');
    await page.screenshot({ path: p1440, fullPage: false });
    console.log(`Saved screenshot: ${p1440}`);

    // 2. Desktop 1920x1080
    console.log('2. Testing Desktop at 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(2000);

    const overflow1920 = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth
      };
    });
    console.log('1920x1080 Overflow Check:', overflow1920);

    const p1920 = path.join(ARTIFACT_DIR, 'desktop_redesign_1920x1080.png');
    await page.screenshot({ path: p1920, fullPage: false });
    console.log(`Saved screenshot: ${p1920}`);

    // 3. Desktop Interactions at 1440x900
    console.log('3. Testing Desktop Interactions...');
    await page.setViewport({ width: 1440, height: 900 });
    await sleep(1000);

    // 3a. Click quick filter pill [สถานีตรวจวัด]
    const pillButtons = await page.$$('div.flex.items-center.gap-1\\.5 button');
    let clickedPill = false;
    for (const btn of pillButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('สถานีตรวจวัด')) {
        await btn.click();
        clickedPill = true;
        console.log('Clicked quick pill: สถานีตรวจวัด');
        break;
      }
    }
    await sleep(1000);
    const pPill = path.join(ARTIFACT_DIR, 'desktop_interactive_pill_stations.png');
    await page.screenshot({ path: pPill, fullPage: false });
    console.log(`Saved screenshot: ${pPill}`);

    // 3b. Click news card to open detail modal
    console.log('Testing News card modal interaction...');
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 500;
    });
    await sleep(600);

    const clicked = await page.evaluate(() => {
      const card = document.querySelector('main section div.grid-cols-4 > div');
      if (card) {
        card.click();
        return true;
      }
      return false;
    });
    console.log('Clicked news card evaluated:', clicked);
    await sleep(1000);
    const pNewsModal = path.join(ARTIFACT_DIR, 'desktop_interactive_news_modal.png');
    await page.screenshot({ path: pNewsModal, fullPage: false });
    console.log(`Saved screenshot: ${pNewsModal}`);

    // Close modal if open
    await page.keyboard.press('Escape');
    await sleep(600);

    // 4. Mobile 390x844 (Verify mobile UI remains completely unchanged)
    console.log('4. Testing Mobile at 390x844...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000);

    const overflow390 = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth
      };
    });
    console.log('390x844 Mobile Overflow Check:', overflow390);

    const p390 = path.join(ARTIFACT_DIR, 'mobile_after_redesign_390x844.png');
    await page.screenshot({ path: p390, fullPage: false });
    console.log(`Saved screenshot: ${p390}`);

    console.log('--- Verification Complete ---');
    console.log('Any Console Errors:', errors.filter(e => !e.includes('favicon') && !e.includes('404')));

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
