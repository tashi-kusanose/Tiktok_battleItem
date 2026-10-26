-- Apply after the matching GitHub Pages files are live.
-- The existing grants and row-level security remain in place.
insert into public.kazz_event_pages (slug, title, page_path, sort_order, published)
values ('fandom-october-2026', 'LIVE FANDOM+ ファンダム ゴジラコラボ', 'fandom/', 50, true)
on conflict (slug) do nothing;
