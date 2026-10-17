import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Override REMAINING_HTML to run this suite against another deployed variant.
const html = fs.readFileSync(process.env.REMAINING_HTML || new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const script of scripts) new vm.Script(script);
const source = scripts.find(s => s.includes('function buildRemainingState'));
function extract(name) {
  const start = source.indexOf(`    function ${name}(`);
  assert.notEqual(start, -1, name);
  return source.slice(start, source.indexOf('\n    }', start) + 6);
}
const ctx = vm.createContext({});
const itemDefinitions = source.slice(source.indexOf('    const ITEM_ICONS ='), source.indexOf('    const els ='));
vm.runInContext(`const HOUR_MS = 3600000; const EXPIRATION_MS = 120 * HOUR_MS;\n${itemDefinitions}\n` +
  ['createEmptyCounts','createEmptyExpirations','normalizeExpirations','normalizePeople','addItemCount','subtractItemCount','getTotalCount','isZeroPerson','remainingDurationFields','parseRemainingDuration','durationSignature','buildRemainingState'].map(extract).join('\n'), ctx);
const now = Date.parse('2026-10-17T12:00:00+09:00');
const hour = 3600000, day = 24 * hour, expiry = now + 2 * day;
const person = () => ({ id:'a', name:'テスト', counts:{glove:2,secretGlove:1,timer:0}, expirations:{glove:[expiry, expiry+day],secretGlove:[expiry],timer:[]} });
const draft = (p, expiresAt=expiry, itemKey='glove') => ({personId:p.id,itemKey,expiresAt,signature:ctx.durationSignature(p,itemKey)});
const plain = x => JSON.parse(JSON.stringify(x));

