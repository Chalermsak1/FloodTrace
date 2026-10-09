const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    // 1. Notification Modal (Target visible mobile notification bell)
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);
    const clickedNotif = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[aria-label="การแจ้งเตือน"]'));
      const visible = btns.find(b => b.offsetWidth > 0 && b.offsetHeight > 0);
      if (visible) {
        visible.click();
        return true;
      }
      return false;
    });
    if (clickedNotif) {
      await sleep(800);
      const pNotif = path.join(ARTIFACT_DIR, 'mobile_notifications_modal.png');
      await page.screenshot({ path: pNotif });
      console.log(`Saved: ${pNotif}`);
    }

    // 2. News Detail Modal
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2500);
    const clickedNews = await page.evaluate(() => {
      const art = document.querySelector('#mobile-news-section article');
      if (art) {
        art.scrollIntoView({ behavior: 'instant', block: 'center' });
        art.click();
        return true;
      }
      return false;
    });
    if (clickedNews) {
      await sleep(1000);
      const pNewsModal = path.join(ARTIFACT_DIR, 'mobile_news_detail_modal.png');
      await page.screenshot({ path: pNewsModal });
      console.log(`Saved: ${pNewsModal}`);
    }

    // 3. Evidence Detail Modal
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2500);
    const clickedEvidence = await page.evaluate(() => {
      const art = document.querySelector('#mobile-evidence-section article');
      if (art) {
        art.scrollIntoView({ behavior: 'instant', block: 'center' });
        art.click();
        return true;
      }
      return false;
    });
    if (clickedEvidence) {
      await sleep(1000);
      const pEvidenceModal = path.join(ARTIFACT_DIR, 'mobile_evidence_detail_modal.png');
      await page.screenshot({ path: pEvidenceModal });
      console.log(`Saved: ${pEvidenceModal}`);
    }

    // 4. Test Navigation to Map from Mobile Map Card button or link
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);
    const clickedMap = await page.evaluate(() => {
      // Find full map button in satellite card
      const mapBtn = document.querySelector('a[href="/map"]');
      if (mapBtn) {
        mapBtn.click();
        return true;
      }
      return false;
    });
    if (clickedMap) {
      await sleep(3000);
      const pMap = path.join(ARTIFACT_DIR, 'mobile_map_navigation.png');
      await page.screenshot({ path: pMap });
      console.log(`Saved: ${pMap}`);
    }

    // 5. Test Profile Drawer from Bottom Navigation
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);
    const clickedProfile = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const profileBtn = btns.find(b => b.textContent.includes('โปรไฟล์'));
      if (profileBtn) {
        profileBtn.click();
        return true;
      }
      return false;
    });
    if (clickedProfile) {
      await sleep(800);
      const pProfile = path.join(ARTIFACT_DIR, 'mobile_profile_drawer.png');
      await page.screenshot({ path: pProfile });
      console.log(`Saved: ${pProfile}`);
    }

    console.log('Modals and navigation captured successfully!');

  } catch (err) {
    console.error('Error in modal capture:', err);
  } finally {
    await browser.close();
  }
}

run();
