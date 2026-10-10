import {START,END,gifts,teams,dailyMissions,missionTotals,dailySummary,calculateDay,boundedNumber} from './data.mjs';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Number(n).toLocaleString('ja-JP');
const state={team:'akatsuki',gift:'score',mission:'drum',times:1};
const sources={hero:['メイン画像','hero.jpg'],intro:['イベント紹介','intro.png'],schedule:['概要・日程','schedule.png'],missions:['ミッション','missions.png'],program:['番組案内','program.png'],gifts:['限定ギフト','gifts.png'],rewards:['入賞特典','rewards.png'],faq:['FAQ','faq.png']};
const views=['overview','gifts','missions','calculator','rewards'];
const giftIcon=(g,extra='')=>`<svg class="gift-icon ${extra}" viewBox="${g.crop}" aria-hidden="true" focusable="false"><image href="assets/gifts.png" width="762" height="1536"/></svg>`;

function showView(id,subtab,writeHash=true){
  if(!views.includes(id)) id='overview';
  $$('.view').forEach(el=>el.hidden=el.id!==id);
  $$('.desktop-nav [data-view],.mobile-nav [data-view]').forEach(button=>{
    if(button.dataset.view===id) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  if(subtab) selectTab(id,subtab);
  if(writeHash&&location.hash!==`#${id}`) history.pushState(null,'',`#${id}`);
}
function selectTab(group,id){
  const buttons=$$(`[data-tabs="${group}"] [role=tab]`);
  if(!buttons.some(b=>b.dataset.tab===id)) return;
  buttons.forEach(button=>{
    const active=button.dataset.tab===id;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
    document.getElementById(button.getAttribute('aria-controls')).hidden=!active;
  });
}
document.addEventListener('click',e=>{
  const view=e.target.closest('[data-view]');
  if(view) showView(view.dataset.view,view.dataset.subtab);
  const tab=e.target.closest('[data-tabs] [role=tab]');
  if(tab) selectTab(tab.closest('[data-tabs]').dataset.tabs,tab.dataset.tab);
  const source=e.target.closest('[data-source]');
  if(source) openSource(source.dataset.source);
});
$$('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const buttons=[...list.querySelectorAll('[role=tab]')];
  const index=buttons.indexOf(document.activeElement);
  if(index<0)return;
  const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  e.preventDefault();buttons[next].click();buttons[next].focus();
}));
window.addEventListener('hashchange',()=>showView(location.hash.slice(1),null,false));
window.addEventListener('popstate',()=>showView(location.hash.slice(1),null,false));

function renderGifts(){
  $('#gift-picker').innerHTML=gifts.map(g=>`<button data-gift="${g.id}" aria-pressed="${state.gift===g.id}" aria-controls="gift-detail">${giftIcon(g)}<b>${g.name}</b><small>${fmt(g.coins)} コイン</small></button>`).join('');
  renderGiftDetail();
}
function renderGiftDetail(){
  const g=gifts.find(x=>x.id===state.gift);
  $('#gift-detail').innerHTML=`<span class="eyebrow red">LIMITED GIFT / ${String(gifts.indexOf(g)+1).padStart(2,'0')}</span>${giftIcon(g,'gift-main')}<h2>${g.name}</h2><div class="gift-price">${fmt(g.coins)}<span>コイン / 個</span></div><div class="gift-point"><span>ギフトpt / 個</span><b>${fmt(g.coins*10)} <small>pt</small></b></div><p class="fine">${g.need?`${g.upperOnly?'暁・雅チームの':'全チームの'}デイリーミッション対象。${g.need}個で＋${fmt(g.bonus)}pt。`:'このギフトを指定したデイリーミッションは資料に記載されていません。'}</p>${g.need?`<button class="text-link" data-gift-mission="${g.id}">ミッションの必要コイン・合計ptを見る ↗</button>`:''}`;
}
$('#gift-picker').addEventListener('click',e=>{
  const button=e.target.closest('[data-gift]');if(!button)return;
  state.gift=button.dataset.gift;
  $$('#gift-picker button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  renderGiftDetail();
});
$('#gift-detail').addEventListener('click',e=>{
  const button=e.target.closest('[data-gift-mission]');if(!button)return;
  const gift=gifts.find(g=>g.id===button.dataset.giftMission);
  if(gift.upperOnly&&state.team==='hana')state.team='akatsuki';
  state.mission=gift.id;state.times=1;renderTeams();renderMissions();renderSummary();renderRewards();$('#calc-team').value=state.team;updateCalc();
  showView('missions','daily');
});

function renderTeams(){
  $$('[data-teams]').forEach(el=>el.innerHTML=Object.entries(teams).map(([id,name])=>`<button data-team="${id}" aria-pressed="${id===state.team}">${name}</button>`).join(''));
}
function setTeam(team){
  if(!Object.hasOwn(teams,team))return;
  state.team=team;state.times=1;
  if(!dailyMissions(team).some(m=>m.id===state.mission))state.mission='drum';
  renderTeams();renderMissions();renderSummary();renderRewards();
  $('#calc-team').value=team;updateCalc();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)setTeam(b.dataset.team);});
