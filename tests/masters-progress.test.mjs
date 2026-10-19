import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const progress = require('../events/masters/mission-progress.js');
const app = readFileSync(new URL('../events/masters/app.js', import.meta.url), 'utf8');
const gifts = JSON.parse(vm.runInNewContext(app.slice(0, app.indexOf("document.querySelector('#gift-grid')")) + ';JSON.stringify(gifts)'));
const now = Date.parse('2026-10-19T22:00:00+09:00');
const fresh = () => progress.restore(gifts, null, now);

test('comments show the full daily and period targets and fit 141 characters', () => {
  const state = fresh();
  assert.deepEqual(gifts.map(progress.totalTarget), [60, 36, 18, 9, 12, 7]);
  state.missions.crown.count = 13;
  state.missions.wish.count = 9;
  const text = progress.comment(gifts, state);
  assert.match(text, /全達成まで/);
  assert.match(text, /ポーンの挑戦 あと47名分/);
  assert.match(text, /ルークの進撃 あと27個/);
  assert.match(text, /栄光の殿堂 あと12個/);
  assert.match(text, /TikTok Stars あと7個/);
  assert.doesNotMatch(text, /回目/);
  assert.ok(progress.comment(gifts, fresh()).length <= progress.LIMIT);
});

test('finishing one daily round still leaves the other two rounds in the remaining total', () => {
  const state = fresh();
  state.missions.crown.count = 20;
  assert.equal(progress.remaining(gifts[0], state.missions.crown), 40);
  assert.match(progress.comment([gifts[0]], state, true), /あと40名分/);
  state.missions.crown.count = 44;
  assert.equal(progress.remaining(gifts[0], state.missions.crown), 16);
  state.missions.crown.count = 60;
  assert.equal(progress.remaining(gifts[0], state.missions.crown), 0);
  assert.match(progress.comment([gifts[0]], state, true), /全達成！/);
});

test('completed missions are omitted from requests and can be copied as thanks', () => {
  const state = fresh();
  state.missions.wish.count = 12;
  assert.match(progress.comment(gifts, state), /ルークの進撃 あと24個/);
  state.missions.wish.count = 36;
  assert.doesNotMatch(progress.comment(gifts, state), /ルークの進撃/);
  assert.equal(progress.comment([gifts[1]], state, true), '【マスターズ】ルークの進撃 全達成！ありがとうございます！');
  for (const gift of gifts) state.missions[gift.id].count = progress.totalTarget(gift);
  assert.equal(progress.comment(gifts, state), '【マスターズ】ギフトミッション全達成！応援ありがとうございます！');
  assert.match(progress.comment(gifts.slice(0, 4), state), /デイリーミッション全達成/);
  assert.match(progress.comment(gifts.slice(4), state), /期間限定ギフトミッション全達成/);
});

test('reload retains counts and JST midnight resets only daily missions', () => {
  const state = fresh();
  state.missions.crown.count = 46;
  state.missions.glory.count = 10;
  state.missions.stars.count = 4;
  const saved = JSON.stringify(state);
  const before = progress.restore(gifts, saved, Date.parse('2026-10-19T14:59:59Z'));
  assert.deepEqual(before, state);
  const after = progress.restore(gifts, saved, Date.parse('2026-10-19T15:00:00Z'));
  assert.equal(after.day, '2026-10-20');
  assert.deepEqual(after.missions.crown, { count: 0 });
  assert.equal(after.missions.glory.count, 10);
  assert.equal(after.missions.stars.count, 4);
});

test('legacy progress migrates by adding recorded rounds without inventing missing counts', () => {
  const legacy = { version: 1, day: '2026-10-19', missions: {
    crown: { round: 2, counts: [20, 8, 0] }, wish: { round: 3, counts: [12, 12, 4] },
    beat: { round: 2, counts: [0, 2, 0] }, glory: { round: 1, counts: [10] }
  } };
  const state = progress.restore(gifts, JSON.stringify(legacy), now);
  assert.equal(state.version, 2);
  assert.equal(state.missions.crown.count, 28);
  assert.equal(state.missions.wish.count, 28);
  assert.equal(state.missions.beat.count, 2);
  assert.equal(state.missions.glory.count, 10);
  assert.equal(progress.remaining(gifts[0], state.missions.crown), 32);
  const nextDay = progress.restore(gifts, legacy, Date.parse('2026-10-19T15:00:00Z'));
  assert.equal(nextDay.missions.crown.count, 0);
  assert.equal(nextDay.missions.glory.count, 10);
});

test('malformed saved inputs cannot produce negative or invalid remaining counts', () => {
  assert.deepEqual(progress.restore(gifts, 'broken json', now), fresh());
  const state = fresh();
  state.missions.crown = { count: 61 };
  state.missions.wish = { count: '4' };
  state.missions.beat = { count: -1 };
  state.missions.temple = { count: 1.5 };
  const loaded = progress.restore(gifts, state, now);
  for (const gift of gifts.slice(0, 4)) assert.deepEqual(loaded.missions[gift.id], { count: 0 });
  assert.throws(() => progress.remaining(gifts[0], { count: 61 }));
  const legacy = { version: 1, day: '2026-10-19', missions: { crown: { counts: [-1, 0.5, 999] } } };
  assert.equal(progress.restore(gifts, legacy, now).missions.crown.count, 0);
});

test('clipboard success writes the exact comment without the fallback', async () => {
  const expected = progress.comment(gifts, fresh());
  let written;
  const success = await progress.copyText(expected, { clipboard: { async writeText(text) { written = text; } } }, {}, {});
  assert.equal(success, true);
  assert.equal(written, expected);
});

test('clipboard denial selects the visible text and uses the fallback', async () => {
  const calls = [];
  const text = '【マスターズ】全達成まで ポーンの挑戦 あと47名分';
  const textarea = { focus() { calls.push('focus'); }, select() { calls.push('select'); }, setSelectionRange(a, b) { calls.push([a, b]); } };
  const success = await progress.copyText(text, { clipboard: { async writeText() { throw Error('denied'); } } }, { execCommand(command) { calls.push(command); return true; } }, textarea);
  assert.equal(success, true);
  assert.deepEqual(calls, ['focus', 'select', [0, text.length], 'copy']);
});

test('failure never reports a successful copy, and oversized text is not copied', async () => {
  const textarea = { focus() {}, select() {}, setSelectionRange() {} };
  assert.equal(await progress.copyText('手動コピー用', {}, { execCommand() { return false; } }, textarea), false);
  assert.equal(await progress.copyText('手動コピー用', {}, {}, textarea), false);
  let attempted = false;
  assert.equal(await progress.copyText('a'.repeat(142), { clipboard: { async writeText() { attempted = true; } } }, {}, textarea), false);
  assert.equal(attempted, false);
});

test('the progress script loads before the app and has a reachable mission tab', () => {
  const html = readFileSync(new URL('../events/masters/index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('src="mission-progress.js') < html.indexOf('src="app.js'));
  assert.match(html, /data-mission-tab="progress" aria-controls="mission-progress"/);
  assert.match(html, /id="mission-progress"[^>]+aria-labelledby="tab-mission-progress"/);
  assert.match(app, /MastersMissionProgress\.mount/);
});
