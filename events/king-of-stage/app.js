import {gifts,dailyMissions,specialMissions,missionTotals,calculate,eventPhase} from './data.mjs';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat('ja-JP').format(n);
const svgPaths={
  crown:'<path d="m3 6 5 4 4-7 4 7 5-4-2 13H5Z"/><path d="M6 22h12"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  gift:'<path d="M3 8h18v5H3zM5 13v8h14v-8M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3ZM12 8h4a3 3 0 1 0-3-3Z"/>',
  flag:'<path d="M5 22V3m0 1c4-4 10 4 15 0v10c-5 4-11-4-15 0"/>',
  calculator:'<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1M8 15h1m6 0h1M8 19h1m6 0h1"/>',
  shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgPaths[name]||svgPaths.crown}</svg>`;}
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon)});}
function giftArt(g,className=''){return `<span class="gift-icon ${className}" aria-hidden="true">${g.crop?`<svg viewBox="${g.crop}"><image href="assets/gifts.png" width="1279" height="1536"/></svg>`:'<span class="unknown-icon">?</span>'}</span>`;}
function cropArt(crop){return `<div class="reward-art" aria-hidden="true"><svg viewBox="${crop}"><image href="assets/flow.png" width="433" height="1536"/></svg></div>`;}
let activeMission={daily:1,special:0};
let repetitions={daily:1,special:1};
let activeGift=0;
const missionCollections={daily:dailyMissions,special:specialMissions};

function setView(name,updateHash=true){
  if(!['overview','gifts','missions','calculator','rules'].includes(name))name='overview';
  $$('.view').forEach(el=>{el.hidden=el.id!==name});
  $$('[data-view]').forEach(b=>{if(b.dataset.view===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(updateHash)history.replaceState(null,'',`#${name}`);
}
function setTab(group,name){
  const list=$(`[data-tabs="${group}"]`);
  if(!list||!list.querySelector(`[data-tab="${name}"]`))return;
  list.querySelectorAll('[data-tab]').forEach(b=>{
    const selected=b.dataset.tab===name;
    b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
    const p=document.getElementById(b.getAttribute('aria-controls'));if(p)p.hidden=!selected;
  });
  if(group==='missions')$('#assumption-control').hidden=name==='summary';
}

