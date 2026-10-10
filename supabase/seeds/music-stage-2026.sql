-- Apply after the matching GitHub Pages files are live.
-- Existing grants and row-level security are unchanged.
insert into public.kazz_event_pages (slug, title, page_path, sort_order, published)
values ('music-stage-2026', 'MUSIC STAGE ミュージックステージ', 'music-stage/', 40, true)
on conflict (slug) do nothing;
