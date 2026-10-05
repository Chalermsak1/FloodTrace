import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildMyAreaUrl,
  fetchDistrictSummary,
  formatSummaryCount,
  getSummaryText,
} from '../src/pages/myAreaSummary.ts';

const response = (body: unknown, ok = true): Response => new Response(JSON.stringify(body), { status: ok ? 200 : 503 });

test('returns populated server-backed district summary', async () => {
  const result = await fetchDistrictSummary('กบินทร์บุรี', async () => response({
    district: 'กบินทร์บุรี',
    community_observation_count: 3,
    current_status: 'มีรายงานจากประชาชน',
    data_freshness: 'ข้อมูลล่าสุดจากระบบ',
  }));

  assert.equal(result.status, 'populated');
  if (result.status === 'populated') {
    assert.equal(result.summary.community_observation_count, 3);
    assert.equal(getSummaryText(result.summary.current_status), 'มีรายงานจากประชาชน');
    assert.equal(getSummaryText(result.summary.data_freshness), 'ข้อมูลล่าสุดจากระบบ');
  }
});

test('preserves a legitimate zero-count district response', async () => {
  const result = await fetchDistrictSummary('ศรีมหาโพธิ', async () => response({
    district: 'ศรีมหาโพธิ',
    community_observation_count: 0,
  }));
  assert.equal(result.status, 'populated');
  if (result.status === 'populated') {
    assert.equal(formatSummaryCount(result.summary.community_observation_count), '0');
  }
});

test('treats null, blank, and explicit unavailable fields as unavailable', async () => {
  assert.equal(getSummaryText(null), null);
  assert.equal(getSummaryText('   '), null);
  assert.equal(getSummaryText('ไม่มีข้อมูล'), null);
  assert.equal(formatSummaryCount(null), null);

  const result = await fetchDistrictSummary('นาดี', async () => response({
    district: 'นาดี',
    current_status: null,
    community_observation_count: null,
  }));
  assert.equal(result.status, 'populated');
  if (result.status === 'populated') {
    assert.equal(getSummaryText(result.summary.current_status), null);
    assert.equal(formatSummaryCount(result.summary.community_observation_count), null);
  }
});

test('reports request failures per district', async () => {
  const result = await fetchDistrictSummary('นาดี', async () => response({}, false));
  assert.deepEqual(result, { status: 'error' });

  const thrown = await fetchDistrictSummary('นาดี', async () => { throw new Error('offline'); });
  assert.deepEqual(thrown, { status: 'error' });
});

test('requests each saved district with its own encoded district query', async () => {
  const requested: string[] = [];
  const districts = ['เมืองปราจีนบุรี', 'ศรีมหาโพธิ'];
  const results = await Promise.all(districts.map(district => fetchDistrictSummary(district, async input => {
    requested.push(String(input));
    return response({ district, community_observation_count: 0 });
  })));

  assert.deepEqual(requested.sort(), districts.map(buildMyAreaUrl).sort());
  assert.ok(results.every(result => result.status === 'populated'));
});

test('rejects a malformed or mismatched district response', async () => {
  const missing = await fetchDistrictSummary('นาดี', async () => response({ community_observation_count: 2 }));
  const mismatched = await fetchDistrictSummary('นาดี', async () => response({ district: 'กบินทร์บุรี' }));
  assert.deepEqual(missing, { status: 'unavailable' });
  assert.deepEqual(mismatched, { status: 'unavailable' });
});

test('saved-district summaries do not depend on the zones endpoint', async () => {
  const page = await readFile(new URL('../src/pages/MyAreaPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /fetchDistrictSummary\(district\)/);
  assert.doesNotMatch(page, /\/api\/public\/zones/);
});
