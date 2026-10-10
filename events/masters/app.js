'use strict';
const icons={crown:'<path d="m2 7 5 5 5-8 5 8 5-5-3 13H5L2 7Z"/><path d="M5 17h14"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/>',calculator:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',flag:'<path d="M4 22V3m0 1c5-5 11 5 16 0v11c-5 5-11-5-16 0"/>',medal:'<circle cx="12" cy="8" r="5"/><path d="m8 12-3 9 7-3 7 3-3-9"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',file:'<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h6"/>',chart:'<path d="M4 20V10m8 10V4m8 16v-7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',sparkle:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h3m2 0h3"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.info}</svg>`;
const format=(n)=>new Intl.NumberFormat('ja-JP').format(n);
const gifts=[
 {id:'crown',name:'マスターズクラウン',coins:30,crop:[180,440,190,142],isNew:true,type:'デイリー',condition:'20名の視聴者から受け取る',short:'クラウン',target:20,unit:'名',points:30000,description:'人数が条件です。同じ人から20個受け取っても、20名の達成にはなりません。'},
 {id:'wish',name:'マスターズウィッシュ',coins:500,crop:[610,432,154,150],isNew:true,type:'デイリー',condition:'12個受け取る',short:'ウィッシュ',target:12,unit:'個',points:26000,description:'受け取ったギフトの個数でカウント。1回の達成に12個が必要です。'},
 {id:'beat',name:'時の鼓動',coins:2000,crop:[120,875,170,155],type:'デイリー',condition:'6個受け取る',short:'時の鼓動',target:6,unit:'個',points:42000,description:'受け取ったギフトの個数でカウント。1回の達成に6個が必要です。'},
 {id:'temple',name:'天空神殿',coins:8000,crop:[398,876,171,155],type:'デイリー',condition:'3個受け取る',short:'天空神殿',target:3,unit:'個',points:72000,description:'受け取ったギフトの個数でカウント。1回の達成に3個が必要です。'},
 {id:'glory',name:'栄光の殿堂',coins:20000,crop:[660,875,170,158],type:'期間限定',condition:'12個受け取る',short:'栄光の殿堂',target:12,unit:'個',points:264000,description:'イベント期間を通して12個受け取ると達成。ボーナスの獲得は期間中1回です。'},
 {id:'stars',name:'TikTok Stars',coins:39999,crop:[395,1200,179,155],type:'期間限定',condition:'7個受け取る',short:'TikTok Stars',target:7,unit:'個',points:336000,description:'イベント期間を通して7個受け取ると達成。ボーナスの獲得は期間中1回です。'}
];
const pageMission={id:'page',name:'イベントページを開く',points:50000,target:1,unit:'回',condition:'イベントページを1回開く',description:'TikTokアプリ内の大会ページが対象です。このガイドを開いても達成にはなりません。'};
const dailyMissions=gifts.slice(0,4),periodMissions=[pageMission,...gifts.slice(4)];
const sources=[
 {file:'01-1000043030.png',title:'01 · 第6回 注目ポイント',width:723,height:1536},
 {file:'02-1000043032.png',title:'02 · イベント概要',width:939,height:1536},
 {file:'03-1000043034.png',title:'03 · 限定ギフト一覧',width:963,height:1536},
 {file:'04-1000043047.png',title:'04 · 限定ギフト・ランキング紹介',width:673,height:1536},
 {file:'05-1000043039.png',title:'05 · ギフトランキングの計算ルール',width:909,height:1536},
 {file:'06-1000043041.png',title:'06 · ボーナスタイム・各ミッション',width:581,height:1536},
 {file:'07-1000043043.png',title:'07 · ギフトランキング特典',width:831,height:1536},
 {file:'08-1000043045.png',title:'08 · デイリーランキング・抽選特典',width:599,height:1536}
];
const cropGift=(g,label=false)=>`<svg viewBox="${g.crop.join(' ')}" ${label?`role="img" aria-label="${g.name}"`:'aria-hidden="true"'}><image href="assets/03-1000043034.png" width="963" height="1536"/></svg>`;
document.querySelector('#gift-grid').innerHTML=gifts.map((g,i)=>`<article class="gift-card ${g.isNew?'new':''}"><div class="gift-topline"><span class="gift-number">GIFT ${String(i+1).padStart(2,'0')}</span>${g.isNew?'<span class="new-badge">NEW</span>':g.id==='stars'?'<span class="new-badge">SPECIAL</span>':''}</div><div class="gift-art">${cropGift(g,true)}</div><div class="gift-info"><h2>${g.name}</h2><div class="gift-price"><b>${format(g.coins)}</b><span>コイン</span></div><div class="gift-mission"><span>${g.type}ミッション</span><b>${g.condition}</b></div><button data-gift-mission="${g.id}">達成ボーナス +${format(g.points)}pt</button></div></article>`).join('');
function missionAmounts(g,rounds=1){
 if(!Number.isInteger(rounds)||rounds<1||rounds>3||(g.type!=='デイリー'&&rounds!==1))throw new Error('達成回数が不正です。');
 const coins=(g.coins||0)*g.target*rounds,eventPoints=coins*3,bonusPoints=g.points*rounds;
 return {coins,eventPoints,bonusPoints,total:eventPoints+bonusPoints,rounds,assumedDiamondsPerCoin:1,excludedBonusTime:true};
}
const missionSelection={daily:'crown',period:'page'};
let missionRounds=1;
function missionCard(g,daily,i){
 const n=daily?missionRounds:1,a=missionAmounts(g,n),estimate=g.id!=='page';
 const condition=g.id==='page'?'TikTok内のイベントページを1回開く':g.id==='crown'?'各回、20名の視聴者から1個ずつ受け取る':`各回、${g.target}個を受け取る`;
 return `<article class="mission-card" id="mission-${g.id}" role="tabpanel" aria-labelledby="pick-${g.id}"><div class="mission-card-top"><div class="mission-icon ${g.id==='page'?'is-page':''}">${g.id==='page'?icon('file'):cropGift(g)}</div><div><span class="eyebrow">${daily?'DAILY':'EVENT'} MISSION · ${n}回達成</span><h3>${g.name}</h3></div><button class="mission-help icon-button" data-mission-detail="${g.id}" aria-label="${g.name}の詳しい条件">${icon('info')}</button></div><p class="mission-condition">${condition}</p><div class="mission-amounts"><div class="amount-cell coin-cell"><span>必要コイン数${g.id==='crown'?'（最低）':''}</span><b>${format(a.coins)}<small>コイン</small></b><small>${g.id==='page'?'ギフト送付不要':`${format(g.coins)} × ${g.target}${g.id==='crown'?'人 × 1個':'個'}${n>1?` × ${n}回`:''}`}</small></div><div class="amount-cell event-cell"><span>イベントポイント${estimate?' <em>参考</em>':''}</span><b>${format(a.eventPoints)}<small>pt</small></b><small>${format(a.coins)} × 3</small></div><div class="amount-cell bonus-cell"><span>ボーナスポイント</span><b>${format(a.bonusPoints)}<small>pt</small></b><small>${format(g.points)} × ${n}回達成</small></div></div><div class="mission-total"><div><span>トータルポイント${estimate?'（参考）':''}</span><small>イベントpt ＋ ボーナスpt</small></div><b>${format(a.total)}<small>pt</small></b></div><p class="mission-footnote">${g.id==='crown'?'20個ではなく20名が条件。各回の人数集計はアプリ内で確認。':g.id==='page'?'このガイドではなく、TikTokアプリ内の大会ページが対象。':daily?'1日最大3回まで達成可能。表示は選択した回数の合計。':'10/19〜10/25の期間内に1回だけ獲得可能。'}</p></article>`;
}
function renderMissions(){
 ['daily','period'].forEach(group=>{const data=group==='daily'?dailyMissions:periodMissions;
 document.querySelector(`#${group}-missions`).innerHTML=data.map((g,i)=>missionCard(g,group==='daily',i)).join('');
 document.querySelector(`#${group}-picker`).innerHTML=data.map(g=>`<button id="pick-${g.id}" role="tab" data-select-mission="${g.id}" data-mission-group="${group}" aria-controls="mission-${g.id}" aria-selected="${g.id===missionSelection[group]}" tabindex="${g.id===missionSelection[group]?0:-1}">${g.short||'ページ閲覧'}</button>`).join('');
 selectMission(missionSelection[group],group);
 });
}
function selectMission(id,group){
 const data=group==='daily'?dailyMissions:periodMissions;if(!data.some(g=>g.id===id))return;
 missionSelection[group]=id;data.forEach(g=>document.querySelector(`#mission-${g.id}`).hidden=g.id!==id);
 document.querySelectorAll(`[data-mission-group="${group}"]`).forEach(b=>{const selected=b.dataset.selectMission===id;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
}
renderMissions();
document.querySelector('#mission-rounds').addEventListener('change',e=>{missionRounds=Number(e.target.value);renderMissions();});
document.querySelectorAll('.mission-picker').forEach(picker=>{
 picker.addEventListener('click',e=>{const b=e.target.closest('[data-select-mission]');if(b)selectMission(b.dataset.selectMission,b.dataset.missionGroup);});
 picker.addEventListener('keydown',handlePickerKeys);
});
document.querySelector('#gift-picker').innerHTML=gifts.map((g,i)=>`<button role="tab" id="gift-pick-${g.id}" aria-controls="gift-${g.id}" data-select-gift="${g.id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span>${String(i+1).padStart(2,'0')}</span>${g.short}</button>`).join('');
document.querySelectorAll('.gift-card').forEach((el,i)=>{el.id=`gift-${gifts[i].id}`;el.setAttribute('role','tabpanel');el.setAttribute('aria-labelledby',`gift-pick-${gifts[i].id}`);el.hidden=i!==0;});
function selectGift(id){gifts.forEach(g=>document.querySelector(`#gift-${g.id}`).hidden=g.id!==id);document.querySelectorAll('[data-select-gift]').forEach(b=>{const selected=b.dataset.selectGift===id;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});}
document.querySelector('#gift-picker').addEventListener('click',e=>{const b=e.target.closest('[data-select-gift]');if(b)selectGift(b.dataset.selectGift);});
document.querySelector('#gift-picker').addEventListener('keydown',handlePickerKeys);
function handlePickerKeys(e){if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const bs=[...e.currentTarget.querySelectorAll('[role="tab"]')],i=bs.indexOf(e.target);if(i<0)return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+bs.length)%bs.length;bs[n].click();bs[n].focus();}
document.querySelector('#calc-daily').innerHTML=dailyMissions.map(g=>`<label><span>${g.name}<small>${g.condition} / 1回 +${format(g.points)}pt</small></span><select name="daily-${g.id}" id="daily-${g.id}" aria-label="${g.name}ミッションの達成回数">${[0,1,2,3].map(n=>`<option value="${n}">${n}回</option>`).join('')}</select></label>`).join('');
document.querySelector('#calc-period').innerHTML=periodMissions.map(g=>`<label><input type="checkbox" name="period-${g.id}" id="period-${g.id}"><span>${g.condition}<small>+${format(g.points)}pt · 期間中1回のみ</small></span></label>`).join('');
document.querySelector('#podium').innerHTML=[{rank:'01',x:63,name:'金',label:'GOLD'},{rank:'02',x:299,name:'銀',label:'SILVER'},{rank:'03',x:538,name:'銅',label:'BRONZE'}].map(p=>`<article class="podium-card"><span class="podium-rank">TOP ${p.rank}</span><svg viewBox="${p.x} 132 226 330" role="img" aria-label="第6回記念盾 ${p.name}"><image href="assets/07-1000043043.png" width="831" height="1536"/></svg><h3>第6回 記念盾（${p.name}）</h3><p>${p.label} · 各チーム</p></article>`).join('');
document.querySelector('#daily-reward-list').innerHTML=[['01',60000],['02',45000],['03',30000],['04–10',20000],['11–20',10000]].map(([r,p])=>`<div class="daily-reward-row"><span>TOP ${r}</span><b>${format(p)}<small>pt</small></b><em>＋3抽選pt</em></div>`).join('');
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));