test('sets remaining days and hours from save time while preserving other items, people and source', () => {
  const p=person(),other={...person(),id:'b'},before=plain([p,other]);
  const result=plain(ctx.buildRemainingState([p,other],draft(p),4*day+6*hour,now));
  assert.deepEqual(result[0].counts,p.counts);
  assert.deepEqual(result[0].expirations.glove,[expiry+day,now+4*day+6*hour]);
  assert.deepEqual(result[0].expirations.secretGlove,p.expirations.secretGlove);
  assert.deepEqual(result[1],other);
  assert.deepEqual([p,other],before);
});
test('remaining duration is anchored to saving, including a delay after opening the editor', () => {
  const p=person(),d=draft(p),savedAt=now+13*hour;
  assert.deepEqual(plain(ctx.buildRemainingState([p],d,day+6*hour,savedAt)[0].expirations.glove),[savedAt+day+6*hour,expiry+day]);
});
test('identical timestamps still edit only one item', () => {
  const p=person();p.expirations.glove=[expiry,expiry];
  const r=ctx.buildRemainingState([p],draft(p),4*day,now)[0];
  assert.deepEqual(plain(r.expirations.glove),[expiry,now+4*day]);
});
test('all eight items, including Song Rush, accept the same remaining duration', () => {
  const keys=Object.keys(ctx.createEmptyCounts());assert.equal(keys.length,8);
  for(const key of keys){
    const p=ctx.normalizePeople([{id:'a',name:'テスト',counts:{[key]:1},expirations:{[key]:[expiry]}}])[0];
    const r=ctx.buildRemainingState([p],draft(p,expiry,key),2*day+6*hour,now)[0];
    assert.equal(r.counts[key],1);
    assert.deepEqual(plain(r.expirations[key]),[now+2*day+6*hour]);
  }
});
test('unknown legacy duration can be set without increasing count', () => {
  const p=person();p.expirations.glove=[expiry];
  const r=ctx.buildRemainingState([p],draft(p,null),day,now)[0];
  assert.equal(r.counts.glove,2);
  assert.deepEqual(plain(r.expirations.glove),[now+day,expiry]);
});
test('zero duration removes exactly one item and keeps unrelated items', () => {
  const p=person();const r=ctx.buildRemainingState([p],draft(p),0,now)[0];
  assert.equal(r.counts.glove,1);
  assert.deepEqual(plain(r.expirations.glove),[expiry+day]);
  assert.equal(r.counts.secretGlove,1);
});
test('zero duration for the final item removes its owner but keeps other people', () => {
  const p=ctx.normalizePeople([{id:'song',name:'ソングのみ',counts:{songRush:1},expirations:{songRush:[expiry]}}])[0];
  const other=person();
  assert.deepEqual(plain(ctx.buildRemainingState([p,other],draft(p,expiry,'songRush'),0,now)),[other]);
});
test('rejects changed counts, changed timestamps and deleted owners', () => {
  const p=person(),d=draft(p);p.counts.glove++;
  assert.throws(()=>ctx.buildRemainingState([p],d,day,now),/情報が変わりました/);
  p.counts.glove--;p.expirations.glove[0]++;
  assert.throws(()=>ctx.buildRemainingState([p],d,day,now),/情報が変わりました/);
  assert.throws(()=>ctx.buildRemainingState([],d,day,now),/情報が変わりました/);
});
test('validates whole days and hours with a total limit of five days', () => {
  assert.equal(ctx.parseRemainingDuration('2','6'),54*hour);
  assert.equal(ctx.parseRemainingDuration('0','0'),0);
  assert.equal(ctx.parseRemainingDuration('5','0'),120*hour);
  assert.equal(ctx.parseRemainingDuration('4','23'),119*hour);
  for(const fields of [['',''],['2',''],['-1','2'],['1.5','0'],['1','24'],['5','1'],['6','0'],['1e2','0'],['NaN','0']]) {
    assert.ok(Number.isNaN(ctx.parseRemainingDuration(...fields)),JSON.stringify(fields));
  }
  for(const duration of [NaN,Infinity,-hour,121*hour,hour/2]) {
    assert.throws(()=>ctx.buildRemainingState([person()],draft(person()),duration,now),/残り日数・時間/);
  }
});
test('prefills remaining fields using the same hour rounding as the list', () => {
  for(const [remaining,fields] of [[1,{days:'0',hours:'1'}],[day-1,{days:'1',hours:'0'}],[day+1,{days:'1',hours:'1'}],[5*day,{days:'5',hours:'0'}],[0,{days:'0',hours:'0'}]]) {
    assert.deepEqual(plain(ctx.remainingDurationFields(now+remaining,now)),fields);
  }
});
test('remaining duration crosses midnight and year boundaries without timezone conversion', () => {
  const n=Date.parse('2026-12-31T23:59:00+09:00'),p=person();
  const r=ctx.buildRemainingState([p],draft(p),day+hour,n)[0];
  assert.ok(r.expirations.glove.includes(n+day+hour));
});
test('old inventory gains Song Rush defaults without losing existing timestamps', () => {
  const p=person(),before=plain(p),r=ctx.normalizePeople([p])[0];
  assert.equal(r.counts.songRush,0);assert.deepEqual(plain(r.expirations.songRush),[]);
  for(const key of Object.keys(p.counts))assert.equal(r.counts[key],p.counts[key]);
  for(const key of Object.keys(p.expirations))assert.deepEqual(plain(r.expirations[key]),p.expirations[key]);
  assert.deepEqual(p,before);
});
test('Song Rush survives adding, saving, reloading and subtracting', () => {
  const p=ctx.normalizePeople([person()])[0],before=plain(p);
  ctx.addItemCount(p,'songRush');ctx.addItemCount(p,'songRush');
  const restored=ctx.normalizePeople(plain([p]))[0];
  assert.equal(restored.counts.songRush,2);assert.equal(restored.expirations.songRush.length,2);
  ctx.subtractItemCount(restored,'songRush');
  assert.equal(restored.counts.songRush,1);assert.equal(restored.expirations.songRush.length,1);
  assert.deepEqual(plain(restored.expirations.glove),before.expirations.glove);
});
