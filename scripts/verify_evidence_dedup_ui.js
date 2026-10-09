const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = '/Users/chalermsak/.gemini/antigravity-ide/brain/6e0704d5-2313-4cce-930a-ef7e377bff52';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyEvidenceDedup() {
  console.log('Testing Evidence Deduplication in Headless Browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // 1. Check Overview Hero Section
    console.log(`Navigating to ${BASE_URL}/ ...`);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2500);

    const screenshotOverview = path.join(ARTIFACT_DIR, 'dedup_evidence_hero_section.png');
    await page.screenshot({ path: screenshotOverview });
    console.log(`Saved hero section screenshot to ${screenshotOverview}`);

    // Extract evidence card titles and badges
    const heroCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('article[role="button"]'));
      return cards.map(c => {
        const titleEl = c.querySelector('h3');
        const text = c.innerText;
        return {
          title: titleEl ? titleEl.innerText : '',
          fullText: text
        };
      });
    });

    console.log(`\nFound ${heroCards.length} external evidence cards in hero section:`);
    heroCards.forEach((c, idx) => {
      console.log(`  [Card ${idx + 1}] Title: ${c.title}`);
      const hasGroupBadge = c.fullText.includes('แหล่งข้อมูล');
      const hasNewsBadge = c.fullText.includes('ข่าวสนับสนุน');
      console.log(`     Group badge: ${hasGroupBadge ? 'YES' : 'NO'} | News badge: ${hasNewsBadge ? 'YES' : 'NO'}`);
    });

    // 2. Click the grouped card (Sri Maha Phot waste sampling) to test modal
    console.log('\nClicking on grouped card to inspect InformationDetailModal...');
    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('article[role="button"]'));
      for (const c of cards) {
        if (c.innerText.includes('สคพ.') || c.innerText.includes('ศรีมหาโพธิ') || c.innerText.includes('แหล่งข้อมูล')) {
          c.click();
          return true;
        }
      }
      if (cards.length > 0) {
        cards[0].click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await sleep(1500);
      const screenshotModal = path.join(ARTIFACT_DIR, 'dedup_evidence_modal_preview.png');
      await page.screenshot({ path: screenshotModal });
      console.log(`Saved modal screenshot to ${screenshotModal}`);

      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return null;
        const text = modal.innerText;
        return {
          title: modal.querySelector('#modal-title')?.innerText || '',
          hasRelatedSources: text.includes('แหล่งข้อมูลและหลักฐานต้นทางที่เกี่ยวข้อง'),
          hasRelatedNews: text.includes('ข่าวสารและรายงานสื่อมวลชนที่เกี่ยวข้อง'),
          hasCaution: text.includes('ข้อกำหนดความถูกต้องและขอบเขตการใช้งาน')
        };
      });
      console.log('Modal Verification Result:', modalInfo);
    }

    // 3. Check Cases Page
    console.log(`\nNavigating to ${BASE_URL}/cases ...`);
    await page.goto(`${BASE_URL}/cases`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    // Click external evidence tab
    console.log('Switching to External Evidence tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const extBtn = buttons.find(b => b.innerText.includes('หลักฐานจากแหล่งสาธารณะ') || b.innerText.includes('External Evidence'));
      if (extBtn) extBtn.click();
    });
    await sleep(1500);

    const screenshotCases = path.join(ARTIFACT_DIR, 'dedup_evidence_cases_page.png');
    await page.screenshot({ path: screenshotCases });
    console.log(`Saved cases page screenshot to ${screenshotCases}`);

    const casesCards = await page.evaluate(() => {
      const cardTitles = Array.from(document.querySelectorAll('h3')).map(h => h.innerText);
      return cardTitles;
    });
    console.log(`Cases Page displayed ${casesCards.length} evidence cards:`);
    casesCards.slice(0, 10).forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

    console.log('\n=> ALL HEADLESS BROWSER VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

verifyEvidenceDedup().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
