export const START='2026-10-26T12:00:00+09:00';
export const END='2026-11-02T00:00:00+09:00';
export const TEAMS={
 small:{name:'SMALL',base:10000,likes:10000,follow:3,people:5,gift:'ゴジラうちわ',giftId:'fan',max:490000,box:30,shield:1},
 medium:{name:'MEDIUM',base:20000,likes:30000,follow:8,people:8,gift:'ゴジラうちわ',giftId:'fan',max:940000,box:35,shield:1},
 big:{name:'BIG',base:25000,likes:50000,follow:10,people:10,gift:'ゴジラスタンプ',giftId:'stamp',max:1165000,box:40,shield:2},
 mega:{name:'MEGA',base:40000,likes:100000,follow:15,people:30,gift:'ゴジラスタンプ',giftId:'stamp',max:1840000,box:50,shield:3}
};
export const GIFTS=[
 {id:'fan',name:'ゴジラうちわ',coins:10,team:'SMALL / MEDIUM',mission:'クリエイターのデイリーミッション・デイリーランキング対象。',viewer:'3個で通常投票券1枚 / 10回まで',art:'105 205 280 264'},
 {id:'stamp',name:'ゴジラスタンプ',coins:100,team:'BIG / MEGA',mission:'クリエイターのデイリーミッション・デイリーランキング対象。',viewer:'2個で通常投票券1枚 / 10回まで',art:'550 205 280 264'},
 {id:'near',name:'ゴジラ接近中',coins:2500,team:'限定ギフト',mission:'視聴者ミッションの対象。',viewer:'1個で通常投票券1枚 / 10回まで',art:'105 664 280 264'},
 {id:'escape',name:'ゴジラからの逃走',coins:8000,team:'限定ギフト',mission:'視聴者ミッションの対象。',viewer:'1個で通常投票券3枚 / 10回まで',art:'550 664 280 264'},
 {id:'zero',name:'ゴジラマイナスゼロ',coins:15000,team:'限定ギフト',mission:'視聴者ミッションの対象。',viewer:'1個で通常投票券4枚 / 5回まで',art:'315 1110 300 264'}
];
export function creatorMissions(team){const t=TEAMS[team];if(!t)throw new Error('Unknown team');return [
 {id:'live',name:'LIVEを配信する',short:'配信',target:60,unit:'分',limit:4,points:10000,tickets:0,kind:'time'},
 {id:'likes',name:'いいねを集める',short:'いいね',target:t.likes,unit:'回',limit:5,points:t.base,tickets:0,kind:'likes'},
 {id:'likes-large',name:'いいねを集める〈大目標〉',short:'いいね大目標',target:t.likes*10,unit:'回',limit:1,points:t.base*10,tickets:0,kind:'likes'},
 {id:'follow',name:'新しくフォローされる',short:'新規フォロー',target:t.follow,unit:'人',limit:5,points:t.base,tickets:1,kind:'follow'},
 {id:'follow-large',name:'新しくフォローされる〈大目標〉',short:'新規フォロー大目標',target:t.follow*10,unit:'人',limit:1,points:t.base*10,tickets:5,kind:'follow'},
 {id:'gift',name:t.gift+'を贈られる',short:t.gift,target:t.people,unit:'人',limit:5,points:t.base,tickets:0,kind:'gift',giftId:t.giftId},
 {id:'gift-large',name:t.gift+'を贈られる〈大目標〉',short:t.gift+'大目標',target:t.people*10,unit:'人',limit:1,points:t.base*10,tickets:0,kind:'gift',giftId:t.giftId}
];}
export const VIEWER_MISSIONS=[
 {id:'watch',name:'LIVEを合計10分視聴',short:'LIVE視聴',target:10,unit:'分',limit:3,votes:1,tickets:1,kind:'time'},
 {id:'comment',name:'LIVEで3回コメント',short:'コメント',target:3,unit:'回',limit:10,votes:1,tickets:1,kind:'comment'},
 {id:'heart',name:'ハートミーを3個贈る',short:'ハートミー',target:3,unit:'個',limit:7,votes:1,tickets:0,kind:'gift'},
 {id:'fan',name:'ゴジラうちわを3個贈る',short:'ゴジラうちわ',target:3,unit:'個',limit:10,votes:1,tickets:0,kind:'gift'},
 {id:'stamp',name:'ゴジラスタンプを2個贈る',short:'ゴジラスタンプ',target:2,unit:'個',limit:10,votes:1,tickets:0,kind:'gift'},
 {id:'near',name:'ゴジラ接近中を1個贈る',short:'ゴジラ接近中',target:1,unit:'個',limit:10,votes:1,tickets:0,kind:'gift'},
 {id:'escape',name:'ゴジラからの逃走を1個贈る',short:'ゴジラからの逃走',target:1,unit:'個',limit:10,votes:3,tickets:0,kind:'gift'},
 {id:'zero',name:'ゴジラマイナスゼロを1個贈る',short:'ゴジラマイナスゼロ',target:1,unit:'個',limit:5,votes:4,tickets:0,kind:'gift'}
];
export const number=n=>new Intl.NumberFormat('ja-JP').format(n);
export function missionCoins(m){
 if(m.kind!=='gift')return {perClear:0,total:0,minimum:false};
 const gift=GIFTS.find(g=>g.id===(m.giftId||m.id));
 if(!gift||!Number.isFinite(gift.coins))return null;
 return {perClear:gift.coins*m.target,total:gift.coins*m.target*m.limit,minimum:m.unit==='人'};
}
export function safeInteger(value,max=1e12){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(0,Math.floor(n))):0;}
export function progress(m,value){const target=m.target*m.limit,done=safeInteger(value,target),clears=Math.min(m.limit,Math.floor(done/m.target));return {target,done,remaining:target-done,clears,points:clears*(m.points||0),votes:clears*(m.votes||0),tickets:clears*m.tickets};}
export function totalPoints({diamonds=0,votes=0,special=0,mission=0}){return Math.min(safeInteger(diamonds),200000)+safeInteger(votes,700)*5+safeInteger(special)*10000+safeInteger(mission);}
export function remainingComment(team,mission,value){const p=progress(mission,value);return `【FANDOM ${team}】${mission.short}：${p.remaining?`全${mission.limit}回達成まであと${number(p.remaining)}${mission.unit}`:'全回達成！'} 応援よろしくお願いします！`;}
