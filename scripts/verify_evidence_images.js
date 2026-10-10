const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Capturing Evidence Section Real Images Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // 1. Desktop 1440x900
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3500);

    // Scroll to the evidence section
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent && h.textContent.includes('สถานการณ์และหลักฐานล่าสุด'));
      if (heading) {
        heading.scrollIntoView({ behavior: 'instant', block: 'center' });
        // Also scroll any scrollable parents
        let parent = heading.parentElement;
        while (parent) {
          if (parent.scrollHeight > parent.clientHeight) {
            parent.scrollTop = parent.scrollHeight;
          }
          parent = parent.parentElement;
        }
      }
    });
    await sleep(2500);

    const desktopPath = path.join(ARTIFACT_DIR, 'desktop_evidence_real_images.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved desktop screenshot: ${desktopPath}`);

    // Click the first evidence card to inspect its detail modal
    const clicked = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('สถานการณ์และหลักฐานล่าสุด'));
      if (heading) {
        const container = heading.closest('section');
        const card = container ? container.querySelector('.group.cursor-pointer') : null;
        if (card) {
          card.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      await sleep(1500);
      const modalPath = path.join(ARTIFACT_DIR, 'desktop_evidence_modal_real_image.png');
      await page.screenshot({ path: modalPath, fullPage: false });
      console.log(`Saved modal screenshot: ${modalPath}`);
    }

    // 2. Mobile 390x844
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    await page.evaluate(() => {
      const el = document.getElementById('mobile-evidence-section');
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await sleep(1500);

    const mobilePath = path.join(ARTIFACT_DIR, 'mobile_evidence_real_images.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved mobile screenshot: ${mobilePath}`);

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
