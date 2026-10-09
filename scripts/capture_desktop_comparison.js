const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Capturing Post-Change Verification Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // 1. Mobile standard 390x844 (iPhone 12/13/14)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000); // allow maplibre & API data to render
    
    // Screenshot 1: Mobile home top
    const p390 = path.join(ARTIFACT_DIR, 'mobile_after_390x844.png');
    await page.screenshot({ path: p390, fullPage: false });
    console.log(`Saved: ${p390}`);

    // Screenshot 2: Mobile home full scroll
    const p390_full = path.join(ARTIFACT_DIR, 'mobile_after_390x844_full.png');
    await page.screenshot({ path: p390_full, fullPage: true });
    console.log(`Saved: ${p390_full}`);

    // Screenshot 3: Mobile 375x812 (iPhone X/13 Mini)
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await sleep(1000);
    const p375 = path.join(ARTIFACT_DIR, 'mobile_after_375x812.png');
    await page.screenshot({ path: p375, fullPage: false });
    console.log(`Saved: ${p375}`);

    // Screenshot 4: Mobile 430x932 (iPhone Pro Max)
    await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await sleep(1000);
    const p430 = path.join(ARTIFACT_DIR, 'mobile_after_430x932.png');
    await page.screenshot({ path: p430, fullPage: false });
    console.log(`Saved: ${p430}`);

    // Screenshot 5: Mobile 320x568 (Compact SE)
    await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await sleep(1000);
    const p320 = path.join(ARTIFACT_DIR, 'mobile_after_320x568.png');
    await page.screenshot({ path: p320, fullPage: false });
    console.log(`Saved: ${p320}`);

    // Reset to 390x844 for interactive tests
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(2000);

    // Interactive 1: District Selector Bottom Sheet Modal
    const districtBtn = await page.$('button[aria-label="เลือกขอบเขตพื้นที่"]');
    if (districtBtn) {
      await districtBtn.click();
      await sleep(600);
      const pDistrict = path.join(ARTIFACT_DIR, 'mobile_district_modal.png');
      await page.screenshot({ path: pDistrict, fullPage: false });
      console.log(`Saved: ${pDistrict}`);
      
      // Select an actual district like 'กบินทร์บุรี' to test filtering
      const districtOptions = await page.$$('div.space-y-1\\.5 button');
      for (const opt of districtOptions) {
        const text = await page.evaluate(el => el.textContent, opt);
        if (text && text.includes('กบินทร์บุรี')) {
          await opt.click();
          await sleep(800);
          const pFiltered = path.join(ARTIFACT_DIR, 'mobile_district_filtered_kabinburi.png');
          await page.screenshot({ path: pFiltered, fullPage: false });
          console.log(`Saved: ${pFiltered}`);
          break;
        }
      }
    }

    // Reset to ALL
    const resetDistrictBtn = await page.$('button[aria-label="เลือกขอบเขตพื้นที่"]');
    if (resetDistrictBtn) {
      await resetDistrictBtn.click();
      await sleep(500);
      const allOpt = await page.$('div.space-y-1\\.5 button');
      if (allOpt) await allOpt.click();
      await sleep(500);
    }

    // Interactive 2: Notification Modal
    const notifBtn = await page.$('button[aria-label="การแจ้งเตือน"]');
    if (notifBtn) {
      await notifBtn.click();
      await sleep(600);
      const pNotif = path.join(ARTIFACT_DIR, 'mobile_notifications_modal.png');
      await page.screenshot({ path: pNotif, fullPage: false });
      console.log(`Saved: ${pNotif}`);
      
      // Close notif modal
      await page.keyboard.press('Escape');
      await sleep(400);
      // or click close button
      const notifClose = await page.$('.animate-in button');
      if (notifClose) await notifClose.click();
      await sleep(400);
    }

    // Interactive 3: News Detail Modal (Click first news article)
    const firstNewsCard = await page.$('#mobile-news-section article');
    if (firstNewsCard) {
      await firstNewsCard.click();
      await sleep(800);
      const pNewsModal = path.join(ARTIFACT_DIR, 'mobile_news_modal.png');
      await page.screenshot({ path: pNewsModal, fullPage: false });
      console.log(`Saved: ${pNewsModal}`);
      
      // Close detail modal
      const closeBtn = await page.$('button[aria-label="ปิด"]');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await sleep(500);
    }

    // Interactive 4: Evidence Detail Modal (Click first evidence card)
    const firstEvidenceCard = await page.$('#mobile-evidence-section article');
    if (firstEvidenceCard) {
      await firstEvidenceCard.click();
      await sleep(800);
      const pEvidenceModal = path.join(ARTIFACT_DIR, 'mobile_evidence_modal.png');
      await page.screenshot({ path: pEvidenceModal, fullPage: false });
      console.log(`Saved: ${pEvidenceModal}`);
    }

    console.log('All verification captures completed successfully!');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
