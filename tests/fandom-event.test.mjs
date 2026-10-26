import test from 'node:test';
import assert from 'node:assert/strict';
import {TEAMS,VIEWER_MISSIONS,creatorMissions,progress,totalPoints,remainingComment,missionCoins} from '../events/fandom/data.mjs';
import {validateCatalog} from '../events/catalog.mjs';

test('daily mission rewards match all four totals in the event announcement',()=>{
 for(const [team,expected] of Object.entries({small:490000,medium:940000,big:1165000,mega:1840000})){
  const missions=creatorMissions(team);
  assert.equal(missions.reduce((n,m)=>n+m.points*m.limit,0),expected);
  assert.equal(TEAMS[team].max,expected);
  assert.equal(missions.reduce((n,m)=>n+m.tickets*m.limit,0),10);
 }
 assert.equal(VIEWER_MISSIONS.reduce((n,m)=>n+m.votes*m.limit,0),100);
 assert.equal(VIEWER_MISSIONS.reduce((n,m)=>n+m.tickets*m.limit,0),13);
});

test('remaining counts target every allowed clear and clamp invalid inputs',()=>{
 const mission=creatorMissions('mega')[5];
 assert.equal(progress(mission,30).remaining,120);
 assert.equal(progress(mission,30).points,40000);
 assert.equal(progress(mission,149).clears,4);
 assert.equal(progress(mission,150).points,200000);
 assert.equal(progress(mission,999).remaining,0);
 assert.equal(progress(mission,-1).done,0);
 assert.equal(progress(mission,Infinity).done,0);
 assert.match(remainingComment('MEGA',mission,30),/全5回達成まであと120人/);
});

test('overall points cap only the gift contribution and keep mission rewards separate',()=>{
 assert.equal(totalPoints({diamonds:300000,votes:700,special:2,mission:490000}),713500);
 assert.equal(totalPoints({diamonds:200001}),200000);
 assert.equal(totalPoints({diamonds:0,votes:800}),3500);
 assert.equal(totalPoints({diamonds:-1,votes:Infinity}),0);
 assert.equal(totalPoints({special:10}),100000);
});

test('gift mission costs include every clear and distinguish people-based minimums',()=>{
 for(const [team,perClear,total,large] of [['small',50,250,500],['medium',80,400,800],['big',1000,5000,10000],['mega',3000,15000,30000]]){
  const missions=creatorMissions(team);
  assert.deepEqual(missionCoins(missions[5]),{perClear,total,minimum:true});
  assert.deepEqual(missionCoins(missions[6]),{perClear:large,total:large,minimum:true});
 }
 const totals={fan:300,stamp:2000,near:25000,escape:80000,zero:75000};
 for(const [id,total] of Object.entries(totals)){
  const mission=VIEWER_MISSIONS.find(m=>m.id===id);
  assert.deepEqual(missionCoins(mission),{perClear:total/mission.limit,total,minimum:false});
 }
 assert.equal(missionCoins(VIEWER_MISSIONS.find(m=>m.id==='heart')),null);
 assert.deepEqual(missionCoins(creatorMissions('small')[0]),{perClear:0,total:0,minimum:false});
});

test('the event catalog accepts only the intended FANDOM destination',()=>{
 const row={slug:'fandom-october-2026',title:'LIVE FANDOM+',page_path:'fandom/',sort_order:50};
 assert.equal(validateCatalog([row])[0].page_path,'fandom/');
 assert.throws(()=>validateCatalog([{...row,page_path:'../fandom/'}]));
});
