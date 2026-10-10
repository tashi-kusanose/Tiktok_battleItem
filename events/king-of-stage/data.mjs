export const gifts = [
  {id:'cats', name:'キャッツ', short:'キャッツ', coins:599, amount:25, bonus:30000, crop:'264 260 200 185', color:'peach'},
  {id:'fireworks', name:'打ち上げ花火', short:'花火', coins:2999, amount:8, bonus:50000, crop:'823 258 190 187', color:'violet'},
  {id:'dj', name:'DJブルー', short:'DJブルー', coins:5000, amount:4, bonus:60000, crop:'265 689 200 190', color:'blue'},
  {id:'bear', name:'ベアヒーロー', short:'ベア', coins:8000, amount:3, bonus:70000, crop:'815 699 200 186', color:'pink'},
  {id:'secret', name:'特別ギフト', short:'特別ギフト', coins:null, amount:2, bonus:120000, crop:null, color:'mint'}
];
export const dailyMissions = [
  {id:'visit', name:'イベントページ訪問', short:'ページ訪問', label:'公式イベントページを1回訪問', amount:1, coins:0, bonus:500, limit:1, icon:'link', note:'TikTokアプリ内の本イベントページが対象です。このガイドの閲覧は達成に含まれません。'},
  ...gifts.map(g=>({...g, label:`「${g.name}」を${g.amount}個受け取る`, limit:3, giftId:g.id, note:g.coins===null?'ギフト名・コイン数は調整中。2個・120,000ptは提供資料の掲載値です。':'必要コイン数はギフト単価 × 必要個数。通常ポイントは実際の受取ダイヤ数で決まります。'}))
];
export const specialMissions = [
  {id:'likes', name:'100万いいね', short:'100万いいね', label:'いいねを合計1,000,000回もらう', amount:1, coins:0, bonus:100000, limit:1, icon:'heart', note:'期間中最大1回。いいね自体の通常ポイントは資料に記載されていないため、報酬のみ表示しています。'},
  {id:'supporters', name:'100人からキャッツ', short:'キャッツ100人', label:'キャッツを異なる100人から受け取る', amount:100, coins:599, bonus:150000, limit:1, giftId:'cats', note:'必要コイン数は1人1個ずつ、計100個の場合。同じ人から100個では達成条件を満たしません。'}
];
export function missionTotals(mission, repeats=1, assumed=false) {
  const n=Math.max(1,Math.min(mission.limit,Math.floor(Number(repeats)||1)));
  const coins=mission.coins===null?null:mission.coins*mission.amount*n;
  const bonus=mission.bonus*n;
  const base=coins===0?0:(assumed&&coins!==null?coins:null);
  return {count:mission.amount*n, coins, bonus, base, total:base===null?null:base+bonus};
}
export function countValue(value,max) {
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
}
export function calculate({diamonds='',days=3,daily={},special={}}={}) {
  const n=countValue(days,5)||1;
  const counts=Object.fromEntries(dailyMissions.map(m=>[m.id,countValue(daily[m.id]||0,m.limit*n)]));
  const dailyBonus=dailyMissions.reduce((sum,m)=>sum+m.bonus*counts[m.id],0);
  const specialBonus=specialMissions.reduce((sum,m)=>sum+(special[m.id]?m.bonus:0),0);
  const empty=String(diamonds).trim()==='';
  const raw=Number(diamonds);
  const valid=!empty&&Number.isFinite(raw)&&Number.isInteger(raw)&&raw>=0&&raw<=1000000000000;
  const base=valid?raw:null;
  const total=base===null?null:base+dailyBonus+specialBonus;
  return {days:n,counts,base,dailyBonus,specialBonus,bonus:dailyBonus+specialBonus,total,error:!empty&&!valid};
}
export function eventPhase(now=Date.now()) {
  const start=Date.parse('2026-10-19T12:00:00+09:00');
  const end=Date.parse('2026-10-24T00:00:00+09:00');
  if(now<start)return {label:'予選 開催前',target:start,countLabel:'予選開幕まで'};
  if(now<end)return {label:'予選 開催中',target:end,countLabel:'予選終了まで'};
  if(now<Date.parse('2026-11-20T00:00:00+09:00'))return {label:'予選 終了',target:null,countLabel:'次は11.20 Breakers決戦'};
  if(now<Date.parse('2026-11-21T00:00:00+09:00'))return {label:'Breakers決戦 当日',target:null,countLabel:'決戦の開始時刻は公式案内を確認'};
  if(now<Date.parse('2026-12-21T00:00:00+09:00'))return {label:'Legends決戦へ',target:null,countLabel:'次は12.21 Legends決戦'};
  if(now<Date.parse('2026-12-22T00:00:00+09:00'))return {label:'Legends決戦 当日',target:null,countLabel:'決戦の開始時刻は公式案内を確認'};
  return {label:'掲載日程 終了',target:null,countLabel:'2026年の掲載日程は終了しました'};
}
