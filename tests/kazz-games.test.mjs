import test from 'node:test';
import assert from 'node:assert/strict';
import {bingoLines,winsRps,GAMES,defaults} from '../games/catalog.mjs';
test('bingo requires a full row, column or diagonal; FREE counts',()=>{
 const card=Array.from({length:25},(_,i)=>i+1);card[12]=0;
 assert.equal(bingoLines(card,[]).bingo,false);
 assert.equal(bingoLines(card,[1,2,3,4]).reach,1);
 assert.equal(bingoLines(card,[1,2,3,4,5]).bingo,true);
 assert.equal(bingoLines(card,[3,8,18,23]).bingo,true);
 assert.equal(bingoLines(card,[1,7,19,25]).bingo,true);
 assert.equal(bingoLines(card,[5,9,17,21]).bingo,true);
 assert.equal(bingoLines(card,[1,2,8,19,25]).bingo,false);
});
test('all three rock-paper-scissors outcomes',()=>{
 for(let i=0;i<3;i++){assert.equal(winsRps(i,(i+1)%3),true);assert.equal(winsRps(i,i),false);assert.equal(winsRps(i,(i+2)%3),false)}
});
test('13 playable games and random launcher have valid defaults',()=>{
 assert.equal(GAMES.length,14);for(const g of GAMES.filter(g=>g.id!=='random'))assert.ok(defaults(g).prompt.length<=160);
});