const viewIds=['overview','gifts','points','missions','rewards'];
let activeView='overview';
function showView(id,options={}){
 if(!viewIds.includes(id))return;
 activeView=id;
 document.querySelectorAll('.view').forEach(el=>{el.hidden=el.id!==id;el.classList.toggle('active',el.id===id);});
 document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===id;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(!options.fromHash && location.hash!==`#${id}`)history.pushState(null,'',`#${id}`);
 if(!options.keepScroll)document.querySelector('#main').scrollTop=0;
 if(options.focus)document.querySelector(`#${id} h1`).setAttribute('tabindex','-1'),document.querySelector(`#${id} h1`).focus({preventScroll:true});
}
document.querySelectorAll('[data-view],[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view||b.dataset.go,{focus:true})));
window.addEventListener('popstate',()=>showView(location.hash.slice(1)||'overview',{fromHash:true}));
window.addEventListener('hashchange',()=>showView(location.hash.slice(1)||'overview',{fromHash:true}));
const groups={overview:{prefix:'overview-',data:'overviewTab'},point:{prefix:'point-',data:'pointTab'},mission:{prefix:'mission-',data:'missionTab'},reward:{prefix:'reward-',data:'rewardTab'}};
function switchTab(group,value){
 const cfg=groups[group],attr=`data-${group}-tab`;
 if(!document.querySelector(`[${attr}="${value}"]`))return;
 document.querySelectorAll(`[${attr}]`).forEach(b=>{const selected=b.dataset[cfg.data]===value;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;document.querySelector('#'+b.getAttribute('aria-controls')).hidden=!selected;});
 if(group==='mission'){document.querySelector('#mission-rounds-label').hidden=value==='period';document.querySelector('#mission-limit-text').textContent=value==='daily'?'各ミッション、毎日最大3回':'各ミッション、期間中1回';}
}
Object.keys(groups).forEach(group=>{const buttons=[...document.querySelectorAll(`[data-${group}-tab]`)];buttons.forEach((b,i)=>{b.addEventListener('click',()=>switchTab(group,b.dataset[groups[group].data]));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%buttons.length;else if(e.key==='ArrowLeft')next=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();buttons[next].click();buttons[next].focus();});});});
function setRankingComparison(rank){
 if(!['gift','daily'].includes(rank))return;
 document.querySelector('#ranking-comparison').dataset.rank=rank;
 document.querySelectorAll('[data-compare-ranking]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.compareRanking===rank)));
 document.querySelector('#ranking-comparison-caption').textContent=rank==='gift'?'ギフトランキング · 7日間の累計・5チーム別':'デイリーランキング · 毎日・全クリエイター共通';
}
document.querySelectorAll('[data-compare-ranking]').forEach(button=>button.addEventListener('click',()=>setRankingComparison(button.dataset.compareRanking)));
document.querySelectorAll('[data-gift-mission]').forEach(b=>b.addEventListener('click',()=>{const g=gifts.find(g=>g.id===b.dataset.giftMission);showView('missions');switchTab('mission',g.type==='デイリー'?'daily':'period');selectMission(g.id,g.type==='デイリー'?'daily':'period');}));
document.querySelector('#mission-calc')?.addEventListener('click',()=>{showView('points',{focus:true});switchTab('point','calc');});

function computePoints(data){
 const limited=data.limited*3,other=data.other,likes=Math.min(data.likes,50000);
 const daily=dailyMissions.reduce((total,g,i)=>total+g.points*data.daily[i],0);
 const period=periodMissions.reduce((total,g,i)=>total+(data.period[i]?g.points:0),0);
 return {limited,other,likes,daily,period,rank:data.rank,giftTotal:limited+other+likes+daily+period+data.rank,dailyTotal:limited+likes,excludedBonusTime:true};
}
function readCalc(){return {limited:Number(document.querySelector('#limited-diamonds').value)||0,other:Number(document.querySelector('#other-diamonds').value)||0,likes:Number(document.querySelector('#likes').value)||0,daily:dailyMissions.map(g=>Number(document.querySelector(`#daily-${g.id}`).value)),period:periodMissions.map(g=>document.querySelector(`#period-${g.id}`).checked),rank:Number(document.querySelector('#daily-rank').value)};}
function isValidCalc(data){return [data.limited,data.other,data.likes].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000)&&Array.isArray(data.daily)&&data.daily.length===4&&data.daily.every(n=>Number.isInteger(n)&&n>=0&&n<=3)&&Array.isArray(data.period)&&data.period.length===3&&data.period.every(n=>typeof n==='boolean')&&[0,60000,45000,30000,20000,10000].includes(data.rank);}
function updateCalc(){
 const data=readCalc();if(!isValidCalc(data)||!document.querySelector('#calc-form').checkValidity()){document.querySelector('#calc-error').textContent='ダイヤ数・いいね数は0〜1,000,000,000の整数で入力してください。';document.querySelector('#result-total').textContent='—';document.querySelector('#result-daily').textContent='—';document.querySelector('#result-breakdown').innerHTML='';return null;}
 document.querySelector('#calc-error').textContent='';const r=computePoints(data);
 document.querySelector('#result-total').textContent=format(r.giftTotal);document.querySelector('#result-daily').textContent=format(r.dailyTotal);
 document.querySelector('#result-breakdown').innerHTML=[['限定ギフト',r.limited],['その他ギフト',r.other],['いいね（上限適用後）',r.likes],['デイリーミッション',r.daily],['期間限定ミッション',r.period],['デイリー入賞ボーナス',r.rank]].map(([label,value])=>`<div><span>${label}</span><b>${format(value)} pt</b></div>`).join('');return r;
}
const formContainer=document.querySelector('#calc-form');
let calcStep=0;
const calcSteps=[];let stepSection;
[...formContainer.children].forEach(node=>{
 if(node.tagName==='H3'){stepSection=document.createElement('div');stepSection.className='calc-step';stepSection.id=`calc-step-${calcSteps.length}`;stepSection.setAttribute('role','tabpanel');stepSection.setAttribute('aria-labelledby',`calc-step-tab-${calcSteps.length}`);calcSteps.push(stepSection);formContainer.insertBefore(stepSection,node);}
 if(stepSection&&!node.matches('.calc-actions,.validation-message'))stepSection.append(node);
});
document.querySelector('#calc-step-tabs').innerHTML=['ギフト','毎日','期間限定','入賞'].map((name,i)=>`<button role="tab" id="calc-step-tab-${i}" aria-controls="calc-step-${i}" data-calc-step="${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${i+1}. ${name}</button>`).join('');
function setCalcStep(n){calcStep=Math.max(0,Math.min(3,n));calcSteps.forEach((el,i)=>el.hidden=i!==calcStep);document.querySelectorAll('[data-calc-step]').forEach(b=>{const selected=Number(b.dataset.calcStep)===calcStep;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});document.querySelector('#calc-step-number').textContent=`${calcStep+1} / 4`;document.querySelector('#calc-back').disabled=calcStep===0;document.querySelector('#calc-next').textContent=calcStep===3?'入力例を見る':'次の項目';}
document.querySelector('#calc-step-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-calc-step]');if(b)setCalcStep(Number(b.dataset.calcStep));});
document.querySelector('#calc-step-tabs').addEventListener('keydown',handlePickerKeys);
document.querySelector('#calc-back').addEventListener('click',()=>setCalcStep(calcStep-1));
document.querySelector('#calc-next').addEventListener('click',()=>{if(calcStep<3)setCalcStep(calcStep+1);else{document.querySelector('#load-example').click();setCalcStep(0);}});
setCalcStep(0);
const calcForm=document.querySelector('#calc-form');calcForm.addEventListener('input',updateCalc);calcForm.addEventListener('change',updateCalc);calcForm.addEventListener('submit',e=>e.preventDefault());calcForm.addEventListener('reset',()=>setTimeout(updateCalc,0));
function applyCalc(data){
 if(!isValidCalc(data))throw new Error('入力値が不正です。整数・達成回数・順位を確認してください。');
 document.querySelector('#limited-diamonds').value=data.limited;document.querySelector('#other-diamonds').value=data.other;document.querySelector('#likes').value=data.likes;
 dailyMissions.forEach((g,i)=>document.querySelector(`#daily-${g.id}`).value=data.daily[i]);periodMissions.forEach((g,i)=>document.querySelector(`#period-${g.id}`).checked=data.period[i]);document.querySelector('#daily-rank').value=data.rank;return updateCalc();
}
document.querySelector('#load-example').addEventListener('click',()=>applyCalc({limited:10000,other:2000,likes:60000,daily:[1,1,0,0],period:[true,false,false],rank:0}));
updateCalc();

