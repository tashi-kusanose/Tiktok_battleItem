import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run against any deployed variant: node --test tests/acquisition-time.test.mjs
// Override ACQUISITION_HTML to check another checkout with the same regression suite.
const html = fs.readFileSync(process.env.ACQUISITION_HTML || new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const script of scripts) new vm.Script(script);
const source = scripts.find(s => s.includes('function buildAcquisitionState'));
function extract(name) {
  const start = source.indexOf(`    function ${name}(`);
  assert.notEqual(start, -1, name);
  return source.slice(start, source.indexOf('\n    }', start) + 6);
}
const ctx = vm.createContext({});
const itemDefinitions = source.slice(source.indexOf('    const ITEM_ICONS ='), source.indexOf('    const els ='));
vm.runInContext(`const EXPIRATION_MS = 432000000;\n${itemDefinitions}\n` +
  ['createEmptyCounts','createEmptyExpirations','normalizeExpirations','normalizePeople','addItemCount','subtractItemCount','getTotalCount','isZeroPerson','acquisitionFields','parseAcquisitionDate','acquisitionSignature','buildAcquisitionState'].map(extract).join('\n'), ctx);
const now = Date.parse('2026-10-17T00:30:00+09:00');
const day = 86400000;
const expiry = now + 2 * day;
const person = () => ({ id:'a', name:'テスト', counts:{glove:2,secretGlove:1,timer:0}, expirations:{glove:[expiry, expiry+day],secretGlove:[expiry],timer:[]} });
const draft = (p, expiresAt=expiry, itemKey='glove') => ({personId:p.id,itemKey,expiresAt,signature:ctx.acquisitionSignature(p,itemKey)});
const plain = x => JSON.parse(JSON.stringify(x));

test('changes just one item, preserves count, other types, other people, and source', () => {
  const p=person(), other={...person(),id:'b'}, before=plain([p,other]);
  const result=plain(ctx.buildAcquisitionState([p,other],draft(p),now-day,now));
  assert.deepEqual(result[0].counts,p.counts);
  assert.deepEqual(result[0].expirations.glove,[expiry+day,now+4*day]);
  assert.deepEqual(result[0].expirations.secretGlove,p.expirations.secretGlove);
  assert.deepEqual(result[1],other);
  assert.deepEqual([p,other],before);
});
test('identical timestamps still edit only one item', () => {
  const p=person();p.expirations.glove=[expiry,expiry];
  const r=ctx.buildAcquisitionState([p],draft(p),now-day,now)[0];
  assert.deepEqual(plain(r.expirations.glove),[expiry,now+4*day]);
});
test('secret glove uses the same five-day rule', () => {
  const p=person();const r=ctx.buildAcquisitionState([p],draft(p,expiry,'secretGlove'),now-day,now)[0];
  assert.deepEqual(plain(r.expirations.glove),p.expirations.glove);
  assert.deepEqual(plain(r.expirations.secretGlove),[now+4*day]);
});
test('unknown legacy timestamp can be filled without increasing count', () => {
  const p=person();p.expirations.glove=[expiry];
  const r=ctx.buildAcquisitionState([p],draft(p,null),now-day,now)[0];
  assert.equal(r.counts.glove,2);assert.equal(r.expirations.glove.length,2);
});
test('expired acquisition removes exactly one item and keeps unrelated items', () => {
  const p=person();const r=ctx.buildAcquisitionState([p],draft(p),now-5*day,now)[0];
  assert.equal(r.counts.glove,1);assert.deepEqual(plain(r.expirations.glove),[expiry+day]);
  assert.equal(r.counts.secretGlove,1);
});
test('expired final item removes its owner but keeps other people', () => {
  const p=person();p.counts={glove:1,secretGlove:0,timer:0};p.expirations={glove:[expiry]};
  const other={...person(),id:'b'};
  assert.deepEqual(plain(ctx.buildAcquisitionState([p,other],draft(p),now-6*day,now)),[other]);
});
test('rejects changed count, changed timestamps, and deleted owner', () => {
  const p=person(),d=draft(p);p.counts.glove++;
  assert.throws(()=>ctx.buildAcquisitionState([p],d,now-day,now),/情報が変わりました/);
  p.counts.glove--;p.expirations.glove[0]++;
  assert.throws(()=>ctx.buildAcquisitionState([p],d,now-day,now),/情報が変わりました/);
  assert.throws(()=>ctx.buildAcquisitionState([],d,now-day,now),/情報が変わりました/);
});
test('rejects future, invalid, and missing acquisition dates', () => {
  const p=person();for(const time of [NaN,Infinity,0,now+1]) assert.throws(()=>ctx.buildAcquisitionState([p],draft(p),time,now),/正しい取得日時/);
  for(const fields of [['',''],['2026-02-30','12:00'],['2026-10-16','25:00'],['2026-10-16','12:60']]) assert.ok(Number.isNaN(ctx.parseAcquisitionDate(...fields)));
});
test('local date/time round trips including leap day and year boundary', () => {
  for(const [date,time] of [['2024-02-29','00:00'],['2026-12-31','23:59'],['2026-10-16','15:27']]) {
    assert.deepEqual(plain(ctx.acquisitionFields(ctx.parseAcquisitionDate(date,time))),{date,time});
  }
});
test('expiry can cross year boundary with an exact 120-hour lifetime', () => {
  const n=Date.parse('2026-12-31T23:59:00+09:00'),p=person();
  const r=ctx.buildAcquisitionState([p],draft(p),n,n)[0];
  assert.ok(r.expirations.glove.includes(n+5*day));
});

