create table public.kazz_event_pages (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  page_path text not null unique check (page_path ~ '^[a-z0-9]+(-[a-z0-9]+)*/$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.kazz_event_pages is 'Public event-guide navigation. Only published rows are readable; edits are restricted to database administrators.';
alter table public.kazz_event_pages enable row level security;
revoke all on table public.kazz_event_pages from public, anon, authenticated;
grant select on table public.kazz_event_pages to anon, authenticated;
grant all on table public.kazz_event_pages to service_role;
create policy "Published event pages are public"
  on public.kazz_event_pages for select
  to anon, authenticated
  using (published = true);
insert into public.kazz_event_pages (slug, title, page_path, sort_order, published) values
  ('masters-october-2026', 'MASTERS CHAMPIONSHIP 第6回10月大会', 'masters/', 10, true),
  ('community-boost-2026', 'COMMUNITY BOOST 10月イベント', 'community-boost/', 20, true),
  ('king-of-stage-2026', 'THE KING OF STAGE', 'king-of-stage/', 30, true);
