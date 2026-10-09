/**
 * Comprehensive Responsive UI/UX Viewport Verifier for FloodTrace
 * Mobile (320px, 360px, 390px, 430px) + Tablet (768px, 1024px) + Desktop (1440px, 1920px)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

const VIEWPORTS = [
  { name: 'mobile_320', width: 320, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'mobile_360', width: 360, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'mobile_390', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'mobile_430', width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'tablet_768', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'tablet_1024', width: 1024, height: 768, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
  { name: 'desktop_1440', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'desktop_1920', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    
    // Find any specific element overflowing
    const overflowingElements = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > winWidth + 1) { // 1px threshold for subpixel rounding
        overflowingElements.push({
          tag: el.tagName,
          id: el.id,
          className: (el.className || '').toString().slice(0, 100),
          right: Math.round(rect.right),
          windowWidth: winWidth
        });
      }
    }
    
    return {
      hasOverflow: docWidth > winWidth + 1 || bodyWidth > winWidth + 1,
      docWidth,
      winWidth,
      bodyWidth,
      overflowingCount: overflowingElements.length,
      topOverflowing: overflowingElements.slice(0, 3)
    };
  });
}

async function runAudit() {
  console.log('================================================================================');
  console.log('FLOODTRACE COMPREHENSIVE RESPONSIVE VIEWPORT AUDIT');
  console.log(`Target: ${BASE_URL}`);
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

  const auditResults = [];

  try {
    const page = await browser.newPage();

    // 1. Audit Overview / Landing across all target viewports
    console.log('--- PHASE 1: VIEWPORT AUDIT ON OVERVIEW PAGE ---');
    for (const vp of VIEWPORTS) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(1000);

      const overflow = await checkHorizontalOverflow(page);
      const passed = !overflow.hasOverflow;
      
      const screenshotPath = path.join(ARTIFACT_DIR, `audit_overview_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${vp.name} (${vp.width}x${vp.height}): DocWidth=${overflow.docWidth}, WinWidth=${overflow.winWidth}, Overflow=${overflow.hasOverflow}`);
      if (!passed) {
        console.log('   Overflow details:', JSON.stringify(overflow.topOverflowing));
      }

      auditResults.push({
        page: 'overview',
        viewport: vp.name,
        width: vp.width,
        passed,
        overflow
      });
    }

    // 2. Interactive Mobile Map & Bottom Sheet Test (390x844)
    console.log('\n--- PHASE 2: MOBILE MAP & BOTTOM SHEET INTERACTION (390x844) ---');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    const mapOverflow = await checkHorizontalOverflow(page);
    console.log(`[${!mapOverflow.hasOverflow ? 'PASS' : 'FAIL'}] Mobile Map Base Viewport: Overflow=${mapOverflow.hasOverflow}`);

    const mapScreenInitial = path.join(ARTIFACT_DIR, 'audit_mobile_map_initial.png');
    await page.screenshot({ path: mapScreenInitial });

    // Test expanding mobile bottom sheet
    const expandBtnSelector = 'button[title="ขยายดูข้อมูลเชิงลึก"], button:has-text("ขยายรายละเอียด")';
    let sheetExpanded = false;
    try {
      const expandBtn = await page.$('button[title="ขยายดูข้อมูลเชิงลึก"]');
      if (expandBtn) {
        await expandBtn.click();
        await sleep(800);
        sheetExpanded = true;
        console.log('   Bottom sheet expanded successfully');
      } else {
        // Fallback: click on collapsed header
        const collapsedBar = await page.$('.cursor-pointer');
        if (collapsedBar) {
          await collapsedBar.click();
          await sleep(800);
          sheetExpanded = true;
          console.log('   Clicked collapsed bar to expand sheet');
        }
      }
    } catch (e) {
      console.warn('   Sheet expand interaction note:', e.message);
    }

    const mapScreenExpanded = path.join(ARTIFACT_DIR, 'audit_mobile_map_expanded.png');
    await page.screenshot({ path: mapScreenExpanded });

    // Test mobile legend toggle
    try {
      const toggled = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent && b.textContent.includes('คำอธิบายสัญลักษณ์'));
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      if (toggled) {
        await sleep(600);
        const legendScreen = path.join(ARTIFACT_DIR, 'audit_mobile_map_legend.png');
        await page.screenshot({ path: legendScreen });
        console.log('   Toggled mobile legend open and captured screenshot');
      }
    } catch (e) {
      console.warn('   Legend toggle note:', e.message);
    }

    // 3. Interactive Information Detail Modal Test
    console.log('\n--- PHASE 3: INFORMATION DETAIL MODAL RESPONSIVENESS ---');
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1500);

    // Click on the latest incident image card on mobile
    let modalOpened = false;
    try {
      modalOpened = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const target = btns.find(b => 
          (b.textContent && (b.textContent.includes('ตรวจสอบข้อเท็จจริง') || b.textContent.includes('ดูหลักฐานต้นทาง') || b.textContent.includes('ดูข้อมูลต้นทาง'))) ||
          b.className.includes('aspect-')
        );
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      if (modalOpened) {
        await sleep(1000);
        console.log('   Opened detail modal via interactive click');
      }
    } catch (e) {
      console.warn('   Modal open interaction note:', e.message);
    }

    const modalScreen = path.join(ARTIFACT_DIR, 'audit_mobile_modal.png');
    await page.screenshot({ path: modalScreen });

    const modalOverflow = await checkHorizontalOverflow(page);
    console.log(`[${!modalOverflow.hasOverflow ? 'PASS' : 'FAIL'}] Modal Viewport Check: Overflow=${modalOverflow.hasOverflow}`);

    // Close modal if opened
    try {
      await page.keyboard.press('Escape');
      await sleep(500);
    } catch (e) {}

    // 4. Report Page 320px Extreme Mobile Audit
    console.log('\n--- PHASE 4: CITIZEN REPORT FORM 320px AUDIT ---');
    await page.setViewport({ width: 320, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/report`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);

    const reportOverflow = await checkHorizontalOverflow(page);
    console.log(`[${!reportOverflow.hasOverflow ? 'PASS' : 'FAIL'}] Report Page 320px Viewport: Overflow=${reportOverflow.hasOverflow}, DocWidth=${reportOverflow.docWidth}, WinWidth=${reportOverflow.winWidth}`);

    const reportScreenStep1 = path.join(ARTIFACT_DIR, 'audit_report_320_step1.png');
    await page.screenshot({ path: reportScreenStep1 });

    // Click next to step 2
    try {
      const advanced = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.textContent && b.textContent.includes('ถัดไป'));
        if (nextBtn) {
          nextBtn.click();
          return true;
        }
        return false;
      });
      if (advanced) {
        await sleep(600);
        const reportOverflowStep2 = await checkHorizontalOverflow(page);
        console.log(`[${!reportOverflowStep2.hasOverflow ? 'PASS' : 'FAIL'}] Report Page Step 2 320px Overflow=${reportOverflowStep2.hasOverflow}`);
        const reportScreenStep2 = path.join(ARTIFACT_DIR, 'audit_report_320_step2.png');
        await page.screenshot({ path: reportScreenStep2 });
        console.log('   Step 2 reached on 320px successfully');
      }
    } catch (e) {
      console.warn('   Report step advance note:', e.message);
    }

    // 5. Desktop Workstation Layout (1440x900)
    console.log('\n--- PHASE 5: DESKTOP WORKSTATION AUDIT (1440x900) ---');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1500);

    const desktopOverviewScreen = path.join(ARTIFACT_DIR, 'audit_desktop_1440_overview.png');
    await page.screenshot({ path: desktopOverviewScreen });

    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    const desktopMapScreen = path.join(ARTIFACT_DIR, 'audit_desktop_1440_map.png');
    await page.screenshot({ path: desktopMapScreen });

    console.log('================================================================================');
    console.log('AUDIT COMPLETED');
    console.log('================================================================================');

  } finally {
    await browser.close();
  }
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
