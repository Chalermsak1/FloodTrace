const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyWebGISUpgrade() {
  console.log('================================================================================');
  console.log('FLOODTRACE: ADVANCED WEBGIS UX UPGRADE VERIFICATION SUITE');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900'
    ]
  });

  const report = {
    checks: [],
    screenshots: []
  };

  try {
    const page = await browser.newPage();

    // 1. Desktop Initial Load & Control Deck Verification
    console.log('[STEP 1] Testing Desktop Viewport (1440x900) - Initial WebGIS View');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000); // Allow MapLibre WebGL canvas and telemetry markers to load

    const initialScreenshotPath = path.join(ARTIFACT_DIR, 'webgis_initial_overview.png');
    await page.screenshot({ path: initialScreenshotPath });
    report.screenshots.push(initialScreenshotPath);
    console.log(`Captured: ${initialScreenshotPath}`);

    // Verify Control Deck Buttons
    const controlDeckInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        hasZoomIn: buttons.some(b => b.getAttribute('aria-label') === 'ซูมเข้า' || b.getAttribute('title')?.includes('ซูมเข้า')),
        hasZoomOut: buttons.some(b => b.getAttribute('aria-label') === 'ซูมออก' || b.getAttribute('title')?.includes('ซูมออก')),
        hasResetExtent: buttons.some(b => b.getAttribute('aria-label') === 'รีเซ็ตมุมมอง' || b.getAttribute('title')?.includes('รีเซ็ต')),
        hasLayerToggle: buttons.some(b => b.getAttribute('aria-label') === 'จัดการชั้นข้อมูลแผนที่' || b.getAttribute('title')?.includes('ชั้นข้อมูล')),
        hasLegendToggle: buttons.some(b => b.getAttribute('aria-label') === 'คำอธิบายสัญลักษณ์แผนที่' || b.getAttribute('title')?.includes('คำอธิบายสัญลักษณ์')),
        hasInspector: buttons.some(b => b.getAttribute('aria-label') === 'เครื่องมือตรวจวัดพิกัด' || b.getAttribute('title')?.includes('ตรวจวัดพิกัด')),
        hasBasemap: buttons.some(b => b.getAttribute('aria-label') === 'สลับแผนที่ฐาน' || b.getAttribute('title')?.includes('แผนที่ฐาน')),
        hasFullscreen: buttons.some(b => b.getAttribute('aria-label') === 'เต็มจอ' || b.getAttribute('title')?.includes('เต็มจอ'))
      };
    });
    console.log('Control Deck verification:', controlDeckInfo);
    const allDeckButtonsFound = Object.values(controlDeckInfo).every(Boolean);
    report.checks.push({ name: 'WebGIS Control Deck Complete', passed: allDeckButtonsFound, details: controlDeckInfo });

    // 2. Open Layer Manager (MapStore Style TOC)
    console.log('\n[STEP 2] Testing WebGIS Layer Manager (MapStore TOC)');
    await page.evaluate(() => {
      const layerBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute('aria-label') === 'จัดการชั้นข้อมูลแผนที่' || b.getAttribute('title')?.includes('ชั้นข้อมูลแผนที่')
      );
      if (layerBtn) layerBtn.click();
    });
    await sleep(600);

    const layerManagerScreenshotPath = path.join(ARTIFACT_DIR, 'webgis_layer_manager_open.png');
    await page.screenshot({ path: layerManagerScreenshotPath });
    report.screenshots.push(layerManagerScreenshotPath);
    console.log(`Captured: ${layerManagerScreenshotPath}`);

    // Verify 4 Hierarchical Groups and Presets inside Layer Manager
    const layerManagerStructure = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasHazardGroup: text.includes('สภาวะน้ำท่วมและขอบเขตวิเคราะห์'),
        hasHydroGroup: text.includes('โครงข่ายอุทกวิทยา'),
        hasFieldGroup: text.includes('ข่าวสารและข้อมูลภาคสนาม'),
        hasBaseGroup: text.includes('แผนที่ฐานและป้ายชื่อภูมิศาสตร์'),
        hasNewsMedia: text.includes('ข่าวสารจากสื่อมวลชน'),
        hasExternalEvidence: text.includes('ข้อสังเกตสิ่งแวดล้อม'),
        hasCitizenReports: text.includes('รายงานจากประชาชน'),
        hasPresetAll: text.includes('ทั้งหมด'),
        hasPresetFlood: text.includes('น้ำท่วม'),
        hasPresetHydro: text.includes('อุทกวิทยา'),
        hasPresetNews: text.includes('ข่าวสาร')
      };
    });
    console.log('Layer Manager Structure verification:', layerManagerStructure);
    const layerManagerPass = Object.values(layerManagerStructure).every(Boolean);
    report.checks.push({ name: 'Layer Manager 4 Groups & News Layer Present', passed: layerManagerPass, details: layerManagerStructure });

    // 3. Test View Presets Interaction
    console.log('\n[STEP 3] Testing MapStore Thematic Presets');
    await page.evaluate(() => {
      const newsPresetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'ข่าวสาร');
      if (newsPresetBtn) newsPresetBtn.click();
    });
    await sleep(600);

    const presetNewsScreenshotPath = path.join(ARTIFACT_DIR, 'webgis_preset_news_view.png');
    await page.screenshot({ path: presetNewsScreenshotPath });
    report.screenshots.push(presetNewsScreenshotPath);
    console.log(`Captured: ${presetNewsScreenshotPath}`);

    // Re-apply 'ทั้งหมด' preset
    await page.evaluate(() => {
      const allPresetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'ทั้งหมด');
      if (allPresetBtn) allPresetBtn.click();
    });
    await sleep(600);

    // Close Layer Manager
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'ปิดแผงชั้นข้อมูล' || b.getAttribute('aria-label') === 'ปิดแผงชั้นข้อมูล');
      if (closeBtn) closeBtn.click();
    });
    await sleep(400);

    // 4. Test Coordinate Inspector & Bottom Status Bar
    console.log('\n[STEP 4] Testing Coordinate Inspector Tool & Bottom Status Bar');
    await page.evaluate(() => {
      const inspectorBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute('aria-label') === 'เครื่องมือตรวจวัดพิกัด' || b.getAttribute('title')?.includes('ตรวจวัดพิกัด')
      );
      if (inspectorBtn) inspectorBtn.click();
    });
    await sleep(400);

    // Move mouse across canvas to trigger cursor coords
    await page.mouse.move(700, 450);
    await sleep(400);

    const inspectorScreenshotPath = path.join(ARTIFACT_DIR, 'webgis_inspector_active.png');
    await page.screenshot({ path: inspectorScreenshotPath });
    report.screenshots.push(inspectorScreenshotPath);
    console.log(`Captured: ${inspectorScreenshotPath}`);

    const statusBarInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasInspectorToast: text.includes('โหมดตรวจวัดพิกัด'),
        hasWGS84: text.includes('WGS84') || text.includes('EPSG:4326'),
        hasCoordinates: /\d+\.\d+°\s*N,\s*\d+\.\d+°\s*E/.test(text)
      };
    });
    console.log('Status bar & coordinates verification:', statusBarInfo);
    report.checks.push({ name: 'Coordinate Inspector Active & Coordinates Visible', passed: statusBarInfo.hasInspectorToast && statusBarInfo.hasWGS84 && statusBarInfo.hasCoordinates, details: statusBarInfo });

    // Turn off inspector
    await page.evaluate(() => {
      const inspectorBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute('aria-label') === 'เครื่องมือตรวจวัดพิกัด' || b.getAttribute('title')?.includes('ตรวจวัดพิกัด')
      );
      if (inspectorBtn) inspectorBtn.click();
    });
    await sleep(300);

    // 5. Test Mobile Viewport (375x667)
    console.log('\n[STEP 5] Testing Mobile Viewport (375x667) Responsiveness');
    await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'webgis_mobile_overview.png');
    await page.screenshot({ path: mobileScreenshotPath });
    report.screenshots.push(mobileScreenshotPath);
    console.log(`Captured: ${mobileScreenshotPath}`);

    // Check no horizontal scrollbar on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log('Mobile horizontal overflow check:', hasHorizontalOverflow ? 'FAIL' : 'PASS');
    report.checks.push({ name: 'Mobile Zero Horizontal Overflow', passed: !hasHorizontalOverflow });

    console.log('\n================================================================================');
    console.log('ALL WEBGIS VERIFICATIONS COMPLETED');
    console.log('================================================================================');
    console.log(JSON.stringify(report, null, 2));

  } catch (err) {
    console.error('Error during WebGIS verification:', err);
    report.error = err.message;
  } finally {
    await browser.close();
  }

  return report;
}

verifyWebGISUpgrade();
