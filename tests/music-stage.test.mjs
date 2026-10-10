import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyMissions,missionTotals,dailySummary,calculateDay,boundedNumber,START,END} from '../events/music-stage/data.mjs';

test('gift mission prices, base points and bonus stay separate',()=>{
  const show=dailyMissions('akatsuki').find(m=>m.id==='show');
  assert.deepEqual(missionTotals(show),{count:1,coins:8997,base:89970,bonus:27000,total:116970});
  assert.equal(missionTotals(show,100).count,5);
  assert.equal(missionTotals(show,-1).total,0);
});
test('team-specific daily ceilings follow individual source rows',()=>{
  assert.deepEqual(dailySummary('akatsuki'),{coins:178932,base:1789320,bonus:670000,total:2459320});
  assert.deepEqual(dailySummary('miyabi'),dailySummary('akatsuki'));
  assert.deepEqual(dailySummary('hana'),{coins:124935,base:1249350,bonus:435000,total:1684350});
  assert.equal(dailyMissions('hana').length,5);
  assert.equal(dailyMissions('akatsuki').find(m=>m.id==='visit').limit,null);
});
test('gift points include all gifts once, with only complete capped missions',()=>{
  assert.equal(calculateDay({quantities:{drum:9}}).daily,0);
  const t=calculateDay({quantities:{drum:115,show:3},ordinary:123});
  assert.equal(t.base,434970);
  assert.equal(t.daily,127000);
  assert.equal(t.total,562093);
  assert.equal(t.completions.drum,10);
});
test('Hana keeps Fuji and Peak gift points but gets no matching mission bonus',()=>{
  const t=calculateDay({team:'hana',quantities:{fuji:1,peak:1},minutes:600,visit:true});
  assert.equal(t.base,229990);
  assert.equal(t.liveCount,5);
  assert.equal(t.daily,55000);
  assert.equal(t.total,284990);
});
test('special bonuses are limited to the correct date and number of new members',()=>{
  assert.equal(calculateDay({day:'20',fan:60,superfan:10}).special,250000);
  assert.equal(calculateDay({day:'23',fan:50,superfan:20}).special,1000000);
  assert.equal(calculateDay({day:'19',fan:50,superfan:10}).special,0);
  assert.equal(calculateDay({day:'25',member:4000000}).member,3550000);
});
test('normal gift points use earned diamonds and malformed input cannot poison totals',()=>{
  assert.equal(calculateDay({ordinary:999,quantities:{score:1,superpopular:1}}).total,1099);
  assert.equal(calculateDay({ordinary:'oops',minutes:-30,quantities:{peak:Infinity}}).total,0);
  assert.equal(boundedNumber('2.7'),2);
});
test('event boundaries are defined in Japan time, including the final minute',()=>{
  assert.equal(Date.parse(START),Date.parse('2026-10-19T03:00:00Z'));
  assert.equal(Date.parse(END),Date.parse('2026-10-25T15:00:00Z'));
});