const stages=[
  {name:'Breakers予選',short:'予選',label:'STEP 01 / QUALIFIERS',date:'10.19 — 10.23',time:'10/19 12:00 〜 10/23 23:59',description:'RED・BLUEの2チームで争う、5日間のランキングバトル。各チーム上位10名、計20名がBreakers決戦に進出します。',teams:['上位10名','上位10名'],teamNote:'Breakers決戦へ',callout:'<b>Day4進出：10/21 23:59時点で3,000,000pt以上</b><p>300万pt未満の場合は、10/22中にランキングから除外予定。最終日の上位10名を決める条件とは別の、中間進出基準です。</p>',note:'各チーム上位4名は、<strong>Breakers決戦の対戦相手を選択</strong>できます。予選順位の高い方から順番に選択。'},
  {name:'Breakers決戦',short:'Breakers決戦',label:'STEP 02 / BREAKERS FINAL',date:'11.20',time:'開始時刻は資料に記載なし',description:'予選各チームの上位から順に1vs1バトルを実施。予選上位者が選んだ対戦相手と激突し、勝ち抜いた各チーム5名、計10名がLegends決戦へ進出します。',teams:['勝者5名','勝者5名'],teamNote:'Legends決戦へ',callout:'<b>1vs1・最大3戦・2本先取</b><p>3戦合計でグローブは4個まで。ミスト・タイマー・ハンマー・ブーストは使用不可です。</p>',note:'進出人数はフロー本文の「各チーム5名、計10名」に準拠。特典欄の人数表記との違いは「ルール → 決戦・注意点」で確認できます。'},
  {name:'Legends決戦',short:'Legends決戦',label:'STEP 03 / LEGENDS FINAL',date:'12.21',time:'Battle Night Day2で開催予定',description:'勝ち上がったBreakers10名が、王座を守るLegends10名に挑戦。1vs1の最終決戦を制し、新たなKing Of Stageを目指します。',teams:['Breakers 10名','Legends 10名'],teamNote:'王座をかけた最終決戦',callout:'<b>オフラインで開催</b><p>当日会場への参加が必要です。Legends決戦の参加者はBattle Night Day1には参加できません。</p>',note:'会場・開始時刻の情報は今回の資料に記載されていません。最新の案内はTikTokアプリ内で確認してください。'}
];
function renderStage(index=0){
  const stage=stages[index];
  $('#schedule-picker').innerHTML=stages.map((s,i)=>`<button role="tab" id="stage-tab-${i}" aria-controls="stage-detail" data-stage="${i}" aria-selected="${i===index}" tabindex="${i===index?0:-1}"><span>STEP 0${i+1}</span><b>${s.short}</b></button>`).join('');
  $('#stage-detail').setAttribute('aria-labelledby',`stage-tab-${index}`);
  $('#stage-detail').innerHTML=`<span class="eyebrow">${stage.label}</span><div class="stage-title"><h2>${stage.name}</h2><div class="stage-date">${stage.date}<small>${stage.time}</small></div></div><p class="stage-summary">${stage.description}</p><div class="team-lines"><div class="team-line"><span>${index===2?'CHALLENGERS':'RED TEAM'}</span><b>${stage.teams[0]}</b><small>${stage.teamNote}</small></div><div class="team-line blue"><span>${index===2?'DEFENDERS':'BLUE TEAM'}</span><b>${stage.teams[1]}</b><small>${stage.teamNote}</small></div></div><div class="callout">${stage.callout}</div><p class="stage-note">${stage.note}</p>`;
}
const rewards=[
  [
    {who:'各チーム上位10名',title:'Breakers決戦への出場権',desc:'予選ランキングで決戦へ進出。',crop:'81 514 95 59'},
    {who:'各チーム上位4名',title:'決戦の対戦相手選択権',desc:'予選順位の高い方から順番に選択。',crop:'249 512 77 66'},
    {who:'各チーム上位10名',title:'限定アバターフレーム',desc:'配信者ランキングの特典。',crop:'88 686 81 70'},
    {who:'応援ランキング上位10名',title:'限定アバターフレーム',desc:'視聴者の応援ランキングの特典。',crop:'259 683 82 74'}
  ],
  [
    {who:'決戦を勝ち抜いた計10名',title:'Legends決戦への出場権',desc:'フロー本文は各チーム5名、計10名。',crop:'82 1030 104 62'},
    {who:'ブレイカーズ全員',title:'スペシャル動画 撮影・出演',desc:'Legends決戦に向けたスペシャル動画。',crop:'257 1027 72 68'}
  ],
  [
    {who:'Legends決戦の勝者',title:'次回Legends決戦への出場権',desc:'次回はLegendsとして出場。',crop:'65 1352 71 61'},
    {who:'Legends決戦の勝者',title:'第4回のレジェンズの盾',desc:'王座を手にした証。',crop:'188 1347 66 73'},
    {who:'Legends決戦の勝者',title:'次回イベントの宣伝動画',desc:'次回The King Of Stageの動画撮影・出演。',crop:'299 1351 64 66'}
  ]
];
function renderRewards(index=0){
  $('#reward-picker').innerHTML=stages.map((s,i)=>`<button role="tab" id="reward-tab-${i}" aria-controls="reward-detail" data-reward-stage="${i}" aria-selected="${i===index}" tabindex="${i===index?0:-1}"><span>STEP 0${i+1}</span><b>${s.short}</b></button>`).join('');
  $('#reward-detail').setAttribute('aria-labelledby',`reward-tab-${index}`);
  $('#reward-detail').innerHTML=`<span class="eyebrow">REWARDS / STEP 0${index+1}</span><h2>${stages[index].name}の特典</h2><div class="reward-grid" ${index===0?'data-four="true"':''}>${rewards[index].map(r=>`<div class="reward-item">${cropArt(r.crop)}<span class="recipient">${r.who}</span><h3>${r.title}</h3><p>${r.desc}</p></div>`).join('')}</div>${index===1?'<p class="fine-print">特典欄には出場権の対象を「各チーム上位10名」とする記載もあります。進出人数はフロー本文に合わせています。</p>':''}`;
}
function renderGift(index=0){
  activeGift=index;const g=gifts[index];
  $('#gift-picker').innerHTML=gifts.map((item,i)=>`<button role="tab" id="gift-tab-${i}" data-gift="${i}" aria-controls="gift-detail" aria-selected="${i===index}" tabindex="${i===index?0:-1}" aria-label="${item.name}${item.coins===null?'・調整中':`・${fmt(item.coins)}コイン`}">${giftArt(item)}<span><b>${item.short==='花火'?'打ち上げ花火':item.name==='ベアヒーロー'?'ベアヒーロー':item.short}</b><small>${item.coins===null?'調整中':`${fmt(item.coins)} コイン`}</small></span></button>`).join('');
  $('#gift-detail').setAttribute('aria-labelledby',`gift-tab-${index}`);
  $('#gift-detail').innerHTML=`<span class="eyebrow">${g.coins===null?'COMING SOON / DETAILS TBC':`MISSION GIFT / 0${index+1}`}</span>${giftArt(g,'gift-main-art')}<h2>${g.name}</h2><div class="gift-price">${g.coins===null?'調整中':`<span class="coin-icon" aria-hidden="true">C</span>${fmt(g.coins)}`}<small>${g.coins===null?'価格未発表':'コイン / 個'}</small></div><div class="gift-mini"><span>${g.amount}個でミッション達成<small>各ギフト1日最大3回</small></span><span><b>＋${fmt(g.bonus)} pt</b><small>ミッションボーナス</small></span></div>${g.coins===null?'<p class="pending-note">名称・価格は未確定。個数と報酬は提供資料の掲載値です。</p>':''}<button class="primary-button" data-gift-mission="${index+1}">必要コインと合計ptを見る <span>↗</span></button>`;
}

