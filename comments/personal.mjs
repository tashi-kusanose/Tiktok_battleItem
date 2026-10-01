import {esc,copyText,storageGet,storageSet,countText} from './core.mjs?v=20260923.1';
const $=id=>document.getElementById(id);
const page=new URLSearchParams(location.search).get('page')||'natsumi';
const slug=/^[a-zA-Z0-9_-]{1,80}$/.test(page)?page:'natsumi';
const storageKey='teiki:personal:'+slug;
const saved=storageGet(storageKey,[]);
let mine=Array.isArray(saved)?saved.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&typeof x.text==='string'&&typeof x.category==='string').slice(0,100):[];
let editId=null,expanded=mine.length>0,timer;
const categories=['通常配信','バトル開始','ちょんちょん','ラスト','歌キラコメ','その他'];
function notice(s){
 const t=$('toast');t.textContent=s;t.hidden=false;clearTimeout(timer);timer=setTimeout(()=>t.hidden=true,2500);
}
function persist(rows){
 if(!storageSet(storageKey,rows)){notice('端末に保存できません。ブラウザの保存設定をご確認ください。');return false;}
 mine=rows;render();return true;
}
function render(){
 $('minePanel').hidden=!expanded;
 $('toggleMine').setAttribute('aria-expanded',String(expanded));
 $('toggleMine').textContent='✍️ マイ定期（'+mine.length+'件） '+(expanded?'▴':'▾');
 $('mineCards').innerHTML=mine.length?mine.map(row=>{
  const count=countText(row.text);
  return '<article class="comment-card"><div class="card-top"><h3>'+esc(row.title)+'</h3><span class="length '+(count>141?'warning':'')+'">'+count+'/141目安</span></div><span class="personal-label">'+esc(row.category)+'</span><p class="comment-body">'+esc(row.text)+'</p><div class="card-bottom"><button class="btn small" data-mine-edit="'+esc(row.id)+'">編集</button><button class="btn small danger" data-mine-delete="'+esc(row.id)+'">削除</button><button class="btn primary" data-mine-copy="'+esc(row.id)+'">コピー</button></div></article>';
 }).join(''):'<p class="empty">まだ定期がありません。「＋ 手動で定期を追加」から登録できます。</p>';
}
function closeForm(){$('mineDialog').close();}
function openForm(row=null){
 editId=row?.id||null;
 $('mineDialogTitle').textContent=editId?'マイ定期を編集':'定期を手入力で追加';
 $('mineTitle').value=row?.title||'';
 $('mineCategory').value=categories.includes(row?.category)?row.category:'通常配信';
 $('mineText').value=row?.text||'';
 showLength();$('mineDialog').showModal();$('mineTitle').focus();
}
function showLength(){
 const n=countText($('mineText').value);
 $('mineLength').textContent=n+'/141文字目安'+(n>141?'（上限の目安を超えています）':'');
 $('mineLength').classList.toggle('warning',n>141);
}
$('toggleMine').onclick=()=>{expanded=!expanded;render();};
$('addMineBtn').onclick=()=>{expanded=true;render();openForm();};
$('mineClose').onclick=closeForm;
$('mineCancel').onclick=closeForm;
$('mineText').oninput=showLength;
$('mineForm').onsubmit=e=>{
 e.preventDefault();
 const title=$('mineTitle').value.trim(),body=$('mineText').value.trim(),category=$('mineCategory').value;
 if(!title||!body||!categories.includes(category))return;
 if(!editId&&mine.length>=100){notice('マイ定期は100件まで保存できます。');return;}
 const item={id:editId||'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),title,category,text:body};
 const rows=editId?mine.map(row=>row.id===editId?item:row):[item,...mine];
 if(persist(rows)){closeForm();notice(editId?'定期を更新しました':'マイ定期を追加しました');}
};
$('mineCards').onclick=async e=>{
 const b=e.target.closest('button');if(!b)return;
 const id=b.dataset.mineEdit||b.dataset.mineDelete||b.dataset.mineCopy;
 const row=mine.find(x=>x.id===id);if(!row)return;
 if(b.dataset.mineEdit){openForm(row);return;}
 if(b.dataset.mineDelete){
  if(!confirm('「'+row.title+'」を削除しますか？'))return;
  if(persist(mine.filter(x=>x.id!==id)))notice('削除しました');
  return;
 }
 if(b.dataset.mineCopy){
  const ok=await copyText(row.text);
  if(ok){notice('コピーしました');b.textContent='コピーしました ✓';setTimeout(()=>{b.textContent='コピー';},1500);}
  else{$('manualText').value=row.text;$('manualDialog').showModal();$('manualText').focus();$('manualText').select();}
 }
};
render();
