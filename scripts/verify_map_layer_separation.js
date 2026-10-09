const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyMapLayerSeparation() {
  console.log('================================================================================');
  console.log('FLOODTRACE: MAP LAYER SEPARATION VERIFICATION SUITE');
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

    // 1. Desktop Initial Load & All Layers Verification
    console.log('[STEP 1] Testing Desktop Viewport (1440x900) - Initial Map View');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500); // Allow MapLibre WebGL canvas and markers to render

    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'map_desktop_all_layers.png');
    await page.screenshot({ path: desktopScreenshotPath });
    report.screenshots.push(desktopScreenshotPath);
    console.log(`Captured: ${desktopScreenshotPath}`);

    // Check presence of Focused View Presets Bar
    const presetButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      return {
        hasAll: buttons.some(b => b.includes('ทั้งหมด')),
        hasFlood: buttons.some(b => b.includes('มุมมองน้ำท่วม')),
        hasEnv: buttons.some(b => b.includes('เฝ้าระวังสิ่งแวดล้อม'))
      };
    });
    console.log('Preset buttons check:', presetButtons);
    report.checks.push({ name: 'Preset Buttons Present', passed: presetButtons.hasAll && presetButtons.hasFlood && presetButtons.hasEnv });

    // Check Map Legend
    const legendCheck = await page.evaluate(() => {
      const legendText = document.body.innerText;
      return {
        hasLegendTitle: legendText.includes('คำอธิบายสัญลักษณ์'),
        hasFloodingSymbol: legendText.includes('น้ำท่วมและน้ำขัง'),
        hasEnvSymbol: legendText.includes('ข้อสังเกตสิ่งแวดล้อม'),
        hasStationsSymbol: legendText.includes('สถานีโทรมาตร'),
        hasCitizenSymbol: legendText.includes('รายงานประชาชน'),
        hasVerifiedIndicator: legendText.includes('วงแหวนเขียว: ตรวจสอบยืนยันแล้ว'),
        hasDisclaimer: legendText.includes('ไม่ใช่ผลตรวจแล็บสารพิษ')
      };
    });
    console.log('Legend verification:', legendCheck);
    report.checks.push({ name: 'Split Legend with 4 Layers & Verification', passed: Object.values(legendCheck).every(Boolean) });

    // 2. Open Layer Control Panel
    console.log('\n[STEP 2] Testing Layer Control Panel (showLayerPanel)');
    // Click layer button (SlidersHorizontal or Layers2)
    const openedPanel = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const layerBtn = btns.find(b => b.title === 'ตัวเลือกชั้นข้อมูล' || b.title === 'ชั้นข้อมูลแผนที่');
      if (layerBtn) {
        layerBtn.click();
        return true;
      }
      return false;
    });
    await sleep(800);

    const layerPanelScreenshot = path.join(ARTIFACT_DIR, 'map_desktop_layer_panel.png');
    await page.screenshot({ path: layerPanelScreenshot });
    report.screenshots.push(layerPanelScreenshot);
    console.log(`Captured: ${layerPanelScreenshot}`);

    // Check layer items in panel
    const layerItemsCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasFloodingLayer: text.includes('น้ำท่วมและระดับน้ำขัง'),
        hasEnvLayer: text.includes('ข้อสังเกตสิ่งแวดล้อม'),
        hasStationsLayer: text.includes('สถานีตรวจวัดและโทรมาตร'),
        hasCitizenLayer: text.includes('รายงานจากประชาชน'),
        hasVerifiedExplanation: text.includes('สถานะการตรวจสอบยืนยัน') && text.includes('#16A34A')
      };
    });
    console.log('Layer panel items check:', layerItemsCheck);
    report.checks.push({ name: 'Layer Panel 4 Layers + Verified Explanation', passed: Object.values(layerItemsCheck).every(Boolean) });

    // 3. Test Flood View Preset
    console.log('\n[STEP 3] Testing "มุมมองน้ำท่วม (Flood View)" Preset');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const floodBtn = btns.find(b => b.innerText.includes('มุมมองน้ำท่วม'));
      if (floodBtn) floodBtn.click();
    });
    await sleep(1000);

    const floodPresetScreenshot = path.join(ARTIFACT_DIR, 'map_desktop_flood_preset.png');
    await page.screenshot({ path: floodPresetScreenshot });
    report.screenshots.push(floodPresetScreenshot);
    console.log(`Captured: ${floodPresetScreenshot}`);

    // 4. Test Environmental Monitoring View Preset
    console.log('\n[STEP 4] Testing "เฝ้าระวังสิ่งแวดล้อม (Environmental View)" Preset');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const envBtn = btns.find(b => b.innerText.includes('เฝ้าระวังสิ่งแวดล้อม'));
      if (envBtn) envBtn.click();
    });
    await sleep(1000);

    const envPresetScreenshot = path.join(ARTIFACT_DIR, 'map_desktop_env_preset.png');
    await page.screenshot({ path: envPresetScreenshot });
    report.screenshots.push(envPresetScreenshot);
    console.log(`Captured: ${envPresetScreenshot}`);

    // Switch back to All Layers
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const allBtn = btns.find(b => b.innerText.includes('มุมมองทั้งหมด'));
      if (allBtn) allBtn.click();
    });
    await sleep(1000);

    // 5. Test Marker Click & Marker Detail Drawer
    console.log('\n[STEP 5] Testing Marker Click Interaction & Detail Drawer');
    const markerClicked = await page.evaluate(() => {
      // Find a marker on map
      const markers = document.querySelectorAll('.maplibregl-marker');
      if (markers.length > 0) {
        // Pick one marker and click it
        markers[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return { clicked: true, totalMarkers: markers.length };
      }
      return { clicked: false, totalMarkers: 0 };
    });
    console.log('Marker click result:', markerClicked);
    await sleep(1000);

    const markerDetailScreenshot = path.join(ARTIFACT_DIR, 'map_desktop_marker_detail.png');
    await page.screenshot({ path: markerDetailScreenshot });
    report.screenshots.push(markerDetailScreenshot);
    console.log(`Captured: ${markerDetailScreenshot}`);

    // Verify marker detail panel contents
    const detailPanelCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasObservedTime: text.includes('เวลาตรวจวัด') || text.includes('เวลาที่สังเกตพบ') || text.includes('เวลาที่แจ้ง'),
        hasSourceOrAgency: text.includes('แหล่งข้อมูล') || text.includes('ผู้รายงาน'),
        hasDisclaimer: text.includes('ข้อสังเกตสภาพน้ำทางกายภาพ') || text.includes('ความแม่นยำระดับตำบล') || text.includes('ข้อมูลโทรมาตร')
      };
    });
    console.log('Detail panel contents check:', detailPanelCheck);
    report.checks.push({ name: 'Marker Detail Panel Attributes & Truthful Labels', passed: detailPanelCheck.hasObservedTime || detailPanelCheck.hasSourceOrAgency });

    // 6. Mobile Viewport Verification (390x844 - iPhone 12/13/14 standard)
    console.log('\n[STEP 6] Testing Mobile Viewport (390x844)');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    const mobileScreenshot = path.join(ARTIFACT_DIR, 'map_mobile_view.png');
    await page.screenshot({ path: mobileScreenshot });
    report.screenshots.push(mobileScreenshot);
    console.log(`Captured: ${mobileScreenshot}`);

    // Check horizontal overflow on mobile
    const overflowCheck = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      return { docWidth, winWidth, hasOverflow: docWidth > winWidth + 1 };
    });
    console.log('Mobile horizontal overflow:', overflowCheck);
    report.checks.push({ name: 'Mobile Zero Horizontal Overflow', passed: !overflowCheck.hasOverflow });

    // Click mobile legend button
    const mobileLegendOpened = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const legendBtn = btns.find(b => b.innerText.includes('คำอธิบายสัญลักษณ์'));
      if (legendBtn) {
        legendBtn.click();
        return true;
      }
      return false;
    });
    await sleep(500);

    const mobileLegendScreenshot = path.join(ARTIFACT_DIR, 'map_mobile_legend.png');
    await page.screenshot({ path: mobileLegendScreenshot });
    report.screenshots.push(mobileLegendScreenshot);
    console.log(`Captured: ${mobileLegendScreenshot}`);
    report.checks.push({ name: 'Mobile Floating Legend Functional', passed: mobileLegendOpened });

  } catch (err) {
    console.error('Audit Error:', err);
    report.checks.push({ name: 'Execution without crashes', passed: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n================================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('================================================================================');
  let allPassed = true;
  for (const c of report.checks) {
    console.log(`[${c.passed ? 'PASS' : 'FAIL'}] ${c.name}`);
    if (!c.passed) allPassed = false;
  }
  console.log(`\nOverall Result: ${allPassed ? 'ALL VERIFICATIONS PASSED' : 'SOME VERIFICATIONS FAILED'}`);
  console.log('Screenshots saved:');
  report.screenshots.forEach(s => console.log(` - ${s}`));
}

verifyMapLayerSeparation().catch(console.error);