function renderMission(group){
  const list=missionCollections[group];const selected=activeMission[group];const m=list[selected];
  const repeat=Math.min(m.limit,repetitions[group]);const assumed=$('#assume-coins').checked;
  const result=missionTotals(m,repeat,assumed);
  $(`#${group}-picker`).innerHTML=list.map((item,i)=>`<button role="tab" id="${group}-tab-${i}" data-mission="${i}" data-group="${group}" aria-controls="${group}-detail" aria-selected="${i===selected}" tabindex="${i===selected?0:-1}">${item.short}</button>`).join('');
  const art=m.giftId?giftArt(gifts.find(g=>g.id===m.giftId)):`<span class="mission-symbol">${icon(m.icon)}</span>`;
  const neededCoins=result.coins===null?'未確定':fmt(result.coins);
  const base=result.base===null?(m.coins===null?'未確定':'受取ダイヤ数'):fmt(result.base);
  const total=result.total===null?`ダイヤ＋${fmt(result.bonus)}`:fmt(result.total);
  const approximate=assumed&&result.coins!==null&&result.coins>0;
  let condition=m.label;
  if(repeat>1)condition=`「${m.name}」を${result.count}個受け取る <b>（${m.amount}個 × ${repeat}回）</b>`;
  const panel=$(`#${group}-detail`);panel.setAttribute('aria-labelledby',`${group}-tab-${selected}`);
  panel.innerHTML=`<div class="mission-heading">${art}<div><span class="eyebrow">${group==='daily'?'DAILY MISSION':'SPECIAL MISSION'} / ${String(selected+1).padStart(2,'0')}</span><h2>${m.name}</h2></div><span class="limit-pill">${group==='daily'?`1日最大${m.limit}回`:'期間中1回'}</span></div><p class="mission-condition">${condition}</p><div class="repeat-row"><span>${repeat}回達成した場合の内訳</span>${m.limit>1?`<div class="segmented" aria-label="達成回数"><button data-repeat="1" data-group="${group}" aria-pressed="${repeat===1}">1回分</button><button data-repeat="3" data-group="${group}" aria-pressed="${repeat===3}">3回分</button></div>`:'<span>ボーナスは通常ptに加算</span>'}</div><div class="amount-grid"><div class="amount-cell"><span>必要コイン</span><strong${result.coins===null?' class="word"':''}>${neededCoins}</strong><small>${result.coins===null?'価格は調整中':result.coins===0?'ギフト購入不要':`${fmt(m.coins)} × ${fmt(result.count)}個`}</small></div><div class="amount-cell"><span>通常pt${approximate?'（参考）':''}</span><strong${result.base===null?' class="word"':''}>${base}</strong><small>${result.base===null?'1ダイヤ＝1pt':approximate?'1コイン＝1ダイヤの仮定':'ギフト分の加算なし'}</small></div><div class="amount-cell bonus"><span>ボーナスpt</span><strong>${fmt(result.bonus)}</strong><small>${fmt(m.bonus)} × ${repeat}回</small></div></div><div class="mission-total"><div><span>合計pt${approximate?'（参考）':''}</span><small>通常pt ＋ ボーナスpt</small></div><strong${result.total===null?' class="word"':''}>${total}${result.total!==null?'<small>pt</small>':''}</strong></div><p class="mission-footnote">${m.note}</p>`;
}

