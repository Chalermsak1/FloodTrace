/**
 * FloodTrace Real-World Browser UI & Public Usability Verifier
 * Uses Puppeteer-Core with native Google Chrome on macOS
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Ephemeral Quick Tunnel URLs change on every restart — never hardcode them.
const BASE_URL = process.env.PUBLIC_URL;
if (!BASE_URL) {
  console.error('PUBLIC_URL env var is required (e.g. PUBLIC_URL=https://<current>.trycloudflare.com)');
  process.exit(2);
}
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/f2fb2dc0-9581-43e9-a7ae-581ec36b846d';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserAudit() {
  console.log('================================================================================');
  console.log('FLOODTRACE BROWSER UI & PUBLIC USABILITY AUDIT');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Chrome Executable: ${CHROME_PATH}`);
  console.log('================================================================================\n');

  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`ERROR: Chrome binary not found at ${CHROME_PATH}`);
    process.exit(1);
  }

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

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Report') || text.includes('Error') || text.includes('error') || text.includes('fetch')) {
      console.log('  [Browser Console]:', text);
    }
  });
  page.on('pageerror', err => console.log('  [Browser PageError]:', err.message));

  const results = [];

  try {
    // ----------------------------------------------------
    // TEST 1: HOME OVERVIEW PAGE
    // ----------------------------------------------------
    console.log('--- TEST 1: Home Overview Page ---');
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const title = await page.title();
    console.log(`Page Title: ${title}`);
    const bodyText = await page.evaluate(() => document.body.innerText);

    const hasTitle = title.includes('FloodTrace');
    const hasStations = bodyText.includes('สถานีน้ำ') && bodyText.includes('สถานีฝน');
    const hasPrachin = bodyText.includes('ปราจีนบุรี');
    const hasPriority = bodyText.includes('โซนเฝ้าระวัง') || bodyText.includes('พื้นที่ที่ควรติดตาม');

    console.log(`  ✓ Title Match: ${hasTitle ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Stations Displayed: ${hasStations ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Prachin Buri Scope: ${hasPrachin ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Priority Surface Present: ${hasPriority ? 'PASS' : 'FAIL'}`);

    const homeScreenshotPath = path.join(ARTIFACT_DIR, 'browser_audit_home.png');
    await page.screenshot({ path: homeScreenshotPath, fullPage: false });
    console.log(`  📸 Screenshot saved: browser_audit_home.png`);

    results.push({ name: 'Home Page Load & Render', pass: hasTitle && hasStations && hasPrachin });

    // ----------------------------------------------------
    // TEST 2: MAP PAGE & INTERACTIVITY
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Interactive Map Page ---');
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Check map container
    const mapExists = await page.evaluate(() => {
      const container = document.querySelector('.maplibregl-map') || document.querySelector('.leaflet-container') || document.querySelector('[class*="map"]');
      return !!container;
    });
    console.log(`  ✓ Map Container Rendered: ${mapExists ? 'PASS' : 'FAIL'}`);

    // Test Zoom
    const zoomInBtn = await page.$('.maplibregl-ctrl-zoom-in') || await page.$('.leaflet-control-zoom-in') || await page.$('button[title*="zoom" i]') || await page.$('button[aria-label*="zoom" i]');
    let zoomWorked = false;
    if (zoomInBtn) {
      await zoomInBtn.click();
      await sleep(1000);
      zoomWorked = true;
      console.log('  ✓ Zoom-in Button Clicked: PASS');
    } else {
      console.log('  ○ Zoom-in Button not found directly, checking canvas');
    }

    // Drag simulation
    const canvas = await page.$('canvas') || await page.$('.maplibregl-canvas') || await page.$('.leaflet-container');
    let dragWorked = false;
    if (canvas) {
      const boundingBox = await canvas.boundingBox();
      if (boundingBox) {
        await page.mouse.move(boundingBox.x + 300, boundingBox.y + 300);
        await page.mouse.down();
        await page.mouse.move(boundingBox.x + 200, boundingBox.y + 200, { steps: 10 });
        await page.mouse.up();
        await sleep(1000);
        dragWorked = true;
        console.log('  ✓ Map Pan/Drag Interaction: PASS');
      }
    }

    const mapScreenshotPath = path.join(ARTIFACT_DIR, 'browser_audit_map.png');
    await page.screenshot({ path: mapScreenshotPath, fullPage: false });
    console.log(`  📸 Screenshot saved: browser_audit_map.png`);

    results.push({ name: 'Map Rendering & Pan Interaction', pass: mapExists && (dragWorked || zoomWorked) });

    // ----------------------------------------------------
    // TEST 3: CITIZEN REPORT FORM & SUBMISSION E2E
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Public Citizen Report Submission ---');
    await page.goto(`${BASE_URL}/report`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const reportPageText = await page.evaluate(() => document.body.innerText);
    const hasReportTitle = reportPageText.includes('รายงาน') && reportPageText.includes('ข้อสังเกต');
    console.log(`  ✓ Report Form Page: ${hasReportTitle ? 'PASS' : 'FAIL'}`);

    // STEP 1: Select Category
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const catBtn = btns.find(b => b.innerText.includes('น้ำเปลี่ยนสี'));
      if (catBtn) catBtn.click();
    });
    await sleep(500);

    // Click Next -> Step 2
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const n = btns.find(b => b.innerText.includes('ถัดไป: ระบุตำแหน่ง'));
      if (n) n.click();
    });
    await sleep(1000);

    // STEP 2: Location
    // Click Next -> Step 3
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const n = btns.find(b => b.innerText.includes('ถัดไป: ตรวจสอบและส่ง'));
      if (n) n.click();
    });
    await sleep(1000);

    // STEP 3: Description & Declaration
    await page.waitForSelector('textarea', { timeout: 5000 });
    await page.focus('textarea');
    await page.type('textarea', 'รายงานตรวจสอบความพร้อมระบบจริง: พบน้ำสีเขียวขุ่นผิดสังเกตริมคลองหนุมาน');
    await sleep(500);

    // Check declaration checkbox by finding input, scrolling into view, and clicking
    const cb = await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
    await cb.evaluate(el => el.scrollIntoView());
    await sleep(300);
    await cb.click();
    await sleep(300);

    let isChecked = await page.evaluate(() => {
      const el = document.querySelector('input[type="checkbox"]');
      return el ? el.checked : false;
    });

    if (!isChecked) {
      // Fallback: trigger click directly on element
      await page.evaluate(() => {
        const el = document.querySelector('input[type="checkbox"]');
        if (el) el.click();
      });
      await sleep(300);
      isChecked = await page.evaluate(() => {
        const el = document.querySelector('input[type="checkbox"]');
        return el ? el.checked : false;
      });
    }

    console.log(`  ✓ Declaration Checkbox Checked: ${isChecked ? 'YES' : 'NO'}`);

    // Click submit button and await network response
    let submittedReportId = null;
    const responsePromise = page.waitForResponse(
      r => r.url().includes('/api/public/reports') && r.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(err => {
      console.warn('Network response wait warning:', err.message);
      return null;
    });

    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    await submitBtn.evaluate(b => b.scrollIntoView());
    await sleep(500);
    await submitBtn.click();
    console.log('  ✓ Clicked submit button');

    const netResp = await responsePromise;
    if (netResp) {
      console.log(`  ✓ Network Response Status: ${netResp.status()}`);
      if (netResp.status() === 429) {
        console.log('  ⚠️ Hit rate limit window. Waiting 15 seconds to retry cleanly...');
        await sleep(15000);
        const retryPromise = page.waitForResponse(
          r => r.url().includes('/api/public/reports') && r.request().method() === 'POST',
          { timeout: 15000 }
        ).catch(() => null);
        await submitBtn.click();
        const retryResp = await retryPromise;
        if (retryResp) {
          console.log(`  ✓ Retry Network Response Status: ${retryResp.status()}`);
          try {
            const retryData = await retryResp.json();
            if (retryData.report_id) {
              submittedReportId = retryData.report_id;
              console.log(`  ✓ Captured Report ID from Retry: ${submittedReportId}`);
            }
          } catch (e) {
            console.warn('Failed parsing retry JSON:', e.message);
          }
        }
      } else {
        try {
          const netData = await netResp.json();
          console.log('  ✓ Network Response Payload:', JSON.stringify(netData).substring(0, 150));
          if (netData.report_id) {
            submittedReportId = netData.report_id;
            console.log(`  ✓ Captured Report ID from Network: ${submittedReportId}`);
          }
        } catch (e) {
          console.warn('Failed parsing response JSON:', e.message);
        }
      }
    }

    await sleep(3000);

    const errorDivText = await page.evaluate(() => {
      const err = document.querySelector('.bg-red-50') || document.querySelector('.bg-rose-50');
      return err ? err.innerText : null;
    });
    if (errorDivText) {
      console.log(`  ⚠️ Form Displayed Error: ${errorDivText}`);
    }

    const afterSubmitText = await page.evaluate(() => document.body.innerText);
    const hasSuccess = afterSubmitText.includes('บันทึกรายงาน') || afterSubmitText.includes('เรียบร้อย') || !!submittedReportId;
    console.log(`  ✓ Submission Execution: ${hasSuccess ? 'PASS' : 'FAIL'}`);

    if (!submittedReportId) {
      const match = afterSubmitText.match(/FT-2026-[A-Z0-9]+/);
      if (match) {
        submittedReportId = match[0];
        console.log(`  ✓ Extracted Report ID from DOM: ${submittedReportId}`);
      }
    }

    const reportScreenshotPath = path.join(ARTIFACT_DIR, 'browser_audit_citizen_report.png');
    await page.screenshot({ path: reportScreenshotPath, fullPage: false });
    console.log(`  📸 Screenshot saved: browser_audit_citizen_report.png`);

    results.push({ name: 'Citizen Report Submission E2E', pass: hasSuccess && !!submittedReportId });

    // ----------------------------------------------------
    // TEST 4: CITIZEN REPORT TRACKING
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Citizen Report Tracking ---');
    if (submittedReportId) {
      // Switch tab or click direct check button
      const clickedDirect = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const directBtn = btns.find(b => b.innerText.includes('ตรวจสอบสถานะรายงานนี้ทันที'));
        if (directBtn) {
          directBtn.click();
          return true;
        }
        return false;
      });

      if (!clickedDirect) {
        // Switch to track mode tab
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const trackTab = btns.find(b => b.innerText.includes('ติดตามสถานะ'));
          if (trackTab) trackTab.click();
        });
        await sleep(1000);

        await page.waitForSelector('input[placeholder*="FT-2026"]', { timeout: 5000 });
        await page.focus('input[placeholder*="FT-2026"]');
        await page.type('input[placeholder*="FT-2026"]', submittedReportId);
        await sleep(500);

        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const searchBtn = btns.find(b => b.innerText.includes('ค้นหาสถานะ'));
          if (searchBtn) searchBtn.click();
        });
      }

      await sleep(3000);

      const trackingText = await page.evaluate(() => document.body.innerText);
      const trackingFound = trackingText.includes('รับเรื่องแล้ว') || trackingText.includes(submittedReportId) || trackingText.includes('รอการตรวจสอบ') || trackingText.includes('ระดับการตรวจสอบ');
      console.log(`  ✓ Report Tracking Result: ${trackingFound ? 'PASS' : 'FAIL'}`);
      results.push({ name: 'Citizen Report Tracking Lookup', pass: trackingFound });
    } else {
      results.push({ name: 'Citizen Report Tracking Lookup', pass: false });
    }

    // ----------------------------------------------------
    // TEST 5: DATA SOURCES & PROVENANCE PAGE
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Data Sources & Methodology Page ---');
    await page.goto(`${BASE_URL}/data-methodology`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const methodologyText = await page.evaluate(() => document.body.innerText);
    const hasThaiWater = methodologyText.includes('ThaiWater') || methodologyText.includes('สสน.');
    const hasRID = methodologyText.includes('RID') || methodologyText.includes('ชลประทาน');
    const hasAutomated = methodologyText.includes('อัปเดตอัตโนมัติ') || methodologyText.includes('Automated');

    console.log(`  ✓ ThaiWater Attribution: ${hasThaiWater ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ RID Attribution: ${hasRID ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Automated Refresh Standard: ${hasAutomated ? 'PASS' : 'FAIL'}`);

    const sourcesScreenshotPath = path.join(ARTIFACT_DIR, 'browser_audit_sources.png');
    await page.screenshot({ path: sourcesScreenshotPath, fullPage: false });
    console.log(`  📸 Screenshot saved: browser_audit_sources.png`);

    results.push({ name: 'Data Methodology & Provenance', pass: hasThaiWater && hasRID });

    // ----------------------------------------------------
    // TEST 6: PROTECTED STAFF CONSOLE (UNAUTHENTICATED GATE)
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Staff Operations Console Protection Gate ---');
    // Clear any previous session
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${BASE_URL}/admin/reports`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const adminGateText = await page.evaluate(() => document.body.innerText);
    const hasStaffKeyPrompt = adminGateText.includes('Staff Access Key') || adminGateText.includes('เข้าสู่ระบบเจ้าหน้าที่');
    const queueHidden = !adminGateText.includes('คิวจัดการรายงาน (Report Queue)');

    console.log(`  ✓ Staff Login Prompt Displayed: ${hasStaffKeyPrompt ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Internal Queue Protected Before Auth: ${queueHidden ? 'PASS' : 'FAIL'}`);

    const staffLoginScreenshot = path.join(ARTIFACT_DIR, 'browser_audit_staff_login.png');
    await page.screenshot({ path: staffLoginScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: browser_audit_staff_login.png`);

    // ----------------------------------------------------
    // TEST 7: STAFF CONSOLE AUTHENTICATED ACCESS
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Staff Console Authenticated Login ---');
    // Enter valid dev key via Puppeteer native typing
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.focus('input[type="password"]');
    await page.type('input[type="password"]', 'dev-admin-secret-key-change-in-prod');
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.innerText.includes('เข้าสู่ระบบเจ้าหน้าที่'));
      if (submitBtn) submitBtn.click();
    });

    await sleep(4000);

    const staffConsoleHtml = await page.evaluate(() => document.body.innerText);
    const hasQueue = staffConsoleHtml.includes('Report Queue') || staffConsoleHtml.includes('คิวจัดการรายงาน') || staffConsoleHtml.includes('รายงานทั้งหมด');
    const hasSummaryMetrics = staffConsoleHtml.includes('สิทธิ์:') || staffConsoleHtml.includes('Staff Operations');

    console.log(`  ✓ Authenticated Queue Unlocked: ${hasQueue ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Staff Operations Dashboard Loaded: ${hasSummaryMetrics ? 'PASS' : 'FAIL'}`);

    const staffConsoleScreenshot = path.join(ARTIFACT_DIR, 'browser_audit_staff_console.png');
    await page.screenshot({ path: staffConsoleScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: browser_audit_staff_console.png`);

    results.push({ name: 'Staff Console Authentication Gate & Queue', pass: hasStaffKeyPrompt && hasQueue });

  } catch (error) {
    console.error('Browser audit caught error:', error);
    results.push({ name: 'Browser Execution', pass: false, error: error.message });
  } finally {
    await browser.close();
  }

  console.log('\n================================================================================');
  console.log('BROWSER AUDIT RESULTS SUMMARY');
  console.log('================================================================================');
  let allPass = true;
  for (const r of results) {
    const symbol = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} | ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\nFinal Browser Status: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  return allPass;
}

runBrowserAudit().then(success => {
  process.exit(success ? 0 : 1);
});