function renderMissions(){
  const missions=dailyMissions(state.team);
  $('#mission-picker').innerHTML=missions.map((m,i)=>`<button data-mission="${m.id}" aria-pressed="${m.id===state.mission}" aria-controls="mission-detail"><span>${String(i+1).padStart(2,'0')}</span>${m.name}</button>`).join('');
  renderMissionDetail();
}
function renderMissionDetail(){
  const mission=dailyMissions(state.team).find(m=>m.id===state.mission);
  const totals=missionTotals(mission,state.times);
  const g=gifts.find(g=>g.id===mission.id);
  const limit=mission.limit?`1日${mission.limit}回まで`:'上限の記載なし';
  $('#mission-detail').innerHTML=`<div class="mission-heading">${g?giftIcon(g):`<span class="mission-symbol">${mission.id==='live'?'◷':'↗'}</span>`}<div><span class="eyebrow">${teams[state.team]} TEAM · DAILY MISSION</span><h2>${mission.name}</h2></div></div><p class="mission-condition">${mission.task}</p><div class="repeat-line"><span>${limit}</span><div class="repeat-buttons"><button data-times="1" aria-pressed="${totals.count===1}">1回分</button>${mission.limit?`<button data-times="${mission.limit}" aria-pressed="${totals.count===mission.limit}">上限${mission.limit}回分</button>`:''}</div></div><div class="amount-grid"><div class="amount-cell"><span>必要コイン<br>${g?`${mission.need*totals.count}個分`:'ギフト購入不要'}</span><strong>${fmt(totals.coins)}</strong><small>コイン</small></div><div class="amount-cell"><span>ギフトpt<br>コイン × 10</span><strong>${fmt(totals.base)}</strong><small>pt</small></div><div class="amount-cell"><span>ミッション報酬<br>${totals.count}回分</span><strong>${fmt(totals.bonus)}</strong><small>ボーナスpt</small></div></div><div class="mission-total"><span>参考合計ポイント</span><strong>${fmt(totals.total)}<small>pt</small></strong></div><p class="fine">${mission.note||`毎日0:00にカウントがリセットされます。${mission.id==='live'?`合計${30*totals.count}分の配信に相当します。`:'指定ギフトは資料の「1コイン＝10pt」で試算。'}`}<br>集計条件・全体上限は最新のイベントルールをご確認ください。</p>`;
}
$('#mission-picker').addEventListener('click',e=>{
  const b=e.target.closest('[data-mission]');if(!b)return;
  state.mission=b.dataset.mission;state.times=1;
  $$('#mission-picker button').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));
  renderMissionDetail();
});
$('#mission-detail').addEventListener('click',e=>{
  const b=e.target.closest('[data-times]');if(!b)return;
  state.times=Number(b.dataset.times);renderMissionDetail();
  $(`#mission-detail [data-times="${state.times}"]`)?.focus({preventScroll:true});
});
function renderSummary(){
  const t=dailySummary(state.team);
  $('#daily-summary').innerHTML=`<span class="eyebrow">${teams[state.team]} TEAM · INDIVIDUAL MISSION TOTALS</span><h2>個別ミッション表からの合算目安</h2><div class="summary-big">${fmt(t.bonus)} <small>ボーナスpt / 日</small></div><p class="fine">回数上限のある配信・ギフトミッションをすべて達成した場合。ランキングページ確認は含みません。</p><div class="summary-lines"><div><span>ギフトに必要なコイン</span><b>${fmt(t.coins)} コイン</b></div><div><span>ギフトpt（×10換算）</span><b>${fmt(t.base)} pt</b></div><div><span>ギフトpt ＋ ミッション報酬</span><b>${fmt(t.total)} pt</b></div><div><span>ページ確認1回分も加える場合</span><b>さらに ＋5,000 pt</b></div></div><p class="callout">特典表の「デイリー最大63万pt/日」と個別ミッションの合計が一致しません。上の数値は個別表を足した参考値で、獲得できる上限を保証するものではありません。</p><p class="fine">メンバーレベル成長ボーナスは資料に最大355万pt/日と記載。段階別の獲得条件は未掲載です。</p>`;
}

