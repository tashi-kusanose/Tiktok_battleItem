// Custom bearer capabilities: 256-bit room/participant tokens, hashed before DB access.
const URL = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins = new Set(['https://tashi-kusanose.github.io','http://localhost:5173','http://127.0.0.1:5173']);
const sha = async (s:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async req => {
 const origin = req.headers.get('origin') || '';
 const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',
  ...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
  'Access-Control-Allow-Headers':'content-type,apikey,x-game-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
 if(origin && !origins.has(origin)) return reply({error:'このページからの操作はできません'},403);
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
 if(req.method!=='POST') return reply({error:'POST only'},405);
 try {
   const token=req.headers.get('x-game-token') || '';
   if(!/^[a-f0-9]{64}$/.test(token)) return reply({error:'参加情報がありません。入り直してください'},401);
   const raw=await req.text();
   if(raw.length>18000) return reply({error:'入力が長すぎます'},413);
   const data=JSON.parse(raw);
   const allowed=['create','join','snapshot','start','answer','mark','claim','pull','draw','close','lock','kick','end','pick'];
   if(!allowed.includes(data.action) || typeof data.code!=='string' && data.action!=='create') return reply({error:'操作が無効です'},400);
   // x-forwarded-for is set by the platform ingress. Store only a daily salted digest.
   const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
   const [hash,rate]=await Promise.all([sha(token),sha(KEY+new Date().toISOString().slice(0,10)+ip)]);
   const res=await fetch(URL+'/rest/v1/rpc/kg_api',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},
     body:JSON.stringify({p_action:data.action,p_code:data.code||'',p_hash:hash,p_data:data.data||{},p_rate:rate})});
   const body=await res.json();
   if(!res.ok) {
      if(body.code==='P0001') return reply({error:body.message},400);
      console.error('kg_api',body.code);
      return reply({error:'処理できませんでした。入力を確認してもう一度お試しください'},500);
   }
   if(body.error) return reply({error:body.error},body.status||400);
   return reply(body);
 } catch {return reply({error:'通信に失敗しました。もう一度お試しください'},500);}
});
