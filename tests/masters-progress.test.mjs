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

test('comments distinguish unique viewers from gift quantities and fit 141 characters', () => {
  const state = fresh();
  state.missions.crown.counts[0] = 13;
  state.missions.wish.counts[0] = 9;
  const text = progress.comment(gifts, state);
  assert.match(text, /ポーンの挑戦 あと7名（1回目）/);
  assert.match(text, /ルークの進撃 あと3個（1回目）/);
  assert.match(text, /栄光の殿堂 あと12個/);
  assert.match(text, /TikTok Stars あと7個/);
  assert.ok(progress.comment(gifts, fresh()).length <= progress.LIMIT);
});

test('each daily round has its own progress, and comments use the selected round', () => {
  const state = fresh();
  state.missions.crown = { round: 2, counts: [20, 8, 0] };
  assert.equal(progress.remaining(gifts[0], state.missions.crown), 12);
  assert.match(progress.comment([gifts[0]], state, true), /あと12名（2回目）/);
  state.missions.crown.round = 1;
  assert.match(progress.comment([gifts[0]], state, true), /1回目）達成/);
  state.missions.crown.round = 3;
  assert.match(progress.comment([gifts[0]], state, true), /あと20名（3回目）/);
});

test('completed missions are omitted from requests and can be copied as thanks', () => {
  const state = fresh();
  state.missions.wish.counts[0] = 12;
  assert.doesNotMatch(progress.comment(gifts, state), /ルークの進撃/);
  assert.equal(progress.comment([gifts[1]], state, true), '【マスターズ】ルークの進撃（1回目）達成！ありがとうございます！');
  for (const gift of gifts) state.missions[gift.id].counts[0] = gift.target;
  assert.equal(progress.comment(gifts, state), '【マスターズ】今回のミッション達成！応援ありがとうございます！');
});

test('reload retains counts and JST midnight resets only daily missions', () => {
  const state = fresh();
  state.missions.crown = { round: 3, counts: [20, 20, 6] };
  state.missions.glory.counts[0] = 10;
  state.missions.stars.counts[0] = 4;
  const saved = JSON.stringify(state);
  const before = progress.restore(gifts, saved, Date.parse('2026-10-19T14:59:59Z'));
  assert.deepEqual(before, state);
  const after = progress.restore(gifts, saved, Date.parse('2026-10-19T15:00:00Z'));
  assert.equal(after.day, '2026-10-20');
  assert.deepEqual(after.missions.crown, { round: 1, counts: [0, 0, 0] });
  assert.equal(after.missions.glory.counts[0], 10);
  assert.equal(after.missions.stars.counts[0], 4);
});

test('malformed saved inputs cannot produce negative or invalid remaining counts', () => {
  assert.deepEqual(progress.restore(gifts, 'broken json', now), fresh());
  const state = fresh();
  state.missions.crown = { round: 99, counts: [-1, 0.5, 999] };
  state.missions.wish = { round: 2, counts: ['4', 6, null] };
  const loaded = progress.restore(gifts, state, now);
  assert.deepEqual(loaded.missions.crown, { round: 1, counts: [0, 0, 0] });
  assert.deepEqual(loaded.missions.wish, { round: 2, counts: [0, 6, 0] });
  assert.throws(() => progress.remaining(gifts[0], { round: 1, counts: [21] }));
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
  const text = '【マスターズ】ポーンの挑戦 あと7名（1回目）';
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
