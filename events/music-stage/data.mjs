export const START = '2026-10-19T12:00:00+09:00';
export const END = '2026-10-26T00:00:00+09:00';
export const gifts = [
  { id:'score', name:'楽譜', coins:1, crop:'142 404 144 109' },
  { id:'drum', name:'ドラムステージ', coins:300, crop:'475 404 151 109', need:10, bonus:10000, limit:10 },
  { id:'autumn', name:'秋の香り', coins:999, crop:'141 649 151 110', need:5, bonus:15000, limit:10 },
  { id:'show', name:'ショーステージ', coins:2999, crop:'475 649 151 110', need:3, bonus:27000, limit:5 },
  { id:'fuji', name:'富士山', coins:7999, crop:'141 903 151 113', need:1, bonus:35000, limit:3, upperOnly:true },
  { id:'peak', name:'ピークタイム', coins:15000, crop:'475 903 151 113', need:1, bonus:65000, limit:2, upperOnly:true },
  { id:'popular', name:'人気UP', coins:1, crop:'142 1155 151 108' },
  { id:'superpopular', name:'スーパー人気', coins:9, crop:'475 1155 151 108' },
];
export const teams = { akatsuki:'暁', miyabi:'雅', hana:'華' };
export function dailyMissions(team) {
  if (!Object.hasOwn(teams, team)) throw new Error('Unknown team');
  return [
    { id:'visit', name:'ランキングページ確認', task:'イベントのランキングページを確認する', coins:0, bonus:5000, limit:null, note:'達成回数上限は資料で「—」表記。1回分のみ参考表示します。' },
    { id:'live', name:'30分のLIVE配信', task:'LIVE配信を30分間行う', coins:0, bonus:team==='hana'?10000:5000, limit:team==='hana'?5:10 },
    ...gifts.filter(g=>g.need && (team!=='hana'||!g.upperOnly)).map(g=>({...g, task:`${g.name}を${g.need}個集める`, coins:g.coins*g.need})),
  ];
}
export function missionTotals(mission, times=1) {
  const count = Math.min(mission.limit ?? 1, Math.max(0, Math.trunc(Number(times)||0)));
  const coins = mission.coins*count;
  return {count,coins,base:coins*10,bonus:mission.bonus*count,total:coins*10+mission.bonus*count};
}
export function dailySummary(team) {
  return dailyMissions(team).filter(m=>m.id!=='visit').reduce((sum,m)=>{
    const t=missionTotals(m,m.limit);
    for(const k of ['coins','base','bonus','total']) sum[k]+=t[k];
    return sum;
  },{coins:0,base:0,bonus:0,total:0});
}
export function boundedNumber(value,max=1000000) {
  const n=Number(value);
  return Number.isFinite(n)?Math.min(max,Math.max(0,Math.trunc(n))):0;
}
// A one-day estimate. Specified gifts use the gift sheet's explicit 1 coin = 10 pt.
// Ordinary gifts use actual earned diamonds, so no coin-to-diamond assumption is made.
export function calculateDay({team='akatsuki',day='19',quantities={},minutes=0,visit=false,ordinary=0,fan=0,superfan=0,member=0}={}) {
  const missions=dailyMissions(team);
  let coins=0,base=0,giftBonus=0;
  const completions={};
  for(const g of gifts){
    const quantity=boundedNumber(quantities[g.id]);
    coins+=quantity*g.coins;
    base+=quantity*g.coins*10;
    const mission=missions.find(m=>m.id===g.id);
    if(mission){
      const count=Math.min(mission.limit,Math.floor(quantity/mission.need));
      completions[g.id]=count;
      giftBonus+=count*mission.bonus;
    }
  }
  const live=missions.find(m=>m.id==='live');
  const liveCount=Math.min(live.limit,Math.floor(boundedNumber(minutes,1440)/30));
  const daily=giftBonus+liveCount*live.bonus+(visit?5000:0);
  const special=String(day)==='20'?boundedNumber(fan,50)*5000:String(day)==='23'?boundedNumber(superfan,10)*100000:0;
  const ordinaryPoints=boundedNumber(ordinary,1000000000);
  const memberPoints=boundedNumber(member,3550000);
  return {coins,base,giftBonus,liveCount,daily,special,ordinary:ordinaryPoints,member:memberPoints,completions,total:base+ordinaryPoints+daily+special+memberPoints};
}
