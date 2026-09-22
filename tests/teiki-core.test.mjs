import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeDocument,publicDocument,publishIssues,resolveText,countText,copyText,esc} from '../comments/core.mjs';
const starter=JSON.parse(readFileSync(new URL('../comments/starter.json',import.meta.url)));
test('51 legacy messages preserved; three unfilled progress messages stay private',()=>{assert.equal(starter.comments.length,51);assert.equal(publicDocument(starter).comments.length,48);assert.deepEqual(publishIssues(starter),[]);});
test('name, emoji and changing goals resolve only explicit variables',()=>{const r=resolveText('{{名前}} {{推しマ}} {{残り数}}本 {{残り人数}}人',{name:'別の配信者',mark:'🎙️🧡',goal:'100',current:'24',peopleGoal:'10',peopleCurrent:'3'});assert.equal(r.text,'別の配信者 🎙️🧡 76本 7人');assert.deepEqual(r.missing,[]);});
test('missing values and unknown variables cannot silently publish',()=>{const d=structuredClone(starter);d.comments[0].text='{{知らない値}}';assert.ok(publishIssues(d).some(x=>x.includes('知らない値')));assert.equal(resolveText('{{残り数}}',{goal:'100',current:''}).missing.length,1);});
test('negative remaining values clamp to zero; zero is a valid input',()=>{assert.equal(resolveText('{{残り数}}',{goal:'0',current:'4'}).text,'0');});
test('grapheme count preserves joined and variation-selector emoji',()=>{assert.equal(countText('🎙️🧡'),2);assert.equal(countText('👩‍👩‍👧‍👦'),1);});
test('141 limit checks final resolved text',()=>{const d=structuredClone(starter);d.comments[0].text='あ'.repeat(142);assert.ok(publishIssues(d).some(x=>x.includes('142')));});
test('hidden categories remove their comments from public projection',()=>{const d=structuredClone(starter);d.categories.find(c=>c.id==='song').visible=false;assert.equal(publicDocument(d).comments.length,28);});
test('unknown fields cannot leak through backup import or public output',()=>{const d=structuredClone(starter);d.privateNote='秘密';d.settings.secret='秘密';assert.equal(normalizeDocument(d).privateNote,undefined);assert.equal(publicDocument(d).settings.secret,undefined);});
test('invalid category IDs, duplicate message IDs and negative input are rejected',()=>{for(const alter of [d=>d.categories[0].id='favorites',d=>d.comments[1].id=d.comments[0].id,d=>d.settings.current='-1']){const d=structuredClone(starter);alter(d);assert.throws(()=>normalizeDocument(d));}});
test('user HTML remains escaped text',()=>{assert.equal(esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');});
function fakeDocument(result){return {activeElement:{focus(){}},body:{appendChild(){}},createElement:()=>({style:{},setAttribute(){},focus(){},select(){},setSelectionRange(){},remove(){}}),execCommand:()=>{if(result instanceof Error)throw result;return result;}};}
test('failed Clipboard API plus false fallback returns failure',async()=>{assert.equal(await copyText('text',{clipboard:{writeText:async()=>{throw Error();}},document:fakeDocument(false)}),false);});
test('throwing fallback returns failure',async()=>{assert.equal(await copyText('text',{clipboard:null,document:fakeDocument(Error())}),false);});
test('actual clipboard promise success returns success; successful fallback also works',async()=>{let v;assert.equal(await copyText('🌼🎙💋',{clipboard:{writeText:async t=>{v=t;}},document:null}),true);assert.equal(v,'🌼🎙💋');assert.equal(await copyText('x',{clipboard:null,document:fakeDocument(true)}),true);});
