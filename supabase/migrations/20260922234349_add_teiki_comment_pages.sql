-- Separate owner-only drafts from the public projection. No changes to existing tools.
create table public.teiki_drafts (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null unique references auth.users(id) on delete cascade,
 slug text not null unique default ('p-' || replace(gen_random_uuid()::text,'-','')) check (slug ~ '^[A-Za-z0-9_-]{1,80}$'),
 document jsonb not null check (octet_length(document::text)<=280000),
 revision integer not null default 1 check(revision>0),
 last_published_draft jsonb,
 previous_published_draft jsonb,
 updated_at timestamptz not null default now()
);
create table public.teiki_publications (
 page_id uuid primary key references public.teiki_drafts(id) on delete cascade,
 slug text not null unique,
 document jsonb not null check(octet_length(document::text)<=280000),
 revision integer not null,
 is_published boolean not null default false,
 published_at timestamptz not null default now()
);
alter table public.teiki_drafts enable row level security;
alter table public.teiki_publications enable row level security;
revoke all on public.teiki_drafts,public.teiki_publications from anon,authenticated;
grant select,insert,update on public.teiki_drafts,public.teiki_publications to authenticated;
grant select on public.teiki_publications to anon;
grant all on public.teiki_drafts,public.teiki_publications to service_role;
create policy teiki_draft_read on public.teiki_drafts for select to authenticated using(owner_user_id=(select auth.uid()) and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
create policy teiki_draft_insert on public.teiki_drafts for insert to authenticated with check(owner_user_id=(select auth.uid()) and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
create policy teiki_draft_update on public.teiki_drafts for update to authenticated using(owner_user_id=(select auth.uid()) and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)) with check(owner_user_id=(select auth.uid()) and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
create policy teiki_public_read on public.teiki_publications for select to anon,authenticated using(is_published=true);
create policy teiki_public_owner_read on public.teiki_publications for select to authenticated using(exists(select 1 from public.teiki_drafts d where d.id=page_id and d.owner_user_id=(select auth.uid())));
create policy teiki_public_owner_insert on public.teiki_publications for insert to authenticated with check(exists(select 1 from public.teiki_drafts d where d.id=page_id and d.slug=teiki_publications.slug and d.owner_user_id=(select auth.uid())));
create policy teiki_public_owner_update on public.teiki_publications for update to authenticated using(exists(select 1 from public.teiki_drafts d where d.id=page_id and d.owner_user_id=(select auth.uid()))) with check(exists(select 1 from public.teiki_drafts d where d.id=page_id and d.slug=teiki_publications.slug and d.owner_user_id=(select auth.uid())));

create function public.teiki_validate(p jsonb) returns void language plpgsql security invoker set search_path='' as $fn$
declare c jsonb; k text; v text;
begin
 if p->>'schemaVersion' is distinct from '1' or jsonb_typeof(p->'settings') is distinct from 'object' or jsonb_typeof(p->'categories') is distinct from 'array' or jsonb_typeof(p->'comments') is distinct from 'array' then raise exception 'TEIKI_INVALID_FORMAT'; end if;
 if jsonb_array_length(p->'comments')>200 or jsonb_array_length(p->'categories')>20 then raise exception 'TEIKI_INVALID_LIMIT'; end if;
 foreach k in array array['name','mark','title','gift','goal','current','peopleGoal','peopleCurrent','accent'] loop
  if jsonb_typeof(p->'settings'->k) is distinct from 'string' then raise exception 'TEIKI_INVALID_SETTING'; end if;
  v=p->'settings'->>k;
  if length(v)>60 then raise exception 'TEIKI_INVALID_LENGTH'; end if;
  if k in ('goal','current','peopleGoal','peopleCurrent') and v<>'' and v!~'^\d{1,9}$' then raise exception 'TEIKI_INVALID_NUMBER'; end if;
 end loop;
 if (p->'settings'->>'accent')!~'^#[0-9A-Fa-f]{6}$' then raise exception 'TEIKI_INVALID_COLOR'; end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p->'categories') x) or (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p->'comments') x) then raise exception 'TEIKI_INVALID_DUPLICATE'; end if;
 for c in select * from jsonb_array_elements(p->'categories') loop
  if coalesce(c->>'id','')!~'^[A-Za-z0-9_-]{1,80}$' or c->>'id' in ('all','favorites') or coalesce(length(trim(c->>'name')),0) not between 1 and 40 or jsonb_typeof(c->'visible') is distinct from 'boolean' then raise exception 'TEIKI_INVALID_CATEGORY'; end if;
 end loop;
 for c in select * from jsonb_array_elements(p->'comments') loop
  if coalesce(c->>'id','')!~'^[A-Za-z0-9_-]{1,80}$' or coalesce(length(trim(c->>'title')),0) not between 1 and 80 or coalesce(length(trim(c->>'text')),0) not between 1 and 1500 or jsonb_typeof(c->'text') is distinct from 'string' or jsonb_typeof(c->'visible') is distinct from 'boolean' or jsonb_typeof(c->'pinned') is distinct from 'boolean' or not exists(select 1 from jsonb_array_elements(p->'categories') x where x->>'id'=c->>'category') then raise exception 'TEIKI_INVALID_COMMENT'; end if;
 end loop;