const sourceDialog=document.querySelector('#source-dialog');let sourceOpener;
document.querySelector('#source-select').innerHTML=sources.map((s,i)=>`<option value="${i+1}">${s.title}</option>`).join('');
function setSource(n){const s=sources[n-1]||sources[0],img=document.querySelector('#source-image');img.src=`assets/${s.file}`;img.alt=s.title;img.width=s.width;img.height=s.height;document.querySelector('#source-select').value=String(n);}
function openSource(n=1){setSource(n);sourceOpener=document.activeElement;sourceDialog.showModal();document.body.classList.add('dialog-open');sourceDialog.scrollTop=0;}
document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>openSource(Number(b.dataset.source))));
document.querySelector('#open-sources').addEventListener('click',()=>openSource());document.querySelector('#footer-sources')?.addEventListener('click',()=>openSource());document.querySelector('#close-source').addEventListener('click',()=>sourceDialog.close());
sourceDialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');sourceOpener?.focus();});
sourceDialog.addEventListener('click',e=>{if(e.target===sourceDialog){const r=sourceDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)sourceDialog.close();}});
document.querySelector('#source-select').addEventListener('change',e=>{setSource(Number(e.target.value));sourceDialog.scrollTop=0;});

const detailDialog=document.querySelector('#detail-dialog');let detailOpener;
const detailsContent={
 assumption:{title:'ポイントの計算前提',html:'<p>必要コイン数は「ギフト1個のコイン数 × 達成に必要な個数 × 達成回数」で算出します。クラウンは、20名が各1個を送った場合の最低額です。</p><p>原本で確定しているのは「イベント限定ギフトは受取1ダイヤ＝3pt」です。コインからダイヤへの換算式は資料にありません。</p><p>比較用のイベントptとトータルptは、<strong>1コイン＝1ダイヤと仮定</strong>した参考値です。必要コイン数と達成ボーナスは原本に基づく数値です。ボーナスタイムの追加分、いいね、順位ボーナスは含みません。</p><p>同じギフトの獲得ポイントを重複加算しないよう、実績の試算では「ポイント」画面に実際の受取ダイヤ数と達成回数を別々に入力してください。</p>'},
 about:{title:'このガイドについて',html:'<p>第6回 MASTERS CHAMPIONSHIPの大会案内8枚をもとに、KazzCompanyが作成した非公式ガイドです。掲載資料：2026年10月7日。</p><p>最新の条件・獲得実績はTikTokアプリ内で確認してください。ボーナスタイムの追加倍率、視聴者応援ランキングの詳細、Vault招待状の条件は資料に記載されていません。</p><p>原本画像は、画面右上の資料アイコンから確認できます。</p>'}
};
function openDetail(title,html){detailOpener=document.activeElement;document.querySelector('#detail-title').textContent=title;document.querySelector('#detail-content').innerHTML=html;detailDialog.showModal();document.body.classList.add('dialog-open');detailDialog.scrollTop=0;}
document.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{const item=detailsContent[b.dataset.detail];openDetail(item.title,item.html);}));
document.querySelector('#close-detail').addEventListener('click',()=>detailDialog.close());
detailDialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');detailOpener?.focus();});
detailDialog.addEventListener('click',e=>{if(e.target===detailDialog){const r=detailDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)detailDialog.close();}});
document.querySelectorAll('.mission-grid').forEach(el=>el.addEventListener('click',e=>{const b=e.target.closest('[data-mission-detail]');if(!b)return;const g=[...dailyMissions,...periodMissions].find(g=>g.id===b.dataset.missionDetail);openDetail(g.name,`<p>${g.description}</p><p>${g.type==='デイリー'?'各ミッション1日最大3回です。表示する回数は画面上部で切り替えられます。':'イベント期間中、1回のみ達成できます。'}</p>`);}));
const comparisonMissions=[...dailyMissions,...periodMissions];
const compactComparison=window.matchMedia('(max-height: 780px)');
let missionComparisonPage=0;
function comparisonCard(g){
 const a=missionAmounts(g),estimate=g.id==='page'?'':' <small>参考</small>';
 return `<article class="mission-comparison-card" data-comparison-mission="${g.id}"><header><h3>${g.name}</h3><span>${g.type||'期間限定'}</span></header><dl><div><dt>必要コイン${g.id==='crown'?' <small>最低</small>':''}</dt><dd>${format(a.coins)}<small>コイン</small></dd></div><div><dt>イベントpt${estimate}</dt><dd>${format(a.eventPoints)}<small>pt</small></dd></div><div><dt>ボーナスpt</dt><dd>${format(a.bonusPoints)}<small>pt</small></dd></div><div class="comparison-total"><dt>合計pt${estimate}</dt><dd>${format(a.total)}<small>pt</small></dd></div></dl></article>`;
}
function renderMissionComparison(page=0){
 const cards=document.querySelector('#mission-comparison-cards');if(!cards)return;
 const size=compactComparison.matches?1:2,pages=Math.ceil(comparisonMissions.length/size);
 missionComparisonPage=Math.max(0,Math.min(pages-1,page));
 const first=missionComparisonPage*size,items=comparisonMissions.slice(first,first+size);
 cards.innerHTML=items.map(comparisonCard).join('');
 document.querySelector('#mission-comparison-page').textContent=`${first+1}${items.length>1?`–${first+items.length}`:''} / 全${comparisonMissions.length}件`;
 document.querySelector('#mission-comparison-prev').disabled=missionComparisonPage===0;
 document.querySelector('#mission-comparison-next').disabled=missionComparisonPage===pages-1;
 document.querySelector('#mission-comparison-note').textContent=items.some(g=>g.id==='crown')?'クラウンは20名が各1個を送る場合の最低額。':items.some(g=>g.id==='page')?'ページ閲覧はTikTokアプリ内の大会ページが対象。':'';
}
compactComparison.addEventListener('change',()=>renderMissionComparison(0));
document.querySelector('#mission-compare').addEventListener('click',()=>{
 const rows=comparisonMissions.map(g=>{const a=missionAmounts(g);return `<tr><th scope="row">${g.name}<small>${g.type||'期間限定'} / 1回</small></th><td>${format(a.coins)}</td><td>${format(a.eventPoints)}</td><td>${format(a.bonusPoints)}</td><td><b>${format(a.total)}</b></td></tr>`;}).join('');
 openDetail('全ミッション・1回達成時の比較',`<section class="mission-comparison"><p class="compare-assumption">イベントpt・合計ptは1コイン＝1ダイヤと仮定した参考値。ボーナスタイム追加分は除外。</p><div class="mission-comparison-desktop"><table class="mission-compare-table"><thead><tr><th scope="col">ミッション</th><th scope="col">必要コイン</th><th scope="col">イベントpt<br>参考</th><th scope="col">ボーナスpt</th><th scope="col">合計pt<br>参考</th></tr></thead><tbody>${rows}</tbody></table><p>クラウンは20名が各1個を送る場合の最低額。ページ閲覧はTikTokアプリ内の大会ページが対象です。</p></div><section class="mission-comparison-mobile" aria-label="ミッション別のポイント比較"><div id="mission-comparison-cards"></div><nav class="comparison-pagination" aria-label="ミッション比較のページ切り替え"><button type="button" id="mission-comparison-prev" data-comparison-step="-1">前へ</button><span id="mission-comparison-page" role="status" aria-live="polite" aria-atomic="true"></span><button type="button" id="mission-comparison-next" data-comparison-step="1">次へ</button></nav><p id="mission-comparison-note" class="comparison-note"></p></section></section>`);
 renderMissionComparison(0);
});
document.querySelector('#result-detail').addEventListener('click',()=>openDetail('ポイント計算の内訳',document.querySelector('#result-breakdown').innerHTML+'<p>ボーナスタイムの追加分を除きます。期間限定ミッションは、その日に初めて達成したものだけを加算してください。</p><button type="button" class="secondary-button" id="dialog-reset-calc">入力をクリア</button>'));
document.querySelector('#detail-content').addEventListener('click',e=>{
 if(e.target.closest('#dialog-reset-calc')){calcForm.reset();setCalcStep(0);detailDialog.close();}
 const pageButton=e.target.closest('[data-comparison-step]');
 if(pageButton&&!pageButton.disabled){renderMissionComparison(missionComparisonPage+Number(pageButton.dataset.comparisonStep));const current=document.querySelector(`[data-comparison-step="${pageButton.dataset.comparisonStep}"]`);if(current.disabled)document.querySelector(`[data-comparison-step="${-Number(pageButton.dataset.comparisonStep)}"]`).focus({preventScroll:true});}
});
const start=Date.parse('2026-10-19T12:00:00+09:00'),end=Date.parse('2026-10-26T00:00:00+09:00');
function tick(now=Date.now()){
 const state=document.querySelector('#event-state'),label=document.querySelector('#countdown-label'),counter=document.querySelector('#countdown');
 if(now>=end){state.textContent='開催終了';label.textContent='大会期間';counter.textContent='終了';return;}
 const upcoming=now<start;state.textContent=upcoming?'開催前':'開催中';label.textContent=upcoming?'開幕まで':'終了まで';const diff=(upcoming?start:end)-now,d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000);counter.textContent=d>0?`${d}日 ${h}時間`:`${h}時間 ${m}分`;
}
tick();setInterval(tick,30000);showView(viewIds.includes(location.hash.slice(1))?location.hash.slice(1):'overview',{fromHash:true,keepScroll:true});

