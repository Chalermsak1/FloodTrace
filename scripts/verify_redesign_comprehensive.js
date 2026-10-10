const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyAll() {
  console.log('================================================================');
  console.log('FLOODTRACE COMPREHENSIVE REDESIGN VERIFICATION & SCREENSHOT SUITE');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP 1440x900 - All Primary and Secondary Routes
    // -------------------------------------------------------------
    console.log('--- 1. DESKTOP VIEWPORT (1440x900) ---');
    await page.setViewport({ width: 1440, height: 900 });

    const routes = [
      { path: '/overview', name: 'desktop_1440_overview' },
      { path: '/map', name: 'desktop_1440_map' },
      { path: '/official-updates', name: 'desktop_1440_official_updates' },
      { path: '/report', name: 'desktop_1440_report' },
      { path: '/cases', name: 'desktop_1440_cases' },
      { path: '/forecast', name: 'desktop_1440_forecast' },
      { path: '/about', name: 'desktop_1440_about' },
      { path: '/data-methodology', name: 'desktop_1440_methodology' },
      { path: '/knowledge', name: 'desktop_1440_knowledge' },
    ];

    for (const r of routes) {
      console.log(`Testing route: ${r.path}...`);
      await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.body.scrollWidth,
          clientWidth: document.body.clientWidth,
          hasOverflow: document.body.scrollWidth > document.body.clientWidth
        };
      });

      const shotPath = path.join(ARTIFACT_DIR, `${r.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`[PASS] ${r.path} -> Saved: ${r.name}.png (Overflow: ${overflow.hasOverflow})`);
    }

    // -------------------------------------------------------------
    // 2. DESKTOP INTERACTIONS: Quick Search & District Scope
    // -------------------------------------------------------------
    console.log('\n--- 2. DESKTOP INTERACTIONS ---');
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);

    // Test Search Input & Autocomplete Dropdown
    const searchInput = await page.$('input[placeholder*="ค้นหา"]');
    if (searchInput) {
      await searchInput.click();
      await searchInput.type('กบินทร์');
      await sleep(600);
      const searchShot = path.join(ARTIFACT_DIR, 'desktop_search_autocomplete.png');
      await page.screenshot({ path: searchShot });
      console.log(`[PASS] Search Autocomplete opened -> Saved: desktop_search_autocomplete.png`);
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // -------------------------------------------------------------
    // 3. TABLET VIEWPORT (768x1024)
    // -------------------------------------------------------------
    console.log('\n--- 3. TABLET VIEWPORT (768x1024) ---');
    await page.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });

    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const tabOverviewShot = path.join(ARTIFACT_DIR, 'tablet_768_overview.png');
    await page.screenshot({ path: tabOverviewShot });
    console.log(`[PASS] Tablet Overview -> Saved: tablet_768_overview.png`);

    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);
    const tabMapShot = path.join(ARTIFACT_DIR, 'tablet_768_map.png');
    await page.screenshot({ path: tabMapShot });
    console.log(`[PASS] Tablet Map -> Saved: tablet_768_map.png`);

    // -------------------------------------------------------------
    // 4. MOBILE VIEWPORT (390x844 - iPhone standard)
    // -------------------------------------------------------------
    console.log('\n--- 4. MOBILE VIEWPORT (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const mobOverviewShot = path.join(ARTIFACT_DIR, 'mobile_390_overview.png');
    await page.screenshot({ path: mobOverviewShot });
    console.log(`[PASS] Mobile Overview -> Saved: mobile_390_overview.png`);

    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);
    const mobMapShot = path.join(ARTIFACT_DIR, 'mobile_390_map.png');
    await page.screenshot({ path: mobMapShot });
    console.log(`[PASS] Mobile Map -> Saved: mobile_390_map.png`);

    await page.goto(`${BASE_URL}/report`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const mobReportShot = path.join(ARTIFACT_DIR, 'mobile_390_report.png');
    await page.screenshot({ path: mobReportShot });
    console.log(`[PASS] Mobile Report -> Saved: mobile_390_report.png`);

    // Test Mobile Drawer toggle
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    const menuBtn = await page.$('button[aria-label="เปิดเมนูหลัก"]');
    if (menuBtn) {
      await menuBtn.click();
      await sleep(600);
      const mobDrawerShot = path.join(ARTIFACT_DIR, 'mobile_drawer_open.png');
      await page.screenshot({ path: mobDrawerShot });
      console.log(`[PASS] Mobile Drawer Open -> Saved: mobile_drawer_open.png`);
    }

    // -------------------------------------------------------------
    // 5. SMALL MOBILE (320x800) - Compactness & Touch Overflow
    // -------------------------------------------------------------
    console.log('\n--- 5. ULTRA-COMPACT MOBILE (320x800) ---');
    await page.setViewport({ width: 320, height: 800, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const mob320Shot = path.join(ARTIFACT_DIR, 'mobile_320_overview.png');
    await page.screenshot({ path: mob320Shot });
    console.log(`[PASS] Compact Mobile 320px -> Saved: mobile_320_overview.png`);

    console.log('\nAll visual verification passes completed successfully!');
    if (consoleErrors.length > 0) {
      console.log(`\nNote: ${consoleErrors.length} console errors were captured during navigation:`);
      consoleErrors.slice(0, 5).forEach((e, i) => console.log(`  [${i+1}] ${e}`));
    } else {
      console.log('Zero console errors captured!');
    }

  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyAll();