function renderCalcFields(reset=false){
  const days=Number($('#calc-days').value);
  const current=reset?{}:Object.fromEntries($$('[data-count]').map(el=>[el.dataset.count,Number(el.value)]));
  $('#calc-period').textContent=days===3?'前半3日分':days===5?'予選5日分':'1日分';
  $('#calc-daily-fields').innerHTML=dailyMissions.map(m=>{
    const max=days*m.limit;const value=Math.min(current[m.id]||0,max);
    return `<label class="calc-row"><span>${m.id==='visit'?'公式ページ訪問':m.name}${m.coins===null?'（調整中）':''}<small>1回 ＋${fmt(m.bonus)}pt</small></span><select data-count="${m.id}" aria-label="${m.name}の達成回数">${Array.from({length:max+1},(_,n)=>`<option value="${n}" ${n===value?'selected':''}>${n} 回</option>`).join('')}</select></label>`;
  }).join('');
}
function renderSpecialFields(){
  $('#calc-special-fields').innerHTML=specialMissions.map(m=>`<label class="check-row"><input type="checkbox" data-special="${m.id}"><span>${m.label}<small>＋${fmt(m.bonus)} pt / 期間中1回</small></span></label>`).join('');
}
function updateCalculation(){
  const daily=Object.fromEntries($$('[data-count]').map(el=>[el.dataset.count,el.value]));
  const special=Object.fromEntries($$('[data-special]').map(el=>[el.dataset.special,el.checked]));
  const result=calculate({diamonds:$('#calc-diamonds').value,days:$('#calc-days').value,daily,special});
  $('#result-total').textContent=result.total===null?'—':fmt(result.total);
  $('#result-total').dataset.long=String(result.total!==null&&String(fmt(result.total)).length>10);
  $('#result-base').textContent=result.base===null?'未入力':`${fmt(result.base)} pt`;
  $('#result-daily').textContent=`${fmt(result.dailyBonus)} pt`;
  $('#result-special').textContent=`${fmt(result.specialBonus)} pt`;
  $('#calc-error').textContent=result.error?'ダイヤ数は0〜1兆の整数で入力してください。':result.base===null?'通常ptを入力すると合計が表示されます。':'';
  $('#calc-diamonds').setAttribute('aria-invalid',String(result.error));
  $('#goal-box').hidden=result.days!==3;
  $('#goal-progress').style.width=`${result.total===null?0:Math.min(100,result.total/3000000*100)}%`;
  $('#goal-message').textContent=result.total===null?'通常ptを入力すると、あと何ptか分かります。':result.total>=3000000?'入力値では300万pt以上。10/21の最終集計で確定します。':`10/21 23:59の基準まで、あと${fmt(3000000-result.total)}pt。`;
}

const sources={event:{name:'表紙',title:'イベントメインビジュアル'},flow:{name:'流れ',title:'イベント全体フロー・特典'},rules:{name:'概要',title:'イベント概要・ポイント・LIVE MATCH'},gifts:{name:'ギフト',title:'予選限定ギフト'},missions:{name:'ミッション',title:'予選限定ミッション'}};
function openSource(name){
  if(!sources[name])return;
  $('#dialog-title').textContent=sources[name].title;
  $('#dialog-content').innerHTML=`<div class="source-tabs" aria-label="提供資料を選ぶ">${Object.entries(sources).map(([key,s])=>`<button data-source="${key}" aria-pressed="${key===name}">${s.name}</button>`).join('')}</div><p class="source-caption">作成時に提供された資料です。表示価格・日程・ルールは変更される場合があります。最新情報はTikTokアプリ内の公式イベントページで確認してください。</p><img class="source-img" src="assets/${name}.png" alt="${sources[name].title}の提供資料">`;
  if(!$('#dialog').open)$('#dialog').showModal();
  $('#dialog-content').scrollTop=0;
}
function openAbout(){
  $('#dialog-title').textContent='このガイドについて';
  $('#dialog-content').innerHTML='<p><b>KazzCompanyが作成した非公式のイベント情報ガイドです。</b><br>TikTokおよびイベント主催者の公式サイトではありません。</p><p>ご提供いただいた5枚のイベント資料をもとに、2026年10月10日時点の案内として整理しています。画像内の月日を今回の2026年開催分として掲載し、時刻は日本時間で表示しています。</p><h3>ポイントの見方</h3><p>公式資料の配信者ランキングは「1ダイヤ＝1pt」。ミッション画面の「1コイン＝1ダイヤ」は比較用の仮定です。実際のランキング計算には「ポイント計算」から受取ダイヤ数を入力してください。</p><h3>未確定・表記の違い</h3><p>特別ギフトの名称・価格は調整中です。応援ランキングの対象範囲とBreakers決戦の進出人数には資料内の表記差があるため、該当画面で説明しています。</p><p>このページの操作は実際のイベント参加・ギフト送付・ミッション達成には連動しません。最新のルールと結果はTikTokアプリでご確認ください。</p>';
  $('#dialog').showModal();
}
function updateClock(){
  const now=Date.now(),phase=eventPhase(now);
  $('#event-state').textContent=phase.label;$('#count-label').textContent=phase.countLabel;
  if(phase.target){const mins=Math.max(0,Math.floor((phase.target-now)/60000));const d=Math.floor(mins/1440),h=Math.floor(mins%1440/60),m=mins%60;$('#countdown').innerHTML=`${d}<span>日</span>${h}<span>時間</span>${m}<span>分</span>`;}
  else $('#countdown').textContent='—';
}

