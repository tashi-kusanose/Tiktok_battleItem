-- Runs only against the new comment tables; all changes are rolled back.
begin;
select set_config('teiki.test_owner',(select owner_user_id::text from public.teiki_drafts where slug='natsumi'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('teiki.test_owner'),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $test$
declare d public.teiki_drafts; saved jsonb; published jsonb; original jsonb; rejected boolean=false;
begin
 select * into strict d from public.teiki_drafts where slug='natsumi';
 select document into original from public.teiki_publications where slug=d.slug;
 saved=public.teiki_save(jsonb_set(d.document,'{settings,name}','"QA rollback only"'),d.revision);
 if (saved->>'revision')::int<>d.revision+1 then raise exception 'TEST_SAVE_REVISION';end if;
 if (select document from public.teiki_publications where slug=d.slug)<>original then raise exception 'TEST_DRAFT_CHANGED_PUBLIC';end if;
 begin perform public.teiki_save(d.document,d.revision);exception when raise_exception then if sqlerrm='TEIKI_CONFLICT' then rejected=true;else raise;end if;end;
 if not rejected then raise exception 'TEST_CONFLICT_NOT_REJECTED';end if;
 published=public.teiki_publish((saved->>'revision')::int);
 if (select jsonb_array_length(document->'comments') from public.teiki_publications where slug=d.slug)<>48 then raise exception 'TEST_HIDDEN_LEAK';end if;
 update public.teiki_publications set document=(published->'document')||'{"private_note":"must be removed"}'::jsonb where page_id=d.id;
 if (select document ? 'private_note' from public.teiki_publications where page_id=d.id) then raise exception 'TEST_UNKNOWN_FIELD_LEAK';end if;
 saved=public.teiki_unpublish((published->>'revision')::int);
 if (select is_published from public.teiki_publications where page_id=d.id) then raise exception 'TEST_UNPUBLISH';end if;
 if (select count(*) from public.teiki_publications where page_id=d.id)<>1 then raise exception 'TEST_OWNER_HIDDEN_READ';end if;
 saved=public.teiki_save(jsonb_set(saved->'document','{settings,name}','"Unpublished draft"'),(saved->>'revision')::int);
 saved=public.teiki_restore((saved->>'revision')::int);
 if saved->'document'->'settings'->>'name'<>'QA rollback only' then raise exception 'TEST_RESTORE';end if;
end $test$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $test$
declare affected integer;
begin
 if (select count(*) from public.teiki_drafts where slug='natsumi')<>0 then raise exception 'TEST_OTHER_DRAFT_READ';end if;
 if (select count(*) from public.teiki_publications where slug='natsumi')<>0 then raise exception 'TEST_OTHER_HIDDEN_READ';end if;
 update public.teiki_drafts set revision=revision+1 where slug='natsumi';get diagnostics affected=row_count;
 if affected<>0 then raise exception 'TEST_OTHER_DRAFT_WRITE';end if;
 update public.teiki_publications set is_published=true where slug='natsumi';get diagnostics affected=row_count;
 if affected<>0 then raise exception 'TEST_OTHER_PUBLIC_WRITE';end if;
end $test$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('teiki.test_owner'),'role','authenticated','is_anonymous',true)::text,true);
set local role authenticated;
do $test$ begin
 if (select count(*) from public.teiki_drafts where slug='natsumi')<>0 then raise exception 'TEST_ANONYMOUS_AUTH_DRAFT_READ';end if;
end $test$;
reset role;
set local role anon;
do $test$ begin
 if (select count(*) from public.teiki_publications where slug='natsumi')<>0 then raise exception 'TEST_ANON_HIDDEN_READ';end if;
 if has_table_privilege('anon','public.teiki_drafts','SELECT') or has_function_privilege('anon','public.teiki_save(jsonb,integer)','EXECUTE') then raise exception 'TEST_ANON_PRIVATE_PERMISSION';end if;
end $test$;
reset role;
rollback;
select 'passed: owner save, revision conflict, private draft isolation, publish projection, unpublish, restore, other account isolation, anonymous auth and anon permissions; rolled back' as verification;
