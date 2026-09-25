import {GAMES,getGame,defaults,pick,HANDS,winsRps,bingoLines} from './catalog.mjs?v=3';
const API='https://esfgrykcvdctnvdqipbj.supabase.co/functions/v1/kazz-games';
const client=window.supabase?.createClient('https://esfgrykcvdctnvdqipbj.supabase.co','sb_publishable_Rwb3qaRXdWZoo05LrbFaDg_29tMI7uI',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=s=>document.querySelector(s), app=$('#app'), modal=$('#modal');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
let saved;try{saved=JSON.parse(localStorage.getItem('kazz-play-v1')||'{}')}catch{saved={}}
saved.hosts||={};saved.listeners||={};saved.presets||={};
const save=()=>{try{const current=JSON.parse(localStorage.getItem('kazz-play-v1')||'{}');saved={...current,...saved,hosts:{...current.hosts,...saved.hosts},listeners:{...current.listeners,...saved.listeners},presets:{...current.presets,...saved.presets}};localStorage.setItem('kazz-play-v1',JSON.stringify(saved))}catch{toast('端末に保存できません。管理リンクを控えてください')}};
let data=null,session=null,group=new URLSearchParams(location.search).get('set')==='talk'?'talk':'kazz',busy=false,channel=null,online=false,refreshing=false,refreshAgain=false,syncTimer=null,present=false,lastSync=0,toastTimer,uiRound=null;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200)}
function status(){const el=$('#connection');el.textContent=!session?'参加型ゲーム':!navigator.onLine?'オフライン':online?'リアルタイム接続中':lastSync?'定期更新で接続中':'接続しています…';el.className='status '+(online?'online':session?'offline':'')}
async function request(action,payload={},ctx=session){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);
 try{
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-game-token':ctx.token},body:JSON.stringify({action,code:ctx.code||'',data:payload}),signal:ctrl.signal});
  const d=await r.json();if(!r.ok||d.error)throw new Error(d.error||'通信に失敗しました');return d;
 }catch(e){if(e.name==='AbortError')throw new Error('通信に時間がかかっています。もう一度お試しください');if(e instanceof TypeError)throw new Error('通信できません。ネット接続を確認してください');throw e}finally{clearTimeout(timer)}
}
function accept(d){
 if(data&&data.room.code===d.room.code&&d.room.revision<data.room.revision)return;
 data=d;lastSync=Date.now();render();status();
}
async function refresh(){
 if(!session||document.hidden)return;
 if(refreshing){refreshAgain=true;return}refreshing=true;
 try{const ctx=session,d=await request('snapshot',{},ctx);if(ctx===session)accept(d)}catch(e){online=false;status();if(!data)showError(e.message);else if(/停止|期限|参加し直/.test(e.message)){disconnect();app.innerHTML=`<div class="panel"><h1>${esc(e.message)}</h1><a href="./">ゲーム集に戻る</a></div>`;}}finally{refreshing=false;if(refreshAgain){refreshAgain=false;setTimeout(refresh,500)}}
}
function connect(){
 if(channel)client?.removeChannel(channel);clearInterval(syncTimer);online=false;
 if(client){channel=client.channel(data.room.channel,{config:{broadcast:{self:false}}}).on('broadcast',{event:'changed'},()=>{clearTimeout(connect.delay);connect.delay=setTimeout(refresh,200)}).subscribe(state=>{online=state==='SUBSCRIBED';status();if(online)refresh()})}
 syncTimer=setInterval(()=>{if(Date.now()-lastSync>(online?20000:4500))refresh()},5000);status();
}
function disconnect(){if(channel)client?.removeChannel(channel);channel=null;clearInterval(syncTimer);session=null;online=false;status()}
async function act(action,payload={}){
 if(busy)return;busy=true;setBusy(true);
 try{const d=await request(action,{round:data?.state.id,revision:data?.room.revision,...payload});accept(d);return true}catch(e){toast(e.message);if(/更新|切り替/.test(e.message))await refresh();return false}finally{busy=false;setBusy(false)}
}
function setBusy(v){app.querySelectorAll('[data-server]').forEach(e=>{e.disabled=v||e.dataset.disabled==='true'})}
function showError(t){app.innerHTML=`<div class="panel"><h1>ルームを開けませんでした</h1><p class="error">${esc(t)}</p><div class="row"><button data-do="retry">再接続</button><a href="./">ゲーム集に戻る</a></div></div>`}
function btn(text,action,cls='',attrs=''){return `<button class="${cls}" data-do="${action}" ${attrs}>${text}</button>`}
function card(g){return `<button class="gamecard ${g.set==='kazz'?'kazz':''}" data-do="game" data-game="${g.id}"><span class="symbol" aria-hidden="true">${g.icon}</span><strong>${g.name}</strong><small>${g.desc}</small><span class="tag">${g.tag}</span></button>`}
function catalog(){return `<div class="tabs" role="tablist" aria-label="ゲーム集"><button role="tab" aria-selected="${group==='talk'}" data-do="tab" data-set="talk">雑談ミニゲーム集</button><button role="tab" aria-selected="${group==='kazz'}" data-do="tab" data-set="kazz">Kazz配信ゲーム集</button></div><div class="catalog ${data?'compactcatalog':''}">${GAMES.filter(g=>g.set===group).map(card).join('')}</div>`}
function home(){
 const active=saved.hosts[saved.active];
 app.innerHTML=`<div class="intro"><div class="eyebrow">PLAY TOGETHER</div><h1>今日の配信、みんなで遊ぼう。</h1><p class="muted">ルームを作って、参加用リンクをリスナーへ。</p></div>${active?`<div class="resume"><span>前回：${esc(active.name)}</span>${btn('ルームを開く','resume')}</div>`:''}<div class="startgrid"><section class="panel accent"><h2>配信者として始める</h2><form id="createform"><div class="field"><label for="roomname">ルーム名</label><input id="roomname" name="roomname" maxlength="40" required placeholder="例：なつみの配信ルーム" autocomplete="off"></div><button class="primary wide" type="submit">ルームを作成</button></form><p class="caption">参加は50人まで・ルームは48時間有効<br>管理リンクで、別の端末からも再開できます。</p></section><section class="panel"><h2>リスナーとして参加する</h2><form id="joinform"><div class="field"><label for="roomcode">ルームコード</label><input id="roomcode" name="roomcode" maxlength="8" pattern="[a-fA-F0-9]{8}" placeholder="8桁のコード" autocapitalize="characters" autocomplete="off" required></div><div class="field"><label for="nickname">参加する名前</label><input id="nickname" name="nickname" maxlength="20" placeholder="配信で使っている名前" value="${esc(saved.name||'')}" required></div><button class="mint wide" type="submit">参加する</button></form></section></div><div class="catalogtitle"><h2>ゲームを選ぶ</h2><p>すべて参加用画面と連動</p></div>${catalog()}`;
}
function joinScreen(code){app.innerHTML=`<section class="panel listener"><div class="eyebrow">JOIN THE ROOM</div><h1>リスナーとして参加</h1><p class="caption">コード <b class="roomcode">${esc(code)}</b></p><form id="joinform"><input id="roomcode" type="hidden" value="${esc(code)}"><div class="field"><label for="nickname">参加する名前</label><input id="nickname" maxlength="20" value="${esc(saved.name||'')}" placeholder="配信で使っている名前" required></div><button class="mint wide">参加する</button></form><p class="caption">回答と名前はルーム内に表示されます。配信画面に映る場合があります。</p><p class="info">スマホ1台では、ゲーム画面への切り替えが必要です。配信を見ながら遊ぶには、2台目の端末や対応端末の画面分割が便利です。</p><a class="muted-link" href="./">ゲーム集に戻る</a></section>`}
function render(){
 if(!data)return home();
 const same=uiRound===data.state.id;uiRound=data.state.id;
 const field=$('#answerText'),draft=same&&field?field.value:null,focused=field===document.activeElement,pos=field?.selectionStart;
 const {room:r,host,state:s,me,players}=data;
 app.className=present?'presentation':'';
 app.innerHTML=`<div class="${host?'':'listener'}"><div class="roomhead"><div><span class="eyebrow">${host?'HOST ROOM':'LISTENER'}${me?' · '+esc(me.name):''}</span><h1>${esc(r.name)}</h1><span class="roomcode">${r.code}</span></div><div class="row">${host?btn('参加用リンク','share','primary')+btn(present?'通常表示':'配信表示','present'):btn('再接続','retry')}${btn('退出','leave','secondary')}</div></div>${r.closed?'<div class="closednotice">このルームは終了しました。ご参加ありがとうございました。</div>':''}<div class="workspace ${host?'':'listenergrid'}"><div><section class="stage">${s.kind?stage():`<div class="empty"><span class="symbol">✦</span><h2>${host?'最初のゲームを選ぼう':'配信者がゲームを準備しています'}</h2><p>${host?'下のゲームを選ぶと、お題の編集と開始ができます。':'画面は自動で切り替わります。このままお待ちください。'}</p></div>`}</section>${host&&!r.closed?`<section class="hostcatalog"><div class="catalogtitle"><h2>次に遊ぶゲーム</h2><p>${s.status==='open'?'切り替えは締切後':''}</p></div>${catalog()}</section>`:''}</div><aside class="panel roster"><h2>参加者 <span class="count">${players.length}<small> / 50</small></span></h2><div class="personlist">${players.length?players.map((p,i)=>`<div class="person"><span class="name"><span class="avatar">${i+1}</span>${esc(p.name)}</span>${host&&!r.closed?`<button data-do="kick" data-id="${p.id}" aria-label="${esc(p.name)}の参加を停止">停止</button>`:''}</div>`).join(''):'<p class="caption">参加用リンクを共有すると<br>ここに名前が表示されます。</p>'}</div>${host?`<div class="roomtools">${btn(r.locked?'参加受付を再開':'参加受付を閉じる','lock','',`data-server data-disabled="${r.closed}" ${r.closed?'disabled':''}`)}${btn('管理リンク','manage')}${btn('結果を保存','export')}${btn('ルームを終了','end','danger',r.closed?'disabled':'')}</div><p class="caption">有効期限：${new Date(r.expiresAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}（日本時間）</p>`:''}</aside></div></div>`;
 if(draft!==null&&$('#answerText')){$('#answerText').value=draft;if(focused){$('#answerText').focus({preventScroll:true});try{$('#answerText').setSelectionRange(pos,pos)}catch{}}}setBusy(busy);
}
function stage(){
 const {state:s,host,me,players,room}=data,g=getGame(s.kind),cfg=s.config,open=s.status==='open'&&!room.closed;
 const count=players.filter(p=>p.answered).length,own=me?.answer!=null;
 let body='';
 if(['either','ranking','quiz'].includes(s.kind)){
  const visible=s.kind!=='quiz'||!open;
  const counts=cfg.options.map((_,i)=>players.filter(p=>p.answer===i).length);
  body=`<div class="votelist">${cfg.options.map((o,i)=>`<button class="vote ${me?.answer===i?'chosen':''}" data-do="answer" data-value="${i}" data-server data-disabled="${host||!open||own}" ${host||!open||own?'disabled':''}><i class="bar" style="width:${visible&&count?Math.round(counts[i]/count*100):0}%"></i><span>${String.fromCharCode(65+i)}. ${esc(o.label)}${s.result?.correct===i?' ✓ 正解':''}</span>${visible?`<b>${counts[i]}票</b>`:''}</button>`).join('')}</div>`;
  if(s.kind==='ranking'&&count){const ranked=cfg.options.map((o,i)=>({...o,n:counts[i]})).sort((a,b)=>b.n-a.n).filter(o=>o.n>0).slice(0,3);body+=`<div class="info">暫定BEST3（同票は入力順）<br>${ranked.map((o,i)=>`${i+1}. ${esc(o.label)} · ${o.n}票`).join('<br>')}</div>`}
  if(s.kind==='quiz'&&!open)body+=answerList(players.filter(p=>p.answer!==null),p=>cfg.options[p.answer]?.label||'',p=>p.answer===s.result?.correct);
 }else if(['question','comment'].includes(s.kind)){
  if(!host&&open&&!own)body=`<form id="answerform"><label for="answerText">あなたの回答</label><textarea id="answerText" maxlength="140" placeholder="140文字まで" required></textarea><button class="primary wide" data-server type="submit">回答を送る</button></form>`;
  body+=answerList(players.filter(p=>p.answer!==null),p=>p.answer);
 }else if(s.kind==='mission'){
  body=`<div class="bigresult">${count}<small>人が達成 / ${players.length}人</small></div><div class="meter"><i style="width:${players.length?count/players.length*100:0}%"></i></div>`;
  if(!host&&open&&!own)body+=btn('できた！','answer','mint wide','data-value="true" data-server');
 }else if(s.kind==='bingo'){
  body=`<div class="bigresult number"><small>いま呼ばれた数字</small>${s.last??'—'}</div>`;
  if(!host){
    if(Array.isArray(me?.card)&&me.card.length===25){
      const marks=Array.isArray(me.marks)?me.marks:[],bingoState=bingoLines(me.card,marks),hit=s.last!=null&&me.card.includes(s.last),opened=hit&&marks.includes(s.last);
      if(s.last!=null)body+=`<div class="bingoalert ${hit?'hit':'miss'}" role="status" aria-live="polite"><strong>${hit?'🎯 当たり！':'今回はありません'}</strong><span>${hit?(opened?'この数字は開封済みです':'カードの '+s.last+' をタップして開こう'):'カードに '+s.last+' はありません'}</span></div>`;
      else body+='<div class="bingoalert ready"><strong>あなたのビンゴカード</strong><span>数字が呼ばれたら、当たりを自動でお知らせします。</span></div>';
      body+=`<div class="bingohead">${'BINGO'.split('').map(c=>`<span>${c}</span>`).join('')}</div><div class="bingo">${me.card.map(n=>{const marked=n===0||marks.includes(n),called=s.drawn.includes(n);return `<button class="${marked?'marked':called?'called':''}" data-do="mark" data-value="${n}" data-server data-disabled="${!open||marked||!called}" ${!open||marked||!called?'disabled':''} aria-label="${n||'フリー'}${marked?' 開封済み':called?' タップして開く':''}">${n||'<small>FREE</small>'}</button>`}).join('')}</div><p class="caption center">${me.bingo?'ビンゴ確認済み！':bingoState.bingo?'揃いました！ビンゴを申告しよう':bingoState.reach?`リーチ ${bingoState.reach}本！`:'黄色になった数字をタップして開こう'}</p>${!me.bingo&&open?btn('ビンゴ！','claim','mint wide',`data-server ${!bingoState.bingo?'disabled data-disabled="true"':''}`):''}`;
    }else{
      body+='<div class="bingoalert miss"><strong>ビンゴカードを取得できていません</strong><span>「再接続」を押してください。改善しない場合は一度退出して参加用リンクから入り直してください。</span></div>'+btn('再接続','retry','wide');
    }
  }else{
    body+='<div class="bingoalert ready"><strong>参加者には個別の5×5カードが表示されます</strong><span>呼ばれた数字がカードにある場合は「🎯 当たり！」と表示され、該当マスが黄色になります。</span></div>';
  }
  body+=`<div class="drawn" aria-label="抽選済みの数字">${s.drawn.map(n=>`<span>${n}</span>`).join('')}</div>`;
  body+=answerList(players.filter(p=>p.bingo),()=> 'BINGO！',()=>true);
 }else if(s.kind==='roulette'){
  body=`<div class="roulette" aria-hidden="true"><span>▼</span></div>${s.result?`<div class="bigresult">${esc(s.result.label)}</div>`:`<p class="caption center">${cfg.options.map(o=>esc(o.label)).join(' / ')}</p>`}`;
 }else if(s.kind==='lottery'){
  body=s.result?`<div class="bigresult"><small>選ばれたのは</small>${esc(s.result.name)}</div>`:'<div class="empty"><span class="symbol">☆</span><p>参加するだけで抽選対象に。<br>配信者が抽選するまでお待ちください。</p></div>';
  body+=`<p class="caption center">当選 ${s.drawn.length}人 / 参加 ${players.length}人 · 同じ人は重複当選しません</p>`;
 }else if(s.kind==='cards'||s.kind==='treasure'){
  body=`<div class="pickgrid">${Array.from({length:6},(_,i)=>{const revealed=(s.revealed||[]).find(v=>v.index===i),label=revealed?.label||(!open?s.deck?.[i]:null),disabled=!open||!!revealed||(!host&&own);return `<button class="pickcard ${revealed?'opened':''}" data-do="pick" data-value="${i}" data-server data-disabled="${disabled}" ${disabled?'disabled':''} aria-label="${i+1}番 ${label?esc(label)+' 開封済み':'を開ける'}"><b>${label?esc(label):(s.kind==='treasure'?'🎁':'?')}</b><span>${i+1}番${revealed?' · '+esc(revealed.by):''}</span></button>`}).join('')}</div><p class="caption">共有の6つを先着順で開けます。リスナーは1人1回。配信者は残りを開けられます。</p>`;
 }else if(s.kind==='slot'){
  const symbols=me?.answer?.reels||['🍒','⭐','7️⃣'];
  body=`<div class="reels">${symbols.map(v=>`<div>${esc(v)}</div>`).join('')}</div>`;
  if(own)body+=`<div class="bigresult"><small>あなたの結果</small>${esc(me.answer.label)}</div>`;
  else if(!host&&open)body+=btn('スロットを回す','pull','mint wide','data-server');
  else if(host&&open)body+='<p class="caption center">リスナーが自分の画面から回すと、ここに結果が届きます。</p>';
  body+=answerList(players.filter(p=>p.answer?.reels),p=>p.answer.reels.join(' ')+' · '+p.answer.label,p=>p.answer.match===3);
 }else if(s.kind==='gacha'||s.kind==='dice'){
  if(own)body=`<div class="bigresult"><small>あなたの結果</small>${esc(me.answer)}</div>`;
  else if(!host&&open)body=`<div class="empty"><span class="symbol">${g.icon}</span><p>1人1回。ボタンを押して結果を見よう。</p></div>${btn(s.kind==='gacha'?'ガチャを回す':'サイコロを振る','pull','mint wide','data-server')}`;
  if(s.kind==='gacha'){
    const total=cfg.options.reduce((a,o)=>a+o.weight,0);
    body+=`<details class="caption"><summary>出るもの・出現確率</summary>${cfg.options.map(o=>`${esc(o.label)}：${(o.weight/total*100).toFixed(1)}%`).join('<br>')}</details>`;
  }
  const max=Math.max(...players.filter(p=>p.answer!==null).map(p=>Number(p.answer)));
  body+=answerList(players.filter(p=>p.answer!==null),p=>p.answer,p=>s.kind==='dice'&&!open&&p.answer===max);
 }else if(s.kind==='rps'){
  if(open&&!host&&!own)body=`<div class="row">${HANDS.map((h,i)=>btn(h,'answer','',`data-value="${i}" data-server`)).join('')}</div>`;
  if(own)body+=`<p class="answered">あなたの手：${HANDS[me.answer]}</p>`;
  if(!open&&s.result?.hand!=null){body+=`<div class="bigresult"><small>相手の手</small>${HANDS[s.result.hand]}</div>`;body+=answerList(players.filter(p=>p.answer!==null),p=>`${HANDS[p.answer]} · ${winsRps(p.answer,s.result.hand)?'勝ち！':p.answer===s.result.hand?'あいこ':'負け'}`,p=>winsRps(p.answer,s.result.hand))}
 }else if(s.kind==='number'){
  if(open&&!host&&!own)body=`<form id="answerform"><label for="answerText">あなたの予想（1〜100）</label><input id="answerText" type="number" min="1" max="100" step="1" inputmode="numeric" required><button class="primary wide" data-server type="submit">予想を送る</button></form>`;
  if(own)body+=`<p class="answered">あなたの予想：${me.answer}</p>`;
  if(!open&&s.result?.target){const diff=Math.min(...players.filter(p=>p.answer!==null).map(p=>Math.abs(p.answer-s.result.target)));body+=`<div class="bigresult number"><small>抽選した数字</small>${s.result.target}</div>`+answerList(players.filter(p=>p.answer!==null).sort((a,b)=>Math.abs(a.answer-s.result.target)-Math.abs(b.answer-s.result.target)),p=>`${p.answer}（差 ${Math.abs(p.answer-s.result.target)}）`,p=>Math.abs(p.answer-s.result.target)===diff)}
 }
 let foot='';
 if(!['bingo','roulette','lottery'].includes(s.kind)){foot=`<p class="caption">回答・参加済み ${count} / ${players.length}人${['quiz','rps','number'].includes(s.kind)&&open?' · 締切まで回答は非公開':''}</p>`;if(own&&open)foot+='<p class="answered">✓ 送信済み。このまま結果をお待ちください。</p>'}
 if(!host&&open&&['roulette'].includes(s.kind))foot+='<p class="caption center">配信者が操作すると、ここにも結果が表示されます。</p>';
 if(host&&!room.closed)foot+=`<div class="playactions">${open&&['bingo','roulette','lottery'].includes(s.kind)?btn(s.kind==='bingo'?'次の数字を引く':s.kind==='roulette'?'ルーレットを回す':'参加者を抽選','draw','mint','data-server'):''}${open?btn('締切・結果発表','close','primary','data-server'):btn('もう一度遊ぶ','again','primary')}${btn('お題をコピー','copyPrompt','secondary')}</div>`;
 return `<div class="stageheader"><span class="gamename">${g?.icon||''} ${g?.name||'ゲーム'}</span><span class="phase ${open?'':'closed'}">${open?'受付中':'結果発表'}</span></div><h2 class="prompt">${esc(cfg.prompt)}</h2>${body}${foot}`;
}
function answerList(ps,format,winner=()=>false){return ps.length?`<div class="answers">${ps.map(p=>`<div class="answer ${winner(p)?'winner':''}"><strong>${esc(p.name)}${winner(p)?' · ★':''}</strong>${esc(format(p))}</div>`).join('')}</div>`:''}
function showModal(title,body){$('#modalcontent').innerHTML=`<div class="modalhead"><h2>${title}</h2><button class="iconbtn" data-do="dismiss" aria-label="閉じる">×</button></div>${body}`;if(!modal.open)modal.showModal()}
function setupGame(id){
 if(!data?.host){$('#roomname')?.focus();toast('配信者としてルームを作成すると始められます');return}
 if(data.state.status==='open'){toast('現在のゲームを締め切ってから選んでください');return}
 let g=getGame(id);if(id==='random')g=pick(GAMES.filter(g=>g.set==='talk'&&g.id!=='random'));
 const c=saved.presets[g.id]||defaults(g);
 showModal(`${g.icon} ${g.name}`,`<form id="gameform" data-game="${g.id}"><div class="field"><label for="promptInput">お題・説明</label><textarea id="promptInput" maxlength="160" required>${esc(c.prompt)}</textarea>${g.samples?btn('別のお題にする','sample','secondary',`type="button" data-game="${g.id}"`):''}</div>${g.options?`<div class="field"><label for="optionsInput">選択肢（1行に1つ・各40文字まで）</label><textarea id="optionsInput" rows="${Math.min(c.options.length,7)}" required>${c.options.map(o=>esc(o.label)).join('\n')}</textarea><p class="caption">${g.id==='quiz'?'4つ':g.id==='either'?'2つ':['cards','treasure'].includes(g.id)?'6つ':'2〜20個'}を入力してください。</p></div>`:''}${g.id==='gacha'?`<div class="field"><label for="weightsInput">出現の重み（選択肢と同じ順に1行1つ）</label><textarea id="weightsInput">${c.options.map(o=>o.weight||1).join('\n')}</textarea><p class="caption">各1〜100。すべて1で同じ確率になります。</p></div>`:''}${g.id==='quiz'?`<div class="field"><label for="correctInput">正解</label><select id="correctInput">${[0,1,2,3].map(i=>`<option value="${i}" ${c.correct===i?'selected':''}>${String.fromCharCode(65+i)}（${i+1}行目）</option>`).join('')}</select></div>`:''}<p class="caption">参加者の画面も、このゲームに切り替わります。前の結果を残したい場合は、開始前に「結果を保存」を押してください。</p><div id="formerror" class="error" role="alert"></div><button class="primary wide" type="submit">このゲームを開始</button></form>`);
}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('コピーしました')}catch{showModal('コピーする内容',`<textarea readonly id="copyFallback">${esc(text)}</textarea><p class="caption">長押ししてコピーしてください。</p>`);$('#copyFallback').select()}}
const invite=()=>`${location.origin}${location.pathname}?room=${data.room.code}&listen=1`;
function share(manage=false){const url=manage?`${location.origin}${location.pathname}?room=${data.room.code}#host=${session.token}`:invite();showModal(manage?'配信者の管理リンク':'リスナーを招待',`<p>${manage?'このリンクを持つ人はルームを操作できます。ご自身だけで保管してください。':'このURLから名前を入力するだけで参加できます。'}</p><div class="sharefield">${esc(url)}</div><button class="primary wide" data-do="copyLink" data-manage="${manage}">リンクをコピー</button>${!manage?`<p class="caption">参加コード：<b class="roomcode">${data.room.code}</b></p><a class="muted-link" href="${esc(url)}" target="_blank" rel="noopener">参加用画面を開く ↗</a>`:''}`)}
function help(){showModal('遊び方',`<ol class="helptext"><li>配信者がルームを作成し、<b>参加用リンク</b>を共有。</li><li>リスナーはリンクを開いて名前を入力。アカウント登録は不要です。</li><li>配信者がゲームを選んで開始。リスナー側の回答・投票・カード操作が反映されます。</li><li><b>締切・結果発表</b>で区切り、同じルームのまま次のゲームへ。</li></ol><p class="info">TikTokとは自動連携しません。操作はこのゲームページで行います。配信とゲームを同時に見る場合は、2台の端末や画面分割をご利用ください。</p><p class="caption">同じ端末・ブラウザなら参加状態を復元できます。管理リンクは配信者ご本人だけで保管してください。ルームは48時間有効、1ルーム50人まで。回答は各ゲーム1人1回です。端末やブラウザを変えた多重参加を完全には防げないため、景品がある企画では配信者側でも参加者をご確認ください。</p>`)}
function confirm(title,text,action){showModal(title,`<p>${text}</p><div class="row">${btn('キャンセル','dismiss')}${btn('実行する','confirmed','danger',`data-next="${action}"`)}</div>`)}
function exportResults(){const {room:r,state:s,players}=data;const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=[['ルーム',r.name],['ゲーム',getGame(s.kind)?.name||'未開始'],['お題',s.config?.prompt||''],['状態',s.status||''],['名前','回答','ビンゴ']];for(const p of players)rows.push([p.name,typeof p.answer==='number'&&s.config?.options?s.config.options[p.answer]?.label:(typeof p.answer==='object'&&p.answer!==null?JSON.stringify(p.answer):p.answer),p.bingo?'BINGO':'']);if(s.result)rows.push(['結果',JSON.stringify(s.result)]);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download=`kazz-play-${r.code}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-do]');if(!el)return;const action=el.dataset.do;
 if(action==='dismiss'){modal.close();return}
 if(action==='tab'){group=el.dataset.set;if(data)render();else{const drafts=['roomname','roomcode','nickname'].map(id=>[id,document.getElementById(id)?.value]);home();for(const [id,value] of drafts)if(value!=null&&document.getElementById(id))document.getElementById(id).value=value;}return}
 if(action==='game'){setupGame(el.dataset.game);return}
 if(action==='sample'){const g=getGame(el.dataset.game),v=pick(g.samples);if(Array.isArray(v))$('#optionsInput').value=v.join('\n');else $('#promptInput').value=v;return}
 if(action==='retry'){await refresh();return}
 if(action==='share'||action==='manage'){share(action==='manage');return}
 if(action==='copyLink'){await copy(el.dataset.manage==='true'?`${location.origin}${location.pathname}?room=${data.room.code}#host=${session.token}`:invite());return}
 if(action==='resume'){location.href=`?room=${saved.active}`;return}
 if(action==='present'){present=!present;render();return}
 if(action==='leave'){location.href='./';return}
 if(action==='again'){setupGame(data.state.kind);return}
 if(action==='copyPrompt'){copy(data.state.config.prompt);return}
 if(action==='export'){exportResults();return}
 if(action==='end'){confirm('ルームを終了しますか？','終了後、このルームではゲームを操作できなくなります。','end');return}
 if(action==='kick'){const p=data.players.find(p=>p.id===el.dataset.id);confirm('参加を停止しますか？',`${esc(p?.name)}さんをこのルームから停止します。同じ参加情報での再参加はできません。`,'kick:'+el.dataset.id);return}
 if(action==='confirmed'){modal.close();if(el.dataset.next.startsWith('kick:'))await act('kick',{id:el.dataset.next.slice(5)});else await act(el.dataset.next);return}
 if(action==='lock'){await act('lock',{locked:!data.room.locked});return}
 if(action==='answer'){await act('answer',{value:JSON.parse(el.dataset.value)});return}
 if(action==='mark'||action==='pick'){await act(action,{value:Number(el.dataset.value)});return}
 if(action==='draw'&&data.state.kind==='roulette')$('.roulette')?.classList.add('spinning');
 if(['draw','close','claim','pull'].includes(action))await act(action);
});
document.addEventListener('submit',async e=>{
 if(!['createform','joinform','gameform','answerform'].includes(e.target.id))return;e.preventDefault();const form=e.target;
 if(form.dataset.pending)return;form.dataset.pending='true';const submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;
 try{
 if(form.id==='createform'){
  const name=$('#roomname').value.trim();const ctx={token:token(),code:''};const d=await request('create',{name},ctx);ctx.code=d.room.code;
  saved.hosts[ctx.code]={token:ctx.token,name};saved.active=ctx.code;save();session=ctx;history.replaceState(null,'',`?room=${ctx.code}`);accept(d);connect();share(true);
 }else if(form.id==='joinform'){
  const code=$('#roomcode').value.trim().toUpperCase(),name=$('#nickname').value.trim();
  const ctx={code,token:saved.listeners[code]?.token||token()};const d=await request('join',{name},ctx);
  saved.listeners[code]={token:ctx.token,name};saved.name=name;save();session=ctx;history.replaceState(null,'',`?room=${code}&listen=1`);accept(d);connect();
 }else if(form.id==='gameform'){
  const g=getGame(form.dataset.game),cfg={prompt:$('#promptInput').value.trim()};
  if(g.options){const labels=$('#optionsInput').value.split('\n').map(s=>s.trim()).filter(Boolean);if(labels.some(s=>[...s].length>40))throw new Error('選択肢は1つ40文字以内です');const weights=g.id==='gacha'?$('#weightsInput').value.split('\n').map(v=>Number(v.trim())):labels.map(()=>1);if(g.id==='gacha'&&(weights.length!==labels.length||weights.some(w=>!Number.isInteger(w)||w<1||w>100)))throw new Error('重みは選択肢と同じ数で、各1〜100の整数を入力してください');cfg.options=labels.map((label,i)=>({label,weight:weights[i]}));}
  if(g.id==='quiz')cfg.correct=Number($('#correctInput').value);
  const d=await request('start',{kind:g.id,config:cfg,revision:data.room.revision});saved.presets[g.id]=cfg;save();modal.close();accept(d);
 }else if(form.id==='answerform'){
  const value=data.state.kind==='number'?Number($('#answerText').value):$('#answerText').value.trim();await act('answer',{value});
 }
 }catch(err){if($('#formerror')&&form.id==='gameform')$('#formerror').textContent=err.message;else toast(err.message)}finally{delete form.dataset.pending;if(submit)submit.disabled=false}
});
$('#help').addEventListener('click',help);
window.addEventListener('online',()=>{status();refresh()});window.addEventListener('offline',()=>{online=false;status()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.addEventListener('pagehide',()=>{if(channel)client?.removeChannel(channel)});
const params=new URLSearchParams(location.search),code=(params.get('room')||'').toUpperCase(),hostToken=new URLSearchParams(location.hash.slice(1)).get('host');
if(code&&/^[A-F0-9]{8}$/.test(code)){
 if(hostToken&&/^[a-f0-9]{64}$/.test(hostToken)){session={code,token:hostToken};history.replaceState(null,'',`?room=${code}`);try{const d=await request('snapshot');if(!d.host)throw new Error('管理リンクを確認してください');saved.hosts[code]={token:hostToken,name:d.room.name};saved.active=code;save();accept(d);connect()}catch(e){showError(e.message)}}
 else if(params.get('listen')!=='1'&&saved.hosts[code]){session={code,token:saved.hosts[code].token};await refresh();if(data)connect()}
 else if(saved.listeners[code]){session={code,token:saved.listeners[code].token};await refresh();if(data)connect()}
 else joinScreen(code);
}else home();