document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-view'))setView(b.dataset.view);
  if(b.hasAttribute('data-go')){setView(b.dataset.go);if(b.dataset.openTab)setTab(b.dataset.go,b.dataset.openTab);$('#main').focus({preventScroll:true});}
  if(b.hasAttribute('data-tab'))setTab(b.closest('[data-tabs]').dataset.tabs,b.dataset.tab);
  if(b.hasAttribute('data-stage')){renderStage(Number(b.dataset.stage));$(`#stage-tab-${b.dataset.stage}`).focus({preventScroll:true});}
  if(b.hasAttribute('data-reward-stage')){renderRewards(Number(b.dataset.rewardStage));$(`#reward-tab-${b.dataset.rewardStage}`).focus({preventScroll:true});}
  if(b.hasAttribute('data-gift')){renderGift(Number(b.dataset.gift));$(`#gift-tab-${b.dataset.gift}`).focus({preventScroll:true});}
  if(b.hasAttribute('data-gift-mission')){activeMission.daily=Number(b.dataset.giftMission);repetitions.daily=1;renderMission('daily');setView('missions');setTab('missions','daily');$('#main').focus({preventScroll:true});}
  if(b.hasAttribute('data-mission')){const group=b.dataset.group;activeMission[group]=Number(b.dataset.mission);repetitions[group]=1;renderMission(group);$(`#${group}-tab-${b.dataset.mission}`).focus({preventScroll:true});}
  if(b.hasAttribute('data-repeat')){const group=b.dataset.group;repetitions[group]=Number(b.dataset.repeat);renderMission(group);$(`[data-repeat="${b.dataset.repeat}"][data-group="${group}"]`).focus({preventScroll:true});}
  if(b.hasAttribute('data-source'))openSource(b.dataset.source);
  if(b.hasAttribute('data-about'))openAbout();
  if(b.id==='dialog-close')$('#dialog').close();
  if(b.id==='reset-calculator'){$('#calc-days').value='3';$('#calc-diamonds').value='';renderCalcFields(true);$$('[data-special]').forEach(el=>el.checked=false);updateCalculation();}
});
document.addEventListener('change',event=>{
  if(event.target.id==='assume-coins'){renderMission('daily');renderMission('special');}
  if(event.target.id==='calc-days'){renderCalcFields();updateCalculation();}
  if(event.target.hasAttribute('data-count')||event.target.hasAttribute('data-special'))updateCalculation();
});
$('#calc-diamonds').addEventListener('input',updateCalculation);
document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tab=event.target.closest('[role="tab"]');if(!tab)return;
  const list=tab.closest('[role="tablist"]');if(!list)return;
  const buttons=[...list.querySelectorAll('[role="tab"]')];let index=buttons.indexOf(tab);
  if(event.key==='Home')index=0;else if(event.key==='End')index=buttons.length-1;else index=(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  event.preventDefault();buttons[index].focus();buttons[index].click();
});
$('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#dialog').close();}});
window.addEventListener('hashchange',()=>setView(location.hash.slice(1),false));
paintIcons();renderStage();renderRewards();renderGift();renderMission('daily');renderMission('special');renderCalcFields();renderSpecialFields();updateCalculation();updateClock();setView(location.hash.slice(1)||'overview',false);setInterval(updateClock,60000);
