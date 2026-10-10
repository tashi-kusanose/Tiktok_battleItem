import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.mjs';

const allowedPages = new Map([
  ['masters-october-2026', 'masters/'],
  ['community-boost-2026', 'community-boost/'],
  ['king-of-stage-2026', 'king-of-stage/'],
  ['music-stage-2026', 'music-stage/'],
]);

export function validateCatalog(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid event catalog');
  const seen = new Set();
  for (const row of rows) {
    if (!row || !allowedPages.has(row.slug) || seen.has(row.slug)
      || row.page_path !== allowedPages.get(row.slug)
      || typeof row.title !== 'string' || !row.title.trim()
      || row.title.length > 120 || !Number.isInteger(row.sort_order)) {
      throw new Error('Invalid event entry');
    }
    seen.add(row.slug);
  }
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
}

export async function loadCatalog(fetcher = fetch, signal) {
  const url = new URL('/rest/v1/kazz_event_pages', SUPABASE_URL);
  url.searchParams.set('select', 'slug,title,page_path,sort_order');
  url.searchParams.set('published', 'eq.true');
  url.searchParams.set('order', 'sort_order.asc,slug.asc');
  const response = await fetcher(url, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' },
    credentials: 'omit',
    signal,
  });
  if (!response.ok) throw new Error(`Event catalog: ${response.status}`);
  return validateCatalog(await response.json());
}

async function refreshCatalog() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const rows = await loadCatalog(fetch, controller.signal);
    const main = document.querySelector('main');
    const banners = new Map([...main.querySelectorAll('[data-event]')]
      .map(element => [element.dataset.event, element]));
    for (const banner of banners.values()) banner.hidden = true;
    for (const row of rows) {
      const banner = banners.get(row.slug);
      if (!banner) continue;
      banner.href = row.page_path;
      banner.setAttribute('aria-label', `${row.title}のイベントページを開く`);
      banner.hidden = false;
      main.append(banner);
    }
    main.dataset.catalog = 'supabase';
  } catch {
    // The published HTML remains usable when the network or Data API is unavailable.
    document.querySelector('main').dataset.catalog = 'fallback';
  } finally {
    clearTimeout(timeout);
  }
}

if (typeof document !== 'undefined') refreshCatalog();