$('#gift-inputs').innerHTML=gifts.map(g=>`<label class="gift-input-row">${giftIcon(g)}<span>${g.name}<small>${fmt(g.coins)} コイン / 個</small></span><input type="number" inputmode="numeric" min="0" max="1000000" step="1" value="0" data-quantity="${g.id}" aria-label="${g.name}の個数"><small>個</small></label>`).join('');
function updateCalc(){
  const day=$('#calc-day').value;
  $('#calc-fan').disabled=day!=='20';$('#calc-superfan').disabled=day!=='23';
  const quantities=Object.fromEntries($$('[data-quantity]').map(el=>[el.dataset.quantity,el.value]));
  const t=calculateDay({team:state.team,day,quantities,minutes:$('#calc-minutes').value,visit:$('#calc-visit').checked,ordinary:$('#calc-ordinary').value,fan:$('#calc-fan').value,superfan:$('#calc-superfan').value,member:$('#calc-member').value});
  $('#calc-total').textContent=fmt(t.total);$('#calc-total').dataset.long=String(fmt(t.total).length>10);
  for(const key of ['coins','base','ordinary','daily','special','member'])$(`#result-${key}`).textContent=fmt(t[key]);
  const invalid=$$('#calculator input[type=number]:not(:disabled)').some(input=>!input.validity.valid);
  $('#calc-error').hidden=!invalid;
}
$('#calc-team').addEventListener('change',e=>setTeam(e.target.value));
$('#calc-day').addEventListener('change',updateCalc);
$('#calculator').addEventListener('input',e=>{if(e.target.matches('input'))updateCalc();});
$('#calculator').addEventListener('change',e=>{
  const input=e.target;
  if(input.matches('input[type=number]')){input.value=String(boundedNumber(input.value,Number(input.max)));updateCalc();}
});
$('#calc-reset').addEventListener('click',()=>{
  $$('#calculator input[type=number]').forEach(i=>i.value='0');$('#calc-visit').checked=false;updateCalc();
});

function renderRewards(){
  const top={akatsuki:5,miyabi:3,hana:2}[state.team];
  $('#reward-grid').innerHTML=`<article class="reward-card featured"><span class="eyebrow">${teams[state.team]} TEAM / TOP 10</span><h2>Music Lounge Special 2026<br>出演の選考対象</h2><p>歌・演奏・カラオケとトークで、年末の特別番組へ。</p></article><article class="reward-card"><span class="eyebrow">${teams[state.team]} TEAM / TOP ${top}</span><h2>All Stars 2026<br>招待の選考対象</h2><p><em>${teams[state.team]}チームは上位${top}名。</em><br>招待される可能性がある特典です。</p></article><article class="reward-card"><span class="eyebrow">TOP 10 / LIMITED FRAME</span><h2>期間限定アバターフレーム</h2><p>1位：1stデザイン・7日間<br>2位 / 3位：各専用デザイン・5日間<br>4〜10位：TOP10デザイン・5日間</p></article><article class="reward-card"><span class="eyebrow">ORIGINAL GOODS</span><h2>オリジナルグッズ</h2><p>TOP10：ハートミーハンマー<br>TOP20：ハートミーカチューシャ</p></article><article class="reward-card" style="grid-column:1/-1"><span class="eyebrow">OFFICIAL PROMOTION</span><h2>公式プロモーションビデオ</h2><p>ステージ出演が決定したメンバーが対象。紹介文には「TOP3に制作」、詳細案内には「出演決定者が対象」と記載があるため、最終条件は公式案内をご確認ください。</p></article>`;
}
function openSource(id){
  if(!sources[id])id='hero';
  const [label,file]=sources[id];
  $('#source-title').textContent=label;
  $('#source-picker').innerHTML=Object.entries(sources).map(([key,[name]])=>`<button data-source="${key}" aria-pressed="${key===id}">${name}</button>`).join('');
  $('#source-image').src=`assets/${file}`;$('#source-image').alt=`Music Stage 提供資料：${label}`;$('#source-open').href=`assets/${file}`;
  if(!$('#source-dialog').open)$('#source-dialog').showModal();
}
$('#close-dialog').addEventListener('click',()=>$('#source-dialog').close());
$('#source-dialog').addEventListener('click',e=>{if(e.target===$('#source-dialog'))$('#source-dialog').close();});
function updateCountdown(){
  const now=Date.now(),start=Date.parse(START),end=Date.parse(END),ended=now>=end,live=now>=start&&!ended;
  $('#event-state').textContent=ended?'開催終了':live?'開催中':'開催前';
  $('#count-label').textContent=ended?'2026年10月大会':live?'終了まで':'開幕まで';
  if(ended){$('#countdown').textContent='終了しました';return;}
  const minutes=Math.ceil(((live?end:start)-now)/60000);
  const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),remaining=minutes%60;
  $('#countdown').textContent=days?`${days}日 ${hours}時間`:`${hours}時間 ${remaining}分`;
}
renderGifts();renderTeams();renderMissions();renderSummary();renderRewards();updateCalc();updateCountdown();
showView(location.hash.slice(1),null,false);
setInterval(updateCountdown,60000);
