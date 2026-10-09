const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyMergedPopup() {
  console.log('Testing Merged Cell Popup in Browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2500);

    // Scroll to map element
    const canvas = await page.$('.maplibregl-canvas');
    if (canvas) {
      await canvas.scrollIntoView();
      await sleep(1000);
      const box = await canvas.boundingBox();
      if (box) {
        // Click on Prachantakham area (middle-top of Prachin Buri map)
        await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.42);
        await sleep(1500);
      }
    }

    const screenshotPath = path.join(ARTIFACT_DIR, 'audit_merged_popup_preview.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Verify text content
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasPriority = pageText.includes('ลำดับการเฝ้าระวัง');
    const hasScore = pageText.includes('คะแนนความสำคัญ');
    const hasBigMapBtn = pageText.includes('ดูรายละเอียดในแผนที่ใหญ่');
    
    // 2. Mobile 375px test
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    const canvasMobile = await page.$('.maplibregl-canvas');
    if (canvasMobile) {
      await canvasMobile.scrollIntoView();
      await sleep(1000);
      const box = await canvasMobile.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.42);
        await sleep(1500);
      }
    }

    const mobileScreenPath = path.join(ARTIFACT_DIR, 'audit_merged_popup_mobile_375.png');
    await page.screenshot({ path: mobileScreenPath });
    const mobileOverflow = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      winWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log('Mobile 375px Check:', mobileOverflow);
  } finally {
    await browser.close();
  }
}

verifyMergedPopup().catch(err => {
  console.error(err);
  process.exit(1);
});