end $fn$;

create function public.teiki_public_document(p jsonb) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s jsonb='{}'; cats jsonb; comments jsonb; c jsonb; k text; v text; rendered text; vars jsonb;
begin
 perform public.teiki_validate(p);
 foreach k in array array['name','mark','title','gift','goal','current','peopleGoal','peopleCurrent','accent'] loop s=s||jsonb_build_object(k,p->'settings'->k); end loop;
 if length(trim(s->>'name'))=0 then raise exception 'TEIKI_INVALID_NAME'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','name',x->>'name','visible',true)),'[]') into cats from jsonb_array_elements(p->'categories') x where (x->>'visible')::boolean;
 select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','category',x->>'category','title',x->>'title','text',x->>'text','visible',true,'pinned',(x->>'pinned')::boolean)),'[]') into comments from jsonb_array_elements(p->'comments') x where (x->>'visible')::boolean and exists(select 1 from jsonb_array_elements(cats) ca where ca->>'id'=x->>'category');
 if jsonb_array_length(comments)=0 then raise exception 'TEIKI_INVALID_EMPTY'; end if;
 vars=jsonb_build_object('名前',s->>'name','推しマ',s->>'mark','ギフト',s->>'gift','目標数',s->>'goal','現在数',s->>'current','目標人数',s->>'peopleGoal','現在人数',s->>'peopleCurrent','残り数',case when s->>'goal'<>'' and s->>'current'<>'' then greatest(0,(s->>'goal')::bigint-(s->>'current')::bigint)::text else '' end,'残り人数',case when s->>'peopleGoal'<>'' and s->>'peopleCurrent'<>'' then greatest(0,(s->>'peopleGoal')::bigint-(s->>'peopleCurrent')::bigint)::text else '' end);
 for c in select * from jsonb_array_elements(comments) loop
  rendered=c->>'text';for k,v in select * from jsonb_each_text(vars) loop if v<>'' then rendered=replace(rendered,'{{'||k||'}}',v);end if;end loop;
  if rendered ~ '(\{\{|\}\}|○○|○人)' then raise exception 'TEIKI_INVALID_UNFILLED'; end if;
 end loop;
 return jsonb_build_object('schemaVersion',1,'settings',s,'categories',cats,'comments',comments);
end $fn$;

create function public.teiki_guard_draft() returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 perform public.teiki_validate(new.document);
 if TG_OP='UPDATE' and (new.id<>old.id or new.owner_user_id<>old.owner_user_id or new.slug<>old.slug) then raise exception 'TEIKI_IMMUTABLE_IDENTITY';end if;
 return new;
