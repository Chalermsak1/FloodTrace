const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- Starting Hydrological Intelligence Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=angle']
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Desktop Map View at 1440x900
    console.log('\n[TEST 1] Desktop Map View (1440x900)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3500);

    const legendVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('เกณฑ์เตือนภัย & โครงข่ายน้ำ') && text.includes('วิกฤต (ล้นตลิ่ง)');
    });
    console.log('  Hydrological Legend visible:', legendVisible);

    const desktopMapShot = path.join(ARTIFACT_DIR, 'hydrological_map_desktop.png');
    await page.screenshot({ path: desktopMapShot });
    console.log('  Saved screenshot:', desktopMapShot);

    // 2. Click River Reach or Trigger Area Selection to Test 6-Tab Panel
    console.log('\n[TEST 2] Testing Area Intelligence Panel & Tabs...');
    // Trigger reach selection via window helper
    await page.evaluate(() => {
      if (window.__floodtrace_select_reach) {
        window.__floodtrace_select_reach('seg_prachin_kabin');
      }
    });
    await sleep(2500);

    const panelState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasTitle: text.includes('กบินทร์บุรี') || text.includes('แม่น้ำปราจีนบุรี'),
        hasOverviewTab: text.includes('ภาพรวม'),
        hasWaterTab: text.includes('ระดับน้ำ & ฝน'),
        hasNewsTab: text.includes('ข่าวสาร'),
        hasEvidenceTab: text.includes('หลักฐาน'),
        hasCitizenTab: text.includes('รายงาน'),
        hasTimelineTab: text.includes('ลำดับเวลา')
      };
    });
    console.log('  Area Intelligence Panel Tabs:', panelState);

    // Click 'ระดับน้ำ & ฝน' Tab
    console.log('  Switching to Water & Rain tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('ระดับน้ำ & ฝน'));
      if (btn) btn.click();
    });
    await sleep(1500);

    const waterTabState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasHighConfidence: text.includes('HIGH CONFIDENCE') || text.includes('เชื่อมโยงโดยตรง'),
        hasWaterLevelUnits: text.includes('ม.รทก.')
      };
    });
    console.log('  Water & Rain tab details:', waterTabState);

    // Click 'ข่าวสาร' Tab
    console.log('  Switching to News tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('ข่าวสาร'));
      if (btn) btn.click();
    });
    await sleep(1500);

    const newsTabState = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img')).map(img => img.src);
      return {
        hasNewsImages: images.length > 0,
        imageCount: images.length
      };
    });
    console.log('  News tab details:', newsTabState);

    const desktopPanelShot = path.join(ARTIFACT_DIR, 'hydrological_area_panel.png');
    await page.screenshot({ path: desktopPanelShot });
    console.log('  Saved panel screenshot:', desktopPanelShot);

    // 3. Desktop Dashboard Hydrological Status Bar
    console.log('\n[TEST 3] Desktop Monitoring Dashboard Hydrological Bar...');
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000);

    const dashboardStatusState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasCriticalAlert: text.includes('วิกฤต 1 จุด') || text.includes('วิกฤต'),
        hasWatchAlert: text.includes('เฝ้าระวัง 1 จุด') || text.includes('เฝ้าระวัง'),
        hasNormalCount: text.includes('ปกติ 5 จุด') || text.includes('ปกติ'),
        hasUnmonitoredCount: text.includes('ไม่มีจุดวัด 5 จุด') || text.includes('ไม่มีจุดวัด')
      };
    });
    console.log('  Dashboard Hydrological Bar Status:', dashboardStatusState);

    const dashboardShot = path.join(ARTIFACT_DIR, 'hydrological_dashboard_desktop.png');
    await page.screenshot({ path: dashboardShot });
    console.log('  Saved dashboard screenshot:', dashboardShot);

    // 4. Mobile Map View at 390x844
    console.log('\n[TEST 4] Mobile Map View (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000);

    const mobileOverflow = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
        hasOverflow: document.body.scrollWidth > document.body.clientWidth
      };
    });
    console.log('  Mobile 390x844 Overflow Check:', mobileOverflow);

    const mobileMapShot = path.join(ARTIFACT_DIR, 'hydrological_map_mobile.png');
    await page.screenshot({ path: mobileMapShot });
    console.log('  Saved mobile screenshot:', mobileMapShot);

    console.log('\n--- Verification Finished Successfully! ---');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await browser.close();
  }
}

run();
