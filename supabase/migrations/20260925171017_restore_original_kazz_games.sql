create or replace function public.kg_api(p_action text,p_code text,p_hash text,p_data jsonb,p_rate text)
returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='5s' as $$
declare r public.kg_rooms%rowtype; me public.kg_players%rowtype; host boolean:=false;
 s jsonb; cfg jsonb; kind text; rid text; nm text; cnt int; lim int; period int; bucket text;
 opts jsonb; val jsonb; result jsonb; players jsonb; safe_s jsonb; hist jsonb;
 n int; j int; total int; weight int; candidate jsonb; chosen jsonb; target int; idx int;
 card jsonb; marks jsonb; line boolean; bingo boolean; x int; y int; uid uuid;
 mutated boolean:=false; current_round text; arr int[];
begin
 if p_hash !~ '^[a-f0-9]{64}$' or p_rate !~ '^[a-f0-9]{64}$' then raise exception '認証情報が無効です'; end if;
 if octet_length(p_data::text)>16000 then raise exception '入力が長すぎます'; end if;
 period:=case when p_action='create' then 3600 else 60 end;
 lim:=case when p_action='create' then 6 when p_action='join' then 60 else 150 end;
 bucket:=case when p_action in ('create','join') then p_rate else p_hash end||':'||case when p_action='create' then 'create' when p_action='join' then 'join' else 'action' end||':'||floor(extract(epoch from now())/period)::text;
 insert into public.kg_limits values(bucket,1,now()+make_interval(secs=>period*2))
 on conflict(key) do update set hits=kg_limits.hits+1 returning hits into cnt;
 if cnt>lim then return jsonb_build_object('error','操作が続いています。少し待ってからお試しください。','status',429); end if;

 begin
 if p_action='create' then
   perform pg_advisory_xact_lock(1942770201);
   select * into r from public.kg_rooms where host_hash=p_hash;
   if not found then
     if (select count(*) from public.kg_rooms where expires_at>now() and not closed)>=200 then raise exception '現在ルームが混み合っています'; end if;
     nm:=btrim(p_data->>'name');
     if coalesce(char_length(nm),0) not between 1 and 40 then raise exception 'ルーム名は1〜40文字です'; end if;
     loop
       p_code:=upper(encode(extensions.gen_random_bytes(4),'hex'));
       exit when not exists(select 1 from public.kg_rooms where code=p_code);
     end loop;
     insert into public.kg_rooms(code,host_hash,name) values(p_code,p_hash,nm) returning * into r;
     delete from public.kg_rooms where expires_at<now()-interval '7 days';
     delete from public.kg_limits where expires_at<now();
   end if;
   host:=true;
 else
   if p_action='snapshot' then
     select * into r from public.kg_rooms where code=upper(p_code);
   else
     select * into r from public.kg_rooms where code=upper(p_code) for update;
   end if;
   if not found then raise exception 'ルームが見つかりません。コードを確認してください'; end if;
   host:=(r.host_hash=p_hash);
   if r.expires_at<now() then raise exception 'このルームは有効期限を過ぎました。新しいルームを作成してください'; end if;
   if not host then select * into me from public.kg_players where room_id=r.id and token_hash=p_hash; end if;
   if me.banned then raise exception 'このルームへの参加は停止されています'; end if;
   if p_action='join' and not host and me.id is null then
      if r.closed or r.locked then raise exception '参加受付は終了しています'; end if;
      if (select count(*) from public.kg_players where room_id=r.id and not banned)>=50 then raise exception 'このルームは定員50人です'; end if;
      nm:=btrim(p_data->>'name');
      if coalesce(char_length(nm),0) not between 1 and 20 then raise exception '名前は1〜20文字です'; end if;
      if exists(select 1 from public.kg_players where room_id=r.id and name=nm) then raise exception '同じ名前が使われています。末尾に絵文字や数字を付けてください'; end if;
      if r.state->>'kind'='bingo' then card:=public.kg_card(); end if;
      insert into public.kg_players(room_id,token_hash,name,round_id,card) values(r.id,p_hash,nm,r.state->>'id',card) returning * into me;
      mutated:=true;
   elsif not host and me.id is null then raise exception '参加し直してください';
   end if;
 end if;
 s:=r.state; kind:=s->>'kind'; rid:=s->>'id'; cfg:=s->'config';
 if p_action not in ('create','snapshot','join') then
   if r.closed then raise exception 'このルームは終了しました'; end if;
   if p_action not in ('answer','mark','claim','pull','pick') and not host then raise exception '配信者だけが操作できます'; end if;
   if p_action in ('answer','mark','claim','pull') and host then raise exception '参加用画面から操作してください'; end if;
   if p_action in ('answer','mark','claim','pull','draw','close','pick') and (p_data->>'round') is distinct from rid then raise exception 'ゲームが切り替わりました。画面の更新をお待ちください'; end if;
   if p_action in ('draw','start') and (p_data->>'revision')::bigint is distinct from r.revision then raise exception '画面が更新されました。内容を確認してもう一度お試しください'; end if;

   if p_action='start' then
     if s->>'status'='open' then raise exception '先に現在のゲームを締め切ってください'; end if;
     if r.revision>3000 then raise exception 'ルームの操作上限です。新しいルームを作成してください'; end if;
     kind:=p_data->>'kind'; cfg:=p_data->'config';
     if kind is null or kind not in ('question','either','ranking','comment','mission','bingo','roulette','gacha','lottery','quiz','rps','dice','number','slot','cards','treasure') then raise exception 'ゲームが無効です'; end if;
     if jsonb_typeof(cfg) is distinct from 'object' then raise exception '設定を確認してください'; end if;
     if coalesce(char_length(cfg->>'prompt'),0) not between 1 and 160 then raise exception 'お題は1〜160文字です'; end if;
     if kind in ('either','ranking','roulette','gacha','quiz','cards','treasure') then
       opts:=cfg->'options';
       if jsonb_typeof(opts) is distinct from 'array' then raise exception '選択肢が必要です'; end if;
       n:=jsonb_array_length(opts);
       if n<2 or n>20 or (kind='either' and n<>2) or (kind='quiz' and n<>4) or (kind in ('cards','treasure') and n<>6) then raise exception '選択肢の数を確認してください'; end if;
       for candidate in select value from jsonb_array_elements(opts) loop
         if coalesce(char_length(candidate->>'label'),0) not between 1 and 40 then raise exception '選択肢は1〜40文字です'; end if;
         if kind='gacha' and ((candidate->>'weight')::int not between 1 and 100 or candidate->>'weight' is null) then raise exception '出現の重みは1〜100です'; end if;
       end loop;
     end if;
     if kind='quiz' and (coalesce((cfg->>'correct')::int,-1) not between 0 and 3) then raise exception '正解を選んでください'; end if;
     cfg:=cfg-'target'-'hand'-'deck';
     s:=jsonb_build_object('id',gen_random_uuid()::text,'kind',kind,'status','open','config',cfg,'drawn','[]'::jsonb,'startedAt',now());
     if kind in ('cards','treasure') then
       s:=s||jsonb_build_object('deck','[]'::jsonb,'revealed','[]'::jsonb); arr:=array[0,1,2,3,4,5];
       for x in 1..6 loop
         j:=public.kg_rand(array_length(arr,1))+1; idx:=arr[j]; arr:=array_remove(arr,idx);
         s:=jsonb_set(s,'{deck}',(s->'deck')||jsonb_build_array(cfg->'options'->idx->>'label'));
       end loop;
     end if;
     update public.kg_players set round_id=s->>'id',answer=null,marks='[]',bingo=false,answered_at=null,card=case when kind='bingo' then public.kg_card() else null end where room_id=r.id;
     mutated:=true;
   elsif p_action='answer' or p_action='pull' then
     if s->>'status' is distinct from 'open' then raise exception '回答は締め切られています'; end if;
     if me.answer is not null then raise exception 'このゲームでは参加済みです'; end if;
     if me.round_id is distinct from rid then raise exception '画面を更新してください'; end if;
     if kind in ('either','ranking','quiz','rps') then
       idx:=(p_data->>'value')::int; n:=case when kind='rps' then 3 else jsonb_array_length(cfg->'options') end;
       if idx is null or idx<0 or idx>=n then raise exception '選択肢を選んでください'; end if;
       val:=to_jsonb(idx);
     elsif kind in ('question','comment') then
       nm:=btrim(p_data->>'value');
       if coalesce(char_length(nm),0) not between 1 and 140 then raise exception '回答は1〜140文字です'; end if;
       val:=to_jsonb(nm);
     elsif kind='mission' then val:='true'::jsonb;
     elsif kind='number' then
       n:=(p_data->>'value')::int;
       if n is null or n<1 or n>100 then raise exception '1〜100の整数を入力してください'; end if;
       val:=to_jsonb(n);
     elsif kind='slot' then
       opts:='["🍒","⭐","7️⃣","🍋","🔔","💎"]'::jsonb;
       val:=jsonb_build_array(opts->public.kg_rand(6),opts->public.kg_rand(6),opts->public.kg_rand(6));
       n:=case when val->0=val->1 and val->1=val->2 then 3 when val->0=val->1 or val->1=val->2 or val->0=val->2 then 2 else 0 end;
       val:=jsonb_build_object('reels',val,'match',n,'label',case n when 3 then '大当たり！' when 2 then '2つ揃い！' else 'また次のゲームで！' end);
     elsif kind='dice' then val:=to_jsonb(public.kg_rand(6)+1);
     elsif kind='gacha' then
       total:=0;
       for candidate in select value from jsonb_array_elements(cfg->'options') loop total:=total+(candidate->>'weight')::int; end loop;
       j:=public.kg_rand(total); total:=0;
       for candidate in select value from jsonb_array_elements(cfg->'options') loop
         total:=total+(candidate->>'weight')::int;
         if j<total then val:=candidate->'label'; exit; end if;
       end loop;
     else raise exception 'このゲームでは回答できません'; end if;
     update public.kg_players set answer=val,answered_at=clock_timestamp() where id=me.id;
     mutated:=true;
   elsif p_action='pick' then
     if kind not in ('cards','treasure') or s->>'status'<>'open' then raise exception 'このゲームでは選べません'; end if;
     if not host and me.answer is not null then raise exception 'このゲームでは参加済みです'; end if;
     n:=(p_data->>'value')::int;
     if n is null or n not between 0 and 5 then raise exception '1〜6番を選んでください'; end if;
     if exists(select 1 from jsonb_array_elements(s->'revealed') v where (v->>'index')::int=n) then raise exception '先に選ばれました。別の番号を選んでください'; end if;
     val:=jsonb_build_object('index',n,'label',s->'deck'->>n);
     s:=jsonb_set(s,'{revealed}',(s->'revealed')||jsonb_build_array(val||jsonb_build_object('by',case when host then '配信者' else me.name end)));
     if not host then update public.kg_players set answer=val,answered_at=clock_timestamp() where id=me.id; end if;
     mutated:=true;
   elsif p_action='mark' then
     if kind<>'bingo' or s->>'status'<>'open' then raise exception 'ビンゴの受付は終了しています'; end if;
     n:=(p_data->>'value')::int;
     if n is null or n=0 or not me.card @> jsonb_build_array(n) or not (s->'drawn') @> jsonb_build_array(n) then raise exception '呼ばれた数字だけ開けられます'; end if;
     if not me.marks @> jsonb_build_array(n) then
       update public.kg_players set marks=kg_players.marks||jsonb_build_array(n) where id=me.id; mutated:=true;
     end if;
   elsif p_action='claim' then
     if kind<>'bingo' or s->>'status'<>'open' then raise exception 'ビンゴの受付は終了しています'; end if;
     marks:=me.marks||'[0]'::jsonb; bingo:=false;
     for x in 0..4 loop
       line:=true;
       for y in 0..4 loop if not marks @> jsonb_build_array(me.card->(x*5+y)) then line:=false; end if; end loop;
       bingo:=bingo or line; line:=true;
       for y in 0..4 loop if not marks @> jsonb_build_array(me.card->(y*5+x)) then line:=false; end if; end loop;
       bingo:=bingo or line;
     end loop;
     line:=true; for x in 0..4 loop if not marks @> jsonb_build_array(me.card->(x*6)) then line:=false; end if; end loop; bingo:=bingo or line;
     line:=true; for x in 0..4 loop if not marks @> jsonb_build_array(me.card->(x*5+4-x)) then line:=false; end if; end loop; bingo:=bingo or line;
     if not bingo then raise exception 'まだラインが揃っていません。呼ばれた数字を開けてください'; end if;
     if not me.bingo then update public.kg_players set bingo=true,answered_at=clock_timestamp() where id=me.id; mutated:=true; end if;
   elsif p_action='draw' then
     if s->>'status'<>'open' then raise exception 'ゲームは終了しています'; end if;
     if kind='bingo' then
       select array_agg(g) into arr from generate_series(1,75) g where not (s->'drawn') @> jsonb_build_array(g);
       if coalesce(array_length(arr,1),0)=0 then raise exception 'すべての数字を抽選しました'; end if;
       n:=arr[public.kg_rand(array_length(arr,1))+1];
       s:=s||jsonb_build_object('last',n,'drawn',(s->'drawn')||jsonb_build_array(n));
     elsif kind='roulette' then
       n:=public.kg_rand(jsonb_array_length(cfg->'options'));
       s:=s||jsonb_build_object('result',jsonb_build_object('index',n,'label',cfg->'options'->n->>'label'),'status','closed','closedAt',now());
     elsif kind='lottery' then
       select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by joined_at),'[]') into opts from public.kg_players p where room_id=r.id and not banned and not (s->'drawn') @> jsonb_build_array(p.id::text);
       n:=jsonb_array_length(opts); if n=0 then raise exception '未当選の参加者がいません'; end if;
       chosen:=opts->public.kg_rand(n);
       s:=s||jsonb_build_object('result',chosen,'drawn',(s->'drawn')||jsonb_build_array(chosen->>'id'));
     else raise exception 'このゲームでは抽選できません'; end if;
     mutated:=true;
   elsif p_action='close' then
     if s->>'status'='closed' then null;
     else
       result:='{}';
       if kind='rps' then result:=jsonb_build_object('hand',public.kg_rand(3));
       elsif kind='number' then result:=jsonb_build_object('target',public.kg_rand(100)+1);
       elsif kind='quiz' then result:=jsonb_build_object('correct',(cfg->>'correct')::int);
       else result:=coalesce(s->'result','{}'); end if;
       s:=s||jsonb_build_object('status','closed','result',result,'closedAt',now()); mutated:=true;
     end if;
   elsif p_action='lock' then
     r.locked:=coalesce((p_data->>'locked')::boolean,true); mutated:=true;
   elsif p_action='kick' then
     uid:=(p_data->>'id')::uuid;
     update public.kg_players set banned=true where id=uid and room_id=r.id; mutated:=true;
   elsif p_action='end' then r.closed:=true; mutated:=true;
   else raise exception '操作が見つかりません'; end if;
 end if;
 if mutated then
   update public.kg_rooms set state=s,locked=r.locked,closed=r.closed,revision=revision+1 where id=r.id returning * into r;
   perform realtime.send(jsonb_build_object('revision',r.revision),'changed','kg:'||r.channel::text,false);
 end if;
 if not host then select * into me from public.kg_players where id=me.id; end if;
 s:=r.state; safe_s:=s;
 if s->>'status'='open' and s->>'kind' in ('cards','treasure') then safe_s:=s-'deck'; end if;
 if not host and s->>'status'='open' and s->>'kind'='quiz' then safe_s:=jsonb_set(s,'{config}',(s->'config')-'correct'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'answered',p.answer is not null,'bingo',p.bingo,
 'answer',case when s->>'status'='closed' or s->>'kind' in ('question','comment','either','ranking','mission','gacha','dice','slot','cards','treasure') then p.answer else null end,
 'answeredAt',case when s->>'status'='closed' or s->>'kind'='bingo' then p.answered_at else null end) order by p.joined_at),'[]') into players
 from public.kg_players p where room_id=r.id and not banned;
 return jsonb_build_object('room',jsonb_build_object('code',r.code,'name',r.name,'channel','kg:'||r.channel::text,'revision',r.revision,'locked',r.locked,'closed',r.closed,'expiresAt',r.expires_at),
 'host',host,'state',safe_s,'players',players,
 'me',case when host then null else jsonb_build_object('id',me.id,'name',me.name,'answer',me.answer,'card',me.card,'marks',me.marks,'bingo',me.bingo) end,'serverTime',now());
 exception when raise_exception then return jsonb_build_object('error',sqlerrm,'status',400);
 when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','入力形式を確認してください','status',400);
 end;
end $$;
