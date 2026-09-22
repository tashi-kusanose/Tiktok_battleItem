alter policy teiki_draft_read on public.teiki_drafts using (owner_user_id=(select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
alter policy teiki_draft_insert on public.teiki_drafts with check (owner_user_id=(select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
alter policy teiki_draft_update on public.teiki_drafts using (owner_user_id=(select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)) with check (owner_user_id=(select auth.uid()) and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
alter policy teiki_public_read on public.teiki_publications to anon;
alter policy teiki_public_owner_read on public.teiki_publications using (is_published or exists(select 1 from public.teiki_drafts d where d.id=page_id and d.owner_user_id=(select auth.uid())));
