export const API_URL='https://esfgrykcvdctnvdqipbj.supabase.co',API_KEY='sb_publishable_Rwb3qaRXdWZoo05LrbFaDg_29tMI7uI',ADMIN_URL='https://tiktoklive-item-manager.vercel.app/comments/admin/',PUBLIC_URL='https://tiktoklive-item-manager.vercel.app/comments/';
export const TOKENS=['名前','推しマ','ギフト','目標数','現在数','残り数','目標人数','現在人数','残り人数'];
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clone=x=>JSON.parse(JSON.stringify(x));
export const uid=(p='m')=>p+crypto.randomUUID().replaceAll('-','');
export function countText(t){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(t)].length:Array.from(t).length;}
export function resolveText(text,s){
 const left=(a,b)=>a!==''&&b!==''&&a!=null&&b!=null?String(Math.max(0,Number(a)-Number(b))):'';
 const v={'名前':s.name,'推しマ':s.mark,'ギフト':s.gift,'目標数':s.goal,'現在数':s.current,'残り数':left(s.goal,s.current),'目標人数':s.peopleGoal,'現在人数':s.peopleCurrent,'残り人数':left(s.peopleGoal,s.peopleCurrent)},missing=new Set();
 const result=String(text).replace(/\{\{([^{}]+)\}\}/g,(_,k)=>{if(!(k in v)||v[k]==null||v[k]===''){missing.add(k);return `【${k}未入力】`;}return String(v[k]);});
 if(/○○|○人|\{\{|\}\}/.test(result))missing.add('文章の未入力箇所');return{text:result,missing:[...missing],count:countText(result)};
}
export function normalizeDocument(d){
 if(!d||d.schemaVersion!==1||!d.settings||!Array.isArray(d.comments)||!Array.isArray(d.categories))throw Error('この形式のバックアップは読み込めません。');
 if(d.comments.length>200||d.categories.length>20)throw Error('定期文は200件、カテゴリは20件までです。');
 const settings={},ids=new Set(),cats=new Set(),valid=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(x);
 for(const[k,max]of Object.entries({name:60,mark:40,title:60,gift:30,goal:12,current:12,peopleGoal:12,peopleCurrent:12})){const v=String(d.settings[k]??'');if(v.length>max)throw Error('入力が長すぎます：'+k);settings[k]=v;}
 for(const k of ['goal','current','peopleGoal','peopleCurrent'])if(settings[k]&&!/^\d{1,9}$/.test(settings[k]))throw Error('目標と現在値は0以上の整数で入力してください。');
 settings.accent=/^#[0-9a-f]{6}$/i.test(d.settings.accent)?d.settings.accent:'#ff3b6a';
 const categories=d.categories.map(c=>{if(!valid(c.id)||['all','favorites'].includes(c.id)||cats.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>40)throw Error('カテゴリの名前・IDを確認してください。');cats.add(c.id);return{id:c.id,name:c.name.trim(),visible:c.visible!==false};});
 const comments=d.comments.map(c=>{if(!valid(c.id)||ids.has(c.id)||!cats.has(c.category)||typeof c.title!=='string'||typeof c.text!=='string'||!c.title.trim()||!c.text.trim()||c.title.length>80||c.text.length>1500)throw Error('定期文のタイトル・本文・カテゴリを確認してください。');ids.add(c.id);return{id:c.id,category:c.category,title:c.title.trim(),text:c.text.trim(),visible:c.visible!==false,pinned:c.pinned===true};});
 return{schemaVersion:1,settings,categories,comments};
}
export function publicDocument(doc){const d=normalizeDocument(doc);d.categories=d.categories.filter(c=>c.visible);const cats=new Set(d.categories.map(c=>c.id));d.comments=d.comments.filter(c=>c.visible&&cats.has(c.category));return d;}
export function publishIssues(doc){const d=publicDocument(doc),out=[];if(!d.settings.name.trim())out.push('配信者名を入力してください。');if(!d.comments.length)out.push('公開する定期文を1件以上用意してください。');for(const c of d.comments){const r=resolveText(c.text,d.settings);if(r.missing.length)out.push(`${c.title}：${r.missing.join('・')}を入力するか、この文を非表示にしてください。`);if(r.count>141)out.push(`${c.title}：${r.count}文字です。141文字の目安に収めてください。`);}return out;}
export async function copyText(text,{clipboard=globalThis.navigator?.clipboard,document=globalThis.document}={}){
 if(clipboard?.writeText){try{await clipboard.writeText(text);return true;}catch{}}
 if(!document)return false;const previous=document.activeElement,ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');Object.assign(ta.style,{position:'fixed',left:'-9999px',top:'0',fontSize:'16px'});document.body.appendChild(ta);let copied=false;
 try{ta.focus({preventScroll:true});ta.select();ta.setSelectionRange(0,text.length);copied=document.execCommand('copy')===true;}catch{}finally{ta.remove();previous?.focus?.({preventScroll:true});}return copied;
}
export function storageGet(k,f){try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v);}catch{return f;}}
export function storageSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}}
export function downloadJSON(v,name){const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
export const SPARKLES=[['音符','✨.•*¨*•.¸¸♬ {{推しマ}} ♬•*¨*•.¸¸.✨'],['音符ロング','•*¨*•.¸¸♬•*¨*•.¸¸♪ {{推しマ}} ♪¸¸.•*¨*•♬'],['星','☆.｡.:*・ﾟ {{推しマ}} ☆.｡.:*・ﾟ'],['天使','꒰ঌ ✨ {{推しマ}} ✨ ໒꒱'],['ハート','₊˚⊹♡ {{推しマ}} ♡⊹˚₊'],['リボン','୨୧ ┈┈ {{推しマ}} ┈┈ ୨୧'],['連続音符','♬.*ﾟ {{推しマ}} ♬.*ﾟ {{推しマ}} ♬.*ﾟ'],['花','✿.•¨•.¸¸.•¨•.¸¸♬ {{推しマ}} ♬¸¸.•¨•.¸¸.•¨•.✿']];