end $fn$;
create trigger teiki_validate_draft before insert or update on public.teiki_drafts for each row execute function public.teiki_guard_draft();

create function public.teiki_guard_publication() returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 -- A direct REST write is subject to the same projection as the publish RPC.
 new.document=public.teiki_public_document(new.document);
 return new;
end $fn$;
create trigger teiki_project_publication before insert or update on public.teiki_publications for each row execute function public.teiki_guard_publication();

create function public.teiki_save(p_document jsonb,p_expected_revision integer) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare r public.teiki_drafts; u uuid=auth.uid();
begin
 if u is null then raise exception 'TEIKI_AUTH_REQUIRED';end if;
 perform public.teiki_validate(p_document);
 select * into r from public.teiki_drafts where owner_user_id=u for update;
 if not found then
  if p_expected_revision is distinct from 0 then raise exception 'TEIKI_CONFLICT';end if;
  insert into public.teiki_drafts(owner_user_id,document) values(u,p_document) returning * into r;
 else
  if r.revision is distinct from p_expected_revision then raise exception 'TEIKI_CONFLICT';end if;
  update public.teiki_drafts set document=p_document,revision=revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 end if;
 return to_jsonb(r);
end $fn$;
create function public.teiki_publish(p_expected_revision integer) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare r public.teiki_drafts; p jsonb;
begin
 select * into r from public.teiki_drafts where owner_user_id=auth.uid() for update;
 if not found then raise exception 'TEIKI_AUTH_REQUIRED';end if;
 if r.revision is distinct from p_expected_revision then raise exception 'TEIKI_CONFLICT';end if;
 p=public.teiki_public_document(r.document);
 update public.teiki_drafts set previous_published_draft=last_published_draft,last_published_draft=document,revision=revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 insert into public.teiki_publications(page_id,slug,document,revision,is_published,published_at) values(r.id,r.slug,p,r.revision,true,clock_timestamp()) on conflict(page_id) do update set document=excluded.document,revision=excluded.revision,is_published=true,published_at=excluded.published_at;
 return to_jsonb(r);
end $fn$;
create function public.teiki_unpublish(p_expected_revision integer) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare r public.teiki_drafts;
begin
 select * into r from public.teiki_drafts where owner_user_id=auth.uid() for update;
 if not found then raise exception 'TEIKI_AUTH_REQUIRED';end if;
 if r.revision is distinct from p_expected_revision then raise exception 'TEIKI_CONFLICT';end if;
 update public.teiki_publications set is_published=false,published_at=clock_timestamp() where page_id=r.id;
 update public.teiki_drafts set revision=revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 return to_jsonb(r);
end $fn$;
create function public.teiki_restore(p_expected_revision integer) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare r public.teiki_drafts;
begin
 select * into r from public.teiki_drafts where owner_user_id=auth.uid() for update;
 if not found then raise exception 'TEIKI_AUTH_REQUIRED';end if;
 if r.revision is distinct from p_expected_revision then raise exception 'TEIKI_CONFLICT';end if;
 if r.last_published_draft is null then raise exception 'TEIKI_NO_PUBLISHED_DRAFT';end if;
 update public.teiki_drafts set document=last_published_draft,revision=revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 return to_jsonb(r);
end $fn$;
revoke all on function public.teiki_validate(jsonb),public.teiki_public_document(jsonb),public.teiki_guard_draft(),public.teiki_guard_publication(),public.teiki_save(jsonb,integer),public.teiki_publish(integer),public.teiki_unpublish(integer),public.teiki_restore(integer) from public,anon,authenticated;
grant execute on function public.teiki_validate(jsonb),public.teiki_public_document(jsonb),public.teiki_guard_draft(),public.teiki_guard_publication(),public.teiki_save(jsonb,integer),public.teiki_publish(integer),public.teiki_unpublish(integer),public.teiki_restore(integer) to authenticated,service_role;
