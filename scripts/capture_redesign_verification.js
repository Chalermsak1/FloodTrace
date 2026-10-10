const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureVerification() {
  console.log('Capturing Redesign Verification Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const routes = [
    { name: 'overview', path: '/overview' },
    { name: 'map', path: '/map' },
    { name: 'official-updates', path: '/official-updates' },
    { name: 'cases', path: '/cases' },
    { name: 'report', path: '/report' },
    { name: 'my-area', path: '/my-area' },
    { name: 'forecast', path: '/forecast' },
    { name: 'knowledge', path: '/knowledge' },
    { name: 'methodology', path: '/methodology' },
    { name: 'about', path: '/about' }
  ];

  try {
    const page = await browser.newPage();

    // 1. DESKTOP (1440x900)
    console.log('\n--- Capturing Desktop (1440x900) ---');
    await page.setViewport({ width: 1440, height: 900 });
    for (const r of routes) {
      try {
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);
        const shotPath = path.join(ARTIFACT_DIR, `redesign_desktop_${r.name}_1440x900.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`✓ Desktop ${r.name}: ${shotPath}`);
      } catch (err) {
        console.warn(`! Desktop ${r.name} error:`, err.message);
      }
    }

    // 2. TABLET (768x1024)
    console.log('\n--- Capturing Tablet (768x1024) ---');
    await page.setViewport({ width: 768, height: 1024 });
    for (const r of [{ name: 'overview', path: '/overview' }, { name: 'map', path: '/map' }, { name: 'cases', path: '/cases' }, { name: 'report', path: '/report' }]) {
      try {
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);
        const shotPath = path.join(ARTIFACT_DIR, `redesign_tablet_${r.name}_768x1024.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`✓ Tablet ${r.name}: ${shotPath}`);
      } catch (err) {
        console.warn(`! Tablet ${r.name} error:`, err.message);
      }
    }

    // 3. MOBILE (390x844)
    console.log('\n--- Capturing Mobile (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const r of [{ name: 'overview', path: '/overview' }, { name: 'map', path: '/map' }, { name: 'cases', path: '/cases' }, { name: 'report', path: '/report' }]) {
      try {
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);
        const shotPath = path.join(ARTIFACT_DIR, `redesign_mobile_${r.name}_390x844.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`✓ Mobile ${r.name}: ${shotPath}`);
      } catch (err) {
        console.warn(`! Mobile ${r.name} error:`, err.message);
      }
    }

  } catch (err) {
    console.error('Fatal error capturing screenshots:', err);
  } finally {
    await browser.close();
    console.log('\nAll verification screenshots captured successfully!');
  }
}

captureVerification();
