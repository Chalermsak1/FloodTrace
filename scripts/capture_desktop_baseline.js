const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureBaselines() {
  console.log('Capturing Desktop & Mobile Baselines...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // 1. Desktop 1280x800
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);
    const p1280 = path.join(ARTIFACT_DIR, 'desktop_baseline_1280x800.png');
    await page.screenshot({ path: p1280, fullPage: false });
    console.log(`Saved: ${p1280}`);

    // 2. Desktop 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const p1440 = path.join(ARTIFACT_DIR, 'desktop_baseline_1440x900.png');
    await page.screenshot({ path: p1440, fullPage: false });
    console.log(`Saved: ${p1440}`);

    // 3. Mobile baseline 390x844
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const p390 = path.join(ARTIFACT_DIR, 'mobile_baseline_390x844.png');
    await page.screenshot({ path: p390, fullPage: false });
    console.log(`Saved: ${p390}`);

  } catch (err) {
    console.error('Error capturing baselines:', err);
  } finally {
    await browser.close();
  }
}

captureBaselines();
