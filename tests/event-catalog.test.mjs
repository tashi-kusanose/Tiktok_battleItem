import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, validateCatalog } from '../events/catalog.mjs';

const masters = { slug: 'masters-october-2026', title: 'MASTERS', page_path: 'masters/', sort_order: 10 };
const king = { slug: 'king-of-stage-2026', title: 'THE KING OF STAGE', page_path: 'king-of-stage/', sort_order: 30 };
const music = { slug: 'music-stage-2026', title: 'MUSIC STAGE', page_path: 'music-stage/', sort_order: 40 };

test('Music Stage is an allowed local destination alongside existing guides', () => {
  assert.deepEqual(validateCatalog([music, king, masters]).map(row => row.page_path), ['masters/', 'king-of-stage/', 'music-stage/']);
  assert.throws(() => validateCatalog([{...music, page_path:'../music-stage/'}]));
});

test('published events are sorted without changing the response', () => {
  const rows = [king, masters];
  assert.deepEqual(validateCatalog(rows).map(row => row.slug), [masters.slug, king.slug]);
  assert.equal(rows[0], king);
});

test('only the intended local destinations are accepted', () => {
  for (const page_path of ['javascript:alert(1)', '//example.com/', '../', 'https://example.com/', 'king-of-stage/']) {
    assert.throws(() => validateCatalog([{ ...masters, page_path }]));
  }
  assert.throws(() => validateCatalog([masters, masters]));
  assert.throws(() => validateCatalog([{ ...masters, slug: 'unknown-event' }]));
});

test('requests only public navigation fields with a publishable key', async () => {
  const rows = await loadCatalog(async (url, options) => {
    assert.equal(url.pathname, '/rest/v1/kazz_event_pages');
    assert.equal(url.searchParams.get('published'), 'eq.true');
    assert.equal(url.searchParams.get('select'), 'slug,title,page_path,sort_order');
    assert.match(options.headers.apikey, /^sb_publishable_/);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.credentials, 'omit');
    return { ok: true, json: async () => [king, masters] };
  });
  assert.equal(rows[0].slug, masters.slug);
});

test('an unavailable API leaves the caller able to retain the static links', async () => {
  await assert.rejects(loadCatalog(async () => ({ ok: false, status: 503 })), /503/);
  await assert.rejects(loadCatalog(async () => ({ ok: true, json: async () => ({}) })), /Invalid/);
});