test('old inventory gains Song Rush defaults without losing existing counts or timestamps', () => {
  const p=person(),before=plain(p),r=ctx.normalizePeople([p])[0];
  assert.equal(r.counts.songRush,0);
  assert.deepEqual(plain(r.expirations.songRush),[]);
  for(const key of Object.keys(p.counts)) assert.equal(r.counts[key],p.counts[key]);
  for(const key of Object.keys(p.expirations)) assert.deepEqual(plain(r.expirations[key]),p.expirations[key]);
  assert.deepEqual(p,before);
});
test('Song Rush survives adding, saving, reloading and subtracting without altering other items', () => {
  const p=ctx.normalizePeople([person()])[0],before=plain(p);
  ctx.addItemCount(p,'songRush');ctx.addItemCount(p,'songRush');
  const restored=ctx.normalizePeople(plain([p]))[0];
  assert.equal(restored.counts.songRush,2);
  assert.equal(restored.expirations.songRush.length,2);
  ctx.subtractItemCount(restored,'songRush');
  assert.equal(restored.counts.songRush,1);
  assert.equal(restored.expirations.songRush.length,1);
  assert.deepEqual(plain(restored.expirations.glove),before.expirations.glove);
  assert.equal(restored.counts.glove,before.counts.glove);
});
test('Song Rush acquisition edits preserve counts and keep owners who have no other items', () => {
  const p=ctx.normalizePeople([{id:'song',name:'ソングのみ',counts:{songRush:2},expirations:{songRush:[expiry,expiry+day]}}])[0];
  const edited=ctx.buildAcquisitionState([p],draft(p,expiry,'songRush'),now-day,now)[0];
  assert.equal(edited.counts.songRush,2);
  assert.deepEqual(plain(edited.expirations.songRush),[expiry+day,now+4*day]);
  const expired=ctx.buildAcquisitionState([edited],draft(edited,expiry+day,'songRush'),now-6*day,now)[0];
  assert.equal(expired.counts.songRush,1);
  assert.deepEqual(plain(expired.expirations.songRush),[now+4*day]);
  assert.deepEqual(plain(ctx.buildAcquisitionState([expired],draft(expired,now+4*day,'songRush'),now-6*day,now)),[]);
});