if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const tool={name:'configure_masters_point_estimate',title:'マスターズのポイントを試算',description:'2026年10月大会の1日分の入力値をセットし、同じ画面の計算結果を更新します。公式ランキングへの反映・ギフト送付は行いません。ボーナスタイム追加分は除外。',inputSchema:{type:'object',properties:{limited:{type:'integer',minimum:0,maximum:1000000000,description:'イベント限定ギフトで受け取ったダイヤ数'},other:{type:'integer',minimum:0,maximum:1000000000,description:'その他ギフトで受け取ったダイヤ数'},likes:{type:'integer',minimum:0,maximum:1000000000},daily:{type:'array',items:{type:'integer',minimum:0,maximum:3},minItems:4,maxItems:4,description:'クラウン、ウィッシュ、時の鼓動、天空神殿の達成回数'},period:{type:'array',items:{type:'boolean'},minItems:3,maxItems:3,description:'イベントページを開く、栄光の殿堂、TikTok Starsをその日に初達成したか'},rank:{type:'integer',enum:[0,60000,45000,30000,20000,10000],description:'デイリー順位によるボーナス'}},required:['limited','other','likes','daily','period','rank'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['limited','other','likes','daily','period','rank'].includes(k))||!isValidCalc(input))throw new Error('入力値が不正です。');const result=applyCalc(input);showView('points');switchTab('point','calc');return result;}};
 try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(_){}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
