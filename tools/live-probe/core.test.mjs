import test from 'node:test';
import assert from 'node:assert/strict';
import { closeState, connectionUrl, normalizeCreator, ProbeSummary, redact, unpackFrame } from './core.mjs';

const event = (msgId, roomId = '7000000000000000001') => ({ type: 'WebcastGiftMessage', data: {
  common: { msgId, roomId }, user: { id: '7000000000000000011' }, giftId: 1, repeatCount: 5,
} });

test('single and bundled JSON frames share the same event contract', () => {
  const a = event('7000000000000000101');
  assert.deepEqual(unpackFrame(JSON.stringify(a)), [a]);
  assert.deepEqual(unpackFrame({ messages: [a, a] }), [a, a]);
  assert.throws(() => unpackFrame({ messages: [{ name: 'not-an-event' }] }));
  assert.throws(() => unpackFrame('not-json'));
});

test('reconnect duplicates are skipped, but messages from different rooms survive', () => {
  const s = new ProbeSummary();
  assert.equal(s.observe(event('7000000000000000101')), true);
  assert.equal(s.observe(event('7000000000000000101')), false);
  assert.equal(s.observe(event('7000000000000000101', '7000000000000000002')), true);
  assert.equal(s.snapshot().observedEvents.WebcastGiftMessage, 2);
  assert.equal(s.snapshot().duplicateEventsSkipped, 1);
  assert.equal(s.snapshot().observedUserCount, 1);
});

test('rounded IDs and display names never identify people or deduplicate messages', () => {
  const s = new ProbeSummary();
  const unsafe = { type: 'WebcastChatMessage', data: {
    common: { msgId: Number.MAX_SAFE_INTEGER + 1, roomId: '123' },
    user: { id: Number.MAX_SAFE_INTEGER + 1, nickname: '同じ名前' },
  } };
  s.observe(unsafe); s.observe(unsafe);
  assert.equal(s.snapshot().eventsWithoutExactMessageAndRoomId, 2);
  assert.equal(s.snapshot().duplicateEventsSkipped, 0);
  assert.equal(s.snapshot().observedUserCount, 0);
});

test('gift streak notifications and card candidates cannot change inventory or coins', () => {
  const s = new ProbeSummary();
  s.observe(event('1'));
  s.observe({ type: 'WebcastBoostCardMessage', data: { common: { msgId: '2', roomId: '3' } } });
  const snapshot = s.snapshot();
  assert.equal(snapshot.itemCandidateEventTypes.WebcastBoostCardMessage, 1);
  assert.equal(snapshot.verifiedInventoryOperations, 0);
  assert.equal('coinTotal' in snapshot, false);
});

test('connection failure is unknown, not a LIVE-ended event', () => {
  assert.deepEqual(closeState(1006), { state: 'unknown', retryable: true });
  assert.deepEqual(closeState(4401), { state: 'invalid_auth', retryable: false });
  assert.deepEqual(closeState(4005), { state: 'ended', retryable: false });
});

test('secret-bearing payloads and URL query values are redacted recursively', () => {
  const value = { apiKey: 'key', nested: [{ text: 'secret/a secret%2Fa', url: 'wss://example/?apiKey=other' }] };
  const clean = JSON.stringify(redact(value, ['secret/a']));
  assert.ok(!clean.includes('secret'));
  assert.ok(!clean.includes('=other'));
  assert.equal(redact(value).apiKey, '[REDACTED]');
});

test('connection uses the fixed provider and JSON, with no extra paid feature enabled', () => {
  const url = new URL(connectionUrl('@valid.id', 'placeholder-for-test'));
  assert.equal(url.origin, 'wss://ws.eulerstream.com');
  assert.equal(url.searchParams.get('uniqueId'), 'valid.id');
  assert.equal(url.searchParams.get('features.rawMessages'), 'false');
  assert.equal(url.searchParams.get('features.useEnterpriseApi'), 'false');
  assert.throws(() => connectionUrl('valid', ''));
  assert.throws(() => normalizeCreator('https://www.tiktok.com/@valid/live'));
});
